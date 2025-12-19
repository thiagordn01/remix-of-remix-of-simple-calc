// deno-lint-ignore-file no-explicit-any
// DEPLOY VERSION: 2.0 - Force redeploy with detailed logging
// Supabase Edge Function: Proxy to Cloudflare Worker 6 (dawn-water-27a4)
// Mirrors openai-fm-proxy behavior, only upstream URL differs

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function corsHeaders(origin?: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range, referer, user-agent, sec-ch-ua, sec-ch-ua-platform, sec-ch-ua-mobile",
  };
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || undefined;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }

  try {
    const { input, prompt, voice, generation } = await req.json();
    
    console.log(`[worker6-proxy] 📥 Requisição recebida:`, { 
      inputLength: input?.length, 
      prompt: prompt?.substring(0, 50), 
      voice, 
      generation 
    });
    
    if (!input || !prompt || !voice) {
      console.error(`[worker6-proxy] ❌ Campos obrigatórios faltando`);
      return new Response(
        JSON.stringify({ error: "Missing required fields: input, prompt, voice" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
      );
    }

    const gen = generation || crypto.randomUUID();
    const url = new URL("https://dawn-water-27a4.ouroferrero008.workers.dev/");
    url.searchParams.set("input", input);
    url.searchParams.set("prompt", prompt);
    url.searchParams.set("voice", voice);
    url.searchParams.set("generation", gen);

    console.log(`[worker6-proxy] 🚀 Chamando Worker:`, url.toString());

    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "sec-ch-ua-platform": '"Windows"',
        Referer: "https://www.openai.fm/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        Range: "bytes=0-",
        "sec-ch-ua-mobile": "?0",
      },
    });

    console.log(`[worker6-proxy] 📊 Status do Worker: ${upstream.status}`);
    console.log(`[worker6-proxy] 📋 Headers:`, Object.fromEntries(upstream.headers.entries()));

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error(`[worker6-proxy] ❌ Worker retornou erro ${upstream.status}:`, errorText);
      return new Response(JSON.stringify({ 
        error: `Worker error: ${upstream.status}`, 
        details: errorText,
        url: url.toString()
      }), {
        status: upstream.status,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const contentType = upstream.headers.get("content-type") || "audio/mpeg";
    const range = upstream.headers.get("content-range");

    const headers: Record<string, string> = {
      ...corsHeaders(origin),
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    };
    if (range) headers["Content-Range"] = range;

    console.log(`[worker6-proxy] ✅ Sucesso! Retornando ${contentType}`);

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (err: any) {
    console.error("worker6-proxy error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }
});
