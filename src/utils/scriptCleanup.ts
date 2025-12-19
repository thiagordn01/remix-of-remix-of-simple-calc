/**
 * Utilitários para limpeza e formatação de roteiros.
 * Focado em remover repetições ("gagueira" da IA) e metadados.
 */

/**
 * Remove repetições onde a IA repete a última frase do contexto anterior.
 * Ex: "O sol nasceu. O sol nasceu e..." -> "O sol nasceu e..."
 */
export function cleanScriptRepetitions(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove repetição exata de parágrafos/frases longas (15+ chars)
  // Procura por: (texto) seguido de (texto)
  const echoRegex = /([^\n.!?]{15,}[.!?])\s*\1/g;
  cleaned = cleaned.replace(echoRegex, "$1");

  // 2. Remove repetição no início do texto (comum em chunks)
  // Ex: Texto anterior terminou em "Fim." e novo começa com "Fim. O dia..."
  const startEchoRegex = /^([^\.!?]{10,}[.!?])\s*\1/i;
  cleaned = cleaned.replace(startEchoRegex, "$1");

  // 3. Remove repetição de frases curtas consecutivas
  const shortPhraseRegex = /([A-Z][^.!?]+[.!?])\s*\1/g;
  cleaned = cleaned.replace(shortPhraseRegex, "$1");

  return cleaned;
}

export function cleanFinalScript(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Remove Markdown e Metadados
  result = result
    .replace(/\*\*/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/^\s*[\-\*]\s+/gm, "")
    .replace(/#{1,6}\s?/g, "");

  // 2. Remove Títulos de Seções (IA gosta de colocar "Parte 1:", "Intro:")
  const metaTitles = [/^Título:.*$/im, /^Roteiro:.*$/im, /^Parte \d+.*$/im, /^Cena \d+.*$/im, /^Narrador:.*$/im];
  metaTitles.forEach((regex) => {
    result = result.replace(regex, "");
  });

  // 3. Aplica a limpeza de repetições
  result = cleanScriptRepetitions(result);

  // 4. Normaliza espaços
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

// Mantido para compatibilidade
export function validateScriptQuality(script: string, targetWords: number) {
  return { score: 100, issues: [] };
}
