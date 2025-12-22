// src/types/scripts.ts

export type AIProvider = "gemini" | "deepseek" | "openai";

export interface ScriptGenerationRequest {
  title: string;
  channelName?: string;
  premisePrompt?: string;
  scriptPrompt?: string;
  duration?: number; // em minutos
  language?: string;
  location?: string;
  /** Identificador do agente selecionado (para tracking/analytics) */
  agentId?: string;
  /** Meta opcional de palavras para a premissa */
  premiseWordTarget?: number;
}

export interface GeminiApiKey {
  id: string;
  key: string;
  /** Nome legível da chave (exibido na UI) */
  name?: string;
  /** Modelo associado (ex: gemini-2.0-flash) */
  model?: string;
  isActive: boolean;
  /**
   * Status operacional da chave. Inclui estados extras usados pela UI
   * (valid, unknown, rate_limited, checking) além dos estados persistidos.
   */
  status?:
    | "active"
    | "suspended"
    | "quota_exceeded"
    | "invalid"
    | "unknown"
    | "valid"
    | "rate_limited"
    | "checking";
  lastUsed?: number;
  errorCount?: number;
  provider?: AIProvider;
  /** Contador de requisições usado em monitores de status */
  requestCount?: number;
  /** Mensagem de status para exibição na UI */
  statusMessage?: string;
  /** Timestamp da última validação bem-sucedida na UI */
  lastValidated?: Date;
}

export interface DeepseekApiKey {
  id: string;
  key: string;
  name?: string;
  model?: string;
  isActive: boolean;
  status?: "active" | "suspended" | "quota_exceeded" | "invalid" | "unknown" | "valid" | "rate_limited" | "checking";
  lastUsed?: number;
  errorCount?: number;
  provider?: AIProvider;
  requestCount?: number;
  statusMessage?: string;
}

export interface ScriptChunk {
  id: string;
  content: string;
  wordCount: number;
  chunkIndex: number;
  isComplete: boolean;
  audioUrl?: string;
  duration?: number;
}

export interface ScriptGenerationResult {
  premise: string;
  script: string[];
  chunks: ScriptChunk[];
  totalWords: number;
  estimatedDuration: number;
  agentUsed?: string;
}

export interface ScriptGenerationProgress {
  stage: "premise" | "script" | "audio";
  currentChunk: number;
  totalChunks: number;
  completedWords: number;
  targetWords: number;
  isComplete: boolean;
  percentage: number;
  message?: string;
}

// === NOVOS TIPOS PARA O SISTEMA DE ESTADO VIVO ===

/**
 * Representa o estado lógico de um personagem em um momento específico
 */
export interface CharacterState {
  name: string;
  age: number; // Idade MATEMÁTICA atual
  location: string; // Onde ele está agora
  status: string; // O que está fazendo (ex: "correndo", "dormindo")
  role: string; // Função imutável (ex: "garçom", "pai")
  items: string[]; // Itens que carrega
}

/**
 * O Estado do Mundo que deve ser validado a cada chunk
 */
export interface WorldState {
  currentYear: number; // Ano atual na história
  timeElapsed: string; // Tempo decorrido desde o início (ex: "2 horas")
  characters: Record<string, CharacterState>; // Mapa de personagens
  keyFacts: string[]; // Fatos imutáveis acumulados
}

/**
 * A resposta obrigatória da IA (JSON + Texto)
 */
export interface StructuredScriptResponse {
  script_content: string; // O texto narrativo do roteiro
  world_state_update: WorldState; // A atualização do estado
}
