import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge Function para reenviar email de credenciais
 *
 * Apenas administradores podem usar esta função.
 * Reenvia o email de boas-vindas com o link de acesso ao sistema.
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Resend Credentials Request ===");

    // Validar método
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Obter dados da requisição
    const { userId, email, name } = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "userId e email são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Reenviando credenciais para: ${email}`);

    // Validar que quem está chamando é admin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verificar se é admin usando SERVICE_ROLE (bypassa RLS)
    console.log(`Verificando permissões de admin para user_id: ${user.id}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: userRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    console.log("Resultado da verificação de role:", { userRole, roleError });

    if (roleError) {
      console.error("Erro ao verificar role:", roleError);
      return new Response(
        JSON.stringify({
          error: "Erro ao verificar permissões",
          details: roleError.message
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!userRole) {
      console.log("Usuário não tem role de admin na tabela user_roles");
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem reenviar credenciais" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Usuário verificado como admin");

    // Buscar dados do usuário alvo (usando service role para bypasaar RLS)
    console.log(`Buscando perfil do usuário: ${userId}`);

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("name, access_expires_at")
      .eq("id", userId)
      .single();

    console.log("Resultado da busca de perfil:", { targetProfile, targetError });

    if (targetError) {
      console.error("Erro ao buscar perfil:", targetError);
      return new Response(
        JSON.stringify({
          error: "Usuário não encontrado",
          details: targetError.message,
          userId: userId
        }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Preparar email
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SYSTEM_EMAIL_FROM = Deno.env.get("SYSTEM_EMAIL_FROM") || "Sistema <noreply@example.com>";
    const SYSTEM_URL = Deno.env.get("SYSTEM_URL") || "https://seu-sistema.com";

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const userName = targetProfile.name || name || "Usuário";
    const expiresAt = targetProfile.access_expires_at;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #D4AF37 0%, #F59E0B 50%, #FBBF24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
          .button { display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #F59E0B 50%, #FBBF24 100%); color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4); }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
          .info-box { background: #f8f9fa; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Suas Credenciais de Acesso</h1>
        </div>
        <div class="content">
          <p>Olá <strong>${userName}</strong>,</p>
          <p>Este email foi reenviado pelo administrador do sistema.</p>
          <p>Você pode acessar o sistema usando o email cadastrado:</p>
          <div class="info-box">
            <strong>📧 Email:</strong> ${email}<br>
            ${expiresAt ? `<strong>⏰ Acesso válido até:</strong> ${new Date(expiresAt).toLocaleDateString('pt-BR')}<br>` : '<strong>✨ Acesso:</strong> Permanente<br>'}
          </div>
          <p><strong>Observação:</strong> Use a mesma senha que você configurou anteriormente. Se esqueceu sua senha, solicite ao administrador para resetá-la.</p>
          <center>
            <a href="${SYSTEM_URL}/auth" class="button">✨ Acessar Sistema Agora ✨</a>
          </center>
          <p>Caso tenha dúvidas, entre em contato com o suporte.</p>
        </div>
        <div class="footer">
          <p>Este é um email automático, não responda.</p>
          <p>© ${new Date().getFullYear()} - Todos os direitos reservados</p>
        </div>
      </body>
      </html>
    `;

    // Enviar email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SYSTEM_EMAIL_FROM,
        to: [email],
        subject: "🔐 Suas Credenciais de Acesso",
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Erro ao enviar email:", errorData);
      throw new Error(`Falha ao enviar email: ${errorData.message || "Erro desconhecido"}`);
    }

    console.log(`✅ Email reenviado com sucesso para ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email reenviado com sucesso",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Erro ao reenviar credenciais:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
