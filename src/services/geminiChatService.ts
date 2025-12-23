/**
 * Gemini Chat Service - Mantém histórico de conversa como o sistema de referência
 *
 * A diferença crucial: ao invés de chamadas isoladas, usamos o array `contents`
 * para manter o histórico da conversa. A IA vê todas as mensagens anteriores.
 *
 * Isso é equivalente ao `ai.chats.create()` do SDK @google/genai.
 */

import { GeminiApiKey } from '@/types/scripts';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatSession {
  messages: ChatMessage[];
  systemInstruction?: string;
  apiKey: GeminiApiKey;
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
   * Similar ao `ai.chats.create()` do sistema de referência
   */
  createChat(
    sessionId: string,
    apiKey: GeminiApiKey,
    config: ChatConfig = {}
  ): string {
    this.sessions.set(sessionId, {
      messages: [],
      systemInstruction: config.systemInstruction,
      apiKey,
    });
    return sessionId;
  }

  /**
   * Envia mensagem e recebe resposta, mantendo histórico
   * Similar ao `chat.sendMessage()` do sistema de referência
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

    // Faz chamada à API com todo o histórico
    const response = await this.callGeminiWithHistory(
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
   * Chama a API do Gemini com todo o histórico da conversa
   */
  private async callGeminiWithHistory(
    session: ChatSession,
    temperature: number,
    maxOutputTokens: number
  ): Promise<string> {
    const { apiKey, messages, systemInstruction } = session;

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
}

// Singleton
export const geminiChatService = new GeminiChatService();
