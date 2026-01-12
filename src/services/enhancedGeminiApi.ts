import { GeminiApiKey } from "@/types/scripts";
import { getLanguageByCode } from "../data/languages";

// Interface ApiError definida localmente para evitar problemas de build
export interface ApiError extends Error {
  code?: string;
  status?: number;
  retryable?: boolean;
  quotaInfo?: {
    quotaId: string;
    quotaMetric: string;
    quotaValue: string;
    retryDelay?: number; // em segundos
  };
}

// Type guard para ApiError
function isApiError(err: any): err is ApiError {
  return !!err && typeof err === "object" && ("code" in err || "status" in err || "retryable" in err);
}

interface GenerationOptions {
  maxRetries?: number;
  retryDelay?: number;
  temperature?: number;
  maxTokens?: number;
  validateResponse?: (response: string) => boolean;
  timeoutMs?: number;
  onProgress?: (message: string) => void;
}

interface GenerationContext {
  premise?: string;
  previousChunk?: string;
  previousContent?: string;
  chunkIndex?: number;
  totalChunks?: number;
  targetWords?: number;
  language?: string;
  location?: string;
  isLastChunk?: boolean;
  simpleMode?: boolean;
}

export class EnhancedGeminiService {
  private static instance: EnhancedGeminiService;
  private apiRotationIndex = 0;
  private apiFailureCount = new Map<string, number>();
  private apiLastFailure = new Map<string, number>();
  private readonly FAILURE_RESET_TIME = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_FAILURES_BEFORE_SKIP = 100; // ✅ Aumentado para explorar todas as APIs completamente

  // ✅ NOVO: Rate Limiting Inteligente (Novas Regras Google: 2 RPM, 50 RPD)
  private globalRateLimitCooldown: number | null = null;
  private readonly RATE_LIMIT_COOLDOWN = 60000; // 60 segundos após 429
  private readonly DELAY_BETWEEN_API_ATTEMPTS = 500; // ✅ NOVO: 0.5s (trocar rápido entre chaves)
  private readonly MIN_TIME_BETWEEN_REQUESTS = 2000; // ✅ CORRIGIDO: 2s entre requisições (apenas para evitar burst, RPM já controla o limite real)

  // ✅ NOVO: Tracking de requisições por API (RPM, RPD e TPM)
  private apiRequestsPerMinute = new Map<string, number[]>(); // timestamps
  private apiRequestsPerDay = new Map<string, number[]>(); // timestamps
  private apiTokensPerMinute = new Map<string, { timestamp: number; tokens: number }[]>(); // ✅ NOVO: TPM tracking

  // ✅ CORREÇÃO: Limites dinâmicos baseados no modelo (plano gratuito do Google)
  private getModelLimits(model: string): { rpm: number; rpd: number; tpm: number } {
    // Dados oficiais do Google AI Studio - Nível GRATUITO (corrigidos)
    const limits: Record<string, { rpm: number; rpd: number; tpm: number }> = {
      "gemini-3-flash-preview": { rpm: 5, rpd: 20, tpm: 1000000 }, // ✅ CORRIGIDO: Limites reais do plano free (5 RPM, 20 RPD)
      "gemini-2.5-pro": { rpm: 2, rpd: 50, tpm: 125000 }, // ✅ CORRIGIDO: 2 RPM, 50 RPD (plano gratuito real)
      "gemini-2.5-flash": { rpm: 10, rpd: 250, tpm: 250000 },
      "gemini-2.5-flash-lite": { rpm: 15, rpd: 1000, tpm: 250000 },
      "gemini-2.0-flash": { rpm: 15, rpd: 200, tpm: 1000000 },
      "gemini-2.0-flash-lite": { rpm: 30, rpd: 200, tpm: 1000000 },
      "gemini-2.0-flash-exp": { rpm: 15, rpd: 200, tpm: 1000000 },
      "gemini-1.5-flash": { rpm: 15, rpd: 50, tpm: 250000 },
      "gemini-1.5-flash-8b": { rpm: 15, rpd: 50, tpm: 250000 },
      "gemini-1.5-pro": { rpm: 2, rpd: 50, tpm: 32000 },
    };

    return limits[model] || { rpm: 2, rpd: 50, tpm: 125000 }; // ✅ Default conservador: 2 RPM, 50 RPD
  }

  // ✅ NOVO: Método público para expor os limites de modelo para outros componentes (ex: ApiStatusMonitor)
  public getModelLimitsPublic(model: string): { rpm: number; rpd: number; tpm: number } {
    return this.getModelLimits(model);
  }

  // ✅ NOVO: Controle de cooldown e exaustão por chave
  private keyCooldownUntil = new Map<string, number>(); // RPM cooldown por chave
  private keyExhaustedUntil = new Map<string, number>(); // RPD exaustão até fim do dia UTC

  // ✅ NOVO FASE 1: Sistema de bloqueio temporário por tipo de erro
  private keyBlockedUntil = new Map<string, number>(); // keyId -> timestamp de desbloqueio
  private keyBlockReason = new Map<string, string>(); // keyId -> razão do bloqueio

  // ✅ CRÍTICO: Sistema de LOCK para prevenir uso simultâneo da mesma API
  private apiInUse = new Map<string, boolean>(); // keyId -> está em uso neste momento?
  private apiLastRequestTime = new Map<string, number>(); // keyId -> timestamp última requisição

  // ✅ NOVO: Timer para reset automático à meia-noite UTC
  private midnightResetInterval: NodeJS.Timeout | null = null;
  private lastResetDate: string | null = null;

  private constructor() {
    this.loadExhaustedKeysFromStorage();
    this.loadQuarantinedKeysFromStorage();
    this.setupAutomaticMidnightReset();
  }

  /**
   * ✅ NOVO: Configurar verificação automática de reset diário às 00:00 UTC
   * Verifica a cada minuto se mudou o dia UTC e reseta todas as quotas
   */
  private setupAutomaticMidnightReset() {
    // Verificar a cada 60 segundos se passou da meia-noite UTC
    this.midnightResetInterval = setInterval(() => {
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD em UTC

      // Se mudou o dia UTC desde o último reset, resetar tudo
      if (this.lastResetDate && this.lastResetDate !== currentDate) {
        console.log(`🌅 [RESET AUTOMÁTICO] Detectada mudança de dia UTC: ${this.lastResetDate} → ${currentDate}`);
        this.performMidnightReset();
      }

      this.lastResetDate = currentDate;
    }, 60000); // Verificar a cada 1 minuto

    // Inicializar lastResetDate
    this.lastResetDate = new Date().toISOString().split("T")[0];
    console.log(`⏰ Sistema de reset automático às 00:00 UTC inicializado (data atual: ${this.lastResetDate})`);
  }

  /**
   * ✅ NOVO: Executar reset de meia-noite (zerar contadores RPD e exaustão)
   */
  private performMidnightReset() {
    console.log(`🔄 [RESET AUTOMÁTICO] Iniciando reset de quotas às 00:00 UTC...`);

    // Limpar todas as exaustões (RPD)
    const exhaustedCount = this.keyExhaustedUntil.size;
    this.keyExhaustedUntil.clear();

    // Limpar todos os contadores RPD (mas MANTER RPM que é por minuto)
    const rpdCount = this.apiRequestsPerDay.size;
    this.apiRequestsPerDay.clear();

    // Atualizar storage
    this.saveExhaustedKeysToStorage();

    console.log(`✅ [RESET AUTOMÁTICO] Completado!`);
    console.log(`   - ${exhaustedCount} APIs exauridas liberadas`);
    console.log(`   - ${rpdCount} contadores RPD zerados`);
    console.log(`   - Contadores RPM mantidos (reset automático a cada minuto)`);
  }

  static getInstance(): EnhancedGeminiService {
    if (!EnhancedGeminiService.instance) {
      EnhancedGeminiService.instance = new EnhancedGeminiService();
    }
    return EnhancedGeminiService.instance;
  }

  // ✅ NOVO: Persistência de chaves exauridas no localStorage
  private loadExhaustedKeysFromStorage() {
    try {
      const stored = localStorage.getItem("gemini_exhausted_keys");
      if (!stored) return;

      const data = JSON.parse(stored) as { apiId: string; exhaustedUntil: number }[];
      const now = Date.now();

      data.forEach(({ apiId, exhaustedUntil }) => {
        if (exhaustedUntil > now) {
          this.keyExhaustedUntil.set(apiId, exhaustedUntil);
          console.log(`📦 API ${apiId} carregada como exaurida até ${new Date(exhaustedUntil).toISOString()}`);
        }
      });
    } catch (error) {
      console.error("Erro ao carregar chaves exauridas do localStorage:", error);
    }
  }

  // ✅ NOVO: Persistência de chaves em quarentena no localStorage
  private loadQuarantinedKeysFromStorage() {
    try {
      const stored = localStorage.getItem("gemini_quarantined_keys");
      if (!stored) return;

      const data = JSON.parse(stored) as { apiId: string; blockedUntil: number; reason: string }[];
      const now = Date.now();

      data.forEach(({ apiId, blockedUntil, reason }) => {
        if (blockedUntil > now) {
          this.keyBlockedUntil.set(apiId, blockedUntil);
          this.keyBlockReason.set(apiId, reason);
          console.log(
            `🔒 API ${apiId} carregada em quarentena até ${new Date(blockedUntil).toISOString()} - ${reason}`,
          );
        }
      });
    } catch (error) {
      console.error("Erro ao carregar chaves em quarentena do localStorage:", error);
    }
  }

  private saveQuarantinedKeysToStorage() {
    try {
      const data = Array.from(this.keyBlockedUntil.entries()).map(([apiId, blockedUntil]) => ({
        apiId,
        blockedUntil,
        reason: this.keyBlockReason.get(apiId) || "Desconhecido",
      }));
      localStorage.setItem("gemini_quarantined_keys", JSON.stringify(data));
    } catch (error) {
      console.error("Erro ao salvar chaves em quarentena no localStorage:", error);
    }
  }

  private saveExhaustedKeysToStorage() {
    try {
      const data = Array.from(this.keyExhaustedUntil.entries()).map(([apiId, exhaustedUntil]) => ({
        apiId,
        exhaustedUntil,
      }));
      localStorage.setItem("gemini_exhausted_keys", JSON.stringify(data));
    } catch (error) {
      console.error("Erro ao salvar chaves exauridas no localStorage:", error);
    }
  }

  // ✅ CORREÇÃO CRÍTICA: Só marcar como exaurida se REALMENTE atingiu o limite de RPD
  private markKeyAsExhausted(apiKey: GeminiApiKey) {
    // Calcular meia-noite UTC (reset de quota diária)
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));

    this.keyExhaustedUntil.set(apiKey.id, tomorrow.getTime());
    this.saveExhaustedKeysToStorage();

    const hoursUntilReset = Math.ceil((tomorrow.getTime() - now.getTime()) / 3600000);
    const limits = this.getModelLimits(apiKey.model);
    console.error(`🛑 API ${apiKey.name} EXAURIDA (RPD=${limits.rpd}). Ignorada até 00:00 UTC (~${hoursUntilReset}h)`);
  }

  // ✅ NOVO: Métodos públicos para verificar status das chaves
  public isKeyAvailable(apiId: string): boolean {
    const now = Date.now();

    // FASE 1: Verificar bloqueio por erro primeiro
    const blockedUntil = this.keyBlockedUntil.get(apiId);
    if (blockedUntil && now < blockedUntil) {
      return false;
    } else if (blockedUntil && now >= blockedUntil) {
      // Desbloquear automaticamente
      this.keyBlockedUntil.delete(apiId);
      this.keyBlockReason.delete(apiId);
      this.apiFailureCount.delete(apiId);
      console.log(`✅ API ${apiId} desbloqueada automaticamente`);
    }

    // Verificar exaustão (RPD)
    const exhaustedUntil = this.keyExhaustedUntil.get(apiId);
    if (exhaustedUntil && now < exhaustedUntil) return false;

    // Verificar cooldown (RPM)
    const cooldownUntil = this.keyCooldownUntil.get(apiId);
    if (cooldownUntil && now < cooldownUntil) return false;

    return true;
  }

  public isKeyInCooldown(apiId: string): boolean {
    const cooldownUntil = this.keyCooldownUntil.get(apiId);
    return cooldownUntil ? cooldownUntil > Date.now() : false;
  }

  public isKeyExhausted(apiId: string): boolean {
    const exhaustedUntil = this.keyExhaustedUntil.get(apiId);
    return exhaustedUntil ? exhaustedUntil > Date.now() : false;
  }

  // FASE 1: Obter razão do bloqueio de uma key
  public getKeyBlockReason(apiId: string): string | undefined {
    const blockedUntil = this.keyBlockedUntil.get(apiId);
    if (!blockedUntil || Date.now() >= blockedUntil) return undefined;

    const reason = this.keyBlockReason.get(apiId);
    const remainingSeconds = Math.ceil((blockedUntil - Date.now()) / 1000);

    return `${reason} (${remainingSeconds}s restantes)`;
  }

  // ✅ NOVO: Obter contadores de RPM e RPD para uma API
  public getApiUsageStats(apiId: string): { rpm: number; rpd: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneDayAgo = now - 86400000;

    // Filtrar e ATUALIZAR os arrays removendo timestamps antigos
    const rpmTimestamps = (this.apiRequestsPerMinute.get(apiId) || []).filter((t) => t > oneMinuteAgo);

    const rpdTimestamps = (this.apiRequestsPerDay.get(apiId) || []).filter((t) => t > oneDayAgo);

    // ✅ CORREÇÃO: Atualizar os Maps com timestamps limpos para visualização correta
    if (rpmTimestamps.length > 0) {
      this.apiRequestsPerMinute.set(apiId, rpmTimestamps);
    } else {
      this.apiRequestsPerMinute.delete(apiId);
    }

    if (rpdTimestamps.length > 0) {
      this.apiRequestsPerDay.set(apiId, rpdTimestamps);
    } else {
      this.apiRequestsPerDay.delete(apiId);
    }

    return {
      rpm: rpmTimestamps.length,
      rpd: rpdTimestamps.length,
    };
  }

  // ✅ NOVO: Obter o menor tempo de espera entre todas as APIs
  public getShortestCooldownMs(apiIds: string[]): number | null {
    const now = Date.now();
    let shortestWait: number | null = null;
    const MAX_REASONABLE_WAIT = 120000; // 2 minutos = máximo razoável de espera

    for (const apiId of apiIds) {
      // ✅ NOVO: Ignorar APIs permanentemente bloqueadas (> 24h = provavelmente billing/key inválida)
      const blockedUntil = this.keyBlockedUntil.get(apiId);
      if (blockedUntil && blockedUntil > now + 86400000) {
        console.log(`⏭️ [getShortestCooldownMs] API ${apiId} ignorada (bloqueio permanente)`);
        continue;
      }

      // ✅ NOVO: Ignorar APIs exauridas (RPD) - não vão liberar até meia-noite
      const exhaustedUntil = this.keyExhaustedUntil.get(apiId);
      if (exhaustedUntil && exhaustedUntil > now) {
        console.log(`⏭️ [getShortestCooldownMs] API ${apiId} ignorada (exaurida RPD)`);
        continue;
      }

      // Verificar cooldown do LOCK (2s entre requisições)
      const lastRequestTime = this.apiLastRequestTime.get(apiId);
      if (lastRequestTime) {
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < this.MIN_TIME_BETWEEN_REQUESTS) {
          const waitTime = this.MIN_TIME_BETWEEN_REQUESTS - timeSinceLastRequest;
          if (waitTime <= MAX_REASONABLE_WAIT && (shortestWait === null || waitTime < shortestWait)) {
            shortestWait = waitTime;
          }
        }
      }

      // Verificar cooldown RPM
      const cooldownUntil = this.keyCooldownUntil.get(apiId);
      if (cooldownUntil && cooldownUntil > now) {
        const waitTime = cooldownUntil - now;
        if (waitTime <= MAX_REASONABLE_WAIT && (shortestWait === null || waitTime < shortestWait)) {
          shortestWait = waitTime;
        }
      }

      // Verificar bloqueio temporário (apenas se for razoável)
      if (blockedUntil && blockedUntil > now) {
        const waitTime = blockedUntil - now;
        if (waitTime <= MAX_REASONABLE_WAIT && (shortestWait === null || waitTime < shortestWait)) {
          shortestWait = waitTime;
        }
      }
    }

    return shortestWait;
  }

  // ✅ NOVO: Parser de informações detalhadas do erro 429 do Google
  private parseQuotaDetails(errorData: any): ApiError["quotaInfo"] | undefined {
    try {
      const details = errorData.error?.details;
      if (!details || !Array.isArray(details)) return undefined;

      let quotaInfo: any = {};

      // Procurar QuotaFailure
      const quotaFailure = details.find((d: any) => d["@type"]?.includes("QuotaFailure"));
      if (quotaFailure?.violations?.[0]) {
        const violation = quotaFailure.violations[0];
        quotaInfo.quotaId = violation.quotaId || "";
        quotaInfo.quotaMetric = violation.quotaMetric || "";
        quotaInfo.quotaValue = violation.quotaValue || "";
      }

      // Procurar RetryInfo
      const retryInfo = details.find((d: any) => d["@type"]?.includes("RetryInfo"));
      if (retryInfo?.retryDelay) {
        // Converter "49s" para 49
        const delayStr = retryInfo.retryDelay;
        const delayMatch = delayStr.match(/(\d+(\.\d+)?)/);
        if (delayMatch) {
          quotaInfo.retryDelay = parseFloat(delayMatch[1]);
        }
      }

      return quotaInfo.quotaId ? quotaInfo : undefined;
    } catch (error) {
      console.warn("Erro ao parsear detalhes de quota:", error);
      return undefined;
    }
  }

  private createApiError(
    message: string,
    status?: number,
    retryable = true,
    quotaInfo?: ApiError["quotaInfo"],
  ): ApiError {
    const error = Object.assign(new Error(message), {
      status,
      retryable,
      quotaInfo,
    }) as ApiError;

    if (status === 429) {
      error.code = "RATE_LIMIT";
    } else if (status === 403) {
      error.code = "API_QUOTA_EXCEEDED";
      error.retryable = false;
    } else if (status === 400) {
      error.code = "INVALID_REQUEST";
      error.retryable = false;
    } else if (status === 401) {
      error.code = "UNAUTHORIZED";
      error.retryable = false;
    } else if (status && status >= 500) {
      error.code = "SERVER_ERROR";
    }

    return error;
  }

  private analyzeApiResponse(data: any): {
    hasContent: boolean;
    finishReason?: string;
    isBlocked: boolean;
    errorType: string;
  } {
    const finishReason = data.candidates?.[0]?.finishReason;
    const content = data.candidates?.[0]?.content;
    const parts = content?.parts;

    // Verificar se foi bloqueado por filtros de segurança
    const isBlocked =
      finishReason === "SAFETY" || finishReason === "RECITATION" || finishReason === "PROHIBITED_CONTENT";

    // Verificar se tem conteúdo real
    const hasContent = !!parts && parts.length > 0 && parts.some((p: any) => p.text && p.text.trim().length > 0);

    let errorType = "UNKNOWN";
    if (isBlocked) {
      errorType = "BLOCKED_BY_SAFETY";
    } else if (finishReason === "MAX_TOKENS") {
      errorType = "MAX_TOKENS_REACHED";
    } else if (!hasContent) {
      errorType = "NO_CONTENT_GENERATED";
    }

    return { hasContent, finishReason, isBlocked, errorType };
  }

  private makePromptSafer(prompt: string): string {
    // Reformular prompt para ser mais neutro e evitar bloqueios
    let saferPrompt = prompt;

    // Remover palavras que podem causar bloqueios
    const sensitivePatterns = [/\b(replace|substituir|eliminar|destruir)\b/gi, /\b(controversial|polêmico)\b/gi];

    sensitivePatterns.forEach((pattern) => {
      saferPrompt = saferPrompt.replace(pattern, (match) => {
        const replacements: Record<string, string> = {
          replace: "complement",
          substituir: "complementar",
          eliminar: "transformar",
          destruir: "modificar",
          controversial: "discussable",
          polêmico: "discutível",
        };
        return replacements[match.toLowerCase()] || match;
      });
    });

    return saferPrompt;
  }

  // Funções de validação removidas - eram muito rigorosas e causavam rejeições falsas

  private async makeApiCallWithTimeout(
    prompt: string,
    apiKey: GeminiApiKey,
    options: GenerationOptions = {},
    attemptNumber: number = 0,
    context: GenerationContext = {},
  ): Promise<string> {
    const {
      temperature = 0.7,
      maxTokens = 8000, // ✅ CORREÇÃO CRÍTICA: 8000 tokens (limite real do Gemini é 8192)
      timeoutMs = 120000, // 2 minutos
      onProgress,
    } = options;

    // Ajustar temperatura em tentativas subsequentes
    let adjustedTemp = temperature;
    if (attemptNumber > 0) {
      adjustedTemp = Math.max(0.3, temperature - attemptNumber * 0.1);
      onProgress?.(`🔧 Ajustando temperatura para ${adjustedTemp.toFixed(2)}`);
    }

    // Usar prompt mais seguro em tentativas subsequentes
    const finalPrompt = attemptNumber > 1 ? this.makePromptSafer(prompt) : prompt;
    if (attemptNumber > 1) {
      onProgress?.(`🛡️ Usando prompt reformulado (tentativa ${attemptNumber + 1})`);
    }

    // FASE 4: Log detalhado ao iniciar chamada
    onProgress?.(`📡 [${apiKey.name}] Iniciando chamada (timeout: ${timeoutMs}ms)`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: finalPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: adjustedTemp,
          maxOutputTokens: maxTokens,
          // ✅ NOVO: Adicionar thinkingConfig para modelos Gemini 3
          ...(apiKey.model.includes("gemini-3") && {
            thinkingConfig: {
              thinkingLevel: "HIGH",
            },
          }),
        },
      };

      // ✅ LOG DETALHADO: Informações da requisição
      console.log(`📤 [${apiKey.name}] Requisição:`, {
        model: apiKey.model,
        promptLength: finalPrompt.length,
        temperature: adjustedTemp,
        maxOutputTokens: maxTokens,
        attempt: attemptNumber + 1,
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${apiKey.model}:generateContent?key=${apiKey.key}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        const errorDetails = errorData.error?.details || [];
        const errorStatus = errorData.error?.status || "";

        // ✅ NOVO: Extrair informações detalhadas de quota (429)
        let quotaInfo: ApiError["quotaInfo"] | undefined;
        if (response.status === 429) {
          quotaInfo = this.parseQuotaDetails(errorData);
          if (quotaInfo) {
            console.log(`📊 [${apiKey.name}] Quota Info:`, quotaInfo);
          }
        }

        // FASE 4: Log detalhado de erro com TODOS os detalhes
        console.error(`❌ [${apiKey.name}] HTTP ${response.status}: ${errorMessage}`);
        console.error(`❌ API Error ${response.status}:`, {
          api: apiKey.name,
          status: response.status,
          message: errorMessage,
          errorStatus: errorStatus,
          details: errorDetails,
          quotaInfo: quotaInfo,
          attempt: attemptNumber + 1,
        });

        // ✅ Criar erro com informações completas (incluindo quotaInfo)
        const apiError = this.createApiError(
          `API Error: ${response.status} - ${errorMessage}`,
          response.status,
          true,
          quotaInfo,
        );

        // ✅ CRÍTICO: Adicionar detalhes ao erro para análise posterior
        (apiError as any).errorDetails = errorDetails;
        (apiError as any).errorStatus = errorStatus;
        (apiError as any).fullMessage = errorMessage;

        throw apiError;
      }

      const data = await response.json();

      // Analisar resposta da API
      const analysis = this.analyzeApiResponse(data);

      // ✅ LOG DETALHADO COM TAMANHO DO TEXTO
      console.log(`📊 Análise da resposta API ${apiKey.name}:`, {
        hasContent: analysis.hasContent,
        finishReason: analysis.finishReason,
        isBlocked: analysis.isBlocked,
        errorType: analysis.errorType,
        textLength: data.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0,
        attempt: attemptNumber + 1,
      });

      // ✅ ALERTA SE MAX_TOKENS (recuperável)
      if (analysis.finishReason === "MAX_TOKENS") {
        console.warn("⚠️ MAX_TOKENS atingido, tentando próxima API");
        onProgress?.("⚠️ Limite de tokens atingido, tentando com API diferente");
      }

      // ✅ ALERTA SE STOP (normal, mas logar mesmo assim)
      if (analysis.finishReason === "STOP") {
        console.log(`✅ Geração finalizada normalmente (STOP)`);
      }

      // Se foi bloqueado por segurança, é recuperável
      if (analysis.isBlocked) {
        console.warn(`🛡️ Conteúdo bloqueado por filtros de segurança (${analysis.finishReason})`);
        throw this.createApiError(
          `Conteúdo bloqueado por filtros de segurança: ${analysis.finishReason}`,
          undefined,
          true, // MARCADO COMO RECUPERÁVEL
        );
      }

      // Se não tem conteúdo mas não foi bloqueado, também é recuperável
      if (!analysis.hasContent) {
        console.warn(`⚠️ Nenhum conteúdo gerado. FinishReason: ${analysis.finishReason}`);
        console.warn(`⚠️ Estrutura da resposta:`, {
          hasCandidates: !!data.candidates,
          candidatesLength: data.candidates?.length,
          hasContent: !!data.candidates?.[0]?.content,
          hasParts: !!data.candidates?.[0]?.content?.parts,
          partsLength: data.candidates?.[0]?.content?.parts?.length,
          firstPartText: data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100),
        });
        console.log("📄 Resposta completa da API:", JSON.stringify(data, null, 2));

        throw this.createApiError(
          `Nenhum conteúdo gerado (${analysis.finishReason || "unknown"})`,
          undefined,
          true, // MARCADO COMO RECUPERÁVEL
        );
      }

      const parts = data.candidates[0].content.parts;
      const fullText = parts.map((part: any) => part.text || "").join("");

      // ✅ VALIDAÇÃO MINIMALISTA: apenas verificar se não é vazio (20 caracteres mínimo)
      if (!fullText.trim() || fullText.trim().length < 20) {
        console.warn(`⚠️ Resposta muito curta ou vazia (${fullText.trim().length} chars)`);
        console.warn(`⚠️ Texto recebido: "${fullText.trim().substring(0, 200)}"`);
        throw this.createApiError("Resposta muito curta ou vazia", undefined, true);
      }

      // Se foi MAX_TOKENS, marcar como recuperável para tentar outra API
      if (analysis.finishReason === "MAX_TOKENS") {
        throw this.createApiError(
          "Limite de tokens atingido, tentando com API diferente",
          undefined,
          true, // ✅ RECUPERÁVEL
        );
      }

      // FASE 4: Log de sucesso detalhado
      const wordCount = fullText.split(/\s+/).length;
      console.log(`✅ [${apiKey.name}] Sucesso - ${wordCount} palavras geradas`);
      console.log("✅ Conteúdo recebido da API");

      if (!fullText.trim()) {
        throw this.createApiError("Resposta vazia da API", undefined, true);
      }

      onProgress?.(`✅ Resposta recebida da API ${apiKey.name} (${wordCount} palavras)`);
      return fullText;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw this.createApiError(`Timeout na API ${apiKey.name} após ${timeoutMs}ms`, undefined, true);
      }

      if (isApiError(error)) {
        throw error;
      }

      // Erro de rede ou outro erro não tratado
      throw this.createApiError(`Erro de conexão com API ${apiKey.name}: ${error.message}`, undefined, true);
    }
  }

  private recordApiFailure(apiKey: GeminiApiKey, error: ApiError) {
    const now = Date.now();
    const currentFailures = this.apiFailureCount.get(apiKey.id) || 0;

    this.apiFailureCount.set(apiKey.id, currentFailures + 1);
    this.apiLastFailure.set(apiKey.id, now);

    // FASE 1: Decidir se bloqueia a key baseado no tipo de erro
    const blockInfo = this.shouldBlockKey(error, currentFailures + 1);

    if (blockInfo.shouldBlock) {
      const blockUntil = now + blockInfo.blockDurationMs;
      this.keyBlockedUntil.set(apiKey.id, blockUntil);
      this.keyBlockReason.set(apiKey.id, blockInfo.reason);
      this.saveQuarantinedKeysToStorage(); // ✅ PERSISTIR

      const blockSeconds = Math.ceil(blockInfo.blockDurationMs / 1000);
      console.warn(`⛔ API ${apiKey.name} BLOQUEADA por ${blockSeconds}s - Razão: ${blockInfo.reason}`);
    } else {
      console.warn(`⚠️ API ${apiKey.name} falhou: ${error.message} (Falhas: ${currentFailures + 1}) - Sem bloqueio`);
    }
  }

  // FASE 1: Decidir se deve bloquear key baseado no tipo de erro
  private shouldBlockKey(
    error: ApiError,
    failureCount: number,
  ): {
    shouldBlock: boolean;
    blockDurationMs: number;
    reason: string;
  } {
    const errorMessage = error.message.toLowerCase();

    // ✅ CASOS QUE NÃO DEVEM BLOQUEAR (erros recuperáveis - apenas tentar próxima API)

    // Caso 0A: MAX_TOKENS - API respondeu, mas precisa de mais tokens (tentar outra)
    if (errorMessage.includes("max_tokens") || errorMessage.includes("limite de tokens")) {
      return {
        shouldBlock: false,
        blockDurationMs: 0,
        reason: "MAX_TOKENS - tentar próxima API",
      };
    }

    // Caso 0B: Timeout ou Network Error - problema temporário de rede
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("network") ||
      errorMessage.includes("conexão") ||
      errorMessage.includes("fetch")
    ) {
      return {
        shouldBlock: false,
        blockDurationMs: 0,
        reason: "Erro temporário de rede/timeout",
      };
    }

    // Caso 0C: Conteúdo bloqueado por segurança - tentar com outra API ou temp diferente
    if (errorMessage.includes("safety") || errorMessage.includes("segurança") || errorMessage.includes("bloqueado")) {
      return {
        shouldBlock: false,
        blockDurationMs: 0,
        reason: "Filtro de segurança - tentar outra API",
      };
    }

    // Caso 0D: Nenhum conteúdo gerado - pode ser temperatura/prompt
    if (
      errorMessage.includes("nenhum conteúdo") ||
      errorMessage.includes("no content") ||
      errorMessage.includes("vazia")
    ) {
      return {
        shouldBlock: false,
        blockDurationMs: 0,
        reason: "Sem conteúdo - tentar outra API",
      };
    }

    // ✅ CASOS QUE DEVEM BLOQUEAR (problemas graves com a API key)

    // Caso 1: Erro de autenticação (401, 403, "API Key not found")
    if (
      error.status === 401 ||
      error.status === 403 ||
      errorMessage.includes("api key not found") ||
      errorMessage.includes("invalid api key") ||
      errorMessage.includes("unauthorized")
    ) {
      return {
        shouldBlock: true,
        blockDurationMs: 999999999, // Bloqueio "permanente" (até reiniciar)
        reason: "Key inválida ou não autorizada",
      };
    }

    // Caso 2A: Erro 429 - DIFERENCIAR entre billing e rate limits
    if (error.status === 429) {
      // Verificar se é problema de billing/créditos (permanente)
      if (
        errorMessage.includes("billing") ||
        errorMessage.includes("payment") ||
        errorMessage.includes("plan and billing details") ||
        errorMessage.includes("credits")
      ) {
        return {
          shouldBlock: true,
          blockDurationMs: 999999999, // Bloqueio "permanente"
          reason: "Sem créditos/billing - verificar conta no Google AI Studio",
        };
      }

      // Para outros 429 (RPM/RPD/TPM), NÃO bloquear aqui
      // Serão tratados especificamente no catch block
      return {
        shouldBlock: false,
        blockDurationMs: 0,
        reason: "Rate limit - será tratado especificamente",
      };
    }

    // Caso 2B: Erro 400 (Bad Request) - APENAS se for problema com a key
    if (error.status === 400) {
      // Se for problema de billing (Pro models), bloquear permanentemente
      if (errorMessage.includes("billing") || errorMessage.includes("payment")) {
        return {
          shouldBlock: true,
          blockDurationMs: 999999999,
          reason: "Billing/pagamento necessário",
        };
      }
      // Outros 400: bloquear temporariamente
      return {
        shouldBlock: true,
        blockDurationMs: 180000, // 3 minutos
        reason: "Bad Request - verificar configuração",
      };
    }

    // Caso 3A: Erros 502/503 - servidor temporariamente sobrecarregado (NÃO bloquear)
    if (error.status === 502 || error.status === 503) {
      return {
        shouldBlock: false,
        blockDurationMs: 0,
        reason: "Servidor do Google temporariamente sobrecarregado - tentar próxima API",
      };
    }

    // Caso 3B: Erro 500 (Internal Server Error) - bloquear por 1 minuto
    if (error.status === 500) {
      return {
        shouldBlock: true,
        blockDurationMs: 60000, // 1 minuto
        reason: "Erro interno do servidor Gemini",
      };
    }

    // Caso 3C: Outros erros 5xx - não bloquear (tentar próxima API)
    if (error.status && error.status >= 500) {
      return {
        shouldBlock: false,
        blockDurationMs: 0,
        reason: "Erro de servidor - tentar próxima API",
      };
    }

    // Caso 4: Apenas 5 falhas consecutivas agora (antes era 3)
    if (failureCount >= 5) {
      return {
        shouldBlock: true,
        blockDurationMs: 180000, // 3 minutos
        reason: "5 falhas consecutivas - problema persistente",
      };
    }

    // Padrão: não bloquear (permitir retry com próxima API)
    return { shouldBlock: false, blockDurationMs: 0, reason: "" };
  }

  private recordApiSuccess(apiKey: GeminiApiKey) {
    const now = Date.now();

    // ✅ CORREÇÃO BASEADA EM TESTES REAIS:
    // - RPM conta TODAS as requisições (já registrado no lockApi)
    // - RPD conta APENAS requisições BEM-SUCEDIDAS (registrar aqui)
    // ✅ BUGFIX CRÍTICO: Limpar timestamps antigos (> 24h) ANTES de adicionar novo
    const oneDayAgo = now - 86400000;
    const rpd = (this.apiRequestsPerDay.get(apiKey.id) || []).filter((t) => t > oneDayAgo); // ✅ BUGFIX: Remover timestamps > 24h
    rpd.push(now);
    this.apiRequestsPerDay.set(apiKey.id, rpd);

    // FASE 1: Resetar TUDO em caso de sucesso (incluindo bloqueios)
    this.apiFailureCount.delete(apiKey.id);
    this.apiLastFailure.delete(apiKey.id);
    this.keyBlockedUntil.delete(apiKey.id);
    this.keyBlockReason.delete(apiKey.id);
    this.saveQuarantinedKeysToStorage(); // ✅ PERSISTIR remoção

    // Obter contagens atuais para log
    const rpm = (this.apiRequestsPerMinute.get(apiKey.id) || []).filter((t) => now - t < 60000);
    const rpdFiltered = rpd.filter((t) => now - t < 86400000);

    console.log(
      `✅ API ${apiKey.name} - Sucesso registrado (RPM atual: ${rpm.length}, RPD atual: ${rpdFiltered.length})`,
    );
  }

  private isApiAvailable(apiKey: GeminiApiKey): boolean {
    const failures = this.apiFailureCount.get(apiKey.id) || 0;
    const lastFailure = this.apiLastFailure.get(apiKey.id) || 0;
    const now = Date.now();

    // Se passou tempo suficiente desde a última falha, resetar contador
    if (lastFailure && now - lastFailure > this.FAILURE_RESET_TIME) {
      this.apiFailureCount.delete(apiKey.id);
      this.apiLastFailure.delete(apiKey.id);
      return true;
    }

    // Se tem muitas falhas recentes, pular esta API
    return failures < this.MAX_FAILURES_BEFORE_SKIP;
  }

  private getAvailableApis(allApis: GeminiApiKey[]): GeminiApiKey[] {
    return allApis.filter((api) => this.isApiAvailable(api));
  }

  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    // ✅ NOVO: Backoff exponencial mais conservador
    const INITIAL_RETRY_DELAY = 10000; // 10 segundos (não mais 1s)
    const MAX_RETRY_DELAY = 120000; // 2 minutos
    const BACKOFF_MULTIPLIER = 2;
    const JITTER_MAX = 5000; // 0-5 segundos de jitter aleatório

    const exponentialDelay = INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, attempt);
    const jitter = Math.random() * JITTER_MAX;
    return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY);
  }

  // ✅ CRÍTICO: Verificar se API pode ser usada (tracking de RPM/RPD + cooldown + exaustão + LOCK)
  private canUseApi(apiKey: GeminiApiKey): boolean {
    const now = Date.now();

    // ✅ CORREÇÃO: Obter limites dinâmicos baseados no modelo
    const limits = this.getModelLimits(apiKey.model);

    // 0A. ✅ CRÍTICO: Verificar se API está EM USO neste momento (LOCK)
    if (this.apiInUse.get(apiKey.id)) {
      console.log(`🔒 API ${apiKey.name} está EM USO por outra requisição`);
      return false;
    }

    // 0B. ✅ CRÍTICO: Verificar se passou 31s desde última requisição (não 30s, 31s para margem)
    const lastRequestTime = this.apiLastRequestTime.get(apiKey.id);
    if (lastRequestTime) {
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < this.MIN_TIME_BETWEEN_REQUESTS) {
        const remainingSeconds = Math.ceil((this.MIN_TIME_BETWEEN_REQUESTS - timeSinceLastRequest) / 1000);
        console.log(
          `⏱️ API ${apiKey.name} precisa aguardar ${remainingSeconds}s (última req há ${Math.round(timeSinceLastRequest / 1000)}s)`,
        );
        return false;
      }
    }

    // 0. Verificar se está exaurida (RPD)
    const exhaustedUntil = this.keyExhaustedUntil.get(apiKey.id);
    if (exhaustedUntil && now < exhaustedUntil) {
      return false;
    } else if (exhaustedUntil && now >= exhaustedUntil) {
      // Reset: chave voltou a ficar disponível
      this.keyExhaustedUntil.delete(apiKey.id);
      this.apiRequestsPerDay.delete(apiKey.id);
      console.log(`✅ API ${apiKey.name} resetada (novo dia UTC)`);
    }

    // 1. Verificar cooldown manual (RPM)
    const cooldownUntil = this.keyCooldownUntil.get(apiKey.id);
    if (cooldownUntil && now < cooldownUntil) {
      const remainingSeconds = Math.ceil((cooldownUntil - now) / 1000);
      return false;
    }

    // 2. Verificar tracking de timestamps (RPM nos últimos 60s)
    const oneMinuteAgo = now - 60000;
    const rpmTimestamps = (this.apiRequestsPerMinute.get(apiKey.id) || []).filter((t) => t > oneMinuteAgo);

    // ✅ NOVO: Log detalhado do estado RPM para debug
    if (rpmTimestamps.length > 0) {
      const oldestTimestamp = Math.min(...rpmTimestamps);
      const ageOfOldest = Math.round((now - oldestTimestamp) / 1000);
      console.log(
        `📊 [${apiKey.name}] RPM Check: ${rpmTimestamps.length}/${limits.rpm} requisições no último minuto (mais antiga há ${ageOfOldest}s)`,
      );
    }

    if (rpmTimestamps.length >= limits.rpm) {
      // Calcular quando a chave estará disponível novamente
      const oldestTimestamp = Math.min(...rpmTimestamps);
      const nextAvailableAt = oldestTimestamp + 60000; // +60s
      this.keyCooldownUntil.set(apiKey.id, nextAvailableAt);

      const waitTime = Math.ceil((nextAvailableAt - now) / 1000);
      console.warn(
        `⏸️ API ${apiKey.name} atingiu ${limits.rpm} RPM (limite do modelo ${apiKey.model}). Disponível em ${waitTime}s`,
      );
      return false;
    }

    // 3. Verificar RPD (últimas 24h)
    const oneDayAgo = now - 86400000;
    const rpdTimestamps = (this.apiRequestsPerDay.get(apiKey.id) || []).filter((t) => t > oneDayAgo);

    this.apiRequestsPerMinute.set(apiKey.id, rpmTimestamps);
    this.apiRequestsPerDay.set(apiKey.id, rpdTimestamps);

    if (rpdTimestamps.length >= limits.rpd) {
      console.warn(
        `🛑 API ${apiKey.name} atingiu ${limits.rpd} RPD (limite do modelo ${apiKey.model}). Exaurida pelo resto do dia.`,
      );
      return false;
    }

    return true;
  }

  // ✅ CRÍTICO: Reservar API para uso (LOCK) - Chamar ANTES da requisição
  private lockApi(apiKey: GeminiApiKey) {
    const now = Date.now();
    this.apiInUse.set(apiKey.id, true);
    this.apiLastRequestTime.set(apiKey.id, now);

    // ✅ CORREÇÃO CRÍTICA: Limpar timestamps antigos ANTES de adicionar novo
    // RPM conta TODAS as requisições (sucesso OU falha)
    const oneMinuteAgo = now - 60000;
    const rpm = (this.apiRequestsPerMinute.get(apiKey.id) || []).filter((t) => t > oneMinuteAgo); // ✅ BUGFIX: Remover timestamps > 60s
    rpm.push(now);
    this.apiRequestsPerMinute.set(apiKey.id, rpm);

    // ⚠️ RPD só conta requisições BEM-SUCEDIDAS (registrado em recordApiSuccess)
    const rpd = (this.apiRequestsPerDay.get(apiKey.id) || []).filter((t) => now - t < 86400000);

    console.log(`🔒 API ${apiKey.name} RESERVADA para uso (locked) - RPM: ${rpm.length}, RPD atual: ${rpd.length}`);
  }

  // ✅ CRÍTICO: Liberar API após uso (UNLOCK) - Chamar SEMPRE após requisição (sucesso ou erro)
  private unlockApi(apiKey: GeminiApiKey) {
    this.apiInUse.delete(apiKey.id);
    console.log(`🔓 API ${apiKey.name} LIBERADA (unlocked)`);
  }

  // ✅ NOVO: Liberar API após erro recuperável (também limpa timer para permitir retry imediato)
  private unlockApiWithError(apiKey: GeminiApiKey, clearTimer: boolean = true) {
    this.apiInUse.delete(apiKey.id);
    if (clearTimer) {
      this.apiLastRequestTime.delete(apiKey.id);
      console.log(`🔓 API ${apiKey.name} LIBERADA após erro (timer resetado para retry imediato)`);
    } else {
      console.log(`🔓 API ${apiKey.name} LIBERADA após erro (timer mantido)`);
    }
  }

  // ✅ Funções de validação removidas - aceitamos todo conteúdo válido da API

  private enhancePromptForFidelity(originalPrompt: string, context: GenerationContext): string {
    // ✅ Prompts agora vêm completamente estruturados de buildChunkPrompt()
    // Esta função apenas passa o prompt direto sem adicionar contexto extra
    // para evitar duplicação
    return originalPrompt;
  }

  async generateWithFidelity(
    prompt: string,
    availableApis: GeminiApiKey[],
    context: GenerationContext = {},
    options: GenerationOptions = {},
  ): Promise<{ content: string; usedApiId: string }> {
    // ✅ MUDANÇA: retornar objeto com API usada
    const {
      maxRetries = 1, // ✅ CORREÇÃO CRÍTICA: Apenas 1 tentativa por API (não 3!)
      retryDelay = 1000,
      validateResponse = () => true, // ✅ Sem validação - aceitar sempre
      onProgress,
    } = options;

    if (!availableApis.length) {
      throw new Error("Nenhuma API disponível");
    }

    // ✅ NOVO: Verificar cooldown global
    if (this.globalRateLimitCooldown) {
      const remainingCooldown = this.globalRateLimitCooldown - Date.now();
      if (remainingCooldown > 0) {
        onProgress?.(`⏸️ Cooldown global ativo: aguardando ${Math.ceil(remainingCooldown / 1000)}s`);
        await new Promise((resolve) => setTimeout(resolve, remainingCooldown));
        this.globalRateLimitCooldown = null;
        onProgress?.(`✅ Cooldown finalizado, retomando geração`);
      }
    }

    const enhancedPrompt = this.enhancePromptForFidelity(prompt, context);
    let lastError: ApiError | null = null;
    let totalAttempts = 0;
    let consecutiveRateLimits = 0; // ✅ Contador de 429s consecutivos
    const MAX_CONSECUTIVE_RATE_LIMITS = 5; // ✅ Se 5 APIs seguidas dão 429, parar
    const startTime = Date.now();
    const MAX_TOTAL_TIME_MS = 5 * 60 * 1000; // 5 minutos máximo total

    // FASE 2: Rastrear keys que falharam nesta geração específica
    const failedKeysInThisGeneration = new Set<string>();
    const usedApisInThisGeneration = new Set<string>(); // ✅ NOVO: Rastrear APIs usadas

    onProgress?.(`🚀 Iniciando geração com ${availableApis.length} APIs disponíveis`);
    console.log(`📊 APIs disponíveis:`, availableApis.map((a) => a.name).join(", "));
    onProgress?.(`📊 Configuração: ${maxRetries} tentativa por API (rotação completa entre todas)`);
    onProgress?.(`📊 Total de tentativas possíveis: ${availableApis.length} (uma vez em cada API)`);

    // ✅ LOOP INFINITO até conseguir sucesso ou esgotar todas as opções
    let apiIndex = 0;
    const MAX_TOTAL_ATTEMPTS = availableApis.length * maxRetries * 3; // 3x de segurança

    while (totalAttempts < MAX_TOTAL_ATTEMPTS) {
      // ✅ NOVO: Delay de 0.5s antes de tentar próxima API (exceto primeira)
      if (apiIndex > 0) {
        onProgress?.(`⏳ Aguardando ${this.DELAY_BETWEEN_API_ATTEMPTS / 1000}s antes de tentar próxima API...`);
        await new Promise((resolve) => setTimeout(resolve, this.DELAY_BETWEEN_API_ATTEMPTS));
      }

      // FASE 2: Filtrar APIs disponíveis E não falhadas gravemente nesta geração
      let availableApisForThisRound = this.getAvailableApis(availableApis);

      // ✅ CRÍTICO: Remover APENAS as keys que foram BLOQUEADAS (não todas que falharam)
      availableApisForThisRound = availableApisForThisRound.filter((api) => {
        // Se está bloqueada, não usar
        if (!this.isKeyAvailable(api.id)) {
          return false;
        }
        // Se falhou gravemente nesta geração, não usar
        if (failedKeysInThisGeneration.has(api.id)) {
          return false;
        }
        // Se está em cooldown ou exaurida, não usar
        if (!this.canUseApi(api)) {
          return false;
        }
        return true;
      });

      if (availableApisForThisRound.length === 0) {
        onProgress?.(`⚠️ Nenhuma API disponível no momento`);

        // ✅ NOVO: Verificar se há APIs em cooldown que podem voltar
        const apisInCooldown = availableApis.filter((api) => {
          const cooldownUntil = this.keyCooldownUntil.get(api.id);
          return cooldownUntil && cooldownUntil > Date.now();
        });

        if (apisInCooldown.length > 0) {
          // Calcular menor tempo de espera
          const nextAvailable = Math.min(...apisInCooldown.map((api) => this.keyCooldownUntil.get(api.id) || 0));
          const waitTime = Math.ceil((nextAvailable - Date.now()) / 1000);

          if (waitTime > 0 && waitTime <= 60) {
            // Só esperar se for menos de 1 minuto
            onProgress?.(`⏸️ Aguardando ${waitTime}s para próxima API ficar disponível...`);
            await new Promise((resolve) => setTimeout(resolve, nextAvailable - Date.now() + 1000));
            continue; // Tentar novamente após cooldown
          }
        }

        // Se não há APIs em cooldown ou o tempo é muito longo, parar
        onProgress?.(`💥 Todas as APIs esgotadas ou bloqueadas`);
        break;
      }

      const api = availableApisForThisRound[apiIndex % availableApisForThisRound.length];
      apiIndex++;

      // ✅ CRÍTICO: Verificar se API pode ser usada (limites de RPM/RPD + LOCK)
      if (!this.canUseApi(api)) {
        onProgress?.(`⏭️ API ${api.name} não disponível no momento`);
        continue;
      }

      onProgress?.(`🔄 Tentando API: ${api.name}`);
      usedApisInThisGeneration.add(api.name); // ✅ NOVO: Registrar que usou esta API

      // Tentar múltiplas vezes com a mesma API
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        totalAttempts++;

        // Verificar se já passou do tempo limite
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > MAX_TOTAL_TIME_MS) {
          onProgress?.(`⏱️ Tempo limite de 5 minutos atingido após ${totalAttempts} tentativas`);
          onProgress?.(`📊 APIs usadas antes do erro: ${usedApisInThisGeneration.size}/${availableApis.length}`);
          console.log(`📊 APIs testadas:`, Array.from(usedApisInThisGeneration).join(", "));
          throw new Error(
            `Timeout: todas as APIs falharam após ${Math.round(elapsedTime / 1000)}s (${totalAttempts} tentativas)`,
          );
        }

        // ✅ CRÍTICO: Verificar novamente se pode usar (pode ter sido locked por outra requisição)
        if (!this.canUseApi(api)) {
          onProgress?.(`⏭️ API ${api.name} foi reservada por outra requisição, pulando...`);
          break; // Pular para próxima API
        }

        // ✅ CRÍTICO: LOCK - Reservar API ANTES da requisição
        this.lockApi(api);
        onProgress?.(`🔒 API ${api.name} reservada para esta requisição`);

        try {
          onProgress?.(`🔄 Tentativa ${totalAttempts} - ${api.name} (${attempt + 1}/${maxRetries})`);

          // Passar número da tentativa para ajustes automáticos
          const result = await this.makeApiCallWithTimeout(
            enhancedPrompt,
            api,
            {
              ...options,
              onProgress,
            },
            attempt,
            context,
          );

          // Validar resposta
          if (validateResponse(result)) {
            this.recordApiSuccess(api);
            consecutiveRateLimits = 0;
            this.apiRotationIndex = (this.apiRotationIndex + apiIndex + 1) % availableApis.length;

            // ✅ CRÍTICO: Liberar API ANTES de retornar
            this.unlockApi(api);

            onProgress?.(`✅ Geração concluída com sucesso usando ${api.name} após ${totalAttempts} tentativas`);
            return { content: result.trim(), usedApiId: api.id };
          } else {
            const validationError = this.createApiError(
              `Resposta não passou na validação`,
              undefined,
              true, // Validação falha é recuperável
            );
            throw validationError;
          }
        } catch (error) {
          const apiError = isApiError(error)
            ? error
            : this.createApiError(`Erro inesperado: ${error.message}`, undefined, true);

          lastError = apiError;
          this.recordApiFailure(api, apiError);

          // ✅ Log diferenciado para erros do servidor do Google
          if (apiError.status === 503) {
            onProgress?.(`⚠️ API ${api.name}: Servidor do Google sobrecarregado (503) - tentando retry`);
          } else if (apiError.status === 502) {
            onProgress?.(`⚠️ API ${api.name}: Bad Gateway (502) - tentando retry`);
          } else {
            onProgress?.(`❌ Erro na API ${api.name}: ${apiError.message}`);
          }

          // ✅ CRÍTICO: Só marcar como falhada se for erro grave (não recuperável)
          // Erros recuperáveis (timeout, max_tokens, etc) não devem bloquear retry futuro
          const blockInfo = this.shouldBlockKey(apiError, this.apiFailureCount.get(api.id) || 0);
          if (blockInfo.shouldBlock) {
            // Se bloqueou, adicionar à lista de falhadas (não tentar mais nesta geração)
            failedKeysInThisGeneration.add(api.id);
            onProgress?.(`🔒 API ${api.name} bloqueada temporariamente - ${blockInfo.reason}`);
          } else {
            // ✅ CORREÇÃO CRÍTICA: Para erros recuperáveis, limpar TANTO apiLastRequestTime QUANTO o último timestamp de RPM
            // Bug anterior: deletava apiLastRequestTime mas mantinha timestamp em apiRequestsPerMinute,
            // causando falsos positivos de rate limit mesmo após 1 minuto

            this.apiLastRequestTime.delete(api.id);

            // ✅ CORRIGIDO: Remover timestamp RPM para erros que NÃO representam consumo real de quota
            // Erros 502/503 = servidor Google sobrecarregado = NÃO consumiu quota
            // Erros locais (timeout, network) = requisição não chegou = NÃO consumiu quota
            // Erros 429 RPM/RPD = quota já foi consumida ANTES do erro = MANTER timestamp
            const shouldRemoveRpmTimestamp =
              !apiError.status || // Sem status HTTP = erro local
              apiError.status === 502 || // ✅ NOVO: Bad Gateway não consome quota
              apiError.status === 503 || // ✅ NOVO: Service Unavailable não consome quota
              apiError.status === 504 || // ✅ NOVO: Gateway Timeout não consome quota
              apiError.message.toLowerCase().includes("timeout") ||
              apiError.message.toLowerCase().includes("network") ||
              apiError.message.toLowerCase().includes("conexão") ||
              apiError.message.toLowerCase().includes("validação") ||
              apiError.message.toLowerCase().includes("fetch") ||
              apiError.message.toLowerCase().includes("aborted");

            if (shouldRemoveRpmTimestamp) {
              const rpmTimestamps = this.apiRequestsPerMinute.get(api.id) || [];
              if (rpmTimestamps.length > 0) {
                rpmTimestamps.pop(); // Remove o último timestamp (requisição não consumiu quota)
                this.apiRequestsPerMinute.set(api.id, rpmTimestamps);
                console.log(
                  `♻️ [${api.name}] Timestamp RPM removido (erro ${apiError.status || "local"}, não consumiu quota)`,
                );
              }
            } else {
              console.log(
                `📊 [${api.name}] Timestamp RPM mantido (requisição consumiu quota, status: ${apiError.status})`,
              );
            }

            onProgress?.(`♻️ API ${api.name} - ${blockInfo.reason} - disponível para retry imediato`);
          }

          // Se não é retryable, pular para próxima API
          if (!apiError.retryable) {
            onProgress?.(`⏭️ Erro não recuperável, pulando para próxima API`);
            break;
          }

          // ✅ CORREÇÃO CRÍTICA: Para erros recuperáveis que NÃO são rate limit,
          // ir IMEDIATAMENTE para próxima API (não fazer 3 tentativas na mesma)
          if (apiError.code !== "RATE_LIMIT") {
            onProgress?.(`⏭️ Erro recuperável (${apiError.message}), tentando próxima API`);
            break; // Sai do loop de tentativas e vai para próxima API
          }

          // ✅ CRÍTICO: Rate limit (429) - usar informações detalhadas do Google
          if (apiError.code === "RATE_LIMIT") {
            const errorMessage = apiError.message.toLowerCase();
            const now = Date.now();

            // Obter limites do modelo e contagens REAIS
            const limits = this.getModelLimits(api.model);
            const currentRpm = (this.apiRequestsPerMinute.get(api.id) || []).filter((t) => now - t < 60000).length;
            const currentRpd = (this.apiRequestsPerDay.get(api.id) || []).filter((t) => now - t < 86400000).length;

            // Log detalhado para debug
            console.log(
              `📊 [${api.name}] Rate Limit 429 - RPM: ${currentRpm}/${limits.rpm}, RPD: ${currentRpd}/${limits.rpd}`,
            );
            if (apiError.quotaInfo) {
              console.log(`📊 [${api.name}] QuotaId: ${apiError.quotaInfo.quotaId}`);
              console.log(`📊 [${api.name}] RetryDelay: ${apiError.quotaInfo.retryDelay}s`);
            }

            // CASO 1: Billing/Créditos
            if (
              errorMessage.includes("billing") ||
              errorMessage.includes("payment") ||
              errorMessage.includes("plan and billing details") ||
              errorMessage.includes("credits")
            ) {
              onProgress?.(`🛑 API ${api.name}: Sem créditos/billing - verificar Google AI Studio`);
              break;
            }

            // ✅ NOVO: Usar quotaId do Google para identificar o tipo EXATO de rate limit
            const quotaId = apiError.quotaInfo?.quotaId || "";
            const retryDelay = apiError.quotaInfo?.retryDelay;

            // CASO 2: RPD (Requests Per Day)
            if (quotaId.includes("PerDay") || currentRpd >= limits.rpd) {
              this.markKeyAsExhausted(api);
              onProgress?.(`🛑 API ${api.name} atingiu limite diário (RPD). Bloqueada até 00:00 UTC`);
              break;
            }

            // CASO 3: RPM (Requests Per Minute)
            if (quotaId.includes("PerMinute") && !quotaId.toLowerCase().includes("token")) {
              consecutiveRateLimits++;
              // Usar retryDelay do Google ou fallback 30s
              const cooldownMs = retryDelay ? retryDelay * 1000 : 30000;
              this.keyCooldownUntil.set(api.id, now + cooldownMs);
              onProgress?.(
                `⏸️ API ${api.name} atingiu RPM. Cooldown ${Math.ceil(cooldownMs / 1000)}s (Google: ${retryDelay || "?"}s)`,
              );

              // Verificar se TODAS as chaves disponíveis estão em cooldown
              const availableApisForCheck = this.getAvailableApis(availableApis);
              const allInCooldown = availableApisForCheck.every((checkApi) => {
                const checkCooldownUntil = this.keyCooldownUntil.get(checkApi.id);
                return checkCooldownUntil && now < checkCooldownUntil;
              });

              if (allInCooldown) {
                const nextAvailable = Math.min(
                  ...availableApisForCheck
                    .map((checkApi) => this.keyCooldownUntil.get(checkApi.id) || 0)
                    .filter((t) => t > 0),
                );
                const waitTime = Math.ceil((nextAvailable - now) / 1000);
                onProgress?.(`⏸️ Todas as chaves em cooldown. Aguardando ${waitTime}s...`);
                this.globalRateLimitCooldown = nextAvailable;
              }

              break;
            }

            // CASO 4: TPM (Tokens Per Minute)
            if (quotaId.toLowerCase().includes("token") || (currentRpm < limits.rpm && currentRpd < limits.rpd)) {
              consecutiveRateLimits++;
              // Usar retryDelay do Google ou fallback 60s
              const cooldownMs = retryDelay ? retryDelay * 1000 : 60000;
              this.keyCooldownUntil.set(api.id, now + cooldownMs);
              onProgress?.(
                `⚠️ API ${api.name}: Limite TPM. Cooldown ${Math.ceil(cooldownMs / 1000)}s (Google: ${retryDelay || "?"}s)`,
              );
              break;
            }

            // CASO 5: Fallback
            const fallbackCooldown = retryDelay ? retryDelay * 1000 : 60000;
            onProgress?.(`⚠️ API ${api.name}: 429 genérico. Cooldown ${Math.ceil(fallbackCooldown / 1000)}s`);
            this.keyCooldownUntil.set(api.id, now + fallbackCooldown);
            consecutiveRateLimits++;
            break;
          }

          // ✅ NOTA: Não há mais delay entre tentativas na mesma API, pois maxRetries=1
          // O delay de 0.5s é entre trocar de API (linha 1016-1019)
        } finally {
          // ✅ CRÍTICO: UNLOCK - Liberar API em caso de erro (sucesso já liberou antes do return)
          // Verificar se ainda está locked (se não foi liberado no sucesso)
          if (this.apiInUse.get(api.id)) {
            // ✅ CORRIGIDO: Usar unlockApiWithError para limpar timer em erros recuperáveis
            // Isso permite que a API seja reutilizada imediatamente
            const shouldClearTimer =
              lastError &&
              (!lastError.status ||
                lastError.status === 502 ||
                lastError.status === 503 ||
                lastError.status === 504 ||
                lastError.message?.toLowerCase().includes("timeout"));

            if (shouldClearTimer) {
              this.unlockApiWithError(api, true);
            } else {
              this.unlockApi(api);
            }
          }
        }
      }

      // FASE 2: Log ao mudar de API
      onProgress?.(`🔄 API ${api.name} esgotou tentativas, passando para próxima...`);
    }

    // Se chegou aqui, todas as tentativas falharam
    const elapsedTime = Date.now() - startTime;

    // ✅ NOVO: Mostrar quantas APIs foram realmente testadas
    onProgress?.(`📊 APIs usadas antes do erro: ${usedApisInThisGeneration.size}/${availableApis.length}`);
    console.log(`📊 APIs que foram testadas:`, Array.from(usedApisInThisGeneration).join(", "));

    const errorMessage = `Todas as ${availableApis.length} APIs falharam após ${totalAttempts} tentativas em ${Math.round(elapsedTime / 1000)}s. APIs testadas: ${usedApisInThisGeneration.size}. Último erro: ${lastError?.message || "Desconhecido"}`;
    onProgress?.(`💥 ${errorMessage}`);

    // FASE 2: Log de keys bloqueadas
    const blockedKeys = availableApis.filter((api) => !this.isKeyAvailable(api.id));
    if (blockedKeys.length > 0) {
      onProgress?.(`🔒 Keys bloqueadas: ${blockedKeys.length}/${availableApis.length}`);
      blockedKeys.forEach((key) => {
        const reason = this.getKeyBlockReason(key.id);
        if (reason) onProgress?.(`   - ${key.name}: ${reason}`);
      });
    }

    // Mensagens específicas baseadas no tipo de erro
    if (lastError?.code === "RATE_LIMIT") {
      onProgress?.(`💡 Todas as APIs atingiram rate limit. Sugestões:`);
      onProgress?.(`   1. Aguarde ~1 hora para reset das quotas`);
      onProgress?.(`   2. Adicione mais APIs ao sistema`);
      onProgress?.(`   3. Reduza a quantidade de gerações simultâneas`);
    } else {
      onProgress?.(`💡 Sugestão: Verifique as configurações das APIs e tente novamente`);
    }

    throw new Error(errorMessage);
  }

  async generatePremise(
    prompt: string,
    availableApis: GeminiApiKey[],
    targetWords?: number,
    onProgress?: (message: string) => void,
  ): Promise<{ content: string; usedApiId: string }> {
    const targetInfo =
      targetWords && targetWords > 0 ? `${targetWords} palavras (alvo sugestivo)` : "sem meta rígida de palavras";

    onProgress?.(`📚 Iniciando geração de premissa em 1 única requisição (${targetInfo})`);

    // Sempre gerar premissa em 1 única requisição (sem chunks)
    const result = await this.generateWithFidelity(
      prompt,
      availableApis,
      { targetWords: targetWords && targetWords > 0 ? targetWords : undefined },
      {
        temperature: 0.6, // ✅ CORREÇÃO: Reduzido de 0.8 para 0.6 (mais controle, menos "viagens")
        timeoutMs: 180000, // ✅ NOVO: 3 minutos (aumentado para suportar 1000 palavras)
        maxTokens: 40000,
        onProgress,
        validateResponse: (response) => {
          // Validação MÍNIMA - apenas garantir que tem conteúdo
          const texto = response?.trim() || "";

          // Verificar se não está vazio e tem conteúdo substancial
          if (!texto || texto.length < 100) {
            return false;
          }

          // Aceitar qualquer resposta com conteúdo substancial (sem limite máximo)
          return true;
        },
      },
    );

    onProgress?.(`✅ Premissa gerada: ${result.content.split(/\s+/).length} palavras`);
    return result;
  }

  // ✅ DELETADO: generatePremiseInChunks - premissa agora é sempre em 1 única requisição

  async generateScriptChunk(
    prompt: string,
    availableApis: GeminiApiKey[],
    context: GenerationContext,
    onProgress?: (message: string) => void,
  ): Promise<{ content: string; usedApiId: string }> {
    // ✅ CORREÇÃO: O prompt já vem COMPLETO de buildChunkPrompt() com todo o contexto necessário
    // Remover duplicação de contexto que estava causando repetição no roteiro

    onProgress?.(`🎯 Gerando chunk ${(context.chunkIndex ?? 0) + 1}/${context.totalChunks ?? 1}`);

    // ✅ Apenas adicionar adaptação cultural (não duplica contexto anterior)
    const culturalPrompt = this.addCulturalContext(prompt, context);

    // ✅ Aumentar tokens e timeout para chunks de 1000 palavras (último chunk até 2000)
    const maxTokensForChunk = context.isLastChunk ? 80000 : 50000;
    const timeoutForChunk = context.isLastChunk ? 360000 : 300000; // 6 min vs 5 min

    if (context.isLastChunk) {
      onProgress?.(`🏁 Gerando ÚLTIMO CHUNK (até 2000 palavras, timeout 5 min)`);
    }

    const result = await this.generateWithFidelity(culturalPrompt, availableApis, context, {
      temperature: 0.45,
      maxRetries: 3,
      timeoutMs: timeoutForChunk,
      maxTokens: maxTokensForChunk,
      onProgress,
      validateResponse: (response) => {
        // ✅ Validação de resposta: modo simples (chat único) vs modo avançado
        const texto = response?.trim() || "";

        // 1. Contar palavras uma vez para ambos os modos
        const words = texto.split(/\s+/).filter((w) => w.length > 0);
        const isSimple = context.simpleMode === true;

        if (isSimple) {
          // 🔹 MODO SIMPLES: validação LEVE — só rejeita respostas praticamente vazias ou lixo óbvio
          if (words.length < 10) {
            console.warn(`⚠️ [simpleMode] Resposta quase vazia: ${words.length} palavras`);
            return false;
          }
        } else {
          // 🔹 MODO AVANÇADO: manter validação forte baseada em meta de palavras
          let minWords: number;

          if (context.targetWords && context.targetWords > 0) {
            // Exigir ~40% da meta, limitado a 200, com piso por tipo de chunk
            const frac = Math.round(context.targetWords * 0.4);
            const baseMin = context.isLastChunk ? 80 : 120;
            minWords = Math.min(200, Math.max(baseMin, frac));
          } else {
            // Sem meta explícita -> valores padrão mais suaves
            minWords = context.isLastChunk ? 80 : 120;
          }

          if (words.length < minWords) {
            console.warn(`⚠️ Resposta muito curta: ${words.length} palavras (mínimo: ${minWords})`);
            return false;
          }
        }

        // 2. Detectar meta-conteúdo (explicações sobre o que a IA está fazendo)
        const metaPatterns = [
          /\(o roteiro foi/i,
          /\(conforme solicitado/i,
          /\(de acordo com/i,
          /\(seguindo as instruções/i,
          /\(o bloco anterior/i,
          /\(este é o bloco/i,
          /\(concluído no bloco/i,
          /\(a narrativa foi/i,
          /\(como você pediu/i,
          /\(aqui está/i,
          /^claro,?\s+vou/i,
          /^de acuerdo,?\s+aquí/i,
          /^ok,?\s+vou/i,
          /roteiro está completo conforme/i,
          /violaria a estrutura/i,
          /instrução de não repetir/i,
        ];

        for (const pattern of metaPatterns) {
          if (pattern.test(texto)) {
            console.warn(`⚠️ Meta-conteúdo detectado: ${pattern}`);
            return false;
          }
        }

        // 3. Detectar se é APENAS explicação entre parênteses
        const parenthesesContent = texto.match(/^\(.*\)$/s);
        if (parenthesesContent) {
          console.warn(`⚠️ Resposta é apenas texto entre parênteses (meta-explicação)`);
          return false;
        }

        return true;
      },
    });

    // ✅ NOVO: Filtrar meta-conteúdo do resultado antes de retornar
    result.content = this.removeMetaContent(result.content);

    return result; // ✅ Já retorna { content, usedApiId }
  }

  /**
   * ✅ NOVO: Remove meta-conteúdo (explicações da IA sobre o que está fazendo)
   * Remove parênteses com explicações meta e preâmbulos indesejados
   */
  private removeMetaContent(text: string): string {
    if (!text) return text;

    let cleaned = text;

    // 1. Remover blocos entre parênteses que são meta-explicações
    const metaParenthesesPatterns = [
      /\s*\([^)]*(?:o roteiro foi|conforme solicitado|de acordo com|seguindo|instrução|concluído|bloco anterior|violaria a estrutura|roteiro está completo)[^)]*\)\s*/gi,
      /\s*\(Este é o bloco[^)]*\)\s*/gi,
      /\s*\(A narrativa[^)]*\)\s*/gi,
    ];

    for (const pattern of metaParenthesesPatterns) {
      cleaned = cleaned.replace(pattern, " ");
    }

    // 2. Remover preâmbulos no início
    const prefixPatterns = [
      /^claro,?\s+(?:vou|aquí|tienes)[^.!?]*[.!?]\s*/i,
      /^de acuerdo,?\s+aquí[^.!?]*[.!?]\s*/i,
      /^ok,?\s+(?:vou|here|is)[^.!?]*[.!?]\s*/i,
      /^seguindo suas instruções[^.!?]*[.!?]\s*/i,
    ];

    for (const pattern of prefixPatterns) {
      cleaned = cleaned.replace(pattern, "");
    }

    // 3. Limpar múltiplos espaços e linhas em branco excessivas
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

    return cleaned;
  }

  private addCulturalContext(prompt: string, context: GenerationContext): string {
    if (!context.language || !context.location) {
      return prompt;
    }

    const language = getLanguageByCode(context.language);
    if (!language) {
      return prompt;
    }

    let culturalPrompt = prompt;

    culturalPrompt += `\n\n=== ADAPTAÇÃO CULTURAL OBRIGATÓRIA ===`;
    culturalPrompt += `\n🌍 IDIOMA: ${language.name} (${language.nativeName})`;
    culturalPrompt += `\n📍 REGIÃO: ${language.region}`;
    culturalPrompt += `\n🎭 CONTEXTO CULTURAL: ${language.culturalContext}`;

    culturalPrompt += `\n\n🚨 INSTRUÇÕES CULTURAIS CRÍTICAS:`;
    culturalPrompt += `\n- ADAPTE completamente o conteúdo para a cultura ${language.region}`;
    culturalPrompt += `\n- USE expressões, gírias e referências locais apropriadas`;
    culturalPrompt += `\n- CONSIDERE feriados, tradições e valores culturais locais`;
    culturalPrompt += `\n- EVITE referências que não façam sentido na cultura local`;
    culturalPrompt += `\n- USE a linguagem coloquial e moderna que as pessoas falam hoje nessa região (nada de linguagem de época ou formal).`;

    // Adaptações COMPLETAS para TODOS os idiomas
    const culturalAdaptations: Record<string, string[]> = {
      "pt-BR": [
        'Use gírias brasileiras naturais (ex: "cara", "mano", "galera", "tá ligado")',
        "Referencie cultura brasileira (futebol, carnaval, novelas, BBB, sertanejo)",
        "Use moeda Real (R$), medidas métricas, e horários brasileiros",
      ],
      "pt-PT": [
        'Use português europeu (ex: "malta", "pá", "fixe")',
        "Referencie cultura portuguesa (fado, bacalhau, Cristiano Ronaldo)",
        "Use Euro (€) e sistema métrico",
      ],
      "en-US": [
        "Use American English spelling (color, realize, organize)",
        "Reference American culture (NFL, Thanksgiving, Hollywood, Silicon Valley)",
        "Use USD ($) and imperial measurements (miles, pounds, Fahrenheit)",
      ],
      "en-GB": [
        "Use British English spelling (colour, realise, organise)",
        "Reference British culture (football/Premier League, tea, royal family)",
        "Use GBP (£) and metric system",
      ],
      "en-AU": [
        "Use Australian English (mate, arvo, barbie)",
        "Reference Australian culture (AFL, beaches, outback)",
        "Use AUD ($) and metric system",
      ],
      "es-ES": [
        'Use español peninsular con "vosotros"',
        "Referencie cultura española (tapas, siesta, La Liga, flamenco)",
        "Use Euro (€) y sistema métrico",
      ],
      "es-MX": [
        "Use mexicanismos (órale, qué padre, chido, ándale)",
        "Referencie cultura mexicana (tacos, mariachi, Día de Muertos, lucha libre)",
        "Use peso mexicano (MXN) y sistema métrico",
      ],
      "es-AR": [
        "Use argentinismos con voseo (che, boludo, dale)",
        "Referencie cultura argentina (tango, asado, fútbol, Messi)",
        "Use peso argentino (ARS) y sistema métrico",
      ],
      "fr-FR": [
        "Utilisez expressions françaises authentiques (c'est-à-dire, n'est-ce pas)",
        "Référencez culture française (gastronomie, vin, Tour Eiffel, mode)",
        "Utilisez euro (€) et système métrique",
      ],
      "fr-CA": [
        "Utilisez québécois authentique (tabarnak, calisse, icitte)",
        "Référencez culture québécoise (poutine, hockey, hiver, cabanes à sucre)",
        "Utilisez dollar canadien (CAD) et système métrique",
      ],
      "de-DE": [
        "Verwenden Sie Hochdeutsch mit regionalen Ausdrücken",
        "Referenzieren Sie deutsche Kultur (Bier, Oktoberfest, Autobahn, Effizienz)",
        "Verwenden Sie Euro (€) und metrisches System",
      ],
      "it-IT": [
        "Usa espressioni italiane autentiche (allora, cioè, dai)",
        "Riferimenti alla cultura italiana (pasta, calcio, moda, arte)",
        "Usa euro (€) e sistema metrico",
      ],
      "ru-RU": [
        "Используйте русские выражения и идиомы",
        "Ссылайтесь на русскую культуру (балет, водка, Красная площадь)",
        "Используйте рубли (₽) и метрическую систему",
      ],
      "zh-CN": [
        "使用简体中文表达方式和网络用语",
        "参考中国文化（春节、火锅、功夫、高铁）",
        "使用人民币（¥）和公制单位",
      ],
      "zh-TW": ["使用繁體中文和台灣用語", "參考台灣文化（夜市、珍珠奶茶、101大樓）", "使用新台幣（NT$）和公制單位"],
      "ja-JP": [
        "日本語の敬語と自然な表現を使用",
        "日本文化を参照（アニメ、寿司、桜、温泉）",
        "円（¥）とメートル法を使用",
      ],
      "ko-KR": [
        "한국어 존댓말과 자연스러운 표현 사용",
        "한국 문화 참조 (K-pop, 김치, 한복, 태권도)",
        "원화 (₩)와 미터법 사용",
      ],
      "ar-SA": [
        "استخدم التعبيرات العربية الأصيلة",
        "اشر إلى الثقافة السعودية (الحج، التمر، الصحراء)",
        "استخدم الريال السعودي (SAR) والنظام المتري",
      ],
      "hi-IN": [
        "हिंदी मुहावरे और प्राकृतिक अभिव्यक्तियों का प्रयोग करें",
        "भारतीय संस्कृति का संदर्भ दें (बॉलीवुड, दिवाली, योग)",
        "रुपये (₹) और मीट्रिक प्रणाली का उपयोग करें",
      ],
      "tr-TR": [
        "Türk deyimleri ve doğal ifadeler kullan",
        "Türk kültürüne atıfta bulun (çay, kebap, Kapadokya)",
        "Türk Lirası (₺) ve metrik sistem kullan",
      ],
      "nl-NL": [
        "Gebruik Nederlandse uitdrukkingen en gezegden",
        "Refereer aan Nederlandse cultuur (kaas, fietsen, molens)",
        "Gebruik euro (€) en metrisch stelsel",
      ],
      "pl-PL": [
        "Używaj polskich wyrażeń i zwrotów",
        "Odnosząc się do polskiej kultury (pierogi, Chopin, solidarność)",
        "Używaj złotych (PLN) i systemu metrycznego",
      ],
      "sv-SE": [
        "Använd svenska uttryck och ordstäv",
        "Referera till svensk kultur (fika, IKEA, midsommar)",
        "Använd kronor (SEK) och metriskt system",
      ],
    };

    const adaptations = culturalAdaptations[context.language];
    if (adaptations) {
      adaptations.forEach((adaptation) => {
        culturalPrompt += `\n- ${adaptation}`;
      });
    } else {
      // Fallback genérico para idiomas não listados
      culturalPrompt += `\n- Adapte completamente para a cultura de ${language.region}`;
      culturalPrompt += `\n- Use expressões idiomáticas e referências culturais locais`;
      culturalPrompt += `\n- Use moeda local e sistema de medidas apropriado`;
      culturalPrompt += `\n- Considere feriados, tradições e valores culturais específicos`;
    }

    culturalPrompt += `\n\n⚠️ NUNCA ignore essas adaptações culturais - elas são ESSENCIAIS para retenção!`;

    return culturalPrompt;
  }

  // Método para obter estatísticas das APIs
  getApiStats(): { [apiId: string]: { failures: number; lastFailure?: Date; available: boolean } } {
    const stats: { [apiId: string]: { failures: number; lastFailure?: Date; available: boolean } } = {};

    for (const [apiId, failures] of this.apiFailureCount.entries()) {
      const lastFailure = this.apiLastFailure.get(apiId);
      stats[apiId] = {
        failures,
        lastFailure: lastFailure ? new Date(lastFailure) : undefined,
        available: failures < this.MAX_FAILURES_BEFORE_SKIP,
      };
    }

    return stats;
  }

  // Método para resetar estatísticas de uma API específica
  // ✅ CORREÇÃO: Reset completo de uma API (usado pelo botão de reset no monitor)
  resetApiStats(apiId: string) {
    // Limpar contadores de falha
    this.apiFailureCount.delete(apiId);
    this.apiLastFailure.delete(apiId);

    // Limpar bloqueios
    this.keyBlockedUntil.delete(apiId);
    this.keyBlockReason.delete(apiId);

    // Limpar exaustão (RPD)
    this.keyExhaustedUntil.delete(apiId);

    // Limpar cooldown (RPM)
    this.keyCooldownUntil.delete(apiId);

    // Limpar histórico de requisições (RPM e RPD)
    this.apiRequestsPerMinute.delete(apiId);
    this.apiRequestsPerDay.delete(apiId);

    // Liberar LOCK se estiver travado
    this.apiInUse.delete(apiId);

    // Limpar último request time
    this.apiLastRequestTime.delete(apiId);

    // Atualizar persistência
    this.saveQuarantinedKeysToStorage();
    this.saveExhaustedKeysToStorage();

    console.log(`🔄 API ${apiId} - TODOS os contadores e bloqueios foram resetados`);
  }

  /**
   * ✅ NOVO: Resetar TODAS as APIs de uma vez (botão manual global)
   */
  public resetAllApis() {
    console.log(`🔄 [RESET MANUAL] Iniciando reset global de TODAS as APIs...`);

    // Obter todas as APIs conhecidas
    const allApiIds = new Set<string>([
      ...this.apiFailureCount.keys(),
      ...this.keyBlockedUntil.keys(),
      ...this.keyExhaustedUntil.keys(),
      ...this.keyCooldownUntil.keys(),
      ...this.apiRequestsPerMinute.keys(),
      ...this.apiRequestsPerDay.keys(),
      ...this.apiInUse.keys(),
      ...this.apiLastRequestTime.keys(),
    ]);

    // Limpar TODOS os Maps
    this.apiFailureCount.clear();
    this.apiLastFailure.clear();
    this.keyBlockedUntil.clear();
    this.keyBlockReason.clear();
    this.keyExhaustedUntil.clear();
    this.keyCooldownUntil.clear();
    this.apiRequestsPerMinute.clear();
    this.apiRequestsPerDay.clear();
    this.apiInUse.clear();
    this.apiLastRequestTime.clear();

    // Resetar cooldown global
    this.globalRateLimitCooldown = null;

    // Atualizar persistência
    this.saveQuarantinedKeysToStorage();
    this.saveExhaustedKeysToStorage();

    console.log(`✅ [RESET MANUAL] TODAS as ${allApiIds.size} APIs foram resetadas completamente!`);
    console.log(`   - Contadores de falha: zerados`);
    console.log(`   - Bloqueios/quarentena: removidos`);
    console.log(`   - Exaustões RPD: removidas`);
    console.log(`   - Cooldowns RPM: removidos`);
    console.log(`   - Históricos RPM/RPD: zerados`);
    console.log(`   - Locks: liberados`);

    return allApiIds.size;
  }
}

export const enhancedGeminiService = EnhancedGeminiService.getInstance();
