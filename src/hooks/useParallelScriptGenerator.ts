import { useState, useCallback, useRef, useEffect } from 'react';
import { useGeminiKeys } from './useGeminiKeys';
import { Agent } from '@/types/agents';
import { GeminiApiKey, AIProvider } from '@/types/scripts';
import { enhancedGeminiService } from '../services/enhancedGeminiApi';
import { puterDeepseekService } from '../services/puterDeepseekService';
import { replacePlaceholders } from '../utils/placeholderUtils';
import { getLanguageFromTitleOrDefault, detectLanguageFromTitle } from '../utils/languageDetection';
import { ScriptGenerationRequest, ScriptGenerationProgress } from '@/types/scripts';
import { 
  injectPremiseContext, 
  buildChunkPrompt, 
  buildMinimalChunkPrompt, 
  extractSemanticAnchors, 
  detectParagraphDuplication, 
  sanitizeScript, 
  extractLastParagraph,
  buildEmergencyPrompt,
  formatParagraphsForNarration
} from '@/utils/promptInjector';
import { validateChunk, findNaturalCutPoint } from '@/utils/chunkValidation';

// ✅ FLAG PARA A/B TESTING: Sistema "Prompt Invisível" vs Sistema Antigo
// Mudar para true para ativar o novo sistema minimalista
const USE_MINIMAL_PROMPT = true;

export interface GenerationJob {
  id: string;
  title: string;
  agentId: string;
  provider: AIProvider; // Provider de IA (gemini ou deepseek)
  status: 'pending' | 'generating_premise' | 'generating_script' | 'completed' | 'error';
  progress: number;
  premise?: string;
  script?: string;
  wordCount?: number;
  error?: string;
  retryCount: number;
  startTime: Date;
  endTime?: Date;
  currentStage?: 'premise' | 'script';
  currentChunk?: number;
  totalChunks?: number;
  logs?: string[];
  apiStats?: { [apiId: string]: { failures: number, lastFailure?: Date, available: boolean } };
  usedApiIds?: string[]; // ✅ NOVO: rastrear APIs já usadas neste job
  apiRotationOffset?: number; // ✅ NOVO: offset de rotação para este job
}

export const useParallelScriptGenerator = (agents: Agent[]) => {
  const { getActiveApiKeys } = useGeminiKeys();
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [currentProvider, setCurrentProvider] = useState<AIProvider>('gemini');
  const [concurrentLimit, setConcurrentLimit] = useState(() => {
    const saved = localStorage.getItem('script_concurrent_limit');
    return saved ? parseInt(saved) : 1; // Padrão 1
  });
  const activeJobCount = useRef(0);
  const jobQueue = useRef<string[]>([]);
  const jobsRef = useRef<GenerationJob[]>([]);
  
  // ✅ NOVO: Pool global de APIs em uso por outros jobs ativos (API única por processo)
  const globalApisInUse = useRef<Set<string>>(new Set());

  // Persistir preferência do limite paralelo no localStorage
  useEffect(() => {
    localStorage.setItem('script_concurrent_limit', concurrentLimit.toString());
    console.log(`💾 Limite paralelo salvo: ${concurrentLimit}`);
  }, [concurrentLimit]);

  // Sincronizar jobsRef com jobs
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  // Função para rotacionar APIs por job (cada job começa com uma API diferente)
  const rotateApisForJob = useCallback((apis: GeminiApiKey[], jobId: string): GeminiApiKey[] => {
    if (apis.length === 0) return [];
    
    // Usa o ID do job como seed para determinar o offset
    const hash = jobId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offset = hash % apis.length;
    
    // Rotaciona o array baseado no offset
    return [...apis.slice(offset), ...apis.slice(0, offset)];
  }, []);

  const updateJob = useCallback((jobId: string, updates: Partial<GenerationJob>) => {
    setJobs(prev => prev.map(job => (job.id === jobId ? { ...job, ...updates } : job)));
  }, []);

  const addLog = useCallback((jobId: string, message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, logs: [...(job.logs || []), logMessage] }
        : job
    ));
  }, []);

  // ✅ NOVO: Função para filtrar APIs não usadas para um job específico
  // Retorna { apis: GeminiApiKey[], poolWasReset: boolean }
  const getUnusedApisForJob = useCallback((job: GenerationJob, allApis: GeminiApiKey[]): { apis: GeminiApiKey[], poolWasReset: boolean } => {
    if (!job.usedApiIds || job.usedApiIds.length === 0) {
      return { apis: rotateApisForJob(allApis, job.id), poolWasReset: false };
    }

    const unusedApis = allApis.filter(api => !job.usedApiIds!.includes(api.id));

    if (unusedApis.length === 0) {
      addLog(job.id, '⚠️ Todas as APIs foram usadas neste job, reiniciando pool');

      // ✅ CORREÇÃO CRÍTICA: Quando resetar o pool de usedApiIds, TAMBÉM limpar globalApisInUse
      // Caso contrário, reserveApisForJob filtra TODAS as APIs e retorna array vazio!
      if (job.usedApiIds && job.usedApiIds.length > 0) {
        job.usedApiIds.forEach(apiId => {
          globalApisInUse.current.delete(apiId);
        });
        console.log(`🔄 [${job.id}] Pool resetado: ${job.usedApiIds.length} APIs liberadas de globalApisInUse`);
      }

      return { apis: rotateApisForJob(allApis, job.id), poolWasReset: true };
    }

    return { apis: unusedApis, poolWasReset: false };
  }, [rotateApisForJob, addLog]);

  // ✅ NOVO: Função helper para liberar TODAS as APIs de um job do pool global
  const releaseJobApisFromGlobalPool = useCallback((jobId: string) => {
    const job = jobsRef.current.find(j => j.id === jobId);
    if (job?.usedApiIds && job.usedApiIds.length > 0) {
      job.usedApiIds.forEach(apiId => {
        globalApisInUse.current.delete(apiId);
      });
      console.log(`🔓 [${jobId}] ${job.usedApiIds.length} APIs liberadas do pool global`);
      return job.usedApiIds.length;
    }
    return 0;
  }, []);

  // ✅ NOVO: Função para reservar APIs exclusivas para um job (API única por processo)
  // Retorna { apis: GeminiApiKey[], poolWasReset: boolean }
  const reserveApisForJob = useCallback((job: GenerationJob, allApis: GeminiApiKey[]): { apis: GeminiApiKey[], poolWasReset: boolean } => {
    const { apis: unusedApis, poolWasReset } = getUnusedApisForJob(job, allApis);

    // Filtrar por APIs não em uso por outros jobs e disponíveis no serviço
    let availableForJob = unusedApis.filter(api => !globalApisInUse.current.has(api.id));
    availableForJob = availableForJob.filter(api => enhancedGeminiService.isKeyAvailable(api.id));

    if (availableForJob.length === 0) {
      return { apis: [], poolWasReset };
    }

    return { apis: availableForJob, poolWasReset };
  }, [getUnusedApisForJob]);

  const processJob = useCallback(async (jobId: string) => {
    console.log('🔍 ProcessJob chamado para:', jobId);
    
    const job = jobsRef.current.find(j => j.id === jobId);
    if (!job) {
      console.error('❌ Job não encontrado:', jobId);
      return;
    }

    console.log('✅ Job encontrado:', job.title);

    const agent = agents.find(a => a.id === job.agentId);
    if (!agent) {
      console.error('❌ Agente não encontrado:', job.agentId);
      updateJob(jobId, { 
        status: 'error', 
        error: 'Agente não encontrado',
        progress: 0
      });
      return;
    }

    console.log('✅ Agente encontrado:', agent.name);

    // SEMPRE usar idioma configurado pelo usuário (NUNCA detectar automaticamente)
    const detectedLanguage = agent.language || 'pt-BR';

    addLog(jobId, `🔍 Idioma configurado: ${detectedLanguage}`);

    // Função para capturar logs do serviço
    const onProgress = (message: string) => {
      addLog(jobId, message);
    };

    try {
      addLog(jobId, `🚀 Iniciando geração para: "${job.title}" (Tentativa ${job.retryCount + 1})`);
      addLog(jobId, `🤖 Usando agente: ${agent.name}`);
      addLog(jobId, `🌐 Idioma: ${detectedLanguage}`);
      addLog(jobId, `🔧 Provider: ${job.provider}`);

      // Verificar disponibilidade baseado no provider
      const activeApis = getActiveApiKeys();

      if (job.provider === 'deepseek') {
        // Para DeepSeek, verificar Puter.js
        if (!puterDeepseekService.isAvailable()) {
          const available = await puterDeepseekService.waitForPuter(5000);
          if (!available) {
            throw new Error('Puter.js nao esta disponivel. Recarregue a pagina.');
          }
        }
        // Garantir autenticacao
        const authenticated = await puterDeepseekService.ensureAuthenticated();
        if (!authenticated) {
          throw new Error('Faca login no Puter na aba APIs > DeepSeek para usar gratuitamente.');
        }
        addLog(jobId, `✅ DeepSeek (Puter.js) conectado`);
      } else {
        // Para Gemini, verificar API keys
        if (!activeApis.length) {
          throw new Error('Nenhuma API Gemini ativa disponivel');
        }
      }

      // ✅ CORREÇÃO: Lógica de reserva de APIs só para Gemini
      let availableApisForJob: typeof activeApis = [];

      if (job.provider === 'gemini') {
        // ✅ Reservar APIs exclusivas para este job (apenas Gemini)
        let reserveResult = reserveApisForJob(job, activeApis);
        availableApisForJob = reserveResult.apis;

        // ✅ CORREÇÃO: Se pool foi resetado, atualizar usedApiIds do job
        if (reserveResult.poolWasReset) {
          updateJob(jobId, { usedApiIds: [] });
          addLog(jobId, `🔄 Pool de APIs do job foi resetado`);
        }

        // ✅ CORREÇÃO: Espera inteligente se não há APIs disponíveis
        if (availableApisForJob.length === 0) {
          const allApiIds = activeApis.map(api => api.id);
          const shortestCooldown = enhancedGeminiService.getShortestCooldownMs(allApiIds);

          if (shortestCooldown !== null && shortestCooldown > 0 && shortestCooldown < 60000) {
            // Se há cooldown razoável (< 60s), aguardar
            const waitSeconds = Math.ceil(shortestCooldown / 1000);
            addLog(jobId, `⏸️ Aguardando ${waitSeconds}s até próxima API ficar disponível...`);
            await new Promise(resolve => setTimeout(resolve, shortestCooldown));
            // Tentar novamente após espera inteligente
            reserveResult = reserveApisForJob(job, getActiveApiKeys());
            availableApisForJob = reserveResult.apis;
            if (reserveResult.poolWasReset) {
              updateJob(jobId, { usedApiIds: [] });
            }
          }

          // Se ainda não há APIs, lançar erro para retry
          if (availableApisForJob.length === 0) {
            addLog(jobId, `⏸️ Job pausado: sem APIs disponíveis no momento`);
            throw new Error('Sem APIs disponíveis no momento, tentando novamente...');
          }
        }

        addLog(jobId, `🔧 APIs totais disponíveis: ${activeApis.length}`);
        addLog(jobId, `✅ APIs exclusivas para este job: ${availableApisForJob.length}`);
        if (job.usedApiIds && job.usedApiIds.length > 0) {
          addLog(jobId, `📊 APIs já usadas: ${job.usedApiIds.length}`);
        }

        // FASE 3: Logar keys bloqueadas
        const blockedApis = activeApis.filter(api => !enhancedGeminiService.isKeyAvailable(api.id));
        if (blockedApis.length > 0) {
          addLog(jobId, `🔒 APIs bloqueadas: ${blockedApis.length}`);
          blockedApis.forEach(api => {
            const reason = enhancedGeminiService.getKeyBlockReason(api.id);
            if (reason) {
              addLog(jobId, `   - ${api.name}: ${reason}`);
            } else if (enhancedGeminiService.isKeyExhausted(api.id)) {
              addLog(jobId, `   - ${api.name}: Exaurida (RPD)`);
            } else if (enhancedGeminiService.isKeyInCooldown(api.id)) {
              addLog(jobId, `   - ${api.name}: Cooldown (RPM)`);
            }
          });
        }

        // ✅ NOVO: Estimativa pré-job
        const estimatedDuration = agent.duration || 10;
        const targetWordsTotal = estimatedDuration * 150;
        const premiseRequests = 1;
        const scriptRequests = targetWordsTotal > 1500
          ? Math.ceil(targetWordsTotal / 1000)
          : 1;
        const estimatedRequests = premiseRequests + scriptRequests;

        const riskLevel = estimatedRequests > availableApisForJob.length * 0.5
          ? 'alto'
          : estimatedRequests > availableApisForJob.length * 0.3
            ? 'médio'
            : 'baixo';

        addLog(jobId, `📊 Estimativa: ${estimatedRequests} requisições (1 premissa + ${scriptRequests} chunks). APIs aptas: ${availableApisForJob.length}. Risco: ${riskLevel}`);

        if (riskLevel === 'alto') {
          addLog(jobId, `⚠️ Risco alto de esgotar pool. Considere reduzir gerações simultâneas.`);
        }
      } else {
        // DeepSeek - sem necessidade de reservar APIs (usa Puter.js ilimitado)
        addLog(jobId, `🚀 DeepSeek via Puter.js - sem limite de requisições`);
      }

      // FASE 1: Geração da Premissa (pular se já existir)
      let premise = job.premise;
      
      if (!premise) {
        updateJob(jobId, { 
          status: 'generating_premise', 
          currentStage: 'premise',
          progress: 10 
        });
        
        addLog(jobId, `📝 Iniciando geração de premissa...`);
        
        const premisePromptRaw = replacePlaceholders(agent.premisePrompt || '', {
          title: job.title,
          titulo: job.title,
          channelName: agent.channelName || 'Canal',
          canal: agent.channelName || 'Canal',
          language: detectedLanguage,
          idioma: detectedLanguage,
          location: agent.location || 'Brasil',
          localizacao: agent.location || 'Brasil',
          duration: agent.duration || 10,
          duracao: agent.duration || 10
        });
        
        const premisePrompt = injectPremiseContext(premisePromptRaw, {
          title: job.title,
          channelName: agent.channelName || 'Canal',
          duration: agent.duration || 10,
          language: detectedLanguage,
          location: agent.location || 'Brasil'
        });

        const premiseWordTarget = agent.premiseWordTarget || 500;
        addLog(jobId, `📊 Meta de palavras para premissa: ${premiseWordTarget}`);

        // Gerar premissa usando o provider correto
        const premiseResult = job.provider === 'deepseek'
          ? await puterDeepseekService.generatePremise(
              premisePrompt,
              premiseWordTarget,
              onProgress
            )
          : await enhancedGeminiService.generatePremise(
              premisePrompt,
              availableApisForJob,
              premiseWordTarget,
              onProgress
            );

        premise = premiseResult.content;
        const premiseWordCount = premise.split(/\s+/).length;
        addLog(jobId, `✅ Premissa gerada com sucesso: ${premiseWordCount} palavras`);

        // ✅ NOVO: Registrar API usada e marcar como em uso global
        const currentJob = jobsRef.current.find(j => j.id === jobId);
        const usedApiIds = [...(currentJob?.usedApiIds || []), premiseResult.usedApiId];
        globalApisInUse.current.add(premiseResult.usedApiId); // Marcar como em uso
        
        addLog(jobId, `🔑 API ${premiseResult.usedApiId} usada para premissa. Total de APIs usadas: ${usedApiIds.length}`);

        updateJob(jobId, { 
          premise,
          usedApiIds,
          progress: 30,
          currentStage: 'script'
        });
      } else {
        addLog(jobId, `✓ Usando premissa já gerada, pulando para roteiro`);
        updateJob(jobId, { 
          currentStage: 'script',
          status: 'generating_script'
        });
      }

      // FASE 2: Geração do Roteiro
      updateJob(jobId, { 
        status: 'generating_script',
        progress: premise === job.premise ? job.progress || 35 : 35 
      });

      addLog(jobId, `🎬 Iniciando geração de roteiro...`);

      const scriptPromptProcessed = replacePlaceholders(agent.scriptPrompt || '', {
        title: job.title,
        titulo: job.title,
        premise: premise,
        premissa: premise,
        channelName: agent.channelName || 'Canal',
        canal: agent.channelName || 'Canal',
        language: detectedLanguage,
        idioma: detectedLanguage,
        location: agent.location || 'Brasil',
        localizacao: agent.location || 'Brasil',
        duration: agent.duration || 10,
        duracao: agent.duration || 10
      });

      // Calcular palavras alvo para o roteiro baseado na duração
      const duration = agent.duration || 10; // minutos
      const wordsPerMinute = 150;
      const targetWords = duration * wordsPerMinute;
      
      addLog(jobId, `📊 Meta de palavras para roteiro: ${targetWords} (${duration} min de duração)`);

      let script = job.script || ''; // Preservar script parcial
      let scriptWordCount = script.split(/\s+/).filter(w => w.length > 0).length;
      
      if (targetWords > 1500) { // ✅ NOVO: Threshold aumentado para 1500 palavras
        // Roteiro longo - gerar em chunks de 1000 palavras
        const wordsPerChunk = 1000; // ✅ NOVO: 1000 palavras por chunk
        const numberOfChunks = Math.ceil(targetWords / wordsPerChunk);
        
        updateJob(jobId, { totalChunks: numberOfChunks });

        const startIndex = job.currentChunk ? job.currentChunk : 0;
        
        if (startIndex > 0) {
          addLog(jobId, `🔄 Retomando do chunk ${startIndex + 1}/${numberOfChunks}`);
        } else {
          addLog(jobId, `🔄 Roteiro será gerado em ${numberOfChunks} partes de ~1000 palavras cada`);
        }

        for (let i = startIndex; i < numberOfChunks; i++) {
          const currentJob = jobsRef.current.find(j => j.id === jobId);
          if (!currentJob) throw new Error('Job perdido durante geração');

          // ✅ NOVO: Detectar se é o último chunk
          const isLastChunk = i === numberOfChunks - 1;

          // ✅ NOVO: Aumentar targetWords para o último chunk (2000 palavras)
          const baseChunkWords = Math.min(wordsPerChunk, targetWords - (i * wordsPerChunk));
          const chunkTargetWords = isLastChunk ? 2000 : baseChunkWords;

          updateJob(jobId, {
            currentChunk: i + 1,
            progress: 35 + ((i / numberOfChunks) * 55)
          });

          // ✅ NOVO: Log diferenciado para o último chunk
          if (isLastChunk) {
            addLog(jobId, `🏁 Gerando ÚLTIMO CHUNK e finalizando roteiro (até ${chunkTargetWords} palavras)...`);
          } else {
            addLog(jobId, `📝 Gerando parte ${i + 1}/${numberOfChunks} (${chunkTargetWords} palavras alvo)`);
          }

          // ✅ CORREÇÃO: Lógica de reserva de APIs só para Gemini
          let availableApisForChunk: typeof activeApis = [];

          if (job.provider === 'gemini') {
            // ✅ Reservar APIs exclusivas para este chunk com retry inteligente
            const currentJobForChunk = jobsRef.current.find(j => j.id === jobId);
            if (!currentJobForChunk) throw new Error('Job perdido durante geração de chunk');
            let chunkReserveResult = reserveApisForJob(currentJobForChunk, getActiveApiKeys());
            availableApisForChunk = chunkReserveResult.apis;

            // ✅ CORREÇÃO: Se pool foi resetado, atualizar usedApiIds do job
            if (chunkReserveResult.poolWasReset) {
              updateJob(jobId, { usedApiIds: [] });
              addLog(jobId, `🔄 Pool de APIs do job foi resetado automaticamente`);
            }

            // ✅ CORRIGIDO: Espera inteligente com limite de tentativas e detecção de APIs viáveis
            let waitAttempts = 0;
            const MAX_WAIT_ATTEMPTS = 10;
            let consecutiveNullCooldowns = 0;

            while (availableApisForChunk.length === 0 && waitAttempts < MAX_WAIT_ATTEMPTS) {
              waitAttempts++;

              // ✅ CORREÇÃO: Se é o último chunk e todas APIs foram usadas, resetar pool manualmente
              const allApis = getActiveApiKeys();
              if (isLastChunk && currentJobForChunk.usedApiIds && currentJobForChunk.usedApiIds.length >= allApis.length) {
                addLog(jobId, `🔄 Último chunk: Pool de APIs esgotado, forçando reset`);
                currentJobForChunk.usedApiIds.forEach(apiId => {
                  globalApisInUse.current.delete(apiId);
                });
                updateJob(jobId, { usedApiIds: [] });
                const updatedJob = jobsRef.current.find(j => j.id === jobId);
                if (updatedJob) {
                  chunkReserveResult = reserveApisForJob(updatedJob, allApis);
                  availableApisForChunk = chunkReserveResult.apis;
                  if (availableApisForChunk.length > 0) {
                    addLog(jobId, `✅ ${availableApisForChunk.length} APIs disponíveis após reset forçado`);
                    break;
                  }
                }
              }

              const allApiIds = allApis.map(api => api.id);
              const shortestCooldown = enhancedGeminiService.getShortestCooldownMs(allApiIds);

              if (shortestCooldown !== null && shortestCooldown > 0) {
                consecutiveNullCooldowns = 0;
                const actualWaitMs = Math.min(shortestCooldown, 60000);
                addLog(jobId, `⏸️ APIs em cooldown. Aguardando ${Math.ceil(actualWaitMs/1000)}s... (tentativa ${waitAttempts}/${MAX_WAIT_ATTEMPTS})`);
                await new Promise(resolve => setTimeout(resolve, actualWaitMs + 500));
              } else {
                consecutiveNullCooldowns++;
                if (consecutiveNullCooldowns >= 3) {
                  addLog(jobId, `❌ Nenhuma API com cooldown recuperável detectada após ${consecutiveNullCooldowns} verificações`);
                  break;
                }
                addLog(jobId, `⏸️ Verificando disponibilidade de APIs... (tentativa ${waitAttempts}/${MAX_WAIT_ATTEMPTS})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
              }

              const retryJob = jobsRef.current.find(j => j.id === jobId);
              if (retryJob) {
                chunkReserveResult = reserveApisForJob(retryJob, getActiveApiKeys());
                availableApisForChunk = chunkReserveResult.apis;
                if (chunkReserveResult.poolWasReset) {
                  updateJob(jobId, { usedApiIds: [] });
                }
              }
            }

            // ✅ CORRIGIDO: Mensagem de erro mais clara e informativa
            if (availableApisForChunk.length === 0) {
              const allApis = getActiveApiKeys();
              const allApiIds = allApis.map(api => api.id);

              let availableCount = 0, cooldownCount = 0, exhaustedCount = 0, blockedCount = 0;
              allApiIds.forEach(apiId => {
                if (enhancedGeminiService.isKeyAvailable(apiId)) availableCount++;
                if (enhancedGeminiService.isKeyInCooldown(apiId)) cooldownCount++;
                if (enhancedGeminiService.isKeyExhausted(apiId)) exhaustedCount++;
                if (enhancedGeminiService.getKeyBlockReason(apiId)) blockedCount++;
              });

              addLog(jobId, `❌ Status das ${allApiIds.length} APIs:`);
              addLog(jobId, `   Disponíveis: ${availableCount}, Cooldown: ${cooldownCount}, Exauridas: ${exhaustedCount}, Bloqueadas: ${blockedCount}`);

              if (exhaustedCount > 0) {
                addLog(jobId, `💡 ${exhaustedCount} APIs atingiram limite diário (RPD). Aguarde reset às 00:00 UTC ou adicione mais APIs.`);
              }
              if (blockedCount > 0) {
                addLog(jobId, `💡 ${blockedCount} APIs estão bloqueadas. Verifique se as chaves são válidas no Google AI Studio.`);
              }

              throw new Error(`Nenhuma API disponível. Total: ${allApiIds.length}, Disponíveis: ${availableCount}, Cooldown: ${cooldownCount}, Exauridas: ${exhaustedCount}, Bloqueadas: ${blockedCount}`);
            }
          }
          // DeepSeek não precisa de reserva de APIs - usa Puter.js ilimitado

          // ✅ SISTEMA "PROMPT INVISÍVEL" ou SISTEMA ANTIGO (A/B Testing)
          let chunkPrompt: string;
          
          if (USE_MINIMAL_PROMPT) {
            // ✅ NOVO: Sistema minimalista (~600 chars de sistema vs ~4000)
            const lastParagraph = extractLastParagraph(script);
            const anchors = extractSemanticAnchors(script);
            
            chunkPrompt = buildMinimalChunkPrompt(scriptPromptProcessed, {
              title: job.title,
              language: detectedLanguage,
              targetWords: chunkTargetWords,
              premise: premise,
              chunkIndex: i,
              totalChunks: numberOfChunks,
              lastParagraph: i > 0 ? lastParagraph : undefined,
              anchors: i > 0 ? anchors : undefined
            });
            
            if (i === 0) {
              addLog(jobId, `🆕 Usando sistema "Prompt Invisível" (minimalista)`);
            }
          } else {
            // Sistema antigo (verboso)
            chunkPrompt = buildChunkPrompt(scriptPromptProcessed, {
              title: job.title,
              channelName: agent.channelName || 'Canal',
              duration: agent.duration || 10,
              language: detectedLanguage,
              location: agent.location || 'Brasil',
              premise: premise,
              previousContent: script,
              chunkIndex: i,
              totalChunks: numberOfChunks,
              targetWords: chunkTargetWords,
              isLastChunk: isLastChunk
            });
          }

          const chunkContext = {
            premise,
            previousContent: script,
            chunkIndex: i,
            totalChunks: numberOfChunks,
            targetWords: chunkTargetWords,
            language: detectedLanguage,
            location: agent.location,
            isLastChunk: isLastChunk
          };

          const chunkResult = job.provider === 'deepseek'
            ? await puterDeepseekService.generateScriptChunk(
                chunkPrompt,
                chunkContext,
                onProgress
              )
            : await enhancedGeminiService.generateScriptChunk(
                chunkPrompt,
                availableApisForChunk,
                chunkContext,
                onProgress
              );

          let chunk = chunkResult.content;
          
          // ✅ NOVO: Sanitizar chunk (remover metadados, tags, formatações)
          if (USE_MINIMAL_PROMPT) {
            chunk = sanitizeScript(chunk);
            // ✅ NOVO: Formatar parágrafos para narração (quebrar blocos longos)
            chunk = formatParagraphsForNarration(chunk);
          }
          
          // ✅ NOVO: Registrar API usada e marcar como em uso global
          const currentJobAfterChunk = jobsRef.current.find(j => j.id === jobId);
          const updatedUsedApiIds = [...(currentJobAfterChunk?.usedApiIds || []), chunkResult.usedApiId];
          globalApisInUse.current.add(chunkResult.usedApiId);
          updateJob(jobId, { usedApiIds: updatedUsedApiIds });
          addLog(jobId, `🔑 API ${chunkResult.usedApiId} usada para chunk ${i + 1}. Total de APIs usadas: ${updatedUsedApiIds.length}`);

          // ✅ VALIDAÇÃO: Sistema minimalista usa detectParagraphDuplication, antigo usa validateChunk
          let validation: { isValid: boolean; errors: string[]; warnings: string[]; duplicatedSample?: string };
          
          if (USE_MINIMAL_PROMPT) {
            // Validação com detectParagraphDuplication (pós-geração)
            const duplicationCheck = detectParagraphDuplication(chunk, script);
            const languageValidation = validateChunk(chunk, null, i, undefined, detectedLanguage);
            
            validation = {
              isValid: !duplicationCheck.hasDuplication && languageValidation.errors.filter(e => e.includes('IDIOMA') || e.includes('MISTURA')).length === 0,
              errors: duplicationCheck.hasDuplication 
                ? [`❌ Duplicação de parágrafo detectada`] 
                : languageValidation.errors.filter(e => e.includes('IDIOMA') || e.includes('MISTURA')),
              warnings: languageValidation.warnings,
              duplicatedSample: duplicationCheck.duplicatedText
            };
          } else {
            // Validação antiga (verbosa)
            validation = validateChunk(
              chunk,
              i > 0 ? (script.split('\n\n').slice(-1)[0] || '') : null,
              i,
              script,
              detectedLanguage
            );
          }

          let retryCount = 0;
          while (!validation.isValid && retryCount < 2) {
            addLog(jobId, `⚠️ Chunk ${i + 1} reprovado: ${validation.errors.join(' | ')}`);
            if (validation.duplicatedSample) {
              addLog(jobId, `📄 Trecho duplicado: "${validation.duplicatedSample.slice(0, 100)}..."`);
            }
            addLog(jobId, `🔄 Tentativa ${retryCount + 1}/2 de regeneração`);
            
            // ✅ SISTEMA MINIMALISTA: Usar prompt de emergência
            let retryPrompt: string;
            
            if (USE_MINIMAL_PROMPT) {
              retryPrompt = buildEmergencyPrompt(
                scriptPromptProcessed,
                {
                  title: job.title,
                  language: detectedLanguage,
                  targetWords: chunkTargetWords,
                  premise: premise,
                  chunkIndex: i,
                  totalChunks: numberOfChunks
                },
                validation.duplicatedSample
              );
            } else {
              // Sistema antigo: append de correção
              retryPrompt = chunkPrompt + `

⚠️⚠️⚠️ CORREÇÃO OBRIGATÓRIA ⚠️⚠️⚠️

Na tentativa anterior, você cometeu estes erros:
${validation.errors.join('\n')}

${validation.duplicatedSample ? `
🚫 Você repetiu este trecho que JÁ EXISTE no roteiro:
"${validation.duplicatedSample.slice(0, 200)}..."

ATENÇÃO: Você DEVE escrever conteúdo COMPLETAMENTE NOVO.
NÃO copie, NÃO parafraseie, NÃO recapitule nada que já foi escrito.
` : ''}

CORRIJA estes problemas agora e escreva conteúdo 100% ORIGINAL que AVANÇA a narrativa.`;
            }
            
            const retryResult = await enhancedGeminiService.generateScriptChunk(
              retryPrompt,
              availableApisForChunk,
              {
                premise,
                previousContent: script,
                chunkIndex: i,
                totalChunks: numberOfChunks,
                targetWords: chunkTargetWords,
                language: detectedLanguage,
                location: agent.location
              },
              onProgress
            );
            
            chunk = retryResult.content;
            
            // ✅ Sanitizar retry também
            if (USE_MINIMAL_PROMPT) {
              chunk = sanitizeScript(chunk);
              const duplicationCheck = detectParagraphDuplication(chunk, script);
              validation = {
                isValid: !duplicationCheck.hasDuplication,
                errors: duplicationCheck.hasDuplication ? [`❌ Duplicação ainda presente`] : [],
                warnings: [],
                duplicatedSample: duplicationCheck.duplicatedText
              };
            } else {
              validation = validateChunk(chunk, i > 0 ? (script.split('\n\n').slice(-1)[0] || '') : null, i, script, detectedLanguage);
            }
            retryCount++;
            
            // Registrar API do retry
            const jobAfterRetry = jobsRef.current.find(j => j.id === jobId);
            const retryApiIds = [...(jobAfterRetry?.usedApiIds || []), retryResult.usedApiId];
            globalApisInUse.current.add(retryResult.usedApiId);
            updateJob(jobId, { usedApiIds: retryApiIds });
          }

          // Avisar sobre warnings (mas não bloquear)
          validation.warnings.forEach(warning => addLog(jobId, warning));

          // ✅ NOVO: Aplicar corte inteligente
          chunk = findNaturalCutPoint(chunk, chunkTargetWords);

          // ✅ LOG DETALHADO DO CHUNK
          addLog(jobId, `✅ Chunk ${i + 1} validado e cortado: ${chunk.split(/\s+/).length} palavras`);

          // ✅ NOVO: Remover mini-continuações (exceto no último chunk)
          const trimmedChunk = chunk.trim();
          const endsWithPunctuation = /[.!?]$/.test(trimmedChunk);

          if (!endsWithPunctuation && i === numberOfChunks - 1) {
            // ✅ NOVO: Apenas no ÚLTIMO chunk, para garantir final bem fechado
            addLog(jobId, `⚠️ Último chunk não terminou com pontuação - solicitando complemento final`);
            
            const continuationPrompt = `Complete APENAS a última frase para finalizar o roteiro:

"${trimmedChunk.slice(-150)}"

REGRAS:
- Complete a última frase até o ponto final
- NÃO adicione novas ideias
- Máximo 30 palavras
- Termine com . ! ou ?`;

            try {
              const currentJobForContinuation = jobsRef.current.find(j => j.id === jobId);
              if (!currentJobForContinuation) throw new Error('Job perdido durante continuação');

              // ✅ CORREÇÃO: Usar provider correto para continuação
              if (job.provider === 'deepseek') {
                // DeepSeek - usar Puter.js
                const continuationResult = await puterDeepseekService.generateScriptChunk(
                  continuationPrompt,
                  {
                    premise,
                    previousChunk: trimmedChunk,
                    chunkIndex: i,
                    totalChunks: numberOfChunks,
                    targetWords: 30,
                    language: detectedLanguage,
                    location: agent.location
                  },
                  onProgress
                );

                const continuation = continuationResult.content;
                const finalChunk = trimmedChunk + ' ' + continuation.trim();
                script += (script ? '\n\n' : '') + finalChunk;
                addLog(jobId, `✅ Último chunk completado automaticamente (DeepSeek)`);
              } else {
                // Gemini - usar sistema de reserva de APIs
                const continuationReserveResult = reserveApisForJob(currentJobForContinuation, getActiveApiKeys());
                const availableApisForContinuation = continuationReserveResult.apis;

                if (continuationReserveResult.poolWasReset) {
                  updateJob(jobId, { usedApiIds: [] });
                }

                if (availableApisForContinuation.length > 0) {
                  const continuationResult = await enhancedGeminiService.generateScriptChunk(
                    continuationPrompt,
                    availableApisForContinuation,
                    {
                      premise,
                      previousChunk: trimmedChunk,
                      chunkIndex: i,
                      totalChunks: numberOfChunks,
                      targetWords: 30,
                      language: detectedLanguage,
                      location: agent.location
                    },
                    onProgress
                  );

                  const continuation = continuationResult.content;

                  const currentJobAfterContinuation = jobsRef.current.find(j => j.id === jobId);
                  const updatedUsedApiIdsAfterContinuation = [...(currentJobAfterContinuation?.usedApiIds || []), continuationResult.usedApiId];
                  globalApisInUse.current.add(continuationResult.usedApiId);
                  updateJob(jobId, { usedApiIds: updatedUsedApiIdsAfterContinuation });
                  addLog(jobId, `🔑 API usada para complemento final. Total de APIs usadas: ${updatedUsedApiIdsAfterContinuation.length}`);

                  const finalChunk = trimmedChunk + ' ' + continuation.trim();
                  script += (script ? '\n\n' : '') + finalChunk;
                  addLog(jobId, `✅ Último chunk completado automaticamente`);
                } else {
                  script += (script ? '\n\n' : '') + chunk;
                  addLog(jobId, `⚠️ Sem APIs para complemento, aceitando chunk como está`);
                }
              }
            } catch (error) {
              script += (script ? '\n\n' : '') + chunk;
              addLog(jobId, `⚠️ Falha ao completar último chunk, aceitando como está`);
            }
          } else {
            // ✅ NOVO: Chunks intermediários: aceitar como está (economizar requisições)
            script += (script ? '\n\n' : '') + chunk;
            if (!endsWithPunctuation && i < numberOfChunks - 1) {
              addLog(jobId, `📝 Chunk ${i + 1} aceito sem pontuação final (será continuado no próximo)`);
            }
          }

          scriptWordCount += chunk.split(/\s+/).length;
          
          // Atualizar script progressivamente
          updateJob(jobId, { script });
          
          const chunkWordCount = chunk.split(/\s+/).length;
          addLog(jobId, `✅ Parte ${i + 1}/${numberOfChunks} concluída: ${chunkWordCount} palavras`);
        }
      } else {
        // Roteiro curto/médio (<1500 palavras) - gerar de uma vez
        addLog(jobId, `📝 Gerando roteiro completo em 1 requisição (~${targetWords} palavras)`);

        // ✅ SISTEMA "PROMPT INVISÍVEL" ou SISTEMA ANTIGO (A/B Testing)
        let fullScriptPrompt: string;
        
        if (USE_MINIMAL_PROMPT) {
          fullScriptPrompt = buildMinimalChunkPrompt(scriptPromptProcessed, {
            title: job.title,
            language: detectedLanguage,
            targetWords: targetWords,
            premise: premise,
            chunkIndex: 0,
            totalChunks: 1
          });
          addLog(jobId, `🆕 Usando sistema "Prompt Invisível" (minimalista)`);
        } else {
          fullScriptPrompt = buildChunkPrompt(scriptPromptProcessed, {
            title: job.title,
            channelName: agent.channelName || 'Canal',
            duration: agent.duration || 10,
            language: detectedLanguage,
            location: agent.location || 'Brasil',
            premise: premise,
            previousContent: '',
            chunkIndex: 0,
            totalChunks: 1,
            targetWords: targetWords
          });
        }

        // ✅ CORREÇÃO: Usar provider correto
        if (job.provider === 'deepseek') {
          // DeepSeek - usar Puter.js
          const scriptResult = await puterDeepseekService.generateScriptChunk(
            fullScriptPrompt,
            {
              premise,
              targetWords,
              language: detectedLanguage,
              location: agent.location
            },
            onProgress
          );

          script = scriptResult.content;
          addLog(jobId, `✅ Roteiro completo gerado via DeepSeek (Puter.js)`);
        } else {
          // Gemini - usar sistema de reserva de APIs
          const currentJobForFullScript = jobsRef.current.find(j => j.id === jobId);
          if (!currentJobForFullScript) throw new Error('Job perdido durante geração de roteiro completo');
          let fullScriptReserveResult = reserveApisForJob(currentJobForFullScript, getActiveApiKeys());
          let availableApisForFullScript = fullScriptReserveResult.apis;

          if (fullScriptReserveResult.poolWasReset) {
            updateJob(jobId, { usedApiIds: [] });
          }

          if (availableApisForFullScript.length === 0) {
            const allApis = getActiveApiKeys();
            const allApiIds = allApis.map(api => api.id);
            const shortestCooldown = enhancedGeminiService.getShortestCooldownMs(allApiIds);

            if (shortestCooldown !== null && shortestCooldown > 0 && shortestCooldown < 60000) {
              const waitSeconds = Math.ceil(shortestCooldown / 1000);
              addLog(jobId, `⏸️ Aguardando ${waitSeconds}s até próxima API ficar disponível...`);
              await new Promise(resolve => setTimeout(resolve, shortestCooldown));
              const retryJob = jobsRef.current.find(j => j.id === jobId);
              if (retryJob) {
                fullScriptReserveResult = reserveApisForJob(retryJob, getActiveApiKeys());
                availableApisForFullScript = fullScriptReserveResult.apis;
                if (fullScriptReserveResult.poolWasReset) {
                  updateJob(jobId, { usedApiIds: [] });
                }
              }
            }

            if (availableApisForFullScript.length === 0) {
              addLog(jobId, `⏸️ Sem APIs disponíveis`);
              throw new Error('Sem APIs disponíveis, tentando novamente...');
            }
          }

          const scriptResult = await enhancedGeminiService.generateScriptChunk(
            fullScriptPrompt,
            availableApisForFullScript,
            {
              premise,
              targetWords,
              language: detectedLanguage,
              location: agent.location
            },
            onProgress
          );

          script = scriptResult.content;

          const currentJobAfterFullScript = jobsRef.current.find(j => j.id === jobId);
          const updatedUsedApiIdsForFullScript = [...(currentJobAfterFullScript?.usedApiIds || []), scriptResult.usedApiId];
          globalApisInUse.current.add(scriptResult.usedApiId);
          updateJob(jobId, { usedApiIds: updatedUsedApiIdsForFullScript });
          addLog(jobId, `🔑 API ${scriptResult.usedApiId} usada para roteiro completo. Total de APIs usadas: ${updatedUsedApiIdsForFullScript.length}`);
        }

        // ✅ NOVO: Sanitizar roteiro (remover metadados, tags, formatações)
        if (USE_MINIMAL_PROMPT) {
          script = sanitizeScript(script);
        }

        scriptWordCount = script.split(/\s+/).length;
      }
      
      const totalWordCount = scriptWordCount;
      
      addLog(jobId, `✅ Roteiro completo gerado: ${scriptWordCount} palavras`);
      addLog(jobId, `⏱️ Duração estimada: ~${Math.ceil(scriptWordCount / 150)} minutos`);

      // Capturar estatísticas das APIs para diagnóstico
      const apiStats = enhancedGeminiService.getApiStats();

      // Finalizar job
      // ✅ CORRIGIDO: Usar função helper para liberar APIs de forma consistente
      const finalJob = jobsRef.current.find(j => j.id === jobId);
      const totalApisUsed = finalJob?.usedApiIds?.length || 0;
      addLog(jobId, `📊 Total de APIs diferentes usadas neste job: ${totalApisUsed}/${activeApis.length}`);

      const releasedCount = releaseJobApisFromGlobalPool(jobId);
      if (releasedCount > 0) {
        addLog(jobId, `🔓 ${releasedCount} APIs liberadas para outros jobs`);
      }

      updateJob(jobId, {
        status: 'completed',
        script,
        wordCount: totalWordCount,
        progress: 100,
        endTime: new Date(),
        apiStats
      });

      const totalTime = Math.round((new Date().getTime() - job.startTime.getTime()) / 1000);
      addLog(jobId, `🎉 Geração concluída com sucesso em ${totalTime}s!`);

    } catch (error) {
      // ✅ MELHOR extração de mensagem de erro com contexto
      let errorMessage = 'Erro desconhecido';
      let errorStack = '';

      if (error instanceof Error) {
        errorMessage = error.message || 'Erro sem mensagem';
        errorStack = error.stack || '';

        // Se mensagem está vazia ou genérica, tentar extrair mais informações
        if (!errorMessage || errorMessage === 'Erro' || errorMessage.length < 5) {
          errorMessage = `Erro genérico: ${error.name || 'Error'}`;

          // Tentar extrair do stack
          if (errorStack) {
            const stackFirstLine = errorStack.split('\n')[0];
            if (stackFirstLine && stackFirstLine !== errorMessage) {
              errorMessage += ` - ${stackFirstLine}`;
            }
          }
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }

      addLog(jobId, `💥 ERRO: ${errorMessage}`);

      // Log stack trace detalhado no console para debug
      if (errorStack) {
        console.error(`[Job ${jobId}] Stack trace:`, errorStack);
      }
      
      // ✅ CORRIGIDO: Usar função helper para liberar APIs de forma consistente
      const releasedCount = releaseJobApisFromGlobalPool(jobId);
      if (releasedCount > 0) {
        addLog(jobId, `📊 APIs usadas antes do erro: ${releasedCount}`);
        addLog(jobId, `🔓 ${releasedCount} APIs liberadas do pool global após erro`);
      }
      
      // Capturar estatísticas das APIs mesmo em caso de erro
      const apiStats = enhancedGeminiService.getApiStats();
      
      // Determinar se o erro é recuperável e se deve tentar novamente
      const isRetryableError = (
        errorMessage.includes('timeout') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('temporarily unavailable') ||
        errorMessage.includes('server error') ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504')
      );

      const maxRetries = 3;
      const currentRetryCount = job.retryCount || 0;
      
      if (isRetryableError && currentRetryCount < maxRetries) {
        // Retry automático - PRESERVAR progresso
        const nextRetryCount = currentRetryCount + 1;
        const retryDelay = Math.min(1000 * Math.pow(2, nextRetryCount), 30000); // backoff exponencial, máximo 30s
        
        addLog(jobId, `🔄 Erro recuperável detectado. Tentativa ${nextRetryCount}/${maxRetries} em ${retryDelay/1000}s...`);
        addLog(jobId, `📌 PRESERVANDO progresso: ${job.currentStage || 'início'}, chunk ${job.currentChunk || 0}`);
        
        updateJob(jobId, {
          status: 'pending',
          error: undefined,
          retryCount: nextRetryCount,
          // ✅ PRESERVAR progresso - NÃO limpar premise, script, currentStage, currentChunk
          // premise: job.premise,  // Mantém premissa se já foi gerada
          // script: job.script,    // Mantém script parcial
          // currentStage: job.currentStage,  // Mantém estágio atual
          // currentChunk: job.currentChunk,  // Mantém chunk atual
          // totalChunks: job.totalChunks,    // Mantém total de chunks
          endTime: undefined
        });

        // Agendar retry com delay
        setTimeout(() => {
          addLog(jobId, `🔄 Iniciando retry automático ${nextRetryCount}/${maxRetries} - Retomando do ${job.currentStage === 'script' ? `chunk ${job.currentChunk || 0}` : 'início'}`);
          jobQueue.current.push(jobId);
          processQueue();
        }, retryDelay);
        
      } else {
        // Erro final - não recuperável ou excedeu tentativas
        if (currentRetryCount >= maxRetries) {
          addLog(jobId, `❌ Máximo de tentativas (${maxRetries}) excedido. Job falhado definitivamente.`);
        } else {
          addLog(jobId, `❌ Erro não recuperável detectado. Job falhado definitivamente.`);
        }
        
        updateJob(jobId, {
          status: 'error',
          error: errorMessage,
          progress: 0,
          endTime: new Date(),
          apiStats
        });

        // Log adicional com sugestões de recuperação
        if (errorMessage.includes('Nenhuma API')) {
          addLog(jobId, `💡 Sugestão: Verifique se há APIs ativas configuradas`);
        } else if (errorMessage.includes('Falha em todas as APIs')) {
          addLog(jobId, `💡 Sugestão: Verifique a conectividade e limites das APIs`);
        } else if (errorMessage.includes('timeout')) {
          addLog(jobId, `💡 Sugestão: Tente novamente ou reduza o tamanho do conteúdo`);
        } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
          addLog(jobId, `💡 Sugestão: Aguarde reset da quota ou adicione mais APIs`);
        } else if (errorMessage.includes('unauthorized') || errorMessage.includes('invalid')) {
          addLog(jobId, `💡 Sugestão: Verifique se as chaves de API estão válidas`);
        }
      }
    }
  }, [jobs, agents, getActiveApiKeys, updateJob, addLog, reserveApisForJob, releaseJobApisFromGlobalPool]);

  const processQueue = useCallback(async () => {
    console.log('🔄 ProcessQueue chamado - Fila:', jobQueue.current.length, 'Ativos:', activeJobCount.current);
    
    // Verificar APIs disponíveis vs limite paralelo
    const availableApis = getActiveApiKeys().filter(api => 
      enhancedGeminiService.isKeyAvailable(api.id)
    );

    if (concurrentLimit > 1 && availableApis.length < concurrentLimit * 3) {
      console.warn(`⚠️ Limite paralelo: ${concurrentLimit}, mas apenas ${availableApis.length} APIs disponíveis`);
      console.warn(`⚠️ Recomendado: ${Math.floor(availableApis.length / 3)} jobs paralelos`);
    }
    
    // Processar múltiplos jobs em paralelo real
    const promises: Promise<void>[] = [];
    
    while (activeJobCount.current < concurrentLimit && jobQueue.current.length > 0) {
      const jobId = jobQueue.current.shift();
      if (!jobId) continue;

      console.log('🚀 Iniciando processamento do job:', jobId);
      activeJobCount.current++;
      
      // Criar promise para processamento paralelo verdadeiro
      const jobPromise = processJob(jobId).finally(() => {
        console.log('✅ Job finalizado:', jobId);
        activeJobCount.current--;
        // Tentar processar próximo item da fila após um pequeno delay
        setTimeout(() => {
          console.log('⏭️ Tentando processar próximo job da fila');
          processQueue();
        }, 100);
      });
      
      promises.push(jobPromise);
    }

    // Executar as promises sem aguardar para processamento paralelo real
    promises.forEach(promise => {
      promise.catch(error => {
        console.error('💥 Erro no processamento do job:', error);
      });
    });
  }, [concurrentLimit, processJob]);

  const generateMultipleScripts = useCallback((requests: ScriptGenerationRequest[], provider: AIProvider = 'gemini') => {
    // Atualizar o provider atual
    setCurrentProvider(provider);

    const newJobs: GenerationJob[] = requests.map(req => ({
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: req.title,
      agentId: req.agentId || '',
      provider: provider, // Usar o provider especificado
      status: 'pending',
      progress: 0,
      retryCount: 0,
      startTime: new Date(),
      logs: [`[${new Date().toLocaleTimeString()}] 📋 Job criado para: "${req.title}" (${provider})`]
    }));

    console.log('📝 Criando jobs:', newJobs.length, newJobs.map(j => j.id));
    
    // Adicionar jobs ao estado
    setJobs(prev => {
      const updated = [...prev, ...newJobs];
      console.log('🔄 Estado jobs atualizado:', updated.length, updated.map(j => j.id));
      return updated;
    });
    
    // Adicionar IDs à fila
    jobQueue.current.push(...newJobs.map(j => j.id));
    console.log('🎯 Jobs adicionados à fila:', jobQueue.current.length, jobQueue.current);
  }, []);

  const clearCompletedJobs = useCallback(() => {
    setJobs(prev => prev.filter(job => job.status !== 'completed' && job.status !== 'error'));
  }, []);

  // useEffect para processar fila quando novos jobs são adicionados
  useEffect(() => {
    if (jobQueue.current.length > 0 && activeJobCount.current < concurrentLimit) {
      console.log('🎯 Detectados jobs na fila, iniciando processamento...');
      processQueue();
    }
  }, [jobs, processQueue, concurrentLimit]);

  const retryJob = useCallback((jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const retryCount = job.retryCount + 1;
    addLog(jobId, `🔄 Iniciando tentativa ${retryCount + 1}`);

    updateJob(jobId, {
      status: 'pending',
      progress: 0,
      error: undefined,
      premise: undefined,
      script: undefined,
      retryCount,
      currentStage: undefined,
      currentChunk: undefined,
      totalChunks: undefined,
      usedApiIds: [], // ✅ NOVO: resetar APIs usadas em retry manual
      endTime: undefined
    });

    jobQueue.current.push(jobId);
    processQueue();
  }, [jobs, updateJob, addLog, processQueue]);

  const cancelJob = useCallback((jobId: string) => {
    // Remove da fila se ainda não começou
    const queueIndex = jobQueue.current.indexOf(jobId);
    if (queueIndex > -1) {
      jobQueue.current.splice(queueIndex, 1);
    }

    // Marca como cancelado
    updateJob(jobId, {
      status: 'error',
      error: 'Cancelado pelo usuário',
      progress: 0,
      endTime: new Date()
    });

    addLog(jobId, `🚫 Job cancelado pelo usuário`);
  }, [updateJob, addLog]);

  const getJobStats = useCallback(() => {
    const pending = jobs.filter(j => j.status === 'pending').length;
    const generating = jobs.filter(j => j.status === 'generating_premise' || j.status === 'generating_script').length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const errors = jobs.filter(j => j.status === 'error').length;

    return { pending, generating, completed, errors, total: jobs.length };
  }, [jobs]);

  const isGenerating = activeJobCount.current > 0 || jobQueue.current.length > 0;
  const totalProgress = jobs.length > 0 
    ? Math.round(jobs.reduce((sum, j) => sum + j.progress, 0) / jobs.length) 
    : 0;

  return {
    jobs,
    isGenerating,
    totalProgress,
    concurrentLimit,
    setConcurrentLimit,
    activeJobs: activeJobCount.current,
    queuedJobs: jobQueue.current.length,
    generateMultipleScripts,
    clearCompletedJobs,
    retryJob,
    cancelJob,
    getJobStats
  };
};
