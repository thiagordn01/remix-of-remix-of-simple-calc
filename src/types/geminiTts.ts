export interface GeminiTtsApiKey {
  id: string;
  key: string;
  label: string;
  requestCount: number;
  lastUsed?: Date;
  isActive: boolean;
  status: 'unknown' | 'valid' | 'invalid' | 'no_credits' | 'suspended';
  statusMessage?: string;
  lastValidated?: Date;
}

export interface GeminiTtsJob {
  id: string;
  text: string;
  voiceName: string;
  filename: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  audioUrl?: string;
  error?: string;
  retryCount?: number;
  currentApiKeyId?: string;

  // Campos para chunking de 800 palavras
  chunks: string[];              // Array de chunks de texto
  audioChunks: Blob[];          // Array de áudios gerados (WAV)
  currentChunk?: number;         // Índice do chunk sendo processado (0-based)
  failedChunks: number[];       // Índices dos chunks que falharam
  chunkRetries: Record<number, number>; // Contagem de retry por chunk

  // ✅ NOVO: Campos de progresso detalhado
  progressDetails?: {
    phase: 'chunking' | 'generating' | 'validating' | 'concatenating' | 'encoding' | 'converting';
    phaseProgress: number;        // Progresso da fase atual (0-100)
    currentChunkAttempt?: number; // Tentativa atual da chunk (1-5)
    currentChunkTotal?: number;   // Total de chunks
    currentApiKeyLabel?: string;  // Nome da API sendo usada
    estimatedTimeRemaining?: number; // Segundos estimados
    startTime?: number;           // Timestamp de início
    chunkTimes: number[];         // Tempo de cada chunk em ms
    logs: JobLog[];               // Logs detalhados do processamento
  };
}

export interface JobLog {
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  chunkIndex?: number;
}
