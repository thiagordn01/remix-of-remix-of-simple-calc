// Utility to split long text into natural chunks under a target word count
export function splitIntoChunks(text: string, targetWords = 1000) { // ✅ NOVO: 1000 palavras
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const sentences = normalized.match(/[^.!?]+[.!?]*/g) || [normalized];
  const chunks: string[] = [];
  let current: string[] = [];
  let count = 0;

  const flush = () => {
    if (current.length) {
      chunks.push(current.join(' ').trim());
      current = [];
      count = 0;
    }
  };

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    if (count + words.length > targetWords && current.length) {
      flush();
    }
    if (words.length > targetWords) {
      // Hard split very long sentence by words
      for (let i = 0; i < words.length; i += targetWords) {
        const part = words.slice(i, i + targetWords).join(' ');
        chunks.push(part);
      }
      current = [];
      count = 0;
    } else {
      current.push(sentence.trim());
      count += words.length;
    }
  }
  flush();
  return chunks;
}

/**
 * Extrai as últimas N frases completas de um texto
 * Garante que não corta no meio de uma frase
 */
export function extractLastCompleteSentences(text: string, maxChars: number = 500): string {
  const trimmed = text.trim();
  
  // Dividir em frases (termina com . ! ?)
  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length === 0) {
    return trimmed.slice(-maxChars);
  }
  
  // Construir contexto de trás para frente até atingir maxChars
  let context = '';
  for (let i = sentences.length - 1; i >= 0; i--) {
    const candidate = sentences[i] + context;
    if (candidate.length > maxChars && context.length > 0) {
      break; // Já temos contexto suficiente
    }
    context = sentences[i] + context;
  }
  
  return context.trim();
}

/**
 * Extrai últimos parágrafos completos
 * Garante que não corta no meio de um parágrafo
 */
export function extractLastCompleteParagraphs(text: string, maxChars: number = 500): string {
  const trimmed = text.trim();
  const paragraphs = trimmed.split(/\n\n+/).filter(p => p.trim());
  
  if (paragraphs.length === 0) {
    return extractLastCompleteSentences(text, maxChars);
  }
  
  // Se último parágrafo já é maior que maxChars, usar só ele
  if (paragraphs[paragraphs.length - 1].length >= maxChars) {
    return extractLastCompleteSentences(paragraphs[paragraphs.length - 1], maxChars);
  }
  
  // Construir contexto de trás para frente
  let context = '';
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const candidate = paragraphs[i] + (context ? '\n\n' + context : '');
    if (candidate.length > maxChars && context.length > 0) {
      break;
    }
    context = paragraphs[i] + (context ? '\n\n' + context : '');
  }
  
  return context.trim();
}
