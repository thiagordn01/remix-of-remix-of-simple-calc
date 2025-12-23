/**
 * Gemini Chat Service - Mantém histórico de conversa como o sistema de referência
 *
 * A diferença crucial: ao invés de chamadas isoladas, usamos o array `contents`
 * para manter o histórico da conversa. A IA vê todas as mensagens anteriores.
 *
 * Isso é equivalente ao `ai.chats.create()` do SDK @google/genai.
 *
 * IMPORTANTE: Suporta rotação automática de APIs em caso de erro 429.
 */

import { GeminiApiKey } from '@/types/scripts';

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
   * Tenta chamar a API com rotação automática em caso de erro 429
   */
  private async callWithRetry(
    session: ChatSession,
    temperature: number,
    maxOutputTokens: number,
    maxRetries: number = 3
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

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Seleciona próxima API disponível
      const apiKey = this.getNextAvailableApi(session);

      if (!apiKey) {
        throw new Error('Nenhuma API disponível para chat');
      }

      try {
        console.log(`🔄 Tentativa ${attempt + 1}/${maxRetries} com API: ${apiKey.name}`);

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
        const is429 = error.message?.includes('429') || error.message?.includes('quota');

        if (is429) {
          console.log(`⚠️ API ${apiKey.name} retornou 429, marcando como indisponível`);
          session.failedApis.add(apiKey.key);
          session.currentApiIndex++;

          // Aguarda um pouco antes de tentar próxima API
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Erro não relacionado a quota, propaga imediatamente
          throw error;
        }
      }
    }

    throw lastError || new Error('Falha ao chamar API após múltiplas tentativas');
  }

  /**
   * Obtém próxima API disponível (que não falhou com 429)
   */
  private getNextAvailableApi(session: ChatSession): GeminiApiKey | null {
    const availableApis = session.apiKeys.filter(
      api => !session.failedApis.has(api.key)
    );

    if (availableApis.length === 0) {
      return null;
    }

    // Rotaciona entre APIs disponíveis
    const index = session.currentApiIndex % availableApis.length;
    return availableApis[index];
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
