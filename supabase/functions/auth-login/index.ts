import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/**
 * Edge Function para autenticação de aplicativos externos
 * Permite que os executáveis Python validem login usando as mesmas credenciais do Kiwify
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Auth Login Request ===");

    // 1. Validar método HTTP
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Parsear payload
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Email e senha são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Tentativa de login: ${email}`);

    // 3. Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 4. Tentar fazer login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password,
    });

    if (authError || !authData.user) {
      console.error("Erro de autenticação:", authError?.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email ou senha incorretos"
        }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Usuário autenticado: ${authData.user.id}`);

    // 5. Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, is_approved, access_expires_at")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      console.error("Erro ao buscar perfil:", profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao buscar dados do usuário"
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 6. Verificar se usuário está aprovado
    if (!profile?.is_approved) {
      console.log(`Usuário ${authData.user.id} não está aprovado`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Sua conta ainda não foi aprovada. Por favor, aguarde a aprovação do administrador."
        }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 7. Verificar expiração do acesso
    if (profile.access_expires_at) {
      const expiresAt = new Date(profile.access_expires_at);
      const now = new Date();

      if (expiresAt < now) {
        const diasExpirados = Math.ceil((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`Acesso de ${authData.user.id} expirado há ${diasExpirados} dias`);

        return new Response(
          JSON.stringify({
            success: false,
            error: `Seu acesso expirou há ${diasExpirados} dia(s). Por favor, renove sua assinatura.`
          }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Calcular dias restantes
      const diasRestantes = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`Acesso válido: ${diasRestantes} dias restantes`);
    }

    // 8. Login bem-sucedido!
    console.log(`✅ Login bem-sucedido para ${email}`);

    const diasRestantes = profile.access_expires_at
      ? Math.ceil((new Date(profile.access_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return new Response(
      JSON.stringify({
        success: true,
        token: authData.session.access_token,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: profile.name || "Usuário",
        },
        access: {
          expires_at: profile.access_expires_at,
          days_remaining: diasRestantes,
          is_permanent: !profile.access_expires_at,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Erro ao processar login:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
