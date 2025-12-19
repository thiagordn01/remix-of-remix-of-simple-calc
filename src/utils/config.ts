export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVneXdxa3FyZ2lmYXV0YXNpbmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTgzMDQsImV4cCI6MjA3MDQzNDMwNH0.smPS5HEF2m8P_Wan9mbCByctJidBDQd6uoNGzYFGAx0";

export type EndpointConfig = {
  url: string;
  label: string;
  type: "supabase" | "workers";
  cooldownUntil?: number;
};

export const ENDPOINTS: EndpointConfig[] = [
  {
    url: "https://egywqkqrgifautasinhi.supabase.co/functions/v1/openai-fm-proxy",
    label: "Servidor A",
    type: "supabase"
  },
  {
    url: "https://egywqkqrgifautasinhi.supabase.co/functions/v1/worker1-proxy",
    label: "Servidor B",
    type: "supabase"
  },
  {
    url: "https://egywqkqrgifautasinhi.supabase.co/functions/v1/worker2-proxy",
    label: "Servidor C",
    type: "supabase"
  },
  {
    url: "https://egywqkqrgifautasinhi.supabase.co/functions/v1/worker3-proxy",
    label: "Servidor D",
    type: "supabase"
  },
  {
    url: "https://egywqkqrgifautasinhi.supabase.co/functions/v1/worker4-proxy",
    label: "Servidor E",
    type: "supabase"
  },
  {
    url: "https://egywqkqrgifautasinhi.supabase.co/functions/v1/worker5-proxy",
    label: "Servidor F",
    type: "supabase"
  },
  {
    url: "https://egywqkqrgifautasinhi.supabase.co/functions/v1/worker6-proxy",
    label: "Servidor G",
    type: "supabase"
  },
  {
    url: "https://egywqkqrgifautasinhi.supabase.co/functions/v1/worker7-proxy",
    label: "Servidor H",
    type: "supabase"
  },
  {
    url: "https://egywqkqrgifautasinhi.supabase.co/functions/v1/worker8-proxy",
    label: "Servidor I",
    type: "supabase"
  },
  {
    url: "https://egywqkqrgifautasinhi.supabase.co/functions/v1/worker9-proxy",
    label: "Servidor J",
    type: "supabase"
  }
];
