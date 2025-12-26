/**
 * Puter Chat Service - Mantém histórico de conversa para modelos via Puter
 *
 * Funciona igual ao geminiChatService mas usando a API do Puter.
 * O Puter suporta mensagens com roles: system, user, assistant, tool
 *
 * Isso garante que a IA lembre de todas as partes anteriores do roteiro,
 * mantendo coerência e evitando duplicações.
 */

// Declaração do tipo global do Puter (se não existir)
declare global {
  interface Window {
    puter: {
      ai: {
        chat: (
          prompt: string | Array<{ role: string; content: string }>,
          options?: {
            model?: string;
            stream?: boolean;
            max_tokens?: number;
          }
        ) => Promise<{
          message: {
            content: string | Array<{ text: string }>;
          };
        }>;
        listModels: (provider?: string) => Promise<Array<{
          id: string;
          provider?: string;
          name?: string;
          context_window?: number;
          max_output?: number;
        }>>;
      };
      auth: {
        isSignedIn: () => Promise<boolean>;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
        getUser: () => Promise<{ username: string; email?: string } | null>;
      };
    };
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  messages: ChatMessage[];
  model: string;
  maxTokens: number;
}

interface ChatConfig {
  systemInstruction?: string;
  maxOutputTokens?: number;
  model?: string;
}

export class PuterChatService {
  private sessions: Map<string, ChatSession> = new Map();
  private defaultModel: string = 'deepseek/deepseek-v3.2';

  /**
   * Verifica se o Puter está disponível
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' &&
           window.puter !== undefined &&
           window.puter.ai !== undefined;
  }

  /**
   * Aguarda o Puter ficar disponível
   */
  async waitForPuter(maxWaitMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      if (this.isAvailable()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * Garante que o usuário está autenticado
   */
  async ensureAuthenticated(): Promise<boolean> {
    if (!this.isAvailable()) {
      const available = await this.waitForPuter();
      if (!available) return false;
    }

    try {
      const signedIn = await window.puter.auth.isSignedIn();
      if (signedIn) return true;

      // Tenta fazer login
      await window.puter.auth.signIn();
      return await window.puter.auth.isSignedIn();
    } catch (error) {
      console.error('Erro ao verificar/fazer autenticação Puter:', error);
      return false;
    }
  }

  /**
   * Define o modelo padrão para novas sessões
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model;
    console.log(`📱 Modelo Puter padrão: ${model}`);
  }

  /**
   * Cria uma nova sessão de chat com histórico persistente
   */
  createChat(
    sessionId: string,
    config: ChatConfig = {}
  ): string {
    const messages: ChatMessage[] = [];

    // Se tiver system instruction, adiciona como primeira mensagem
    if (config.systemInstruction) {
      messages.push({
        role: 'system',
        content: config.systemInstruction
      });
    }

    this.sessions.set(sessionId, {
      messages,
      model: config.model || this.defaultModel,
      maxTokens: config.maxOutputTokens || 8192
    });

    console.log(`💬 Chat Puter criado: ${sessionId} (modelo: ${config.model || this.defaultModel})`);
    return sessionId;
  }

  /**
   * Envia mensagem e recebe resposta, mantendo histórico
   */
  async sendMessage(
    sessionId: string,
    message: string,
    options: {
      temperature?: number; // Nota: Puter pode não suportar temperature
      maxOutputTokens?: number;
      onProgress?: (text: string) => void;
    } = {}
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Sessão de chat Puter não encontrada: ${sessionId}`);
    }

    // Garante autenticação
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error('Faça login no Puter para usar a IA.');
    }

    // Adiciona mensagem do usuário ao histórico
    session.messages.push({
      role: 'user',
      content: message
    });

    console.log(`📤 Enviando mensagem (total: ${session.messages.length} mensagens no histórico)`);

    try {
      // Chama a API do Puter com todo o histórico
      const response = await window.puter.ai.chat(session.messages, {
        model: session.model,
        stream: false,
        max_tokens: options.maxOutputTokens || session.maxTokens
      });

      // Extrai o conteúdo da resposta
      const content = this.extractContent(response);

      if (!content) {
        throw new Error('Resposta vazia do Puter');
      }

      // Adiciona resposta da IA ao histórico
      session.messages.push({
        role: 'assistant',
        content: content
      });

      const wordCount = content.split(/\s+/).length;
      console.log(`📥 Resposta recebida: ${wordCount} palavras`);

      options.onProgress?.(content);

      return content;

    } catch (error: any) {
      // Remove a mensagem do usuário que falhou para manter histórico consistente
      session.messages.pop();

      console.error('❌ Erro no chat Puter:', error);

      // Trata erros específicos
      if (error.message?.includes('rate') || error.message?.includes('limit')) {
        throw new Error('Limite de requisições atingido. Aguarde alguns segundos.');
      }

      if (error.message?.includes('401') || error.message?.includes('auth')) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      throw error;
    }
  }

  /**
   * Extrai conteúdo da resposta do Puter
   */
  private extractContent(response: any): string {
    const content = response?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content.map(item => item.text || item.content || '').join('');
    }

    if (response?.message?.text) {
      return response.message.text;
    }

    console.warn('Formato de resposta Puter inesperado:', response);
    return JSON.stringify(content);
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
    console.log(`🗑️ Sessão Puter limpa: ${sessionId}`);
  }

  /**
   * Retorna número de mensagens na sessão
   */
  getMessageCount(sessionId: string): number {
    return this.sessions.get(sessionId)?.messages.length || 0;
  }

  /**
   * Verifica se uma sessão existe
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Atualiza o modelo de uma sessão existente
   */
  updateSessionModel(sessionId: string, model: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.model = model;
      console.log(`📱 Modelo da sessão ${sessionId} atualizado para: ${model}`);
    }
  }
}

// Singleton
export const puterChatService = new PuterChatService();
