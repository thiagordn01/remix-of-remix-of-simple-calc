import { useCallback, useMemo, useRef, useState } from "react";
import { splitIntoChunks } from "@/utils/chunkText";
import { SUPABASE_ANON_KEY, ENDPOINTS, type EndpointConfig } from "@/utils/config";
import { useUserTracking } from "./useUserTracking";

export type AudioJob = {
  id: string;
  text: string;
  prompt: string; // already language-augmented
  voice: string;
  language: string;
  endpoint: string;
  label?: string;
  filename?: string;
  status: "queued" | "processing" | "done" | "error";
  progress: number; // 0..100
  error?: string;
  finalUrl?: string;
  retryAttempts: number;
  maxRetries: number;
  currentEndpointIndex: number;
  chunkRetryInfo?: { chunkIndex: number, attempts: number, endpoint: string }[];
};

type AddJobInput = {
  text: string;
  prompt: string; // pass with buildPromptWithAccent already applied
  voice: string;
  language: string;
  endpoint: string;
  label?: string;
  filename?: string;
  initialEndpointIndex: number;
};

function needsSupabaseAuth(url: string) {
  return url.includes("supabase.co/functions");
}

function getTimeoutForAttempt(attempt: number): number {
  const baseTimeout = 30000; // 30s
  return Math.min(baseTimeout * Math.pow(1.5, attempt - 1), 120000); // Max 2min
}

function getRetryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt - 1), 16000); // 1s, 2s, 4s, 8s, 16s
}

function getAvailableEndpoint(currentIndex: number): EndpointConfig {
  const availableEndpoints = ENDPOINTS.filter(ep => 
    !ep.cooldownUntil || ep.cooldownUntil < Date.now()
  );
  
  console.log(`🔄 [ENDPOINT] Buscando endpoint disponível (atual: ${ENDPOINTS[currentIndex]?.label})`);
  console.log(`📊 [ENDPOINT] ${availableEndpoints.length}/${ENDPOINTS.length} servidores disponíveis`);
  
  if (availableEndpoints.length === 0) {
    console.warn('⚠️ [ENDPOINT] Todos em cooldown, usando próximo na sequência');
    return ENDPOINTS[(currentIndex + 1) % ENDPOINTS.length];
  }
  
  // Tenta usar o endpoint atual se disponível
  const currentEndpoint = ENDPOINTS[currentIndex];
  if (availableEndpoints.includes(currentEndpoint)) {
    console.log(`✅ [ENDPOINT] Usando ${currentEndpoint.label} (conforme planejado)`);
    return currentEndpoint;
  }
  
  // Senão, pega o próximo disponível
  console.log(`⏭️ [ENDPOINT] ${currentEndpoint.label} indisponível, usando ${availableEndpoints[0].label}`);
  return availableEndpoints[0];
}

async function fetchChunkWithRetry(
  chunkText: string,
  body: any,
  job: AudioJob,
  chunkIndex: number,
  onProgress: (info: { attempts: number, endpoint: string }) => void
): Promise<ArrayBuffer> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= job.maxRetries; attempt++) {
    const endpoint = getAvailableEndpoint(job.currentEndpointIndex);
    const timeoutMs = getTimeoutForAttempt(attempt);
    
    onProgress({ attempts: attempt, endpoint: endpoint.label });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      console.log(`[Chunk ${chunkIndex + 1}] 🎯 Tentativa ${attempt}/${job.maxRetries}`);
      console.log(`           └─ Servidor: ${endpoint.label} (índice ${job.currentEndpointIndex})`);
      console.log(`           └─ URL: ${endpoint.url}`);
      
      let res: Response;
      
      if (needsSupabaseAuth(endpoint.url)) {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        };
        
        res = await fetch(endpoint.url, {
          method: "POST",
          headers,
          body: JSON.stringify({ ...body, input: chunkText }),
          signal: controller.signal,
        });
      } else {
        const url = new URL(endpoint.url);
        url.searchParams.set("input", chunkText);
        url.searchParams.set("prompt", body.prompt);
        url.searchParams.set("voice", body.voice);
        url.searchParams.set("generation", body.generation || crypto.randomUUID());
        
        res = await fetch(url.toString(), { 
          method: "GET",
          signal: controller.signal 
        });
      }
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const status = res.status;
        
        // Rate limit - aguardar antes de tentar
        if (status === 429) {
          const retryAfter = res.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : getRetryDelay(attempt);
          console.log(`[Chunk ${chunkIndex + 1}] Rate limited, aguardando ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Server errors - marcar endpoint como problemático temporariamente
        if (status >= 500) {
          endpoint.cooldownUntil = Date.now() + 30000; // 30s cooldown
          job.currentEndpointIndex = (job.currentEndpointIndex + 1) % ENDPOINTS.length;
        }
        
        // Client errors (exceto 429) - falhar imediatamente
        if (status >= 400 && status < 500 && status !== 429) {
          throw new Error(`Erro ${status}: ${res.statusText}`);
        }
        
        throw new Error(`Falha na requisição (${status}): ${res.statusText}`);
      }
      
      const arrayBuffer = await res.arrayBuffer();
      console.log(`[Chunk ${chunkIndex + 1}] Sucesso com ${endpoint.label}`);
      return arrayBuffer;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
      
      console.log(`[Chunk ${chunkIndex + 1}] Erro na tentativa ${attempt}: ${error.message}`);
      
      // Se não é a última tentativa, aguardar antes de tentar novamente
      if (attempt < job.maxRetries) {
        job.currentEndpointIndex = (job.currentEndpointIndex + 1) % ENDPOINTS.length;
        const delay = getRetryDelay(attempt);
        console.log(`[Chunk ${chunkIndex + 1}] Aguardando ${delay}ms antes da próxima tentativa`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Falha após ${job.maxRetries} tentativas: ${lastError?.message || 'Erro desconhecido'}`);
}

export function useAudioQueue(concurrency = 3) {
  const [jobs, setJobs] = useState<AudioJob[]>([]);
  const queueRef = useRef<AudioJob[]>([]);
  const activeCountRef = useRef(0);
  const { logActivity } = useUserTracking();

  const updateJob = useCallback((id: string, patch: Partial<AudioJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const startNext = useCallback(() => {
    if (activeCountRef.current >= concurrency) return;
    const next = queueRef.current.shift();
    if (!next) return;
    activeCountRef.current += 1;
    updateJob(next.id, { status: "processing", retryAttempts: 0, chunkRetryInfo: [] });

    (async () => {
      try {
        const chunks = splitIntoChunks(next.text, 140);
        const parts: ArrayBuffer[] = new Array(chunks.length); // Array com slots reservados
        
        // Processar chunks sequencialmente para preservar ordem
        for (let i = 0; i < chunks.length; i++) {
          let chunkProgress = { attempts: 0, endpoint: '' };
          
          const onChunkProgress = (info: { attempts: number, endpoint: string }) => {
            chunkProgress = info;
            const progressText = `Processando chunk ${i + 1}/${chunks.length} (tentativa ${info.attempts}/${next.maxRetries} - ${info.endpoint})`;
            
            // Atualizar informações de retry
            const newRetryInfo = [...(next.chunkRetryInfo || [])];
            const existingIndex = newRetryInfo.findIndex(item => item.chunkIndex === i);
            if (existingIndex >= 0) {
              newRetryInfo[existingIndex] = { chunkIndex: i, attempts: info.attempts, endpoint: info.endpoint };
            } else {
              newRetryInfo.push({ chunkIndex: i, attempts: info.attempts, endpoint: info.endpoint });
            }
            
            updateJob(next.id, { 
              retryAttempts: Math.max(next.retryAttempts, info.attempts),
              chunkRetryInfo: newRetryInfo,
              error: progressText // Usar campo error temporariamente para mostrar progresso
            });
          };
          
          const arrayBuffer = await fetchChunkWithRetry(
            chunks[i],
            {
              prompt: next.prompt,
              voice: next.voice,
              generation: crypto.randomUUID(),
            },
            next,
            i,
            onChunkProgress
          );
          
          parts[i] = arrayBuffer; // Garantir ordem correta
          
          const pct = Math.round(((i + 1) / chunks.length) * 100);
          updateJob(next.id, { 
            progress: pct,
            error: undefined // Limpar mensagem de progresso
          });
        }
        
        const blob = new Blob(parts, { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        updateJob(next.id, { 
          finalUrl: url, 
          status: "done", 
          progress: 100,
          error: undefined
        });
        
        // Log audio generation activity
        logActivity('audio_generated', window.location.pathname, {
          textLength: next.text.length,
          language: next.language,
          voice: next.voice,
          chunksCount: parts.length,
          retryAttempts: next.retryAttempts
        });
        
        console.log(`[Job ${next.id}] Concluído com sucesso após ${next.retryAttempts} tentativas máximas`);
        
      } catch (e: any) {
        console.error(`[Job ${next.id}] Falha final:`, e);
        updateJob(next.id, { 
          status: "error", 
          error: e?.message || "Erro desconhecido após todas as tentativas"
        });
      } finally {
        activeCountRef.current -= 1;
        startNext();
      }
    })();
  }, [concurrency, updateJob]);

  const addJob = useCallback((input: AddJobInput) => {
    const id = crypto.randomUUID();
    const job: AudioJob = {
      id,
      text: input.text,
      prompt: input.prompt, // já com idioma
      voice: input.voice,
      language: input.language,
      endpoint: input.endpoint,
      label: input.label,
      filename: input.filename,
      status: "queued",
      progress: 0,
      retryAttempts: 0,
      maxRetries: 10,
      currentEndpointIndex: input.initialEndpointIndex,
      chunkRetryInfo: [],
    };
    setJobs((prev) => [job, ...prev]);
    queueRef.current.push(job);
    // tentar iniciar imediatamente se houver vaga
    startNext();
    return id;
  }, [startNext]);

  return { jobs, addJob } as const;
}
