import { DeepseekApiKey } from "@/types/scripts";

// Usar proxy do Supabase para evitar erro de CORS
const SUPABASE_URL = "https://wzldbdmcozbmivztbmik.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bGRiZG1jb3pibWl2enRibWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzIxMjEsImV4cCI6MjA3Nzc0ODEyMX0.J7bG_ymiHUT47WIBEqR82PVRIyGfW1NoVNBOY1sOuBQ";
const DEEPSEEK_PROXY_URL = `${SUPABASE_URL}/functions/v1/deepseek-proxy`;

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
}

interface ApiError extends Error {
  code?: string;
  status?: number;
  retryable?: boolean;
}

export class EnhancedDeepseekService {
  private static instance: EnhancedDeepseekService;
  private apiRotationIndex = 0;
  private apiFailureCount = new Map<string, number>();
  private apiLastFailure = new Map<string, number>();
  private readonly FAILURE_RESET_TIME = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_FAILURES_BEFORE_SKIP = 5;
  private readonly DELAY_BETWEEN_API_ATTEMPTS = 500; // 0.5s entre tentativas

  // Rate limiting
  private apiRequestsPerMinute = new Map<string, number[]>();
  private keyCooldownUntil = new Map<string, number>();
  private apiInUse = new Map<string, boolean>();
  private apiLastRequestTime = new Map<string, number>();

  private constructor() {
    console.log("EnhancedDeepseekService inicializado");
  }

  static getInstance(): EnhancedDeepseekService {
    if (!EnhancedDeepseekService.instance) {
      EnhancedDeepseekService.instance = new EnhancedDeepseekService();
    }
    return EnhancedDeepseekService.instance;
  }

  private createApiError(message: string, status?: number, retryable = false): ApiError {
    const error = new Error(message) as ApiError;
    error.status = status;
    error.retryable = retryable;
    return error;
  }

  private async lockApi(apiKey: DeepseekApiKey): Promise<boolean> {
    if (this.apiInUse.get(apiKey.id)) {
      return false;
    }
    this.apiInUse.set(apiKey.id, true);

    // Registrar timestamp da requisicao (RPM tracking)
    const now = Date.now();
    const rpm = this.apiRequestsPerMinute.get(apiKey.id) || [];
    rpm.push(now);
    this.apiRequestsPerMinute.set(
      apiKey.id,
      rpm.filter((t) => now - t < 60000),
    );
    this.apiLastRequestTime.set(apiKey.id, now);

    return true;
  }

  private releaseApi(apiKey: DeepseekApiKey): void {
    this.apiInUse.delete(apiKey.id);
  }

  private canUseApi(apiKey: DeepseekApiKey): boolean {
    const now = Date.now();

    // Verificar se esta em uso
    if (this.apiInUse.get(apiKey.id)) {
      return false;
    }

    // Verificar cooldown
    const cooldownUntil = this.keyCooldownUntil.get(apiKey.id);
    if (cooldownUntil && now < cooldownUntil) {
      return false;
    }

    // Verificar falhas recentes
    const failures = this.apiFailureCount.get(apiKey.id) || 0;
    const lastFailure = this.apiLastFailure.get(apiKey.id) || 0;
    if (lastFailure && now - lastFailure > this.FAILURE_RESET_TIME) {
      this.apiFailureCount.delete(apiKey.id);
      this.apiLastFailure.delete(apiKey.id);
    } else if (failures >= this.MAX_FAILURES_BEFORE_SKIP) {
      return false;
    }

    return true;
  }

  private recordApiFailure(apiKey: DeepseekApiKey, error: ApiError): void {
    const currentFailures = this.apiFailureCount.get(apiKey.id) || 0;
    this.apiFailureCount.set(apiKey.id, currentFailures + 1);
    this.apiLastFailure.set(apiKey.id, Date.now());

    // Cooldown por rate limit
    if (error.status === 429) {
      this.keyCooldownUntil.set(apiKey.id, Date.now() + 60000); // 1 minuto
    }
  }

  private recordApiSuccess(apiKey: DeepseekApiKey): void {
    this.apiFailureCount.delete(apiKey.id);
    this.apiLastFailure.delete(apiKey.id);
    this.keyCooldownUntil.delete(apiKey.id);
  }

  private selectNextApi(availableApis: DeepseekApiKey[]): DeepseekApiKey | null {
    const usableApis = availableApis.filter((api) => this.canUseApi(api));

    if (usableApis.length === 0) {
      console.warn("Nenhuma API DeepSeek disponivel no momento");
      return null;
    }

    this.apiRotationIndex = (this.apiRotationIndex + 1) % usableApis.length;
    return usableApis[this.apiRotationIndex];
  }

  private async makeApiRequest(
    prompt: string,
    apiKey: DeepseekApiKey,
    options: GenerationOptions = {},
    attemptNumber: number = 0,
  ): Promise<string> {
    const { temperature = 0.7, maxTokens = 8192, timeoutMs = 120000, onProgress } = options;

    // Tentar obter lock
    const gotLock = await this.lockApi(apiKey);
    if (!gotLock) {
      throw this.createApiError("API em uso por outra requisicao", undefined, true);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      onProgress?.(`Chamando API DeepSeek (${apiKey.name})...`);

      // Usar proxy do Supabase para evitar CORS
      const response = await fetch(DEEPSEEK_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "x-deepseek-api-key": apiKey.key,
        },
        body: JSON.stringify({
          model: apiKey.model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || "Unknown error";

        console.error(`DeepSeek API Error [${apiKey.name}]:`, {
          status: response.status,
          errorMessage,
        });

        let apiError: ApiError;

        if (response.status === 429) {
          apiError = this.createApiError("Rate limit atingido", 429, true);
        } else if (response.status === 401) {
          apiError = this.createApiError("API key invalida", 401, false);
        } else if (response.status === 403) {
          apiError = this.createApiError("Acesso negado", 403, false);
        } else if (response.status >= 500) {
          apiError = this.createApiError("Erro no servidor DeepSeek", response.status, true);
        } else {
          apiError = this.createApiError(errorMessage, response.status, false);
        }

        throw apiError;
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw this.createApiError("Nenhum conteudo gerado", undefined, true);
      }

      const content = data.choices[0].message?.content;
      if (!content || content.trim().length < 20) {
        throw this.createApiError("Resposta muito curta ou vazia", undefined, true);
      }

      const wordCount = content.split(/\s+/).length;
      console.log(`DeepSeek ${apiKey.name}: ${wordCount} palavras geradas`);

      onProgress?.(`Resposta recebida de ${apiKey.name} (${wordCount} palavras)`);
      return content;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw this.createApiError(`Timeout na API ${apiKey.name}`, undefined, true);
      }

      throw error;
    } finally {
      this.releaseApi(apiKey);
    }
  }

  private async generateWithFidelity(
    prompt: string,
    availableApis: DeepseekApiKey[],
    context: GenerationContext = {},
    options: GenerationOptions = {},
  ): Promise<{ content: string; usedApiId: string }> {
    const { maxRetries = 3, onProgress, validateResponse } = options;

    let lastError: Error | null = null;
    let attempts = 0;
    const maxTotalAttempts = Math.min(availableApis.length * maxRetries, 20);

    while (attempts < maxTotalAttempts) {
      const apiKey = this.selectNextApi(availableApis);

      if (!apiKey) {
        // Todas as APIs estao em cooldown, aguardar
        onProgress?.("Todas as APIs em cooldown, aguardando...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
        continue;
      }

      try {
        const content = await this.makeApiRequest(prompt, apiKey, options, attempts);

        // Validar resposta se houver funcao de validacao
        if (validateResponse && !validateResponse(content)) {
          throw this.createApiError("Resposta nao passou na validacao", undefined, true);
        }

        this.recordApiSuccess(apiKey);
        return { content, usedApiId: apiKey.id };
      } catch (error: any) {
        lastError = error;
        this.recordApiFailure(apiKey, error);

        if (!error.retryable) {
          console.error(`Erro nao recuperavel com ${apiKey.name}: ${error.message}`);
        }

        // Delay entre tentativas
        await new Promise((resolve) => setTimeout(resolve, this.DELAY_BETWEEN_API_ATTEMPTS));
        attempts++;
      }
    }

    throw lastError || new Error("Todas as tentativas falharam");
  }

  async generatePremise(
    prompt: string,
    availableApis: DeepseekApiKey[],
    targetWords: number = 1000,
    onProgress?: (message: string) => void,
  ): Promise<{ content: string; usedApiId: string }> {
    onProgress?.(`Iniciando geracao de premissa DeepSeek (${targetWords} palavras)`);

    const result = await this.generateWithFidelity(
      prompt,
      availableApis,
      { targetWords },
      {
        temperature: 0.75,
        timeoutMs: 180000, // 3 minutos
        maxTokens: 40000,
        onProgress,
        validateResponse: (response) => {
          const texto = response?.trim() || "";
          return texto.length >= 100;
        },
      },
    );

    onProgress?.(`Premissa gerada: ${result.content.split(/\s+/).length} palavras`);
    return result;
  }

  async generateScriptChunk(
    prompt: string,
    availableApis: DeepseekApiKey[],
    context: GenerationContext,
    onProgress?: (message: string) => void,
  ): Promise<{ content: string; usedApiId: string }> {
    onProgress?.(`Gerando chunk ${(context.chunkIndex ?? 0) + 1}/${context.totalChunks ?? 1}`);

    const result = await this.generateWithFidelity(prompt, availableApis, context, {
      temperature: 0.45,
      timeoutMs: 180000, // 3 minutos
      maxTokens: 32000,
      onProgress,
      validateResponse: (response) => {
        const texto = response?.trim() || "";
        return texto.length >= 50;
      },
    });

    const wordCount = result.content.split(/\s+/).length;
    onProgress?.(`Chunk gerado: ${wordCount} palavras`);

    return result;
  }

  // Metodos publicos para status
  public isKeyAvailable(apiId: string): boolean {
    const now = Date.now();

    if (this.apiInUse.get(apiId)) return false;

    const cooldownUntil = this.keyCooldownUntil.get(apiId);
    if (cooldownUntil && now < cooldownUntil) return false;

    const failures = this.apiFailureCount.get(apiId) || 0;
    const lastFailure = this.apiLastFailure.get(apiId) || 0;
    if (lastFailure && now - lastFailure < this.FAILURE_RESET_TIME && failures >= this.MAX_FAILURES_BEFORE_SKIP) {
      return false;
    }

    return true;
  }

  public isKeyInCooldown(apiId: string): boolean {
    const cooldownUntil = this.keyCooldownUntil.get(apiId);
    return cooldownUntil ? cooldownUntil > Date.now() : false;
  }

  public getApiUsageStats(apiId: string): { rpm: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const rpmTimestamps = (this.apiRequestsPerMinute.get(apiId) || []).filter((t) => t > oneMinuteAgo);

    return { rpm: rpmTimestamps.length };
  }
}

// Singleton export
export const enhancedDeepseekService = EnhancedDeepseekService.getInstance();
