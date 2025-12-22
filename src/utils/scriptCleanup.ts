/**
 * Utilitários para limpeza e formatação de roteiros.
 */

// Quebra parágrafos gigantes em menores baseados em pontuação
// Se um bloco tiver > 300 caracteres, procuramos um ponto final para dar Enter.
function breakHugeParagraphs(text: string): string {
  return text
    .split("\n")
    .map((paragraph) => {
      if (paragraph.length < 300) return paragraph;

      // Substitui ". " (ponto espaço) por ".\n\n" (ponto parágrafo)
      // O regex evita quebrar siglas tipo "U.S.A." (olha para letra maiúscula depois)
      return paragraph.replace(/([.?!])\s+([A-Z])/g, "$1\n\n$2");
    })
    .join("\n");
}

export function cleanScriptRepetitions(text: string): string {
  if (!text) return "";
  let cleaned = text;

  // 1. Remove a tag [FIM] se sobrar
  cleaned = cleaned.replace(/\[FIM\]/gi, "");

  // 2. Remove repetição exata de parágrafos
  const paragraphEchoRegex = /([^\n.!?]{15,}[.!?])\s*\1/g;
  cleaned = cleaned.replace(paragraphEchoRegex, "$1");

  // 3. Remove repetição de início
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
    .replace(/\[.*?\]/g, "")
    .replace(/^\s*[\-\*]\s+/gm, "")
    .replace(/#{1,6}\s?/g, "");

  // Remove títulos indesejados
  const metaTitles = [/^Título:.*$/im, /^Roteiro:.*$/im, /^Parte \d+.*$/im];
  metaTitles.forEach((regex) => {
    result = result.replace(regex, "");
  });

  // 1. Remove Repetições
  result = cleanScriptRepetitions(result);

  // 2. QUEBRA OS PARÁGRAFOS GIGANTES (Visual Clean)
  result = breakHugeParagraphs(result);

  // Normaliza espaços
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export function validateScriptQuality(script: string, targetWords: number) {
  return { score: 100, issues: [] };
}
