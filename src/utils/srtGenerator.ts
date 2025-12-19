export interface SrtConfig {
  blockDurationSeconds: number;
  blockIntervalMs: number;
  maxCharsPerBlock: number;
  minWordsPerBlock: number;
  maxWordsPerBlock: number;
}

export const DEFAULT_SRT_CONFIG: SrtConfig = {
  blockDurationSeconds: 30,
  blockIntervalMs: 20,
  maxCharsPerBlock: 500,
  minWordsPerBlock: 30,
  maxWordsPerBlock: 100
};

interface SrtBlock {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

/**
 * Converte milissegundos para formato SRT (HH:MM:SS,mmm)
 */
function formatSrtTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Divide o texto em sentenças preservando pontuação
 */
function splitIntoSentences(text: string): string[] {
  // Remove múltiplos espaços e quebras de linha
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Divide em sentenças por pontos, exclamações, interrogações
  const sentences = cleanText.split(/([.!?]+\s+)/).filter(s => s.trim());
  
  // Reconstrói sentenças com pontuação
  const result: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i];
    const punctuation = sentences[i + 1] || '';
    if (sentence.trim()) {
      result.push((sentence + punctuation).trim());
    }
  }
  
  return result;
}

/**
 * Conta palavras em um texto
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Cria blocos de texto respeitando os limites configurados
 */
function createTextBlocks(text: string, config: SrtConfig): string[] {
  const sentences = splitIntoSentences(text);
  const blocks: string[] = [];
  let currentBlock = '';

  for (const sentence of sentences) {
    const testBlock = currentBlock ? `${currentBlock} ${sentence}` : sentence;
    const wordCount = countWords(testBlock);
    const charCount = testBlock.length;

    // Verifica se adicionar essa sentença ultrapassa os limites
    const exceedsChars = charCount > config.maxCharsPerBlock;
    const exceedsWords = wordCount > config.maxWordsPerBlock;

    if (exceedsChars || exceedsWords) {
      // Se o bloco atual tem conteúdo suficiente, salva e começa novo
      if (currentBlock && countWords(currentBlock) >= config.minWordsPerBlock) {
        blocks.push(currentBlock.trim());
        currentBlock = sentence;
      } else {
        // Se não tem conteúdo suficiente, adiciona mesmo ultrapassando (evita blocos muito pequenos)
        currentBlock = testBlock;
      }
    } else {
      currentBlock = testBlock;
    }
  }

  // Adiciona o último bloco se tiver conteúdo
  if (currentBlock.trim()) {
    blocks.push(currentBlock.trim());
  }

  return blocks;
}

/**
 * Gera o conteúdo do arquivo SRT
 */
export function generateSrtContent(scriptText: string, config: SrtConfig = DEFAULT_SRT_CONFIG): string {
  const blocks = createTextBlocks(scriptText, config);
  const srtBlocks: SrtBlock[] = [];

  let currentTimeMs = 0;

  blocks.forEach((blockText, index) => {
    const startTimeMs = currentTimeMs;
    const endTimeMs = startTimeMs + (config.blockDurationSeconds * 1000);

    srtBlocks.push({
      index: index + 1,
      startTime: formatSrtTimestamp(startTimeMs),
      endTime: formatSrtTimestamp(endTimeMs),
      text: blockText
    });

    // Adiciona intervalo entre blocos
    currentTimeMs = endTimeMs + config.blockIntervalMs;
  });

  // Formata no padrão SRT
  return srtBlocks
    .map(block => 
      `${block.index}\n${block.startTime} --> ${block.endTime}\n${block.text}\n`
    )
    .join('\n');
}

/**
 * Calcula estatísticas do SRT gerado
 */
export function calculateSrtStats(scriptText: string, config: SrtConfig = DEFAULT_SRT_CONFIG) {
  const blocks = createTextBlocks(scriptText, config);
  const totalDurationMs = blocks.length * (config.blockDurationSeconds * 1000 + config.blockIntervalMs);

  return {
    totalBlocks: blocks.length,
    totalDurationSeconds: Math.ceil(totalDurationMs / 1000),
    totalDurationFormatted: formatSrtTimestamp(totalDurationMs),
    averageWordsPerBlock: Math.round(
      blocks.reduce((sum, block) => sum + countWords(block), 0) / blocks.length
    ),
    averageCharsPerBlock: Math.round(
      blocks.reduce((sum, block) => sum + block.length, 0) / blocks.length
    )
  };
}

/**
 * Valida configuração SRT
 */
export function validateSrtConfig(config: Partial<SrtConfig>): string[] {
  const errors: string[] = [];

  if (config.blockDurationSeconds !== undefined && config.blockDurationSeconds < 1) {
    errors.push('Duração do bloco deve ser no mínimo 1 segundo');
  }

  if (config.blockIntervalMs !== undefined && config.blockIntervalMs < 0) {
    errors.push('Intervalo entre blocos não pode ser negativo');
  }

  if (config.maxCharsPerBlock !== undefined && config.maxCharsPerBlock < 50) {
    errors.push('Máximo de caracteres por bloco deve ser no mínimo 50');
  }

  if (config.minWordsPerBlock !== undefined && config.minWordsPerBlock < 1) {
    errors.push('Mínimo de palavras por bloco deve ser no mínimo 1');
  }

  if (config.maxWordsPerBlock !== undefined && config.maxWordsPerBlock < config.minWordsPerBlock!) {
    errors.push('Máximo de palavras deve ser maior que o mínimo');
  }

  return errors;
}
