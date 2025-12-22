// ✅ src/utils/scriptCleanup.ts

/**
 * Remove Call-to-Actions (CTAs) que aparecem prematuramente no meio do texto.
 * Só permite CTAs no final absoluto.
 */
function removeRepeatedCTAs(text: string): string {
  // Padrões de CTA em várias línguas (PL, PT, IT)
  const ctaPatterns = [
    /jeśli ta historia.*?subskrybuj/gi,
    /zasubskrybuj kanał/gi,
    /zostaw.*?ocenę/gi,
    /napisz w komentarzu/gi,
    /daj znać w komentarzu/gi,
    /nie zapomnij zasubskrybować/gi,
    /obejrzyj tę historię do końca/gi,
    /inscreva-se no canal/gi,
    /deixe seu like/gi,
    // 🇮🇹 CTAs italianos comuns
    /guarda fino alla fine/gi,
    /commenta dando un voto da 0 a 10/gi,
    /commenta dandomi un voto da 0 a 10/gi,
    /iscriviti per sostenere il mio lavoro/gi,
    /iscriviti al canale/gi,
  ];

  // Divide o texto em linhas
  const lines = text.split("\n");
  const totalLines = lines.length;

  // Define uma "Zona Segura" no final (últimas 10% das linhas) onde CTAs são permitidos
  const safeZoneIndex = Math.floor(totalLines * 0.9);

  return lines
    .map((line, index) => {
      // Se a linha estiver ANTES da zona segura, removemos CTAs
      if (index < safeZoneIndex) {
        let cleanedLine = line;
        ctaPatterns.forEach((pattern) => {
          cleanedLine = cleanedLine.replace(pattern, "");
        });
        return cleanedLine;
      }
      // Se estiver no final, deixa como está
      return line;
    })
    .join("\n");
}

export function truncateAfterEnding(text: string): { cleaned: string; found: boolean } {
  // Apenas tags técnicas de fim
  const endTriggers = ["[FIM]", "[THE END]", "[FIN]"];

  for (const trigger of endTriggers) {
    const index = text.toUpperCase().lastIndexOf(trigger);
    if (index !== -1) {
      return {
        cleaned: text.slice(0, index).trim(),
        found: true,
      };
    }
  }
  return { cleaned: text, found: false };
}

function breakHugeParagraphs(text: string): string {
  return text
    .split("\n")
    .map((paragraph) => {
      if (paragraph.length < 250) return paragraph;
      return paragraph.replace(/([.?!])\s+([A-Z])/g, "$1\n\n$2");
    })
    .join("\n");
}

export function cleanScriptRepetitions(text: string): string {
  if (!text) return "";
  let cleaned = text;

  // 1. Remove CTAs repetitivos no meio do texto
  cleaned = removeRepeatedCTAs(cleaned);

  // 2. Remove repetição exata de blocos
  const echoRegex = /([^\n.!?]{15,}[.!?])\s*\1/g;
  cleaned = cleaned.replace(echoRegex, "$1");

  // 3. Remove repetição de início
  const startEchoRegex = /^([^\.!?]{10,}[.!?])\s*\1/i;
  cleaned = cleaned.replace(startEchoRegex, "$1");

  return cleaned;
}

export function cleanFinalScript(text: string): string {
  if (!text) return "";
  let result = text;

  result = result
    .replace(/\*\*/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/^\s*[\-\*]\s+/gm, "")
    .replace(/#{1,6}\s?/g, "");

  const metaTitles = [/^Título:.*$/im, /^Roteiro:.*$/im, /^Parte \d+.*$/im, /^Capítulo \d+.*$/im, /^\[BIBLE\].*$/im];
  metaTitles.forEach((regex) => {
    result = result.replace(regex, "");
  });

  // Remove a Bíblia se ela vazar no texto final
  result = result.replace(/\[BIBLE\][\s\S]*?\[\/BIBLE\]/gi, "");

  result = cleanScriptRepetitions(result);
  result = removeGlobalAdjacentSentenceDuplicates(result);
  result = breakHugeParagraphs(result);

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function removeGlobalAdjacentSentenceDuplicates(text: string): string {
  const splitter = /(?<=[.!?])\s+/;
  const sentences = text.split(splitter).filter((s) => s.trim().length > 0);
  if (sentences.length <= 1) return text;

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/["'“”„”]/g, "").trim();

  const result: string[] = [];
  let lastNorm = "";

  for (const sentence of sentences) {
    const norm = normalize(sentence);
    if (!norm) continue;
    if (norm === lastNorm) continue;
    result.push(sentence);
    lastNorm = norm;
  }

  return result.join(" ");
}

export function validateScriptQuality(script: string, targetWords: number) {
  return { score: 100, issues: [] };
}
