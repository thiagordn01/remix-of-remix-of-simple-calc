/**
 * Utilitários para limpeza e formatação de roteiros.
 */

// Quebra parágrafos gigantes em menores baseados em pontuação
function breakHugeParagraphs(text: string): string {
  // Se um parágrafo tiver mais de 250 caracteres, tenta quebrar no ponto final mais próximo
  return text
    .split("\n")
    .map((paragraph) => {
      if (paragraph.length < 250) return paragraph;

      // Substitui ". " por ".\n\n" para forçar quebra, mas tenta não quebrar siglas
      return paragraph.replace(/([.?!])\s+([A-Z])/g, "$1\n\n$2");
    })
    .join("\n");
}

export function cleanScriptRepetitions(text: string): string {
  if (!text) return "";
  let cleaned = text;

  // 1. Remove a tag [FIM] se ela aparecer no texto (para não ir pro áudio)
  cleaned = cleaned.replace(/\[FIM\]/gi, "");

  // 2. Remove repetição exata de blocos (A. A.)
  const paragraphEchoRegex = /([^\n.!?]{15,}[.!?])\s*\1/g;
  cleaned = cleaned.replace(paragraphEchoRegex, "$1");

  // 3. Remove repetição de início (Eco)
  const startEchoRegex = /^([^\.!?]{10,}[.!?])\s*\1/i;
  cleaned = cleaned.replace(startEchoRegex, "$1");

  return cleaned;
}

export function cleanFinalScript(text: string): string {
  if (!text) return "";
  let result = text;

  // Limpezas básicas
  result = result
    .replace(/\*\*/g, "")
    .replace(/\[.*?\]/g, "") // Remove tags restantes
    .replace(/^\s*[\-\*]\s+/gm, "")
    .replace(/#{1,6}\s?/g, "");

  // Remove títulos indesejados
  const metaTitles = [/^Título:.*$/im, /^Roteiro:.*$/im, /^Parte \d+.*$/im];
  metaTitles.forEach((regex) => {
    result = result.replace(regex, "");
  });

  // APLICA AS CORREÇÕES CRÍTICAS
  result = cleanScriptRepetitions(result);
  result = breakHugeParagraphs(result); // <--- AQUI ESTÁ A MÁGICA DOS PARÁGRAFOS

  // Normaliza quebras de linha (máximo 2)
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

// Funções auxiliares mantidas
export function validateScriptQuality(script: string, targetWords: number) {
  return { score: 100, issues: [] };
}
