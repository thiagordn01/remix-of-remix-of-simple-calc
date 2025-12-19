// Arquivo: src/utils/geminiTtsChunks.ts

// Reduzido para 450 palavras (~585 tokens) para máxima consistência de tom
// Baseado em feedback da comunidade: "menos de 600 a 700 tokens"
// Conversão: 450 palavras × 1.3 ≈ 585 tokens (margem conservadora)
// Histórico: 800 → 500 → 450 (ajuste fino baseado em testes reais)
export const GEMINI_TTS_WORD_LIMIT = 450;

/**
 * Conta palavras em um texto
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Valida que nenhum chunk ultrapassa o limite
 */
export function validateChunks(chunks: string[], maxWords: number = GEMINI_TTS_WORD_LIMIT): boolean {
  return chunks.every((chunk) => countWords(chunk) <= maxWords);
}

/**
 * Quebra um texto à força por contagem de palavras.
 * Este é o nosso "plano de emergência" para garantir que nenhum chunk seja grande demais.
 */
function forceSplitByWords(text: string, maxWords: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const forcedChunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    const chunkSlice = words.slice(i, i + maxWords);
    forcedChunks.push(chunkSlice.join(" "));
  }
  return forcedChunks;
}

/**
 * Divide texto em chunks de até 450 palavras (~585 tokens), respeitando pontos e vírgulas.
 * Esta é a versão corrigida e mais segura.
 */
export function splitTextForGeminiTts(text: string, maxWords: number = GEMINI_TTS_WORD_LIMIT): string[] {
  if (!text.trim()) return [];

  const chunks: string[] = [];
  let currentChunk = "";

  // Primeiro, dividimos o texto em sentenças para tentar manter a coesão.
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const sentenceWordCount = countWords(trimmedSentence);
    const currentChunkWordCount = countWords(currentChunk);

    // Se a sentença sozinha já ultrapassa o limite, ela precisa de tratamento especial.
    if (sentenceWordCount > maxWords) {
      // Primeiro, se já tínhamos um chunk em andamento, vamos salvá-lo.
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // Agora, tratamos a sentença gigante, dividindo-a por vírgulas.
      const parts = trimmedSentence.split(",");
      for (const part of parts) {
        const trimmedPart = part.trim();
        if (!trimmedPart) continue;

        const partWordCount = countWords(trimmedPart);

        // **AQUI ESTÁ A CORREÇÃO PRINCIPAL**
        // Se a parte (entre vírgulas) ainda for maior que o limite, usamos a força bruta.
        if (partWordCount > maxWords) {
          const hardSplits = forceSplitByWords(trimmedPart, maxWords);
          chunks.push(...hardSplits);
        } else {
          // Se a parte cabe, adicionamos ao chunk atual. Se não, salvamos o atual e começamos um novo.
          const currentPartChunkWordCount = countWords(currentChunk);
          if (currentPartChunkWordCount + partWordCount <= maxWords) {
            currentChunk += (currentChunk ? "," : "") + trimmedPart;
          } else {
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = trimmedPart;
          }
        }
      }
    } else {
      // Se a sentença normal cabe no chunk atual, ótimo.
      if (currentChunkWordCount + sentenceWordCount <= maxWords) {
        currentChunk += (currentChunk ? " " : "") + trimmedSentence;
      } else {
        // Se não cabe, salvamos o chunk atual e a nova sentença inicia o próximo chunk.
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedSentence;
      }
    }
  }

  // Não se esqueça de salvar o último chunk que sobrou.
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
