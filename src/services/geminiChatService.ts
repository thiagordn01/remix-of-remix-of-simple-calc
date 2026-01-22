import { GeminiApiKey } from "@/types/scripts";
import { enhancedGeminiService } from "./enhancedGeminiApi";

interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  systemInstruction?: string;
  apiKeys: GeminiApiKey[]; // Lista de APIs para rotação
  currentApiIndex: number; // Índice da API atual
  failedApis: Set<string>; // APIs que falharam nesta sessão específica
}

interface ChatConfig {
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export class GeminiChatService {
  private sessions: Map<string, ChatSession> = new Map();

  /**
   * Cria uma nova sessão de chat com histórico persistente
   */
  createChat(sessionId: string, apiKeys: GeminiApiKey | GeminiApiKey[], config: ChatConfig = {}): string {
    const keysArray = Array.isArray(apiKeys) ? apiKeys : [apiKeys];

    if (keysArray.length === 0) {
      throw new Error("Pelo menos uma API key é necessária");
    }

    this.sessions.set(sessionId, {
      sessionId,
      messages: [],
      systemInstruction: config.systemInstruction,
      apiKeys: keysArray,
      currentApiIndex: 0,
      failedApis: new Set(),
    });

    console.log(`💬 Chat criado: ${sessionId} com ${keysArray.length} APIs disponíveis`);
    return sessionId;
  }

  /**
   * Envia mensagem e recebe resposta, mantendo histórico
   */
  async sendMessage(
    sessionId: string,
    message: string,
    options: {
      temperature?: number;
      maxOutputTokens?: number;
      timeoutMs?: number;
      onProgress?: (text: string) => void;
    } = {},
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Sessão de chat não encontrada: ${sessionId}`);
    }

    // Adiciona mensagem do usuário ao histórico
    session.messages.push({
      role: "user",
      parts: [{ text: message }],
    });

    try {
      // Tenta com rotação de APIs
      const response = await this.callWithRetry(
        session,
        options.temperature ?? 0.7,
        options.maxOutputTokens ?? 8192,
        options.timeoutMs ?? 300000, // Default 300s (5 min) para evitar timeout em gerações longas
        options.onProgress,
      );

      // Adiciona resposta da IA ao histórico APENAS se sucesso
      session.messages.push({
        role: "model",
        parts: [{ text: response }],
      });

      return response;
    } catch (error) {
      // Se falhou definitivamente, remove a mensagem do usuário para não "sujar" o histórico num retry manual
      session.messages.pop();
      throw error;
    }
  }

  /**
   * Tenta chamar a API com rotação robusta e espera inteligente
   */
  private async callWithRetry(
    session: ChatSession,
    temperature: number,
    maxOutputTokens: number,
    timeoutMs: number,
    onProgress?: (text: string) => void,
  ): Promise<string> {
    let lastError: Error | null = null;

    // Limite de segurança para não ficar em loop eterno se houver erro de lógica
    // 3x o número de chaves deve ser suficiente para cobrir cooldowns
    const MAX_TOTAL_ATTEMPTS = session.apiKeys.length * 3;
    let attempts = 0;

    // Se todas já falharam anteriormente, limpar histórico de falhas da sessão para tentar de novo
    if (session.failedApis.size >= session.apiKeys.length) {
      console.log("♻️ Resetando lista de falhas da sessão de chat (todas as keys já foram tentadas)");
      session.failedApis.clear();
    }

    while (attempts < MAX_TOTAL_ATTEMPTS) {
      attempts++;

      // 1. Obter a melhor API disponível
      const apiKey = await this.getSmartAvailableApi(session, onProgress);

      if (!apiKey) {
        // Se retornou null, é porque realmente não tem nada, nem esperando.
        throw new Error("Todas as APIs estão indisponíveis ou esgotadas no momento.");
      }

      try {
        console.log(`🔄 [Chat] Tentativa ${attempts} com API: ${apiKey.name}`);

        // Registrar tentativa no sistema central (para métricas de RPM)
        enhancedGeminiService.registerExternalApiUsage(apiKey.id);

        const response = await this.callGeminiWithHistory(session, apiKey, temperature, maxOutputTokens, timeoutMs);

        // ✅ SUCESSO
        return response;
      } catch (error: any) {
        lastError = error;
        const msg = error.message?.toLowerCase() || "";

        // Detecção de Erros Retryable
        const is429 = msg.includes("429") || msg.includes("quota") || msg.includes("resource has been exhausted");
        const is5xx = msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("overloaded");
        const isNetwork = msg.includes("fetch") || msg.includes("network") || msg.includes("timeout");

        // Erros fatais (não adianta tentar outra API se o prompt for inválido, mas aqui assumimos erro de chave)
        const isFatal = msg.includes("invalid argument") || msg.includes("key not valid");

        // Reportar erro para o sistema central gerenciar quarentena
        enhancedGeminiService.reportExternalError(apiKey.id, {
          message: msg,
          status: is429 ? 429 : 500,
        });

        // Marcar falha nesta sessão
        session.failedApis.add(apiKey.key);

        // Se for 429, logar e continuar imediatamente para a próxima
        if (is429) {
          console.warn(`⚠️ [Chat] 429 na API ${apiKey.name}. Rotacionando...`);
          onProgress?.(`⚠️ API ${apiKey.name} esgotada (429). Trocando...`);
          // Pequeno delay para não bombardear
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        if (is5xx || isNetwork) {
          console.warn(`⚠️ [Chat] Erro de servidor/rede na API ${apiKey.name}. Rotacionando...`);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        // Se for erro fatal de chave, continuar
        console.error(`❌ [Chat] Erro na API ${apiKey.name}: ${msg}`);
      }
    }

    throw lastError || new Error(`Falha no Chat após ${attempts} tentativas.`);
  }

  /**
   * Lógica inteligente para pegar a próxima API
   * Se todas estiverem em cooldown, ele ESPERA em vez de retornar null/erro
   */
  private async getSmartAvailableApi(
    session: ChatSession,
    onProgress?: (text: string) => void,
  ): Promise<GeminiApiKey | null> {
    const startTime = Date.now();
    const TIMEOUT_WAITING_FOR_KEY = 60000; // Esperar no máximo 1 min por uma chave livre

    while (Date.now() - startTime < TIMEOUT_WAITING_FOR_KEY) {
      // Filtra APIs que ainda não falharam nesta sessão específica
      const candidates = session.apiKeys.filter((api) => !session.failedApis.has(api.key));

      if (candidates.length === 0) {
        // Se todas falharam nesta sessão, vamos tentar "ressuscitar" as que tiveram erros leves (não bloqueadas globalmente)
        const globalSafe = session.apiKeys.filter((api) => enhancedGeminiService.isKeyAvailable(api.id));
        if (globalSafe.length > 0) {
          // Achamos algumas que o sistema global diz estarem OK, vamos limpar a lista local e usar
          session.failedApis.clear();
          continue;
        }
        return null; // Realmente sem opções
      }

      // 1. Tentar achar uma chave "Perfeita" (Globalmente disponível e sem cooldown)
      const perfectApi = candidates.find((api) => enhancedGeminiService.isKeyAvailable(api.id));

      if (perfectApi) {
        return perfectApi;
      }

      // 2. Se não tem perfeita, verificar se tem alguma que está APENAS em Cooldown (RPM)
      // e esperar ela liberar
      const cooldownApi = candidates.find((api) => enhancedGeminiService.isKeyInCooldown(api.id));

      if (cooldownApi) {
        onProgress?.(`⏳ Todas as APIs ocupadas. Aguardando liberação...`);
        console.log(`⏳ [Chat] Aguardando 5s por liberação de API...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue; // Tenta o loop de novo
      }

      // 3. Fallback agressivo: Se o sistema global diz que está bloqueada, mas aqui ainda não falhou,
      // vamos tentar usar assim mesmo (o bloqueio global pode ser falso positivo de outra thread)
      // Pegamos a primeira da lista de candidatos
      if (candidates.length > 0) {
        console.log(`⚠️ [Chat] Usando API em estado incerto (Fallback): ${candidates[0].name}`);
        return candidates[0];
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return null;
  }

  /**
   * Chama a API do Gemini (fetch direto para garantir controle total)
   */
  private async callGeminiWithHistory(
    session: ChatSession,
    apiKey: GeminiApiKey,
    temperature: number,
    maxOutputTokens: number,
    timeoutMs: number,
  ): Promise<string> {
    const { messages, systemInstruction } = session;

    // Setup de Timeout com AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {

      const requestBody: any = {
        contents: messages,
        generationConfig: {
          temperature,
          maxOutputTokens: Math.min(maxOutputTokens, 8192), // 🔒 Trava de segurança para evitar 503
        },
      };

      if (systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      // ✅ DESATIVADO PARA TESTE: Configuração para modelos Thinking (Gemini 3)
      // O modo thinking pode estar causando respostas vazias/503 no chat com histórico
      // if (apiKey.model.includes("gemini-3")) {
      //   requestBody.generationConfig.thinkingConfig = {
      //     thinkingLevel: "HIGH",
      //   };
      // }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${apiKey.model}:generateContent?key=${apiKey.key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || response.statusText;
        throw new Error(`Gemini API Error: ${response.status} - ${msg}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!text) {
        throw new Error("Resposta vazia da API Gemini (sem conteúdo gerado)");
      }

      return text;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error(`Timeout na API ${apiKey.name} após ${timeoutMs}ms (abortado)`);
      }
      throw error;
    }
  }

  getHistory(sessionId: string): ChatMessage[] {
    return this.sessions.get(sessionId)?.messages || [];
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export const geminiChatService = new GeminiChatService();
