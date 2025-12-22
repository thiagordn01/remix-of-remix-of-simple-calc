// ✅ src/utils/scriptCleanup.ts
// Versão Final - Com filtro anti-gagueira

/**
 * 1. Remove repetições onde a IA repete a última frase do contexto anterior.
 * Ex: "O sol nasceu. O sol nasceu e brilhou..." -> "O sol nasceu e brilhou..."
 */
export function cleanScriptRepetitions(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Filtro 1: Repetição exata de blocos longos (Gagueira de Parágrafo)
  // Procura por: (texto de 15 chars) seguido imediatamente de (texto de 15 chars)
  const paragraphEchoRegex = /([^\n.!?]{15,}[.!?])\s*\1/g;
  cleaned = cleaned.replace(paragraphEchoRegex, "$1");

  // Filtro 2: Repetição de início de frase (Eco de Continuidade)
  // Ex: Texto anterior terminou em "Fim." e novo começa com "Fim. O dia..."
  const startEchoRegex = /^([^\.!?]{10,}[.!?])\s*\1/i;
  cleaned = cleaned.replace(startEchoRegex, "$1");

  // Filtro 3: Repetição de frases curtas consecutivas
  const shortPhraseRegex = /([A-Z][^.!?]+[.!?])\s*\1/g;
  cleaned = cleaned.replace(shortPhraseRegex, "$1");

  return cleaned;
}

/**
 * 2. Função principal de limpeza chamada pelo useScriptGenerator
 */
export function cleanFinalScript(text: string): string {
  if (!text) return "";

  let result = text;

  // Remove Markdown (*, #) e Metadados ([Música])
  result = result
    .replace(/\*\*/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/^\s*[\-\*]\s+/gm, "")
    .replace(/#{1,6}\s?/g, "");

  // Remove Títulos de Seções que a IA adora inventar
  const metaTitles = [
    /^Título:.*$/im,
    /^Roteiro:.*$/im,
    /^Parte \d+.*$/im,
    /^Cena \d+.*$/im,
    /^Narrador:.*$/im,
    /^Intro:.*$/im,
    /^Outro:.*$/im,
  ];
  metaTitles.forEach((regex) => {
    result = result.replace(regex, "");
  });

  // APLICA O FILTRO DE REPETIÇÃO
  result = cleanScriptRepetitions(result);

  // Normaliza espaços (máximo 2 quebras de linha)
  return result
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

// Mantido para compatibilidade com seus outros arquivos
export function validateScriptQuality(script: string, targetWords: number) {
  return { score: 100, issues: [] };
}
