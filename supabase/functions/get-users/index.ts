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
    // Validate requester is authenticated and is master
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is master
    const { data: isMasterData, error: isMasterErr } = await authClient.rpc("is_master");
    if (isMasterErr || !isMasterData) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Master access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role to get user data
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get profiles
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, name, is_approved, created_at, access_expires_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch profiles" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get auth users to get emails
    const { data: authUsersData, error: authUsersError } = await admin.auth.admin.listUsers();

    if (authUsersError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch user emails" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Merge profiles with emails
    const usersWithEmails = profiles.map((profile) => {
      const authUser = authUsersData.users.find((u) => u.id === profile.id);
      let daysRemaining: number | null = null;

      if (profile.access_expires_at) {
        const expirationDate = new Date(profile.access_expires_at);
        const now = new Date();
        const diffTime = expirationDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...profile,
        email: authUser?.email || "N/A",
        days_remaining: daysRemaining,
      };
    });

    return new Response(
      JSON.stringify({ users: usersWithEmails }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e) {
    console.error("get-users error:", e);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
