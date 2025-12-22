// ✅ src/utils/scriptCleanup.ts

/**
 * Corta o texto se encontrar frases de encerramento.
 * Isso impede que a IA diga "Tchau" e depois comece a história de novo.
 */
export function truncateAfterEnding(text: string): { cleaned: string; found: boolean } {
  const lower = text.toLowerCase();

  const endTriggers = [
    // Tags
    "[fim]",
    "***",
    // Polonês
    "do usłyszenia w kolejnej",
    "do zobaczenia w kolejnej",
    "subskrybuj kanał",
    "zasubskrybuj kanał",
    "dziękuję, że byłeś",
    // Português
    "inscreva-se no canal",
    "até a próxima",
    "obrigado por assistir",
    "deixe seu like",
    // Inglês
    "thanks for watching",
    "subscribe to the channel",
    "see you next time",
  ];

  for (const trigger of endTriggers) {
    const index = lower.lastIndexOf(trigger);
    if (index !== -1) {
      // Pega o texto até a frase de fim + um pouco de margem e corta o resto
      const cutPoint = Math.min(text.length, index + trigger.length + 50);
      return {
        cleaned: text.slice(0, cutPoint), // Corta o lixo pós-final
        found: true,
      };
    }
  }

  return { cleaned: text, found: false };
}

// Quebra parágrafos gigantes nos pontos finais
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

export function cleanScriptRepetitions(text: string): string {
  if (!text) return "";
  let cleaned = text;

  // 1. Remove repetição exata de blocos
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

  // Remove Markdown e Metadados
  result = result
    .replace(/\*\*/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/^\s*[\-\*]\s+/gm, "")
    .replace(/#{1,6}\s?/g, "");

  const metaTitles = [/^Título:.*$/im, /^Roteiro:.*$/im, /^Parte \d+.*$/im, /^Capítulo \d+.*$/im];
  metaTitles.forEach((regex) => {
    result = result.replace(regex, "");
  });

  // Aplica as limpezas lógicas
  result = cleanScriptRepetitions(result);

  // Aplica a quebra visual de parágrafos (Anti-Wall of Text)
  result = breakHugeParagraphs(result);

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export function validateScriptQuality(script: string, targetWords: number) {
  return { score: 100, issues: [] };
}
