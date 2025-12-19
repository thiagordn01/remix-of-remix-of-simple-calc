import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY"); // Opcional
const SYSTEM_EMAIL_FROM = Deno.env.get("SYSTEM_EMAIL_FROM") || "noreply@yourdomain.com";
const SYSTEM_URL = Deno.env.get("SYSTEM_URL") || "https://yourdomain.com";
const KIWIFY_WEBHOOK_TOKEN = Deno.env.get("KIWIFY_WEBHOOK_TOKEN"); // Token de segurança da Kiwify

// API do parceiro (Talkify/Charles Network)
const TALKIFY_API_KEY = Deno.env.get("TALKIFY_API_KEY") || "cn_live_k8X2mP9qR3wL7vY1nT5sJ4hF6gB0cA";
const TALKIFY_API_URL = "https://api.talkifydev.com/integrations/charles-network/create";

// Interface do payload da Kiwify
interface KiwifyWebhook {
  order_id: string;
  order_ref?: string;
  order_status: string;
  payment_method?: string;
  payment_merchant_id?: string;
  installments?: number;
  Customer?: {
    full_name?: string;
    email: string;
    mobile?: string;
  };
  Product?: {
    product_id?: string;
    product_name?: string;
  };
  Subscription?: {
    id?: string;
    start_date?: string;
    next_payment?: string;
    subscription_id?: string;
    status?: string;
    customer_access?: {
      has_access?: boolean;
      active_period?: boolean;
      access_until?: string; // ← Data correta de expiração do acesso
    };
    plan?: {
      id?: string;
      name?: string;
      frequency?: "daily" | "weekly" | "monthly" | "yearly";
      qty_charges?: number;
    };
  };
  order_amount?: number;
  [key: string]: any; // Para outros campos não mapeados
}

/**
 * Gera uma senha aleatória segura
 */
function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Retorna o número de dias baseado na frequência do plano
 * @param frequency - Frequência do plano ("daily" | "weekly" | "monthly" | "yearly")
 * @returns Número de dias correspondente
 */
function getDaysForFrequency(frequency?: string): number {
  switch (frequency?.toLowerCase()) {
    case "daily":
      return 1;
    case "weekly":
      return 7;
    case "yearly":
      return 365;
    case "monthly":
    default:
      return 30;
  }
}

/**
 * Calcula data de expiração baseada no tipo de compra
 * Para assinaturas, usa a data next_payment da Kiwify (sincroniza com a plataforma)
 * Para compras únicas, retorna null (acesso permanente)
 */
function calculateExpirationDate(payload: KiwifyWebhook): string | null {
  // Se tem assinatura ativa, usar next_payment da Kiwify
  // A Kiwify é a fonte da verdade para datas de assinatura
  if (payload.Subscription?.next_payment) {
    const expirationDate = new Date(payload.Subscription.next_payment);
    console.log(`Assinatura: expira em ${expirationDate.toISOString()} (next_payment da Kiwify)`);
    return expirationDate.toISOString();
  }

  // Se tem subscription_id mas não tem next_payment, calcular baseado na frequência
  if (payload.Subscription?.subscription_id || payload.Subscription?.id) {
    const frequency = payload.Subscription?.plan?.frequency;
    const daysToAdd = getDaysForFrequency(frequency);
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + daysToAdd);
    console.log(`Assinatura sem next_payment: +${daysToAdd} dias (frequência: ${frequency || 'monthly'})`);
    return expirationDate.toISOString();
  }

  // Compra única = acesso permanente (null)
  console.log("Compra única: acesso permanente (sem expiração)");
  return null;
}

/**
 * Envia email com credenciais usando Resend
 */
async function sendCredentialsEmail(
  email: string,
  name: string,
  password: string,
  isNewUser: boolean
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY não configurado, pulando envio de email");
    return false;
  }

  try {
    const subject = isNewUser
      ? "🎉 Seu acesso foi liberado!"
      : "✅ Seu acesso foi renovado!";

    const html = isNewUser
      ? `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #D4AF37 0%, #F59E0B 50%, #FBBF24 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; box-shadow: 0 4px 6px rgba(212, 175, 55, 0.3); }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D4AF37; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #F59E0B 50%, #FBBF24 100%); color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4); transition: transform 0.2s; }
            .button:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(212, 175, 55, 0.5); }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">🎉 Bem-vindo(a)!</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${name}</strong>!</p>

              <p>Seu pagamento foi confirmado e seu acesso ao sistema foi liberado com sucesso!</p>

              <div class="credentials">
                <h3 style="color: #D4AF37; margin-top: 0;">📧 Suas Credenciais de Acesso:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Senha temporária:</strong> <code style="background: #FEF3C7; padding: 6px 12px; border-radius: 4px; color: #92400E; font-weight: bold;">${password}</code></p>
              </div>

              <p><strong>⚠️ Importante:</strong> Por segurança, recomendamos que você altere sua senha no primeiro acesso.</p>

              <div style="text-align: center;">
                <a href="${SYSTEM_URL}/auth" class="button">✨ Acessar Sistema Agora ✨</a>
              </div>

              <p>Se você tiver qualquer dúvida, não hesite em entrar em contato com nosso suporte.</p>

              <p>Bons estudos! 🚀</p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #D4AF37 0%, #F59E0B 50%, #FBBF24 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; box-shadow: 0 4px 6px rgba(212, 175, 55, 0.3); }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #F59E0B 50%, #FBBF24 100%); color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4); transition: transform 0.2s; }
            .button:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(212, 175, 55, 0.5); }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">✅ Acesso Renovado!</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${name}</strong>!</p>

              <p>Seu pagamento foi confirmado e seu acesso ao sistema foi renovado com sucesso!</p>

              <p>Você já pode continuar acessando normalmente com suas credenciais existentes.</p>

              <div style="text-align: center;">
                <a href="${SYSTEM_URL}/auth" class="button">✨ Acessar Sistema ✨</a>
              </div>

              <p>Obrigado por continuar conosco! 🚀</p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SYSTEM_EMAIL_FROM,
        to: email,
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Erro ao enviar email via Resend:", error);
      return false;
    }

    console.log(`Email enviado com sucesso para ${email}`);
    return true;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return false;
  }
}

/**
 * Envia dados do usuário para a API do parceiro (Talkify/Charles Network)
 * Isso dá acesso ao sistema do parceiro automaticamente
 */
async function sendToPartnerAPI(email: string, name: string): Promise<boolean> {
  try {
    console.log(`📤 Enviando dados para API do parceiro: ${email}`);

    const response = await fetch(TALKIFY_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TALKIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        name: name,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro na API do parceiro (${response.status}):`, errorText);
      return false;
    }

    const result = await response.json();
    console.log(`✅ Usuário registrado na API do parceiro:`, result);
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar para API do parceiro:", error);
    return false;
  }
}

/**
 * Processa o webhook da Kiwify
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Webhook Kiwify Recebido ===");
    console.log("DEBUG - SYSTEM_EMAIL_FROM:", SYSTEM_EMAIL_FROM);
    console.log("DEBUG - RESEND_API_KEY configurado:", !!RESEND_API_KEY);

    // 1. Validar método HTTP
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Validar token de segurança da Kiwify
    if (KIWIFY_WEBHOOK_TOKEN) {
      const url = new URL(req.url);
      const tokenFromUrl = url.searchParams.get("token");

      if (tokenFromUrl !== KIWIFY_WEBHOOK_TOKEN) {
        console.error("Token inválido ou ausente. Esperado:", KIWIFY_WEBHOOK_TOKEN, "Recebido:", tokenFromUrl);
        return new Response(
          JSON.stringify({ error: "Unauthorized - Invalid token" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("✅ Token validado com sucesso");
    } else {
      console.warn("⚠️ KIWIFY_WEBHOOK_TOKEN não configurado - webhook sem validação de token!");
    }

    // 3. Parsear payload
    const payload: KiwifyWebhook = await req.json();
    console.log("Payload recebido:", JSON.stringify(payload, null, 2));

    // 4. Validar campos obrigatórios
    if (!payload.order_id) {
      return new Response(
        JSON.stringify({ error: "Missing order_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!payload.Customer?.email) {
      return new Response(
        JSON.stringify({ error: "Missing customer email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Processar baseado no status do pedido
    const orderStatus = payload.order_status;
    console.log(`Processando pedido ${payload.order_id} com status: ${orderStatus}`);

    // Criar cliente Supabase com service role (bypass RLS)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Status que exigem revogação de acesso
    const REVOKE_STATUSES = ["cancelled", "refunded", "chargeback", "canceled"];

    if (REVOKE_STATUSES.includes(orderStatus)) {
      console.log(`⚠️ Status requer revogação de acesso: ${orderStatus}`);
      return await handleAccessRevocation(payload, admin);
    }

    // Status que concedem acesso
    if (orderStatus === "paid") {
      console.log(`✅ Status concede acesso: ${orderStatus}`);
      return await handlePaidOrder(payload, admin);
    }

    // Outros status são apenas registrados mas não processados
    console.log(`ℹ️ Status ${orderStatus} apenas registrado, sem ação`);
    return new Response(
      JSON.stringify({
        ok: true,
        message: `Event logged but not processed - status: ${orderStatus}`
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * Processa pedido pago - concede acesso
 */
async function handlePaidOrder(payload: KiwifyWebhook, admin: any): Promise<Response> {
  try {
    // 1. Verificar se já processamos este pedido (idempotência)
    const { data: existingPurchase } = await admin
      .from("kiwify_purchases")
      .select("id, user_id")
      .eq("order_id", payload.order_id)
      .maybeSingle();

    // Se já processamos este pedido, ainda assim atualizamos o acesso do usuário
    // Isso permite correções via reenvio de webhook
    const isReprocessing = !!existingPurchase;
    if (isReprocessing) {
      console.log(`⚠️ Pedido ${payload.order_id} já foi processado anteriormente - reprocessando para atualizar acesso`);
    }

    const customerEmail = payload.Customer?.email?.toLowerCase().trim() || '';
    const customerName = payload.Customer?.full_name || "Usuário";
    const customerPhone = payload.Customer?.mobile;

    console.log(`Processando compra para: ${customerName} (${customerEmail})`);

    // 8. Verificar se usuário já existe (busca direta na tabela auth.users)
    let existingUser = null;
    try {
      const { data: users, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (listError) {
        console.log(`Erro ao listar usuários: ${listError.message}`);
      } else if (users?.users) {
        existingUser = users.users.find(
          (u: any) => u.email?.toLowerCase() === customerEmail
        );
        if (existingUser) {
          console.log(`✅ Usuário existente encontrado: ${existingUser.id}`);
        } else {
          console.log(`Usuário não encontrado na lista (${users.users.length} usuários verificados)`);
        }
      }
    } catch (err) {
      console.log(`Erro ao buscar usuário: ${err}`);
    }

    let userId: string;
    let tempPassword: string | null = null;
    let isNewUser = false;

    if (!existingUser) {
      // 9. Criar novo usuário
      console.log("Criando novo usuário...");
      isNewUser = true;
      tempPassword = generateSecurePassword();

      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: customerEmail,
        password: tempPassword,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          name: customerName,
          phone: customerPhone,
          created_via: "kiwify_webhook",
        },
      });

      if (createError || !newUser?.user) {
        console.error("Erro ao criar usuário:", createError);
        return new Response(
          JSON.stringify({
            error: "Failed to create user",
            details: createError?.message
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      userId = newUser.user.id;
      console.log(`Novo usuário criado: ${userId}`);
    } else {
      // Usuário já existe
      userId = existingUser.id;
      console.log(`Usuário existente encontrado: ${userId}`);
    }

    // 10. Calcular data de expiração
    // Prioridade:
    // 1. access_until da Kiwify (fonte da verdade - data exata que o cliente tem acesso)
    // 2. next_payment da Kiwify (geralmente igual ao access_until)
    // 3. Calcular manualmente baseado na frequência do plano (fallback)
    let expiresAt: string | null = null;

    const accessUntil = payload.Subscription?.customer_access?.access_until;
    const nextPayment = payload.Subscription?.next_payment;
    const frequency = payload.Subscription?.plan?.frequency;

    console.log(`📊 Dados da assinatura: access_until=${accessUntil}, next_payment=${nextPayment}, frequency=${frequency}`);

    if (accessUntil) {
      // MELHOR OPÇÃO: Usar access_until da Kiwify (data exata de expiração do acesso)
      expiresAt = new Date(accessUntil).toISOString();
      console.log(`📅 Usando access_until da Kiwify (fonte da verdade): ${expiresAt}`);
    } else if (nextPayment) {
      // FALLBACK 1: Usar next_payment (geralmente é igual ao access_until)
      expiresAt = new Date(nextPayment).toISOString();
      console.log(`📅 Usando next_payment da Kiwify (fallback): ${expiresAt}`);
    } else {
      // FALLBACK 2: Calcular manualmente baseado na frequência
      const daysToAdd = getDaysForFrequency(frequency);
      console.log(`📅 Nenhuma data da Kiwify disponível, calculando manualmente...`);

      // Buscar data de expiração atual do profile
      const { data: currentProfile } = await admin
        .from("profiles")
        .select("access_expires_at")
        .eq("id", userId)
        .maybeSingle();

      const now = new Date();
      let baseDate = new Date(); // Por padrão, usar hoje

      if (!isNewUser && currentProfile?.access_expires_at) {
        const currentExpiration = new Date(currentProfile.access_expires_at);

        if (currentExpiration > now) {
          baseDate = currentExpiration;
          console.log(`📅 Renovação: acesso ainda válido, estendendo a partir de ${currentExpiration.toISOString()}`);
        } else {
          console.log(`📅 Renovação: acesso estava expirado em ${currentExpiration.toISOString()}, usando hoje como base`);
        }
      } else {
        console.log(`📅 ${isNewUser ? 'Novo usuário' : 'Usuário sem data anterior'}: usando hoje como base`);
      }

      baseDate.setDate(baseDate.getDate() + daysToAdd);
      expiresAt = baseDate.toISOString();
      console.log(`📅 Nova data de expiração (calculado): ${expiresAt} (+${daysToAdd} dias, frequência: ${frequency || 'monthly'})`);
    }

    // 11. Criar/atualizar profile com acesso aprovado
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: userId,
        name: customerName,
        is_approved: true,
        access_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("Erro ao atualizar profile:", profileError);
      // Não é fatal - continuar
    } else {
      console.log("Profile atualizado com sucesso");
    }

    // 12. Registrar compra na tabela de auditoria (apenas se não for reprocessamento)
    if (!isReprocessing) {
      const { error: purchaseError } = await admin
        .from("kiwify_purchases")
        .insert({
          user_id: userId,
          order_id: payload.order_id,
          order_ref: payload.order_ref,
          order_status: payload.order_status,
          payment_method: payload.payment_method,
          payment_merchant_id: payload.payment_merchant_id,
          installments: payload.installments,
          amount: payload.order_amount,
          product_id: payload.Product?.product_id,
          product_name: payload.Product?.product_name,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          subscription_id: payload.Subscription?.subscription_id,
          subscription_start_date: payload.Subscription?.start_date,
          subscription_next_payment: payload.Subscription?.next_payment,
          webhook_payload: payload,
          purchased_at: new Date().toISOString(),
        });

      if (purchaseError) {
        console.error("Erro ao registrar compra:", purchaseError);
        // Não é fatal - continuar
      } else {
        console.log("Compra registrada com sucesso");
      }

      // 13. Enviar email com credenciais para o comprador (apenas no primeiro processamento)
      if (isNewUser && tempPassword) {
        console.log(`Enviando email com credenciais para ${customerEmail}...`);
        await sendCredentialsEmail(customerEmail, customerName, tempPassword, true);
      } else if (!isNewUser) {
        console.log(`Enviando email de renovação para ${customerEmail}...`);
        await sendCredentialsEmail(customerEmail, customerName, "", false);
      }
    } else {
      console.log(`⚠️ Reprocessamento: pulando registro de compra e envio de email (já feito anteriormente)`);
    }

    // 14. Enviar dados para API do parceiro (Talkify/Charles Network)
    // Isso dá acesso automático ao sistema do parceiro
    await sendToPartnerAPI(customerEmail, customerName);

    // 15. Retornar sucesso
    console.log(`✅ Webhook ${isReprocessing ? 'reprocessado' : 'processado'} com sucesso para pedido ${payload.order_id}`);
    return new Response(
      JSON.stringify({
        ok: true,
        message: isReprocessing ? "Webhook reprocessed - access updated" : "Webhook processed successfully",
        user_id: userId,
        is_new_user: isNewUser,
        is_reprocessing: isReprocessing,
        access_expires_at: expiresAt,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

/**
 * Processa cancelamento/reembolso/chargeback - revoga acesso
 */
async function handleAccessRevocation(payload: KiwifyWebhook, admin: any): Promise<Response> {
  try {
    const customerEmail = payload.Customer?.email?.toLowerCase().trim();
    const orderStatus = payload.order_status;
    
    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing customer email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`🚫 Revogando acesso para: ${customerEmail} (motivo: ${orderStatus})`);

    // 1. Encontrar usuário pelo email (busca na lista)
    let user = null;
    try {
      const { data: users, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (listError) {
        console.log(`Erro ao listar usuários: ${listError.message}`);
      } else if (users?.users) {
        user = users.users.find(
          (u: any) => u.email?.toLowerCase() === customerEmail
        );
        if (user) {
          console.log(`✅ Usuário encontrado para revogação: ${user.id}`);
        }
      }
    } catch (err) {
      console.log(`Erro ao buscar usuário: ${err}`);
    }

    if (!user) {
      console.log(`⚠️ Usuário não encontrado: ${customerEmail}`);
      return new Response(
        JSON.stringify({
          ok: true,
          message: "User not found - no action needed",
          email: customerEmail
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = user.id;

    // 2. Revogar acesso no profile
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        is_approved: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Erro ao revogar acesso:", profileError);
    } else {
      console.log(`✅ Acesso revogado para user_id: ${userId}`);
    }

    // 3. Atualizar ou criar registro de compra com dados de cancelamento
    const { data: existingPurchase } = await admin
      .from("kiwify_purchases")
      .select("id")
      .eq("order_id", payload.order_id)
      .maybeSingle();

    const now = new Date().toISOString();
    const purchaseData: any = {
      user_id: userId,
      order_id: payload.order_id,
      order_ref: payload.order_ref,
      order_status: orderStatus,
      customer_email: customerEmail,
      customer_name: payload.Customer?.full_name || "Usuário",
      customer_phone: payload.Customer?.mobile,
      product_name: payload.Product?.product_name,
      amount: payload.order_amount,
      webhook_payload: payload,
      updated_at: now,
    };

    // Adicionar campos específicos do tipo de cancelamento
    if (orderStatus === "cancelled" || orderStatus === "canceled") {
      purchaseData.canceled_at = now;
      purchaseData.cancellation_reason = "Customer cancelled subscription";
      purchaseData.cancellation_type = "customer_request";
    } else if (orderStatus === "refunded") {
      purchaseData.refunded_at = now;
      purchaseData.refund_amount = payload.order_amount;
      purchaseData.refund_reason = "Order refunded";
    } else if (orderStatus === "chargeback") {
      purchaseData.chargeback_date = now;
      purchaseData.chargeback_reason = "Payment disputed by customer";
    }

    if (existingPurchase) {
      // Atualizar registro existente
      const { error: updateError } = await admin
        .from("kiwify_purchases")
        .update(purchaseData)
        .eq("id", existingPurchase.id);

      if (updateError) {
        console.error("Erro ao atualizar compra:", updateError);
      } else {
        console.log("Compra atualizada com status de cancelamento");
      }
    } else {
      // Criar novo registro
      purchaseData.purchased_at = now;
      const { error: insertError } = await admin
        .from("kiwify_purchases")
        .insert(purchaseData);

      if (insertError) {
        console.error("Erro ao inserir compra:", insertError);
      } else {
        console.log("Compra registrada com status de cancelamento");
      }
    }

    // 4. Retornar sucesso
    console.log(`✅ Cancelamento processado para pedido ${payload.order_id}`);
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Access revoked successfully",
        user_id: userId,
        order_status: orderStatus,
        access_revoked: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Erro ao revogar acesso:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to revoke access",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}
