// Servico para usar DeepSeek via Puter.js (gratuito e ilimitado)
// Documentacao: https://docs.puter.com/AI/chat/

// Declaracao do tipo global do Puter
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

// Modelos disponiveis no Puter.js (nomes oficiais)
// Ref: https://docs.puter.com/AI/chat/
// Nota: Use listModels() para ver todos os modelos disponiveis
export type PuterAIModel = string; // Aceita qualquer modelo disponivel no Puter

// Interface para modelo da API
export interface PuterModelInfo {
  id: string;
  provider?: string;
  name?: string;
  context_window?: number;
  max_output?: number;
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

export class PuterDeepseekService {
  private static instance: PuterDeepseekService;
  private currentModel: PuterAIModel = 'deepseek/deepseek-v3.2'; // Modelo padrao DeepSeek V3.2
  private isGenerating = false;
  private isAuthenticated = false;
  private currentUser: { username: string; email?: string } | null = null;
  private cachedModels: PuterModelInfo[] = [];
  private modelsLastFetched: number = 0;

  private constructor() {
    console.log('PuterDeepseekService inicializado');
  }

  static getInstance(): PuterDeepseekService {
    if (!PuterDeepseekService.instance) {
      PuterDeepseekService.instance = new PuterDeepseekService();
    }
    return PuterDeepseekService.instance;
  }

  setModel(model: PuterAIModel): void {
    // Migrar IDs antigos para novos
    const migratedModel = this.migrateModelId(model);
    this.currentModel = migratedModel;
    console.log(`Modelo alterado para: ${migratedModel}`);
  }

  // Migra IDs de modelos antigos para o formato correto
  private migrateModelId(modelId: string): string {
    const migrations: Record<string, string> = {
      // DeepSeek - apenas adicionar prefixo quando necessário
      'deepseek-chat': 'deepseek/deepseek-chat',
      'deepseek-v3': 'deepseek/deepseek-v3.2',
      'deepseek-v3.2': 'deepseek/deepseek-v3.2',
      'deepseek-reasoner': 'deepseek/deepseek-r1',
      // Claude - migrar versoes antigas
      'claude-3-5-sonnet': 'claude-sonnet-4-5-20250929',
      'claude-sonnet-4': 'claude-sonnet-4-20250514',
      'claude-opus-4': 'claude-opus-4-5-20251101',
      // GPT - migrar versoes antigas
      'gpt-4o': 'gpt-4.1',
      'gpt-4o-mini': 'gpt-4.1-mini',
      'o1-mini': 'o4-mini',
      // Gemini - migrar versoes antigas
      'gemini-2.0-flash': 'gemini-2.5-flash',
      'gemini-1.5-pro': 'gemini-2.5-pro',
      // Grok - migrar versoes antigas
      'grok-2': 'grok-3',
    };

    return migrations[modelId] || modelId;
  }

  // Retorna max_tokens apropriado para cada modelo
  private getMaxTokensForModel(modelId: string): number {
    // DeepSeek V3 suporta até 128K contexto, 8192 output
    if (modelId.includes('deepseek')) {
      return 8192; // Máximo para TODOS os modelos DeepSeek
    }
    // Outros modelos geralmente suportam 8192+
    return 8192;
  }

  getModel(): PuterAIModel {
    // Retorna o modelo com migracao aplicada
    return this.migrateModelId(this.currentModel);
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' &&
           window.puter !== undefined &&
           window.puter.ai !== undefined;
  }

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

  async checkAuth(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const signedIn = await window.puter.auth.isSignedIn();
      this.isAuthenticated = signedIn;

      if (signedIn) {
        this.currentUser = await window.puter.auth.getUser();
      } else {
        this.currentUser = null;
      }

      return signedIn;
    } catch (error) {
      console.error('Erro ao verificar autenticacao:', error);
      return false;
    }
  }

  async signIn(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await window.puter.auth.signIn();
      this.isAuthenticated = true;
      this.currentUser = await window.puter.auth.getUser();
      return true;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return false;
    }
  }

  async signOut(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await window.puter.auth.signOut();
      this.isAuthenticated = false;
      this.currentUser = null;
      console.log('Usuario deslogado do Puter');
      return true;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return false;
    }
  }

  async switchUser(): Promise<boolean> {
    // Primeiro faz logout, depois login com nova conta
    await this.signOut();
    return await this.signIn();
  }

  getCurrentUser(): { username: string; email?: string } | null {
    return this.currentUser;
  }

  // Buscar modelos disponiveis da API Puter
  async fetchAvailableModels(provider?: string): Promise<PuterModelInfo[]> {
    if (!this.isAvailable()) {
      console.warn('Puter nao disponivel para buscar modelos');
      return [];
    }

    try {
      const models = await window.puter.ai.listModels(provider);
      console.log(`Modelos encontrados${provider ? ` (${provider})` : ''}:`, models.length);

      // Cache dos modelos
      if (!provider) {
        this.cachedModels = models;
        this.modelsLastFetched = Date.now();
      }

      return models;
    } catch (error) {
      console.error('Erro ao buscar modelos:', error);
      return [];
    }
  }

  // Retorna modelos em cache ou busca novos
  async getModels(forceRefresh: boolean = false): Promise<PuterModelInfo[]> {
    const cacheAge = Date.now() - this.modelsLastFetched;
    const cacheValid = cacheAge < 5 * 60 * 1000; // 5 minutos

    if (!forceRefresh && cacheValid && this.cachedModels.length > 0) {
      return this.cachedModels;
    }

    return await this.fetchAvailableModels();
  }

  // Buscar modelos por provider especifico
  async getModelsByProvider(provider: string): Promise<PuterModelInfo[]> {
    return await this.fetchAvailableModels(provider);
  }

  async ensureAuthenticated(): Promise<boolean> {
    const isSignedIn = await this.checkAuth();
    if (isSignedIn) return true;

    // Tentar fazer login automaticamente
    return await this.signIn();
  }

  private extractContent(response: any): string {
    // Puter pode retornar content como string ou array
    const content = response?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      // Claude e alguns modelos retornam array com objetos {text: ...}
      return content.map(item => item.text || item.content || '').join('');
    }

    // Fallback
    if (response?.message?.text) {
      return response.message.text;
    }

    console.warn('Formato de resposta inesperado:', response);
    return JSON.stringify(content);
  }

  async generateContent(
    prompt: string,
    onProgress?: (message: string) => void
  ): Promise<string> {
    if (this.isGenerating) {
      throw new Error('Ja existe uma geracao em andamento');
    }

    if (!this.isAvailable()) {
      const available = await this.waitForPuter();
      if (!available) {
        throw new Error('Puter.js nao esta disponivel. Recarregue a pagina.');
      }
    }

    // Sempre verificar autenticacao antes de cada chamada
    const signedIn = await window.puter.auth.isSignedIn();
    if (!signedIn) {
      console.log('Usuario nao autenticado, tentando login...');
      try {
        await window.puter.auth.signIn();
        this.isAuthenticated = true;
        this.currentUser = await window.puter.auth.getUser();
      } catch (e) {
        this.isAuthenticated = false;
        throw new Error('Faca login no Puter para usar a IA gratuitamente.');
      }
    } else {
      this.isAuthenticated = true;
      if (!this.currentUser) {
        this.currentUser = await window.puter.auth.getUser();
      }
    }

    this.isGenerating = true;

    // Garantir que o modelo esta no formato correto
    const modelToUse = this.migrateModelId(this.currentModel);
    const modelName = this.getModelDisplayName(modelToUse);
    onProgress?.(`Gerando com ${modelName}...`);

    try {
      const maxTokens = this.getMaxTokensForModel(modelToUse);
      console.log(`🤖 Puter AI - Modelo: ${modelToUse}, max_tokens: ${maxTokens}`);

      const response = await window.puter.ai.chat(prompt, {
        model: modelToUse,
        stream: false,
        max_tokens: maxTokens
      });

      console.log('Resposta Puter:', response);

      // Verificar se a resposta indica erro
      if (response && typeof response === 'object' && 'success' in response && response.success === false) {
        const errorObj = response as any;
        const errorMsg = errorObj.error?.message || errorObj.error?.code || 'Erro desconhecido do modelo';
        console.error('Erro na resposta Puter:', errorObj.error);

        // Se o erro for de autenticacao, tentar reautenticar
        if (errorMsg.includes('auth') || errorMsg.includes('401') || errorMsg.includes('login')) {
          this.isAuthenticated = false;
          throw new Error('Sessao expirada. Faca login novamente.');
        }

        throw new Error(`Erro do modelo: ${errorMsg}`);
      }

      const content = this.extractContent(response);

      if (!content) {
        throw new Error('Resposta vazia do modelo');
      }

      const wordCount = content.split(/\s+/).length;

      onProgress?.(`Gerado: ${wordCount} palavras`);
      console.log(`Puter AI (${modelToUse}): ${wordCount} palavras geradas`);

      return content;

    } catch (error: any) {
      console.error('Erro Puter AI:', error);

      // Tratar erros especificos
      if (error.message?.includes('no fallback model') || error.message?.includes('not found')) {
        throw new Error(`Modelo "${modelToUse}" nao disponivel. Tente outro modelo.`);
      }

      // Erro 400 - parâmetros inválidos (ex: max_tokens)
      if (error?.error?.status === 400 || error?.error?.code === 400 || 
          error.message?.includes('400') || error.message?.includes('Invalid')) {
        const errorMsg = error?.error?.message || error.message || 'Parametros invalidos';
        throw new Error(`Erro do modelo: ${errorMsg}. Este modelo pode ter restricoes - tente outro.`);
      }

      if (error.message?.includes('rate') || error.message?.includes('limit')) {
        throw new Error('Limite de requisicoes atingido. Aguarde alguns segundos.');
      }

      if (error.message?.includes('401') || error.message?.includes('auth') || error.message?.includes('login')) {
        this.isAuthenticated = false;
        this.currentUser = null;
        throw new Error('Sessao expirada. Faca login novamente.');
      }

      // Erros do Puter/OpenRouter com detalhes
      if (error?.success === false && error?.error) {
        const apiError = error.error;
        throw new Error(`Erro (${apiError.code || apiError.status}): ${apiError.message}`);
      }

      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  async generatePremise(
    prompt: string,
    targetWords: number = 1000,
    onProgress?: (message: string) => void
  ): Promise<{ content: string; usedApiId: string }> {
    onProgress?.(`Iniciando geracao de premissa (${targetWords} palavras)`);

    const content = await this.generateContent(prompt, onProgress);

    onProgress?.(`Premissa gerada: ${content.split(/\s+/).length} palavras`);

    return {
      content,
      usedApiId: `puter-${this.currentModel}`
    };
  }

  async generateScriptChunk(
    prompt: string,
    context: GenerationContext,
    onProgress?: (message: string) => void
  ): Promise<{ content: string; usedApiId: string }> {
    onProgress?.(`Gerando chunk ${(context.chunkIndex ?? 0) + 1}/${context.totalChunks ?? 1}`);

    const content = await this.generateContent(prompt, onProgress);

    const wordCount = content.split(/\s+/).length;
    onProgress?.(`Chunk gerado: ${wordCount} palavras`);

    return {
      content,
      usedApiId: `puter-${this.currentModel}`
    };
  }

  async testConnection(onProgress?: (message: string) => void): Promise<boolean> {
    onProgress?.('Verificando autenticacao Puter...');

    try {
      // Primeiro verificar/fazer login
      const authenticated = await this.ensureAuthenticated();
      if (!authenticated) {
        onProgress?.('Login necessario');
        return false;
      }

      const user = this.getCurrentUser();
      onProgress?.(`Logado como: ${user?.username || 'usuario'}`);
      onProgress?.('Testando conexao com IA...');

      const response = await this.generateContent(
        'Responda apenas com a palavra "sucesso".',
        onProgress
      );

      const isValid = response.toLowerCase().includes('sucesso');
      onProgress?.(isValid ? 'Conexao OK!' : 'Teste concluido');

      return true;
    } catch (error: any) {
      onProgress?.(`Erro: ${error.message}`);
      return false;
    }
  }

  isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  getModelDisplayName(modelId: PuterAIModel): string {
    const model = PuterDeepseekService.getAvailableModels().find(m => m.id === modelId);
    if (model) return model.name;

    // Se nao encontrar na lista padrao, formata o ID
    // Ex: "claude-sonnet-4-20250514" -> "Claude Sonnet 4"
    return modelId
      .replace(/-\d{8}$/, '') // Remove date suffix
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Lista de modelos RECOMENDADOS (funcionam bem) - ATUALIZADO DEZ/2025
  // Para lista completa, use fetchAvailableModels()
  // Os IDs devem ser exatos conforme retornado pela API
  static getAvailableModels(): Array<{ id: PuterAIModel; name: string; description: string; vendor: string; isNew?: boolean }> {
    return [
      // ============ DeepSeek ============
      {
        id: 'deepseek/deepseek-v3.2',
        name: 'DeepSeek V3.2',
        description: 'Versão mais recente - raciocínio equilibrado e eficiente',
        vendor: 'DeepSeek',
        isNew: true
      },
      {
        id: 'deepseek/deepseek-v3.2-speciale',
        name: 'DeepSeek V3.2 Speciale',
        description: 'Raciocínio máximo - para problemas complexos',
        vendor: 'DeepSeek',
        isNew: true
      },
      {
        id: 'deepseek/deepseek-r1',
        name: 'DeepSeek R1',
        description: 'Thinking mode - raciocínio passo a passo',
        vendor: 'DeepSeek'
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat',
        description: 'Thinking mode - raciocínio avançado passo a passo',
        vendor: 'DeepSeek'
      },
      
      // ============ Claude - Anthropic ============
      {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude Opus 4.5',
        description: 'Mais poderoso da Anthropic - raciocinio complexo',
        vendor: 'Anthropic',
        isNew: true
      },
      {
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude Sonnet 4.5',
        description: 'Equilibrio perfeito entre velocidade e qualidade',
        vendor: 'Anthropic',
        isNew: true
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        description: 'Versao estavel e confiavel',
        vendor: 'Anthropic'
      },
      {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        description: 'Mais rapido e economico',
        vendor: 'Anthropic',
        isNew: true
      },
      
      // ============ OpenAI ============
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        description: 'OpenAI GPT-4.1 - mais recente e poderoso',
        vendor: 'OpenAI',
        isNew: true
      },
      {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        description: 'Rapido e eficiente - otimo custo-beneficio',
        vendor: 'OpenAI',
        isNew: true
      },
      {
        id: 'gpt-4.1-nano',
        name: 'GPT-4.1 Nano',
        description: 'Ultra rapido para tarefas simples',
        vendor: 'OpenAI',
        isNew: true
      },
      {
        id: 'o4-mini',
        name: 'o4 Mini',
        description: 'Raciocinio avancado (reasoning)',
        vendor: 'OpenAI',
        isNew: true
      },
      {
        id: 'o3',
        name: 'o3',
        description: 'Reasoning de ultima geracao',
        vendor: 'OpenAI',
        isNew: true
      },
      
      // ============ Google ============
      {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3 Pro',
        description: 'Google Gemini 3 Pro - mais recente e poderoso',
        vendor: 'Google',
        isNew: true
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Google Gemini mais poderoso',
        vendor: 'Google',
        isNew: true
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Rapido e equilibrado',
        vendor: 'Google',
        isNew: true
      },
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: 'Mais economico da linha Gemini',
        vendor: 'Google',
        isNew: true
      },
      
      // ============ xAI ============
      {
        id: 'grok-3',
        name: 'Grok 3',
        description: 'xAI Grok 3 - mais recente',
        vendor: 'xAI',
        isNew: true
      },
      {
        id: 'grok-3-fast',
        name: 'Grok 3 Fast',
        description: 'Versao otimizada para velocidade',
        vendor: 'xAI',
        isNew: true
      },
      {
        id: 'grok-3-mini',
        name: 'Grok 3 Mini',
        description: 'Versao compacta e eficiente',
        vendor: 'xAI',
        isNew: true
      },
      
      // ============ Mistral ============
      {
        id: 'mistral-large-latest',
        name: 'Mistral Large',
        description: 'Modelo europeu mais poderoso',
        vendor: 'Mistral',
        isNew: true
      },
      {
        id: 'mistral-medium-2508',
        name: 'Mistral Medium',
        description: 'Equilibrio entre poder e velocidade',
        vendor: 'Mistral'
      },
      {
        id: 'codestral-2508',
        name: 'Codestral',
        description: 'Especializado em codigo',
        vendor: 'Mistral'
      }
    ];
  }
}

// Singleton export
export const puterDeepseekService = PuterDeepseekService.getInstance();
