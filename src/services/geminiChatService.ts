/**
 * Gemini Chat Service - Mantém histórico de conversa como o sistema de referência
 *
 * A diferença crucial: ao invés de chamadas isoladas, usamos o array `contents`
 * para manter o histórico da conversa. A IA vê todas as mensagens anteriores.
 *
 * Isso é equivalente ao `ai.chats.create()` do SDK @google/genai.
 *
 * IMPORTANTE: Suporta rotação automática de APIs em caso de erro 429 e 503.
 */

import { GeminiApiKey } from '@/types/scripts';
import { enhancedGeminiService } from './enhancedGeminiApi';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatSession {
  messages: ChatMessage[];
  systemInstruction?: string;
  apiKeys: GeminiApiKey[];  // Lista de APIs para rotação
  currentApiIndex: number;  // Índice da API atual
  failedApis: Set<string>;  // APIs que falharam com 429
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
   * Aceita uma lista de APIs para rotação automática em caso de erro
   */
  createChat(
    sessionId: string,
    apiKeys: GeminiApiKey | GeminiApiKey[],
    config: ChatConfig = {}
  ): string {
    const keysArray = Array.isArray(apiKeys) ? apiKeys : [apiKeys];

    if (keysArray.length === 0) {
      throw new Error('Pelo menos uma API key é necessária');
    }

    this.sessions.set(sessionId, {
      messages: [],
      systemInstruction: config.systemInstruction,
      apiKeys: keysArray,
      currentApiIndex: 0,
      failedApis: new Set()
    });

    console.log(`💬 Chat criado: ${sessionId} com ${keysArray.length} APIs disponíveis`);
    return sessionId;
  }

  /**
   * Envia mensagem e recebe resposta, mantendo histórico
   * Rotaciona automaticamente para próxima API em caso de erro 429
   */
  async sendMessage(
    sessionId: string,
    message: string,
    options: {
      temperature?: number;
      maxOutputTokens?: number;
      onProgress?: (text: string) => void;
    } = {}
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Sessão de chat não encontrada: ${sessionId}`);
    }

    // Adiciona mensagem do usuário ao histórico
    session.messages.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Tenta com rotação de APIs
    const response = await this.callWithRetry(
      session,
      options.temperature ?? 0.9,
      options.maxOutputTokens ?? 8192
    );

    // Adiciona resposta da IA ao histórico
    session.messages.push({
      role: 'model',
      parts: [{ text: response }]
    });

    options.onProgress?.(response);

    return response;
  }

  /**
   * Tenta chamar a API com rotação automática em caso de erro 429, 503 e outros erros retryable
   */
  private async callWithRetry(
    session: ChatSession,
    temperature: number,
    maxOutputTokens: number,
    maxRetries: number = 10  // ✅ CORREÇÃO: Aumentado para suportar mais rotações
  ): Promise<string> {
    const availableApis = session.apiKeys.filter(
      api => !session.failedApis.has(api.key)
    );

    if (availableApis.length === 0) {
      // Limpa APIs falhadas e tenta novamente (podem ter se recuperado)
      console.log('⚠️ Todas as APIs falharam, limpando lista e tentando novamente...');
      session.failedApis.clear();
    }

    let lastError: Error | null = null;
    let totalAttempts = 0;
    const MAX_TOTAL_ATTEMPTS = session.apiKeys.length * 2; // ✅ Máximo = 2x número de APIs

    while (totalAttempts < MAX_TOTAL_ATTEMPTS) {
      totalAttempts++;

      // Seleciona próxima API disponível (que não está em uso e não falhou)
      const apiKey = this.getNextAvailableApi(session);

      if (!apiKey) {
        // Se todas APIs falharam, limpar e tentar novamente
        if (session.failedApis.size > 0) {
          console.log(`⚠️ [Tentativa ${totalAttempts}] Todas as ${session.failedApis.size} APIs falharam, aguardando 2s e resetando...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          session.failedApis.clear();
          continue;
        }
        throw new Error('Nenhuma API disponível para chat');
      }

      try {
        console.log(`🔄 Tentativa ${totalAttempts}/${MAX_TOTAL_ATTEMPTS} com API: ${apiKey.name}`);

        // ✅ CORREÇÃO: Registrar uso no enhancedGeminiService para tracking de RPM/RPD
        enhancedGeminiService.registerExternalApiUsage(apiKey.id);

        const response = await this.callGeminiWithHistory(
          session,
          apiKey,
          temperature,
          maxOutputTokens
        );

        console.log(`✅ Sucesso com API: ${apiKey.name}`);
        return response;

      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || '';

        // ✅ CORREÇÃO: Detectar TODOS os erros retryable (429, 503, 500, 502, 504, timeout, network, resposta vazia)
        const is429 = errorMessage.includes('429') || errorMessage.includes('quota');
        const is503 = errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable');
        const isServerError = errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('504');
        const isNetworkError = errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('ECONNRESET');
        const isEmptyResponse = errorMessage.toLowerCase().includes('resposta vazia') || errorMessage.toLowerCase().includes('empty response');

        const isRetryable = is429 || is503 || isServerError || isNetworkError || isEmptyResponse;

        if (isRetryable) {
          // ✅ CORREÇÃO: Log detalhado do tipo de erro
          if (is429) {
            console.log(`⚠️ API ${apiKey.name} retornou 429 (rate limit), marcando como temporariamente indisponível`);
          } else if (is503) {
            console.log(`⚠️ API ${apiKey.name} retornou 503 (modelo sobrecarregado), tentando próxima API`);
          } else if (isServerError) {
            console.log(`⚠️ API ${apiKey.name} retornou erro de servidor (${errorMessage.slice(0, 50)}), tentando próxima API`);
          } else if (isEmptyResponse) {
            console.log(`⚠️ API ${apiKey.name} retornou resposta vazia, tentando próxima API`);
          } else {
            console.log(`⚠️ API ${apiKey.name} erro de rede (${errorMessage.slice(0, 50)}), tentando próxima API`);
          }

          session.failedApis.add(apiKey.key);
          session.currentApiIndex++;

          // ✅ CORREÇÃO: Delay variável baseado no tipo de erro
          const delayMs = is429 ? 2000 : (is503 || isEmptyResponse) ? 500 : 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // Erro não recuperável (401, 403, safety filter, etc.)
          console.error(`❌ API ${apiKey.name} erro não recuperável: ${errorMessage}`);
          throw error;
        }
      }
    }

    throw lastError || new Error(`Falha ao chamar API após ${totalAttempts} tentativas em ${session.apiKeys.length} APIs`);
  }

  /**
   * Obtém próxima API disponível (que não falhou e está disponível no enhancedGeminiService)
   */
  private getNextAvailableApi(session: ChatSession): GeminiApiKey | null {
    // Primeiro filtro: APIs que não falharam nesta sessão
    const notFailedApis = session.apiKeys.filter(
      api => !session.failedApis.has(api.key)
    );

    if (notFailedApis.length === 0) {
      return null;
    }

    // ✅ CORREÇÃO: Segundo filtro - APIs que estão realmente disponíveis (não em cooldown/exauridas)
    const trulyAvailableApis = notFailedApis.filter(
      api => enhancedGeminiService.isKeyAvailable(api.id)
    );

    // Se há APIs realmente disponíveis, usar uma delas
    if (trulyAvailableApis.length > 0) {
      const index = session.currentApiIndex % trulyAvailableApis.length;
      const selectedApi = trulyAvailableApis[index];
      console.log(`🎯 API selecionada: ${selectedApi.name} (${trulyAvailableApis.length} disponíveis de ${notFailedApis.length} não-falhadas)`);
      return selectedApi;
    }

    // ✅ FALLBACK: Se nenhuma está "truly available", usar qualquer uma não-falhada
    // (pode estar em cooldown curto - o retry irá lidar)
    const index = session.currentApiIndex % notFailedApis.length;
    const fallbackApi = notFailedApis[index];
    console.log(`⚠️ API fallback: ${fallbackApi.name} (0 disponíveis, usando não-falhada)`);
    return fallbackApi;
  }

  /**
   * Chama a API do Gemini com todo o histórico da conversa
   */
  private async callGeminiWithHistory(
    session: ChatSession,
    apiKey: GeminiApiKey,
    temperature: number,
    maxOutputTokens: number
  ): Promise<string> {
    const { messages, systemInstruction } = session;

    const requestBody: any = {
      contents: messages,
      generationConfig: {
        temperature,
        maxOutputTokens,
      }
    };

    // Adiciona system instruction se existir
    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    // Adiciona thinkingConfig para modelos Gemini 3
    if (apiKey.model.includes('gemini-3')) {
      requestBody.generationConfig.thinkingConfig = {
        thinkingLevel: 'HIGH'
      };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${apiKey.model}:generateContent?key=${apiKey.key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API Error: ${response.status} - ${errorData.error?.message || 'Unknown'}`);
    }

    const data = await response.json();

    // Extrair texto da resposta
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      throw new Error('Resposta vazia da API Gemini');
    }

    return text;
  }

  /**
   * Obtém o histórico completo da sessão
   */
  getHistory(sessionId: string): ChatMessage[] {
    return this.sessions.get(sessionId)?.messages || [];
  }

  /**
   * Limpa a sessão
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Retorna número de mensagens na sessão
   */
  getMessageCount(sessionId: string): number {
    return this.sessions.get(sessionId)?.messages.length || 0;
  }

  /**
   * Retorna APIs que falharam na sessão
   */
  getFailedApis(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    return session ? Array.from(session.failedApis) : [];
  }
}

// Singleton
export const geminiChatService = new GeminiChatService();
