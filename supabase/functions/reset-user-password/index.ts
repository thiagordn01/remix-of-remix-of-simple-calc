import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge Function para resetar senha de usuário
 *
 * Apenas administradores podem usar esta função.
 * Gera uma nova senha temporária, atualiza no Supabase Auth, e envia por email.
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Reset User Password Request ===");

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

    console.log(`Resetando senha para: ${email}`);

    // Cliente Supabase com permissões de service role (admin)
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

    // Cliente Supabase normal para validar quem está chamando
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

    // Validar que quem está chamando é admin
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

    // Criar cliente com SERVICE_ROLE_KEY que bypassa RLS
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: userRole, error: roleError } = await supabaseServiceRole
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
        JSON.stringify({ error: "Apenas administradores podem resetar senhas" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Usuário verificado como admin");

    // Gerar senha temporária (8 caracteres: letras e números)
    const generatePassword = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let password = "";
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const newPassword = generatePassword();
    console.log("Nova senha gerada");

    // Atualizar senha no Supabase Auth usando service role
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Erro ao atualizar senha:", updateError);
      throw new Error(`Falha ao atualizar senha: ${updateError.message}`);
    }

    console.log("Senha atualizada no Supabase Auth");

    // Buscar dados do usuário (usando service role para bypass RLS)
    console.log(`Buscando perfil do usuário: ${userId}`);

    const { data: targetProfile, error: targetError } = await supabaseServiceRole
      .from("profiles")
      .select("name, access_expires_at")
      .eq("id", userId)
      .single();

    console.log("Resultado da busca de perfil:", { targetProfile, targetError });

    const userName = targetProfile?.name || name || "Usuário";
    const expiresAt = targetProfile?.access_expires_at;

    // Preparar email
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SYSTEM_EMAIL_FROM = Deno.env.get("SYSTEM_EMAIL_FROM") || "Sistema <noreply@example.com>";
    const SYSTEM_URL = Deno.env.get("SYSTEM_URL") || "https://seu-sistema.com";

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

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
          .password-box { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
          .password { font-size: 24px; font-weight: bold; color: #333; letter-spacing: 2px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔑 Nova Senha Gerada</h1>
        </div>
        <div class="content">
          <p>Olá <strong>${userName}</strong>,</p>
          <p>Sua senha foi resetada pelo administrador do sistema.</p>
          <div class="info-box">
            <strong>📧 Email de acesso:</strong> ${email}<br>
            ${expiresAt ? `<strong>⏰ Acesso válido até:</strong> ${new Date(expiresAt).toLocaleDateString('pt-BR')}<br>` : '<strong>✨ Acesso:</strong> Permanente<br>'}
          </div>
          <div class="password-box">
            <p style="margin: 0 0 10px 0; font-size: 14px;">Sua nova senha temporária:</p>
            <div class="password">${newPassword}</div>
          </div>
          <p><strong>⚠️ IMPORTANTE:</strong></p>
          <ul>
            <li>Guarde esta senha em um local seguro</li>
            <li>Recomendamos trocar sua senha após o primeiro acesso</li>
            <li>Não compartilhe suas credenciais com ninguém</li>
          </ul>
          <center>
            <a href="${SYSTEM_URL}/auth" class="button">✨ Acessar Sistema Agora ✨</a>
          </center>
          <p>Se você não solicitou esta alteração, entre em contato com o suporte imediatamente.</p>
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
        subject: "🔑 Nova Senha de Acesso",
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Erro ao enviar email:", errorData);
      throw new Error(`Falha ao enviar email: ${errorData.message || "Erro desconhecido"}`);
    }

    console.log(`✅ Nova senha enviada com sucesso para ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Senha resetada e email enviado com sucesso",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Erro ao resetar senha:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
