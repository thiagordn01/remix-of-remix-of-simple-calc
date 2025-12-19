// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: Proxy to DeepSeek API
// Handles CORS for browser requests

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function corsHeaders(origin?: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-deepseek-api-key",
  };
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || undefined;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
    );
  }

  try {
    const body = await req.json();
    const apiKey = req.headers.get("x-deepseek-api-key");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key. Send it in x-deepseek-api-key header." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
      );
    }

    // Forward request to DeepSeek API
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(origin),
      },
    });
  } catch (err: any) {
    console.error("DeepSeek proxy error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
    );
  }
});
