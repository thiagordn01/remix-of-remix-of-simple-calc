// ✅ src/utils/scriptCleanup.ts

/**
 * Utilitários para limpeza e formatação de guiões.
 */

// Quebra parágrafos gigantes em menores baseados em pontuação
function breakHugeParagraphs(text: string): string {
  return text
    .split("\n")
    .map((paragraph) => {
      if (paragraph.length < 250) return paragraph;
      // Substitui ". " por ".\n\n" para dar ar ao texto
      return paragraph.replace(/([.?!])\s+([A-Z])/g, "$1\n\n$2");
    })
    .join("\n");
}

/**
 * Corta o texto APENAS se encontrar a tag técnica de fim.
 * NÃO corta mais por palavras como "Obrigado" ou "Subscreva".
 */
export function truncateAfterEnding(text: string): { cleaned: string; found: boolean } {
  // Agora confiamos apenas em tags explícitas para não cortar CTAs legítimos
  const endTriggers = ["[FIM]", "[THE END]", "[FIN]"];

  for (const trigger of endTriggers) {
    // Busca case-insensitive
    const index = text.toUpperCase().lastIndexOf(trigger);
    if (index !== -1) {
      // Corta exatamente onde a tag começa, removendo a tag e o lixo depois
      return {
        cleaned: text.slice(0, index).trim(),
        found: true,
      };
    }
  }

  return { cleaned: text, found: false };
}

export function cleanScriptRepetitions(text: string): string {
  if (!text) return "";
  let cleaned = text;

  // 1. Remove repetição exata de blocos (A. A.)
  const echoRegex = /([^\n.!?]{15,}[.!?])\s*\1/g;
  cleaned = cleaned.replace(echoRegex, "$1");

  // 2. Remove repetição de início
  const startEchoRegex = /^([^\.!?]{10,}[.!?])\s*\1/i;
  cleaned = cleaned.replace(startEchoRegex, "$1");

  return cleaned;
}

export function cleanFinalScript(text: string): string {
  if (!text) return "";
  let result = text;

  // Limpezas básicas de Markdown
  result = result
    .replace(/\*\*/g, "")
    .replace(/\[.*?\]/g, "") // Remove tags restantes (como [Música])
    .replace(/^\s*[\-\*]\s+/gm, "")
    .replace(/#{1,6}\s?/g, "");

  // Remove títulos gerados pela IA
  const metaTitles = [/^Título:.*$/im, /^Roteiro:.*$/im, /^Parte \d+.*$/im, /^Capítulo \d+.*$/im];
  metaTitles.forEach((regex) => {
    result = result.replace(regex, "");
  });

  // Aplica limpeza de repetições (gaguez)
  result = cleanScriptRepetitions(result);

  // Aplica quebra visual de parágrafos
  result = breakHugeParagraphs(result);

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export function validateScriptQuality(script: string, targetWords: number) {
  return { score: 100, issues: [] };
}
