/**
 * Validação e corte inteligente de chunks de roteiro
 * 
 * ✅ VERSÃO 2.0: Integração com Sistema "Prompt Invisível"
 */

// Re-exportar funções do novo sistema minimalista
export { 
  extractSemanticAnchors, 
  detectParagraphDuplication, 
  sanitizeScript,
  extractLastParagraph 
} from './minimalPromptBuilder';

// ✅ NOVO: Tamanho mínimo de n-gram para detectar duplicação long-range
const MIN_NGRAM_WORDS = 30;

// ✅ CRÍTICO: Palavras comuns para detectar mistura PT/EN (principais culpados)
const PORTUGUESE_INDICATORS = [
  'você', 'voce', 'não', 'nao', 'também', 'tambem', 'até', 'ate', 'através', 'atraves',
  'então', 'entao', 'está', 'esta', 'são', 'sao', 'será', 'sera', 'foram', 'muito',
  'mais', 'como', 'para', 'isso', 'esse', 'essa', 'aqui', 'agora', 'quando', 'onde',
  'porque', 'porquê', 'pode', 'fazer', 'tem', 'tinha', 'foi', 'ser', 'vai', 'vamos',
  'precisa', 'quer', 'saber', 'tudo', 'nada', 'algo', 'alguém', 'algum', 'alguns',
  'outro', 'outra', 'outros', 'outras', 'mesmo', 'mesma', 'sobre', 'entre', 'sem',
  'com', 'seu', 'sua', 'seus', 'suas', 'meu', 'minha', 'meus', 'minhas', 'nosso',
  'nossa', 'nossos', 'nossas', 'dele', 'dela', 'deles', 'delas', 'este', 'esta',
  'estes', 'estas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo'
];

const ENGLISH_INDICATORS = [
  'you', 'your', 'have', 'has', 'had', 'been', 'were', 'was', 'are', 'will',
  'would', 'could', 'should', 'can', 'must', 'may', 'might', 'do', 'does', 'did',
  'going', 'make', 'made', 'know', 'knew', 'think', 'thought', 'want', 'wanted',
  'need', 'needed', 'get', 'got', 'some', 'any', 'all', 'every', 'each', 'many',
  'much', 'more', 'most', 'very', 'really', 'just', 'only', 'even', 'also', 'too',
  'about', 'through', 'between', 'without', 'with', 'from', 'into', 'onto', 'upon',
  'before', 'after', 'during', 'while', 'since', 'until', 'because', 'if', 'when',
  'where', 'what', 'which', 'who', 'whom', 'whose', 'how', 'why', 'there', 'here',
  'then', 'now', 'today', 'tomorrow', 'yesterday', 'never', 'always', 'sometimes',
  'often', 'usually', 'already', 'still', 'yet', 'again', 'once', 'twice'
];

/**
 * ✅ CRÍTICO: Detecta mistura de idiomas PT/EN no chunk
 * Retorna % de palavras em português e % em inglês
 */
function detectLanguageMixing(text: string): { ptPercentage: number; enPercentage: number; isMixed: boolean } {
  if (!text || text.trim().length === 0) {
    return { ptPercentage: 0, enPercentage: 0, isMixed: false };
  }

  const words = text.toLowerCase()
    .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/gi, ' ') // Manter acentos PT
    .split(/\s+/)
    .filter(w => w.length > 2); // Ignorar palavras muito curtas

  if (words.length === 0) {
    return { ptPercentage: 0, enPercentage: 0, isMixed: false };
  }

  let ptCount = 0;
  let enCount = 0;

  for (const word of words) {
    if (PORTUGUESE_INDICATORS.includes(word)) ptCount++;
    if (ENGLISH_INDICATORS.includes(word)) enCount++;
  }

  const ptPercentage = (ptCount / words.length) * 100;
  const enPercentage = (enCount / words.length) * 100;

  // ✅ Considera "misturado" se tem mais de 3% de ambos os idiomas
  // Isso captura casos onde o roteiro tem frases inteiras alternadas
  const isMixed = ptPercentage > 3 && enPercentage > 3;

  return { ptPercentage, enPercentage, isMixed };
}

export interface ChunkValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  duplicatedSample?: string; // ✅ NOVO: Amostra do trecho duplicado (para debug)
}

/**
 * ✅ NOVO: Detecta sobreposição long-range (trechos de 30+ palavras repetidos)
 */
function hasLongOverlap(
  fullPreviousContent: string,
  newChunk: string,
  minWords: number = MIN_NGRAM_WORDS
): { overlapped: boolean; sample?: string } {
  if (!fullPreviousContent || !newChunk) {
    return { overlapped: false };
  }

  // Normalizar ambos os textos
  const previousNorm = fullPreviousContent.toLowerCase().replace(/\s+/g, ' ').trim();
  const newNorm = newChunk.toLowerCase().replace(/\s+/g, ' ').trim();
  
  const newWords = newNorm.split(' ');
  
  // Examinar janelas deslizantes de minWords palavras
  for (let i = 0; i <= newWords.length - minWords; i++) {
    const window = newWords.slice(i, i + minWords).join(' ');
    
    if (previousNorm.includes(window)) {
      // Encontrou duplicação! Retornar amostra de 40 palavras para debug
      const sampleWords = newWords.slice(i, i + Math.min(40, newWords.length - i));
      return {
        overlapped: true,
        sample: sampleWords.join(' ')
      };
    }
  }
  
  return { overlapped: false };
}

/**
 * Valida chunk gerado para detectar problemas de continuidade
 * ✅ NOVO: Aceita fullPreviousContent opcional para detectar duplicação long-range
 * ✅ CRÍTICO: Aceita expectedLanguage para detectar mistura de idiomas
 */
export function validateChunk(
  newChunk: string,
  previousChunk: string | null,
  chunkIndex: number,
  fullPreviousContent?: string, // ✅ NOVO: Contexto completo para validação long-range
  expectedLanguage?: string // ✅ CRÍTICO: Idioma esperado (ex: "en-US", "pt-BR")
): ChunkValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let duplicatedSample: string | undefined;
  
  // VALIDAÇÃO A: Palavra cortada (primeira palavra muito curta e minúscula)
  if (chunkIndex > 0) {
    const firstWord = newChunk.trim().split(/\s+/)[0];
    if (firstWord && firstWord.length < 3 && firstWord === firstWord.toLowerCase()) {
      errors.push('❌ Primeira palavra cortada detectada');
    }
    
    // VALIDAÇÃO B: Chunk começa com letra minúscula (exceto aspas/caracteres especiais)
    const firstChar = newChunk.trim()[0];
    if (firstChar && /[a-z]/.test(firstChar)) {
      errors.push('❌ Chunk começa com letra minúscula (frase cortada)');
    }
    
    // VALIDAÇÃO C: Duplicação (últimas 50 palavras do anterior aparecem no novo)
    if (previousChunk) {
      const lastWords = previousChunk.trim().split(/\s+/).slice(-50).join(' ').toLowerCase();
      const newChunkLower = newChunk.toLowerCase();
      
      if (newChunkLower.includes(lastWords)) {
        errors.push('❌ Duplicação detectada (últimas 50 palavras repetidas)');
      }
    }
    
    // ✅ NOVO: VALIDAÇÃO D: Duplicação long-range (trechos de 30+ palavras já existentes)
    if (fullPreviousContent && fullPreviousContent.trim()) {
      const overlap = hasLongOverlap(fullPreviousContent, newChunk);
      if (overlap.overlapped) {
        errors.push('❌ Duplicação long-range detectada (trecho já existe no roteiro)');
        duplicatedSample = overlap.sample;
      }
    }
  }

  // ✅ CRÍTICO: VALIDAÇÃO F: Mistura de idiomas PT/EN
  if (expectedLanguage) {
    const languageDetection = detectLanguageMixing(newChunk);

    if (languageDetection.isMixed) {
      errors.push(
        `❌ MISTURA CRÍTICA DE IDIOMAS DETECTADA! ` +
        `PT: ${languageDetection.ptPercentage.toFixed(1)}% | EN: ${languageDetection.enPercentage.toFixed(1)}%`
      );
    } else {
      // Validar idioma dominante contra esperado
      const isEnglishExpected = expectedLanguage.startsWith('en');
      const isPortugueseExpected = expectedLanguage.startsWith('pt');

      if (isEnglishExpected && languageDetection.ptPercentage > 10) {
        errors.push(
          `❌ IDIOMA ERRADO: Esperado INGLÊS mas detectado ${languageDetection.ptPercentage.toFixed(1)}% PORTUGUÊS`
        );
      } else if (isPortugueseExpected && languageDetection.enPercentage > 10) {
        errors.push(
          `❌ IDIOMA ERRADO: Esperado PORTUGUÊS mas detectado ${languageDetection.enPercentage.toFixed(1)}% INGLÊS`
        );
      }
    }
  }

  // VALIDAÇÃO G: Chunk muito curto (menos de 70% do alvo)
  const wordCount = newChunk.split(/\s+/).length;
  if (wordCount < 280) { // 70% de 400 palavras
    warnings.push(`⚠️ Chunk curto (${wordCount} palavras, esperado ~400)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    duplicatedSample
  };
}

/**
 * Encontra melhor ponto de corte natural próximo do alvo
 */
export function findNaturalCutPoint(text: string, targetWords: number = 400): string {
  const words = text.split(/\s+/);
  
  if (words.length <= targetWords) {
    return text; // Já está no tamanho certo
  }
  
  // Janela de busca: ±100 palavras do alvo
  const minWords = targetWords - 100;
  const maxWords = targetWords + 100;
  
  // 1ª prioridade: Quebra de parágrafo (linha em branco)
  const paragraphs = text.split(/\n\n+/);
  let accumulated = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const paraWords = paragraphs[i].split(/\s+/).length;
    accumulated += paraWords;
    
    if (accumulated >= minWords && accumulated <= maxWords) {
      return paragraphs.slice(0, i + 1).join('\n\n');
    }
  }
  
  // 2ª prioridade: Ponto final seguido de espaço
  const textUpToMax = words.slice(0, maxWords).join(' ');
  const sentences = textUpToMax.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    return sentences.join(' ');
  }
  
  // Última opção: Cortar exatamente no alvo
  return words.slice(0, targetWords).join(' ');
}
