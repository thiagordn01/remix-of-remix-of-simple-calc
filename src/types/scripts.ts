export interface GeminiApiKey {
  id: string;
  name: string;
  key: string;
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-3-flash-preview';
  isActive: boolean;
  requestCount: number;
  lastUsed?: Date;
  status?: 'valid' | 'invalid' | 'suspended' | 'rate_limited' | 'unknown' | 'checking';
  statusMessage?: string;
  lastValidated?: Date;
}

export interface DeepseekApiKey {
  id: string;
  name: string;
  key: string;
  model: 'deepseek-chat' | 'deepseek-reasoner';
  isActive: boolean;
  requestCount: number;
  lastUsed?: Date;
  status?: 'valid' | 'invalid' | 'suspended' | 'rate_limited' | 'unknown' | 'checking';
  statusMessage?: string;
  lastValidated?: Date;
}

export type AIProvider = 'gemini' | 'deepseek';

export interface ScriptGenerationRequest {
  title: string;
  agentId?: string; // Se fornecido, usa as configurações do agente
  // Campos opcionais que podem ser sobrescritos mesmo com agente
  channelName?: string;
  premisePrompt?: string;
  scriptPrompt?: string;
  duration?: number; // em minutos
  language?: string;
  location?: string;
  premiseWordTarget?: number;
}

export interface ScriptGenerationResult {
  premise: string;
  script: string[];
  chunks: ScriptChunk[];
  totalWords: number;
  estimatedDuration: number;
  agentUsed?: string; // Nome do agente usado
}

export interface ScriptChunk {
  id: string;
  content: string;
  wordCount: number;
  chunkIndex: number;
  isComplete: boolean;
}

export interface ScriptGenerationProgress {
  stage: 'premise' | 'script';
  currentChunk: number;
  totalChunks: number;
  completedWords: number;
  targetWords: number;
  isComplete: boolean;
  percentage: number;
  currentApiKey?: string;
  message?: string;
}

export interface BatchScriptRequest {
  titles: string[];
  agentId?: string;
  batchSettings: {
    delayBetweenItems: number;
    delayBetweenChunks: number;
    maxRetries: number;
    autoSaveToHistory: boolean;
  };
}

export interface BatchScriptResult {
  title: string;
  result: ScriptGenerationResult | null;
  error?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  progress?: ScriptGenerationProgress;
}

export interface SrtConfig {
  blockDurationSeconds: number;
  blockIntervalMs: number;
  maxCharsPerBlock: number;
  minWordsPerBlock: number;
  maxWordsPerBlock: number;
}
