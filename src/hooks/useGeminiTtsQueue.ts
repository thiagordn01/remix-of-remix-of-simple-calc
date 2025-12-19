import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { GeminiTtsJob, JobLog } from "@/types/geminiTts";
import { buildGeminiApiUrl, GEMINI_TTS_MODEL } from "@/utils/geminiTtsConfig";
import { convertPcmToWav } from "@/utils/pcmToWav";
import { convertWavToMp3 } from "@/utils/wavToMp3";
import { decodeToBuffer, concatAudioBuffers, audioBufferToWav } from "@/utils/audioUtils";
import { useGeminiTtsKeys } from "@/hooks/useGeminiTtsKeys";
import { splitTextForGeminiTts, countWords } from "@/utils/geminiTtsChunks";

// ✅ CORREÇÃO: Lock global por requisição individual (não apenas por job)
// Garante que mesma API key não processe múltiplas requisições simultaneamente
const ACTIVE_REQUESTS = new Map<string, string>(); // keyId -> requestId (jobId:chunkIndex)

/**
 * Tenta adquirir lock para usar uma API key em uma requisição específica
 * @returns true se conseguiu lock, false se key já está em uso
 */
function tryAcquireKeyLock(keyId: string, requestId: string): boolean {
  if (ACTIVE_REQUESTS.has(keyId)) {
    const currentRequest = ACTIVE_REQUESTS.get(keyId);
    console.log(`   🔒 Key ${keyId.slice(0,8)} já está processando requisição: ${currentRequest}`);
    return false;
  }
  ACTIVE_REQUESTS.set(keyId, requestId);
  console.log(`   🔓 Lock adquirido: Key ${keyId.slice(0,8)} → ${requestId}`);
  return true;
}

/**
 * Libera lock de uma API key
 */
function releaseKeyLock(keyId: string, requestId: string): void {
  const currentRequest = ACTIVE_REQUESTS.get(keyId);
  if (currentRequest === requestId) {
    ACTIVE_REQUESTS.delete(keyId);
    console.log(`   ✅ Lock liberado: Key ${keyId.slice(0,8)} (era ${requestId})`);
  }
}

// Função auxiliar para atualizar um job específico de forma segura
const updateJobState = (
  setJobs: React.Dispatch<React.SetStateAction<GeminiTtsJob[]>>,
  jobId: string,
  updates: Partial<GeminiTtsJob>,
) => {
  setJobs((prevJobs) => prevJobs.map((j) => (j.id === jobId ? { ...j, ...updates } : j)));
};

/**
 * Adiciona um log ao job
 * ✅ OTIMIZADO: Usa batching implícito do React 18
 */
const addJobLog = (
  setJobs: React.Dispatch<React.SetStateAction<GeminiTtsJob[]>>,
  jobId: string,
  type: JobLog['type'],
  message: string,
  chunkIndex?: number
) => {
  try {
    setJobs((prevJobs) => {
      const updatedJobs = prevJobs.map((j) => {
        if (j.id !== jobId) return j;

        const log: JobLog = {
          timestamp: Date.now(),
          type,
          message,
          chunkIndex
        };

        const currentLogs = j.progressDetails?.logs || [];

        // Limitar a 50 logs para evitar memory leak
        const updatedLogs = [...currentLogs, log].slice(-50);

        // Console log para debug (remover em produção)
        console.log(`[LOG ${type.toUpperCase()}] ${message}`);

        // ✅ CORREÇÃO: Garantir que progressDetails sempre exista
        return {
          ...j,
          progressDetails: {
            phase: j.progressDetails?.phase || 'generating',
            phaseProgress: j.progressDetails?.phaseProgress || 0,
            currentChunkTotal: j.progressDetails?.currentChunkTotal || j.chunks.length,
            startTime: j.progressDetails?.startTime || Date.now(),
            chunkTimes: j.progressDetails?.chunkTimes || [],
            logs: updatedLogs,
            ...(j.progressDetails || {})
          }
        };
      });

      return updatedJobs;
    });
  } catch (error) {
    console.error('Erro ao adicionar log:', error);
  }
};

export function useGeminiTtsQueue(maxConcurrentJobs = 2) {
  const [jobs, setJobs] = useState<GeminiTtsJob[]>([]);
  const { toast } = useToast();
  const activeJobsCount = useRef(0);
  const queue = useRef<string[]>([]);
  const { 
    apiKeys, 
    getNextValidKey, 
    markKeyUsed, 
    markKeyNoCredits,
    reserveKeyForJob,
    releaseKeyFromJob
  } = useGeminiTtsKeys();

  // ADD THIS REF TO HOLD THE LATEST JOBS STATE
  const jobsRef = useRef(jobs);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const processQueue = useCallback(async () => {
    if (activeJobsCount.current >= maxConcurrentJobs || queue.current.length === 0) {
      return;
    }

    const jobIdToProcess = queue.current.shift();
    if (!jobIdToProcess) return;

    // --- THIS IS THE FIX ---
    // Find the job using the ref, which is always up-to-date, instead of the async setter pattern
    const jobToProcess = jobsRef.current.find((j) => j.id === jobIdToProcess);

    if (!jobToProcess) {
      console.error(`[QUEUE] Job ${jobIdToProcess} não encontrado. Pode ter sido removido.`);
      // Não recoloca na fila para evitar loops infinitos se o job foi deletado.
      return;
    }

    activeJobsCount.current++;

    // Reservar key EXCLUSIVA para este job
    console.log(`🚀 Iniciando job ${jobToProcess.filename} (${jobToProcess.chunks.length} chunks)`);

    // ✅ LOG: Job iniciado
    addJobLog(setJobs, jobToProcess.id, 'info', `Iniciando processamento de ${jobToProcess.chunks.length} chunks`);

    const dedicatedKey = getNextValidKey([], jobToProcess.id);

    if (!dedicatedKey) {
      console.error(`❌ [JOB ${jobToProcess.id.slice(0,8)}] Nenhuma key disponível. Jobs em andamento: ${activeJobsCount.current - 1}`);
      
      updateJobState(setJobs, jobToProcess.id, { 
        status: "error", 
        error: `Todas as API keys estão em uso. Aguarde ${activeJobsCount.current - 1} job(s) em andamento terminarem.` 
      });
      
      toast({
        title: "Aguardando API keys",
        description: `Job "${jobToProcess.filename}" na fila. ${activeJobsCount.current - 1} jobs processando.`,
        variant: "default",
      });
      
      activeJobsCount.current--;
      processQueue();
      return;
    }

    reserveKeyForJob(dedicatedKey.id, jobToProcess.id);

    updateJobState(setJobs, jobToProcess.id, {
      status: "processing",
      progress: 5,
      currentApiKeyId: dedicatedKey.id,
      progressDetails: {
        ...jobToProcess.progressDetails!,
        phase: 'generating',
        phaseProgress: 0,
        currentApiKeyLabel: dedicatedKey.label
      }
    });

    // ### INÍCIO DA CORREÇÃO PRINCIPAL ###

    const generatedAudioChunks: (Blob | null)[] = new Array(jobToProcess.chunks.length).fill(null);

    const processChunkWithRetry = async (
      chunkIndex: number,
      currentRetry: number = 0,
      failedKeyIds: string[] = [],
      rateLimitedKeys: Map<string, number> = new Map(), // ✅ NOVO: Rastrear keys com 429 e quando ficam disponíveis
      chunkStartTime: number = Date.now() // ✅ NOVO: Rastrear tempo total do chunk
    ): Promise<Blob> => {
      const chunk = jobToProcess!.chunks[chunkIndex];
      const totalChunks = jobToProcess!.chunks.length;
      const requestId = `${jobToProcess!.id.slice(0,8)}:chunk${chunkIndex}`;

      // ✅ LOG: Início do retry
      if (currentRetry > 0) {
        console.log(`\n🔁 [RETRY ${currentRetry}] Chunk ${chunkIndex + 1} - Elapsed: ${Math.floor((Date.now() - chunkStartTime) / 1000)}s`);
      }

      // ✅ TIMEOUT GLOBAL: Máximo 10 minutos por chunk
      const MAX_CHUNK_TIME_MS = 10 * 60 * 1000; // 10 minutos
      const elapsedTime = Date.now() - chunkStartTime;
      if (elapsedTime > MAX_CHUNK_TIME_MS) {
        const elapsedMinutes = Math.floor(elapsedTime / 60000);
        throw new Error(
          `⏱️ TIMEOUT: Chunk ${chunkIndex + 1} ultrapassou limite de ${MAX_CHUNK_TIME_MS / 60000} minutos ` +
          `(tentou por ${elapsedMinutes} minutos). Todas as APIs podem estar com rate limit prolongado.`
        );
      }

      // Calcular max retries baseado em APIs DISPONÍVEIS (não reservadas e ativas)
      const totalActiveKeys = apiKeys.filter(k =>
        k.isActive &&
        k.status !== 'suspended' &&
        k.status !== 'no_credits'
      ).length;

      // ✅ CORREÇÃO: Limitar retries para evitar loop infinito (máximo 20 tentativas)
      const MAX_CHUNK_RETRIES = Math.min(Math.max(totalActiveKeys * 2, 5), 20);

      // ✅ CORREÇÃO: Buscar key que NÃO esteja com lock ativo
      let apiKeyObj = null;
      let selectedKeyId: string | null = null;

      // Buscar todas as keys disponíveis (excluindo falhadas, reservadas e em rate limit)
      const now = Date.now();
      const availableKeys = apiKeys.filter(k =>
        k.isActive &&
        k.status !== 'suspended' &&
        k.status !== 'no_credits' &&
        k.status !== 'invalid' &&
        !failedKeyIds.includes(k.id) &&
        // ✅ NOVO: Excluir keys que ainda estão em cooldown
        (!rateLimitedKeys.has(k.id) || rateLimitedKeys.get(k.id)! <= now)
      );

      // Tentar adquirir lock em uma key disponível
      for (const key of availableKeys) {
        if (tryAcquireKeyLock(key.id, requestId)) {
          apiKeyObj = key;
          selectedKeyId = key.id;
          break;
        }
      }

      if (!apiKeyObj || !selectedKeyId) {
        // ✅ CRÍTICO: Se não encontrou key, verificar se há keys em cooldown
        const totalKeys = apiKeys.filter(k => k.isActive).length;
        const keysInCooldown = apiKeys.filter(k =>
          k.isActive &&
          rateLimitedKeys.has(k.id) &&
          rateLimitedKeys.get(k.id)! > now &&
          !failedKeyIds.includes(k.id) // Excluir keys que falharam permanentemente
        ).length;
        const keysFailed = failedKeyIds.length;

        console.log(`⚠️ [RETRY ${currentRetry + 1}] Nenhuma key disponível - Total: ${totalKeys}, Cooldown: ${keysInCooldown}, Falhadas: ${keysFailed}`);

        if (keysInCooldown > 0) {
          // ✅ HÁ KEYS EM COOLDOWN - AGUARDAR ATÉ A PRÓXIMA FICAR DISPONÍVEL
          const nextAvailable = Math.min(
            ...Array.from(rateLimitedKeys.values()).filter(t => t > now)
          );
          const waitMs = nextAvailable - now;
          const waitSec = Math.ceil(waitMs / 1000);

          console.warn(`⏸️ TODAS as ${keysInCooldown} keys em cooldown! Aguardando ${waitSec}s até próxima ficar disponível...`);

          addJobLog(setJobs, jobToProcess.id, 'warning',
            `⏸️ Aguardando ${waitSec}s até próxima API ficar disponível...`,
            chunkIndex
          );

          // ⏱️ PROFILING: Marcar início da espera
          const waitStartTime = Date.now();
          console.log(`   ⏱️ [${new Date().toLocaleTimeString()}] Iniciando espera de ${waitSec}s por cooldown...`);

          // ✅ AGUARDAR + margem de 1s
          await new Promise(resolve => setTimeout(resolve, waitMs + 1000));

          const actualWaitTime = Date.now() - waitStartTime;
          console.log(`   ⏱️ Espera concluída: ${(actualWaitTime / 1000).toFixed(1)}s`);

          // ✅ LIMPAR keys que saíram do cooldown
          const nowAfterWait = Date.now();
          let keysCleared = 0;
          for (const [keyId, availableAt] of rateLimitedKeys.entries()) {
            if (availableAt <= nowAfterWait) {
              rateLimitedKeys.delete(keyId);
              keysCleared++;
              console.log(`✅ Key ${keyId.slice(0, 8)} saiu do cooldown`);
            }
          }

          console.log(`✅ ${keysCleared} key(s) disponível(is) novamente. Tentando retry...`);

          // ✅ FAZER RETRY (não lançar erro, apenas tentar novamente)
          return processChunkWithRetry(chunkIndex, currentRetry, failedKeyIds, rateLimitedKeys, chunkStartTime);
        }

        // ✅ SEM KEYS EM COOLDOWN = Todas falharam permanentemente
        const errorMsg = `❌ Nenhuma API key disponível - Total: ${totalKeys}, Falhadas: ${keysFailed}. ` +
          `Todas as keys disponíveis falharam. Adicione mais API keys ou verifique as configurações.`;

        addJobLog(setJobs, jobToProcess.id, 'error', errorMsg, chunkIndex);
        throw new Error(errorMsg);
      }

      // Log apenas a cada 5 chunks para reduzir bloqueio de UI
      if (chunkIndex % 5 === 0 || currentRetry > 0) {
        console.log(`🔄 Chunk ${chunkIndex + 1}/${totalChunks} | Tentativa ${currentRetry + 1}`);
      }

      updateJobState(setJobs, jobToProcess!.id, {
        currentChunk: chunkIndex,
        progress: Math.floor(((chunkIndex + 0.25) / totalChunks) * 100),
        currentApiKeyId: apiKeyObj.id,
      });

      try {
        const apiUrl = buildGeminiApiUrl(apiKeyObj.key);

        const chunkWords = countWords(chunk);
        console.log(`   ⏳ Chunk ${chunkIndex + 1}/${jobToProcess!.chunks.length}: Requisitando ${chunkWords} palavras para Gemini TTS...`);

        const requestBody = {
          model: GEMINI_TTS_MODEL,
          contents: [{ parts: [{ text: chunk }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: jobToProcess!.voiceName } },
            },
          },
        };

        // ⏱️ PROFILING: Medir tempo de resposta da API Gemini
        const apiStartTime = Date.now();
        console.log(`   ⏱️ [${new Date().toLocaleTimeString()}] Enviando requisição para Gemini...`);

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const apiResponseTime = Date.now() - apiStartTime;
        console.log(`   ⏱️ API Gemini respondeu em ${(apiResponseTime / 1000).toFixed(2)}s (${apiResponseTime}ms)`);

        if (response.status === 429 || response.status === 402 || response.status === 403) {
          const errorMsg = `API Error ${response.status}`;

          console.warn(`⚠️ Key "${apiKeyObj.label}" falhou - Status ${response.status}`);

          // ✅ NOVO: Para erro 429, parsear RetryInfo do Google
          if (response.status === 429) {
            try {
              const errorData = await response.json();
              const retryInfo = errorData.error?.details?.find((d: any) =>
                d['@type']?.includes('RetryInfo')
              );

              let retryDelaySeconds = 60; // Padrão: 60 segundos
              if (retryInfo?.retryDelay) {
                const match = retryInfo.retryDelay.match(/(\d+)/);
                if (match) {
                  retryDelaySeconds = parseInt(match[1], 10);
                }
              }

              const availableAt = Date.now() + (retryDelaySeconds * 1000);
              rateLimitedKeys.set(selectedKeyId!, availableAt);

              console.log(`⏸️ Key "${apiKeyObj.label}" em cooldown por ${retryDelaySeconds}s (disponível às ${new Date(availableAt).toLocaleTimeString()})`);
              addJobLog(setJobs, jobToProcess.id, 'warning',
                `API "${apiKeyObj.label}" atingiu rate limit - aguardando ${retryDelaySeconds}s`,
                chunkIndex
              );
            } catch (e) {
              // Se falhar ao parsear, usar 60s padrão
              rateLimitedKeys.set(selectedKeyId!, Date.now() + 60000);
            }
          } else {
            // 402/403: sem créditos ou suspensa
            markKeyNoCredits(apiKeyObj.id);
            const updatedFailedKeys = [...failedKeyIds, selectedKeyId!];

            // ✅ LIBERAR LOCK antes de retry
            releaseKeyLock(selectedKeyId!, requestId);

            if (currentRetry < MAX_CHUNK_RETRIES) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              return processChunkWithRetry(chunkIndex, currentRetry + 1, updatedFailedKeys, rateLimitedKeys, chunkStartTime);
            }

            throw new Error(`${errorMsg} - Todas as ${updatedFailedKeys.length} keys testadas falharam.`);
          }

          // ✅ LIBERAR LOCK antes de retry
          releaseKeyLock(selectedKeyId!, requestId);

          // ✅ FAZER RETRY - A lógica de "aguardar todas em cooldown" já está na linha 245-290
          // quando tentamos pegar uma nova key
          if (currentRetry < MAX_CHUNK_RETRIES) {
            console.log(`🔄 Retry ${currentRetry + 1}/${MAX_CHUNK_RETRIES} após 429 da key "${apiKeyObj.label}"`);
            // ⏱️ Aguardando 1s antes de tentar próxima key (dar tempo para rate limit registrar)
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return processChunkWithRetry(chunkIndex, currentRetry + 1, failedKeyIds, rateLimitedKeys, chunkStartTime);
          }

          throw new Error(`Rate Limit: Atingiu máximo de ${MAX_CHUNK_RETRIES} tentativas. Todas as keys podem estar em rate limit.`);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Erro ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        markKeyUsed(apiKeyObj.id);

        // ⏱️ PROFILING: Medir parse do JSON
        const parseStartTime = Date.now();
        const result = await response.json();
        const parseTime = Date.now() - parseStartTime;
        console.log(`   ⏱️ Parse JSON: ${parseTime}ms`);

        const audioPart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (!audioPart?.inlineData?.data) {
          throw new Error("Nenhum áudio recebido da API.");
        }

        // ✅ LOG: Tamanho do base64 recebido da API
        const base64Size = audioPart.inlineData.data.length;
        const base64SizeKB = (base64Size / 1024).toFixed(2);
        console.log(`      ✅ Resposta recebida: ${base64Size} chars base64 (${base64SizeKB} KB) - MimeType: ${audioPart.inlineData.mimeType}`);
        addJobLog(setJobs, jobToProcess.id, 'info', `API respondeu: ${base64SizeKB} KB base64`, chunkIndex);

        // ⏱️ PROFILING: Medir conversão PCM to WAV
        const conversionStartTime = Date.now();
        const wavBytes = convertPcmToWav(audioPart.inlineData.data, audioPart.inlineData.mimeType);
        const conversionTime = Date.now() - conversionStartTime;

        if (wavBytes.length === 0) throw new Error("Falha ao converter áudio.");

        const wavSizeMB = (wavBytes.length / (1024 * 1024)).toFixed(2);
        console.log(`      ✅ WAV convertido: ${wavBytes.length} bytes (${wavSizeMB} MB) em ${conversionTime}ms`);
        addJobLog(setJobs, jobToProcess.id, 'success', `WAV gerado: ${wavSizeMB} MB`, chunkIndex);

        // ✅ SUCESSO: Liberar lock e retornar blob
        releaseKeyLock(selectedKeyId!, requestId);
        return new Blob([wavBytes] as BlobPart[], { type: "audio/wav" });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const isKeyError = errorMsg.includes('429') || errorMsg.includes('402') || errorMsg.includes('403');

        // ✅ GARANTIR que lock seja liberado em caso de erro
        releaseKeyLock(selectedKeyId!, requestId);

        if (isKeyError && currentRetry < MAX_CHUNK_RETRIES) {
          const updatedFailedKeys = failedKeyIds.includes(selectedKeyId!)
            ? failedKeyIds
            : [...failedKeyIds, selectedKeyId!];

          await new Promise((resolve) => setTimeout(resolve, 2000));
          return processChunkWithRetry(chunkIndex, currentRetry + 1, updatedFailedKeys, rateLimitedKeys, chunkStartTime);
        }

        if (currentRetry < MAX_CHUNK_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return processChunkWithRetry(chunkIndex, currentRetry + 1, failedKeyIds, rateLimitedKeys, chunkStartTime);
        }

        throw error;
      }
    };

    try {
      // ✅ CORREÇÃO: Processar chunks SEQUENCIALMENTE e refazer IMEDIATAMENTE se falhar
      console.log(`🔄 [JOB ${jobToProcess.id.slice(0,8)}] Iniciando processamento de ${jobToProcess.chunks.length} chunks`);

      for (let i = 0; i < jobToProcess.chunks.length; i++) {
        const chunkWordCount = countWords(jobToProcess.chunks[i]);
        const chunkStartTime = Date.now();
        console.log(`\n📝 [CHUNK ${i + 1}/${jobToProcess.chunks.length}] Processando (${chunkWordCount} palavras)`);

        // ✅ LOG: Iniciando chunk
        addJobLog(setJobs, jobToProcess.id, 'info', `Processando chunk ${i + 1}/${jobToProcess.chunks.length} (${chunkWordCount} palavras)`, i);

        let chunkSuccess = false;
        let lastChunkError = null;

        // ✅ CORREÇÃO: Tentar gerar chunk com retry agressivo (até 5 tentativas)
        const MAX_CHUNK_ATTEMPTS = 5;

        for (let attempt = 1; attempt <= MAX_CHUNK_ATTEMPTS && !chunkSuccess; attempt++) {
          try {
            console.log(`   🔄 Tentativa ${attempt}/${MAX_CHUNK_ATTEMPTS} para chunk ${i + 1}`);

            // ✅ LOG: Tentativa
            if (attempt > 1) {
              addJobLog(setJobs, jobToProcess.id, 'warning', `Retry ${attempt}/${MAX_CHUNK_ATTEMPTS} para chunk ${i + 1}`, i);
            }

            // ✅ ATUALIZAR: Progresso detalhado com tentativa atual
            updateJobState(setJobs, jobToProcess.id, {
              currentChunk: i,
              progressDetails: {
                ...jobToProcess.progressDetails!,
                currentChunkAttempt: attempt,
                phaseProgress: Math.floor(((i + (attempt - 1) / MAX_CHUNK_ATTEMPTS) / jobToProcess.chunks.length) * 100)
              }
            });

            // Resetar lista de keys falhadas a cada nova tentativa (permite reusar keys)
            const wavBlob = await processChunkWithRetry(i, 0, []);
            generatedAudioChunks[i] = wavBlob;
            chunkSuccess = true;

            const chunkElapsedTime = Date.now() - chunkStartTime;
            console.log(`\n   ✅ ═══════════════════════════════════════════════════`);
            console.log(`   ✅ Chunk ${i + 1}/${jobToProcess.chunks.length} CONCLUÍDO`);
            console.log(`   ✅ Tempo total: ${(chunkElapsedTime / 1000).toFixed(2)}s`);
            console.log(`   ✅ Palavras: ${chunkWordCount} | Tentativas: ${attempt}`);
            console.log(`   ✅ ═══════════════════════════════════════════════════\n`);

            // ✅ LOG: Chunk concluído
            addJobLog(setJobs, jobToProcess.id, 'success', `Chunk ${i + 1} concluído: ${(chunkElapsedTime / 1000).toFixed(1)}s (${chunkWordCount} palavras)`, i);

            // Calcular tempo estimado restante
            const currentChunkTimes = jobToProcess.progressDetails?.chunkTimes || [];
            const updatedChunkTimes = [...currentChunkTimes, chunkElapsedTime];
            const avgChunkTime = updatedChunkTimes.reduce((a, b) => a + b, 0) / updatedChunkTimes.length;
            const remainingChunks = jobToProcess.chunks.length - (i + 1);
            const estimatedTimeRemaining = Math.ceil((avgChunkTime * remainingChunks) / 1000);

            // Atualizar progresso
            updateJobState(setJobs, jobToProcess.id, {
              progress: Math.floor(((i + 1) / jobToProcess.chunks.length) * 90), // 0-90%
              failedChunks: [],
              progressDetails: {
                ...jobToProcess.progressDetails!,
                chunkTimes: updatedChunkTimes,
                estimatedTimeRemaining,
                phaseProgress: Math.floor(((i + 1) / jobToProcess.chunks.length) * 100)
              }
            });

            // ✅ YIELD: Deixa UI respirar entre chunks
            await new Promise(resolve => setTimeout(resolve, 0));

          } catch (chunkError: any) {
            lastChunkError = chunkError;
            console.warn(`   ⚠️ Chunk ${i + 1} falhou na tentativa ${attempt}: ${chunkError.message}`);

            // ✅ LOG: Erro na chunk
            addJobLog(setJobs, jobToProcess.id, 'warning', `Chunk ${i + 1} falhou (tentativa ${attempt}): ${chunkError.message}`, i);

            // Adicionar delay progressivo entre tentativas (backoff exponencial)
            if (attempt < MAX_CHUNK_ATTEMPTS) {
              const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s, 5s, 5s
              console.log(`   ⏳ Aguardando ${delayMs}ms antes de tentar novamente...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
        }

        // ✅ CORREÇÃO CRÍTICA: Se chunk falhou após todas tentativas, PARAR IMEDIATAMENTE
        if (!chunkSuccess) {
          const errorMsg = `❌ FALHA CRÍTICA: Chunk ${i + 1}/${jobToProcess.chunks.length} falhou após ${MAX_CHUNK_ATTEMPTS} tentativas. Erro: ${lastChunkError?.message || 'Desconhecido'}`;
          console.error(errorMsg);

          // ✅ LOG: Falha crítica
          addJobLog(setJobs, jobToProcess.id, 'error', errorMsg, i);

          updateJobState(setJobs, jobToProcess.id, {
            failedChunks: [i],
            currentChunk: i,
          });

          throw new Error(errorMsg);
        }
      }

      console.log(`\n✅ [JOB ${jobToProcess.id.slice(0,8)}] Todas as ${jobToProcess.chunks.length} chunks foram geradas com sucesso!`);

      // ✅ LOG: Todas chunks geradas
      addJobLog(setJobs, jobToProcess.id, 'success', `Todas as ${jobToProcess.chunks.length} chunks geradas com sucesso!`);

      // ✅ VALIDAÇÃO CRÍTICA: Verificar integridade ANTES de concatenar
      console.log(`\n🔍 [VALIDAÇÃO] Verificando integridade dos ${jobToProcess.chunks.length} chunks...`);

      // ✅ ATUALIZAR: Fase de validação
      updateJobState(setJobs, jobToProcess.id, {
        progressDetails: {
          ...jobToProcess.progressDetails!,
          phase: 'validating',
          phaseProgress: 0
        }
      });

      addJobLog(setJobs, jobToProcess.id, 'info', 'Validando integridade dos chunks...');

      // Validação 1: Nenhum chunk pode ser null
      const nullChunks = generatedAudioChunks
        .map((chunk, idx) => chunk === null ? idx : -1)
        .filter(idx => idx !== -1);

      if (nullChunks.length > 0) {
        throw new Error(`❌ ERRO CRÍTICO: ${nullChunks.length} chunk(s) estão null: [${nullChunks.join(', ')}]`);
      }

      // Validação 2: Todos os chunks devem ter tamanho > 0
      const emptyChunks = generatedAudioChunks
        .map((chunk, idx) => (chunk && chunk.size === 0) ? idx : -1)
        .filter(idx => idx !== -1);

      if (emptyChunks.length > 0) {
        throw new Error(`❌ ERRO CRÍTICO: ${emptyChunks.length} chunk(s) estão vazios: [${emptyChunks.join(', ')}]`);
      }

      // Validação 3: Verificar ordem sequencial (índices 0, 1, 2, ...)
      for (let i = 0; i < generatedAudioChunks.length; i++) {
        if (!generatedAudioChunks[i]) {
          throw new Error(`❌ ERRO CRÍTICO: Chunk ${i} está faltando na sequência!`);
        }
      }

      console.log(`✅ [VALIDAÇÃO] Todos os ${jobToProcess.chunks.length} chunks estão íntegros e na ordem correta!`);

      // ✅ LOG: Validação concluída
      addJobLog(setJobs, jobToProcess.id, 'success', 'Validação concluída: todos os chunks íntegros');

      updateJobState(setJobs, jobToProcess.id, {
        progress: 90,
        status: "processing",
        progressDetails: {
          ...jobToProcess.progressDetails!,
          phase: 'concatenating',
          phaseProgress: 0
        }
      });

      // ✅ SINCRONIZAÇÃO: Usar array original para manter ordem EXATA
      const orderedChunks = generatedAudioChunks as Blob[];
      console.log(`\n🔗 [CONCATENAÇÃO] Iniciando concatenação de ${orderedChunks.length} chunks...`);

      // ✅ LOG: Iniciando concatenação
      addJobLog(setJobs, jobToProcess.id, 'info', `Concatenando ${orderedChunks.length} chunks de áudio...`);

      // 1. Converter Blobs para ArrayBuffers (mantendo ordem)
      console.log(`🔄 [CONVERSÃO] Convertendo ${orderedChunks.length} Blobs → ArrayBuffers...`);
      const arrayBuffers: ArrayBuffer[] = [];
      for (let idx = 0; idx < orderedChunks.length; idx++) {
        const arrayBuffer = await orderedChunks[idx].arrayBuffer();
        const sizeMB = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(2);
        console.log(`   📦 Chunk ${idx + 1}/${orderedChunks.length}: ${arrayBuffer.byteLength} bytes (${sizeMB} MB)`);
        addJobLog(setJobs, jobToProcess.id, 'info', `Chunk ${idx + 1} blob: ${sizeMB} MB`, idx);

        arrayBuffers.push(arrayBuffer);

        // ✅ YIELD a cada 3 chunks para não travar UI
        if (idx % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      console.log(`✅ [CONVERSÃO] ${arrayBuffers.length} ArrayBuffers prontos!`);

      // 2. Decodificar para AudioBuffers
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffers: AudioBuffer[] = [];

      try {
        console.log(`📊 [DECODIFICAÇÃO] Decodificando ${arrayBuffers.length} WAV files...`);
        addJobLog(setJobs, jobToProcess.id, 'info', `Decodificando ${arrayBuffers.length} chunks de áudio...`);

        for (let index = 0; index < arrayBuffers.length; index++) {
          const decoded = await decodeToBuffer(arrayBuffers[index], audioContext);

          // ✅ LOG CRÍTICO: Duração individual de cada chunk ANTES da concatenação
          const chunkWords = countWords(jobToProcess.chunks[index]);
          const durationSeconds = decoded.duration.toFixed(2);
          const durationMinutes = (decoded.duration / 60).toFixed(2);
          console.log(`   📝 Chunk ${index + 1}/${arrayBuffers.length}: ${durationSeconds}s (${durationMinutes} min) - ${chunkWords} palavras`);
          addJobLog(setJobs, jobToProcess.id, 'info', `Chunk ${index + 1}: ${durationSeconds}s (${durationMinutes} min) - ${chunkWords} palavras`, index);

          audioBuffers.push(decoded);

          // ✅ VALIDAÇÃO: Verificar sample rate consistente
          if (index === 0) {
            console.log(`   Sample Rate: ${decoded.sampleRate} Hz, Canais: ${decoded.numberOfChannels}, Duração: ${decoded.duration.toFixed(2)}s`);
          } else {
            const firstSampleRate = audioBuffers[0].sampleRate;
            if (decoded.sampleRate !== firstSampleRate) {
              throw new Error(`❌ ERRO DE SINCRONIZAÇÃO: Chunk ${index} tem sample rate ${decoded.sampleRate} Hz, mas chunk 0 tem ${firstSampleRate} Hz!`);
            }
          }

          // ✅ YIELD a cada 2 chunks
          if (index % 2 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        console.log(`✅ [DECODIFICAÇÃO] ${audioBuffers.length} chunks decodificados com sucesso!`);

        // ✅ LOG: Decodificação concluída
        addJobLog(setJobs, jobToProcess.id, 'success', `${audioBuffers.length} chunks decodificados`);

        // 3. Concatenar AudioBuffers (com normalização RMS automática)
        console.log(`🔗 [CONCATENAÇÃO] Concatenando e normalizando volumes...`);
        addJobLog(setJobs, jobToProcess.id, 'info', 'Normalizando volumes e concatenando...');

        const concatenatedBuffer = concatAudioBuffers(audioBuffers);
        const totalDurationSeconds = concatenatedBuffer.duration.toFixed(2);
        const totalDurationMinutes = (concatenatedBuffer.duration / 60).toFixed(2);

        console.log(`✅ [CONCATENAÇÃO] Áudio final: ${totalDurationSeconds}s (${totalDurationMinutes} min) @ ${concatenatedBuffer.sampleRate} Hz`);

        // ✅ LOG: Concatenação concluída
        addJobLog(setJobs, jobToProcess.id, 'success', `Áudio concatenado: ${totalDurationSeconds}s (${totalDurationMinutes} min)`);

        // ✅ YIELD antes de conversão pesada
        await new Promise(resolve => setTimeout(resolve, 0));

        // 4. Re-encodar para WAV
        console.log(`🔄 [ENCODING] Convertendo AudioBuffer → WAV...`);

        // ✅ ATUALIZAR: Fase de encoding
        updateJobState(setJobs, jobToProcess.id, {
          progressDetails: {
            ...jobToProcess.progressDetails!,
            phase: 'encoding',
            phaseProgress: 0
          }
        });

        addJobLog(setJobs, jobToProcess.id, 'info', 'Encoding para WAV...');

        const wavArrayBuffer = audioBufferToWav(concatenatedBuffer);
        const finalWavBlob = new Blob([wavArrayBuffer], { type: "audio/wav" });
        console.log(`✅ [WAV] Arquivo WAV gerado: ${(finalWavBlob.size / 1024 / 1024).toFixed(2)} MB`);

        // ✅ LOG: WAV gerado
        addJobLog(setJobs, jobToProcess.id, 'success', `WAV gerado: ${(finalWavBlob.size / 1024 / 1024).toFixed(2)} MB`);

        updateJobState(setJobs, jobToProcess.id, { progress: 95 });

        // ✅ YIELD antes de MP3 (conversão mais pesada)
        await new Promise(resolve => setTimeout(resolve, 0));

        // 5. Converter para MP3
        console.log(`🎵 [MP3] Convertendo WAV → MP3 (128 kbps)...`);

        // ✅ ATUALIZAR: Fase de conversão MP3
        updateJobState(setJobs, jobToProcess.id, {
          progressDetails: {
            ...jobToProcess.progressDetails!,
            phase: 'converting',
            phaseProgress: 0
          }
        });

        addJobLog(setJobs, jobToProcess.id, 'info', 'Convertendo para MP3 (128 kbps)...');

        const mp3Blob = await convertWavToMp3(finalWavBlob);
        const mp3SizeMB = (mp3Blob.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ [MP3] Arquivo MP3 gerado: ${mp3SizeMB} MB`);

        const audioUrl = URL.createObjectURL(mp3Blob);
        console.log(`🎉 [SUCESSO] Áudio completo disponível!`);

        // ✅ LOG: MP3 gerado e job completo
        addJobLog(setJobs, jobToProcess.id, 'success', `MP3 gerado: ${(mp3Blob.size / 1024 / 1024).toFixed(2)} MB`);

        updateJobState(setJobs, jobToProcess.id, {
          status: "done",
          audioUrl,
          progress: 100,
        });

        toast({
          title: "✅ Áudio gerado com sucesso!",
          description: `${jobToProcess.filename} - ${totalDurationMinutes} min (${jobToProcess.chunks.length} chunks concatenados)`,
          variant: "default",
        });

      } catch (concatError: any) {
        throw new Error(`Falha ao concatenar áudio: ${concatError.message}`);
      } finally {
        // ✅ IMPORTANTE: Fechar AudioContext para liberar memória
        if (audioContext) {
          await audioContext.close();
        }
      }
    } catch (error: any) {
      console.error(`❌ Job ${jobToProcess.filename} falhou: ${error.message}`);
      updateJobState(setJobs, jobToProcess.id, { status: "error", error: error.message });
    } finally {
      // Liberar key reservada
      if (jobToProcess.currentApiKeyId) {
        releaseKeyFromJob(jobToProcess.currentApiKeyId, jobToProcess.id);
      }

      activeJobsCount.current--;
      processQueue();
    }
  }, [maxConcurrentJobs, toast, apiKeys, getNextValidKey, markKeyUsed, markKeyNoCredits]);

  const addJob = useCallback(
    (
      jobDetails: Omit<
        GeminiTtsJob,
        "id" | "status" | "progress" | "chunks" | "audioChunks" | "failedChunks" | "chunkRetries"
      >,
    ) => {
      const chunks = splitTextForGeminiTts(jobDetails.text);

      const newJob: GeminiTtsJob = {
        id: crypto.randomUUID(),
        status: "queued",
        progress: 0,
        chunks,
        audioChunks: new Array(chunks.length).fill(null),
        failedChunks: [],
        chunkRetries: {},
        ...jobDetails,
        filename: jobDetails.filename || `audio_${Date.now()}`,
        // ✅ NOVO: Inicializar progresso detalhado
        progressDetails: {
          phase: 'chunking',
          phaseProgress: 0,
          currentChunkTotal: chunks.length,
          startTime: Date.now(),
          chunkTimes: [],
          logs: [{
            timestamp: Date.now(),
            type: 'info',
            message: `Job criado com ${chunks.length} chunks (${countWords(jobDetails.text)} palavras total)`
          }]
        }
      };

      setJobs((prev) => [...prev, newJob]);
      queue.current.push(newJob.id);
      // REMOVED: setTimeout(processQueue, 0); to prevent race conditions
      return newJob.id;
    },
    [],
  );

  useEffect(() => {
    // Tenta iniciar um novo job da fila sempre que a lista de jobs mudar
    // (por exemplo, quando um job é adicionado)
    processQueue();
  }, [jobs, processQueue]);

  const removeJob = (id: string) => {
    const jobToRemove = jobs.find(j => j.id === id);

    // ✅ Não permitir remover job em processamento (previne crash)
    if (jobToRemove?.status === "processing") {
      toast({
        title: "Não é possível remover",
        description: "Aguarde o job terminar antes de remover",
        variant: "destructive",
      });
      return;
    }

    // ✅ Revogar Blob URL antes de remover para evitar memory leak
    if (jobToRemove?.audioUrl) {
      URL.revokeObjectURL(jobToRemove.audioUrl);
    }

    setJobs((prev) => prev.filter((j) => j.id !== id));
    queue.current = queue.current.filter((jobId) => jobId !== id);
  };

  const clearCompletedJobs = () => {
    // ✅ Revogar Blob URLs ANTES de remover para evitar memory leak
    jobs.forEach(job => {
      if ((job.status === "done" || job.status === "error") && job.audioUrl) {
        URL.revokeObjectURL(job.audioUrl);
      }
    });

    setJobs((prev) => prev.filter((j) => j.status !== "done" && j.status !== "error"));
  };

  return { jobs, addJob, removeJob, clearCompletedJobs };
}
