import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: "Missing code" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Validate requester is authenticated
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const userId = userData.user.id;

    // Use service role to bypass RLS for controlled updates
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: invite, error: inviteErr } = await admin
      .from("invites")
      .select("id, code, max_uses, used_count, expires_at, used_by_user_id")
      .eq("code", code)
      .maybeSingle();

    if (inviteErr || !invite) {
      return new Response(JSON.stringify({ error: "Invalid invite" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Validations
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Invite expired" }), { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (invite.max_uses !== null && invite.used_count >= invite.max_uses) {
      return new Response(JSON.stringify({ error: "Invite limit reached" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    // Verificar se o convite de uso único já foi usado
    if (invite.max_uses === 1 && invite.used_by_user_id) {
      return new Response(JSON.stringify({ error: "Invite already used" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Approve user profile (create if needed)
    const { error: upsertErr } = await admin.from("profiles").upsert({ id: userId, is_approved: true }).eq("id", userId);
    if (upsertErr) {
      console.error("profiles upsert error", upsertErr);
      return new Response(JSON.stringify({ error: "Failed to approve profile" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Increment usage and register user who used the invite
    const updateData: any = { used_count: (invite.used_count || 0) + 1 };
    if (invite.max_uses === 1) {
      updateData.used_by_user_id = userId;
    }

    const { error: updateInviteErr } = await admin
      .from("invites")
      .update(updateData)
      .eq("id", invite.id);
    if (updateInviteErr) {
      console.error("invite update error", updateInviteErr);
      // Not fatal for user approval; continue
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    console.error("accept-invite error", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});