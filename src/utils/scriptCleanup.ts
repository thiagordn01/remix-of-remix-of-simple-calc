/**
 * Utilitários para limpeza e formatação de roteiros gerados por IA.
 * Focado em remover alucinações, marcações de markdown e repetições (gagueira).
 */

export function cleanScriptRepetitions(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove repetição exata de frases longas (Gagueira de parágrafo)
  // Ex: "Ele correu para a porta. Ele correu para a porta."
  // O regex busca grupos de 15+ caracteres que se repetem com apenas espaços/pontuação entre eles.
  const paragraphEchoRegex = /([^\n.!?]{15,}[.!?])\s*\1/g;
  cleaned = cleaned.replace(paragraphEchoRegex, "$1");

  // 2. Remove repetição de início de frase (Eco de continuidade)
  // Ex: "...no final do dia. No final do dia, ele foi..."
  // Remove a repetição se ela ocorrer logo no início do texto ou após pontuação
  const startEchoRegex = /^([^\.!?]{10,})\s*\1/i;
  cleaned = cleaned.replace(startEchoRegex, "$1");

  // 3. Remove repetições de frases curtas consecutivas (3-4 palavras)
  const shortPhraseRegex = /([A-Z][^.!?]+[.!?])\s*\1/g;
  cleaned = cleaned.replace(shortPhraseRegex, "$1");

  return cleaned;
}

export function cleanFinalScript(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Remove Artefatos de Markdown e Metadados
  result = result
    .replace(/\*\*/g, "") // Negrito
    .replace(/\[.*?\]/g, "") // Tags como [Música], [Aplausos]
    .replace(/^\s*[\-\*]\s+/gm, "") // Listas bullets no início da linha
    .replace(/#{1,6}\s?/g, ""); // Cabeçalhos Markdown (#, ##)

  // 2. Remove Títulos de Seções comuns que a IA gosta de colocar
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

  // 3. Aplica a limpeza de repetições (O "Gaguejo")
  result = cleanScriptRepetitions(result);

  // 4. Normalização Final de Espaços
  result = result
    .replace(/\n{3,}/g, "\n\n") // Máximo 2 quebras de linha
    .replace(/ {2,}/g, " ") // Máximo 1 espaço consecutivo
    .trim();

  return result;
}
