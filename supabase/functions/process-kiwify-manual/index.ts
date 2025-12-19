import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Processa uma compra Kiwify manualmente
 *
 * POST /functions/v1/process-kiwify-manual
 *
 * Body:
 * {
 *   "order_id": "KW12345",
 *   "customer_email": "cliente@example.com",
 *   "customer_name": "João Silva",
 *   "customer_phone": "+5511999999999",
 *   "order_amount": 97.00,
 *   "order_status": "paid",
 *   "product_name": "Produto XYZ",
 *   "is_subscription": false,
 *   "next_payment_date": null // ISO date se assinatura
 * }
 */

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Processamento Manual de Compra Kiwify ===");

    // VALIDAÇÃO 1: Apenas POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // VALIDAÇÃO 2: Autenticação (admin)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verificar se é admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // PARSEAR DADOS
    const body = await req.json();
    console.log("Dados recebidos:", JSON.stringify(body, null, 2));

    // VALIDAÇÃO 3: Campos obrigatórios
    const required = ["order_id", "customer_email", "customer_name", "order_status"];
    for (const field of required) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // VALIDAÇÃO 4: Apenas pedidos pagos
    if (body.order_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Only paid orders can be processed" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const customerEmail = body.customer_email.toLowerCase().trim();
    const customerName = body.customer_name;
    const customerPhone = body.customer_phone || null;

    // VALIDAÇÃO 5: Verificar duplicação
    const { data: existingPurchase } = await supabaseAdmin
      .from("kiwify_purchases")
      .select("id")
      .eq("order_id", body.order_id)
      .maybeSingle();

    if (existingPurchase) {
      return new Response(
        JSON.stringify({
          error: "Order already processed",
          order_id: body.order_id
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // PROCESSAR COMPRA
    console.log(`Processando compra para: ${customerName} (${customerEmail})`);

    // 1. Verificar se usuário existe
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = authUsers.users.find(
      (u) => u.email?.toLowerCase() === customerEmail
    );

    let userId: string;
    let tempPassword: string | null = null;
    let isNewUser = false;

    if (!existingUser) {
      // Criar novo usuário
      console.log("Criando novo usuário...");
      isNewUser = true;
      tempPassword = generateSecurePassword();

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: customerName,
          phone: customerPhone,
          created_via: "manual_processing",
        },
      });

      if (createError || !newUser.user) {
        console.error("Erro ao criar usuário:", createError);
        throw new Error(`Failed to create user: ${createError?.message}`);
      }

      userId = newUser.user.id;
      console.log(`Usuário criado com sucesso: ${userId}`);
    } else {
      userId = existingUser.id;
      console.log(`Usuário já existe: ${userId}`);
    }

    // 2. Calcular expiração
    let expirationDate: string | null = null;
    if (body.is_subscription && body.next_payment_date) {
      expirationDate = new Date(body.next_payment_date).toISOString();
    } else if (body.is_subscription) {
      const exp = new Date();
      exp.setDate(exp.getDate() + 30);
      expirationDate = exp.toISOString();
    }

    // 3. Atualizar profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        name: customerName,
        phone: customerPhone,
        is_approved: true,
        access_expires_at: expirationDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Erro ao atualizar profile:", profileError);
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }

    console.log("Profile atualizado com sucesso");

    // 4. Registrar compra em kiwify_purchases
    const purchaseData = {
      user_id: userId,
      order_id: body.order_id,
      order_ref: body.order_ref || null,
      order_status: body.order_status,
      customer_email: customerEmail,
      customer_name: customerName,
      customer_phone: customerPhone,
      product_name: body.product_name || "Produto",
      amount: body.order_amount || 0,
      payment_method: body.payment_method || "unknown",
      subscription_id: body.subscription_id || null,
      purchased_at: body.purchased_at || new Date().toISOString(),
      webhook_payload: body, // Salvar dados completos
    };

    const { error: purchaseError } = await supabaseAdmin
      .from("kiwify_purchases")
      .insert(purchaseData);

    if (purchaseError) {
      console.error("Erro ao registrar compra:", purchaseError);
      throw new Error(`Failed to register purchase: ${purchaseError.message}`);
    }

    console.log("Compra registrada com sucesso");

    // 5. Enviar email (se configurado)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (RESEND_API_KEY && isNewUser && tempPassword) {
      emailSent = await sendCredentialsEmail(
        customerEmail,
        customerName,
        tempPassword,
        expirationDate
      );
    }

    // RETORNAR SUCESSO
    return new Response(
      JSON.stringify({
        success: true,
        message: "Purchase processed successfully",
        data: {
          user_id: userId,
          order_id: body.order_id,
          is_new_user: isNewUser,
          email_sent: emailSent,
          temporary_password: isNewUser ? tempPassword : null,
          access_expires_at: expirationDate,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("=== Erro Fatal ===", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// Helpers
function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function sendCredentialsEmail(
  email: string,
  name: string,
  password: string,
  expiresAt: string | null
): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const SYSTEM_EMAIL_FROM = Deno.env.get("SYSTEM_EMAIL_FROM") || "noreply@example.com";
  const SYSTEM_URL = Deno.env.get("SYSTEM_URL") || "https://example.com";

  if (!RESEND_API_KEY) return false;

  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #D4AF37;">Bem-vindo!</h1>
        <p>Olá <strong>${name}</strong>,</p>
        <p>Seu acesso foi liberado! Aqui estão suas credenciais:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Senha Temporária:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 4px;">${password}</code></p>
          ${expiresAt ? `<p><strong>Acesso válido até:</strong> ${new Date(expiresAt).toLocaleDateString('pt-BR')}</p>` : ''}
        </div>
        <p><a href="${SYSTEM_URL}/auth" style="display: inline-block; background: #D4AF37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Acessar Sistema</a></p>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">Recomendamos alterar sua senha no primeiro acesso.</p>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SYSTEM_EMAIL_FROM,
        to: email,
        subject: "Seu acesso foi liberado!",
        html: emailHtml,
      }),
    });

    if (response.ok) {
      console.log(`Email enviado com sucesso para ${email}`);
      return true;
    } else {
      console.error(`Erro ao enviar email:`, await response.text());
      return false;
    }
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return false;
  }
}
