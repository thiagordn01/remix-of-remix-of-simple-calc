// ✅ src/utils/minimalPromptBuilder.ts

export interface MinimalChunkContext {
  title: string;
  language: string;
  targetWords: number;
  premise: string;
  chunkIndex: number;
  totalChunks: number;
  lastParagraph?: string;
  anchors?: string[];
}

const LANGUAGE_NAMES: Record<string, string> = {
  "pt-BR": "Português Brasileiro",
  "pt-PT": "Português",
  "en-US": "English",
  "es-ES": "Español",
  "fr-FR": "Français",
  "de-DE": "Deutsch",
  "it-IT": "Italiano",
  "pl-PL": "Polski",
  "ru-RU": "Russian",
  "ja-JP": "Japanese",
  "zh-CN": "Chinese",
};

function extractPremiseSection(premise: string, sectionNumber: number): string {
  const sectionRegex = new RegExp(
    `(?:[\\[\\(]?)?\\b(?:CAPITULO|CHAPTER|SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*${sectionNumber}\\b[^\\n]*([\\s\\S]*?)(?=(?:[\\[\\(]?)?\\b(?:CAPITULO|CHAPTER|SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*\\d+|$)`,
    "i",
  );

  const match = premise.match(sectionRegex);
  if (match) return match[1].replace(/^[:\-\s]+/, "").trim();

  const paragraphs = premise.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length >= 3) {
    const totalAvailable = paragraphs.length;
    if (sectionNumber === 1) return paragraphs.slice(0, Math.ceil(totalAvailable * 0.33)).join("\n\n");
    if (sectionNumber === 2)
      return paragraphs.slice(Math.ceil(totalAvailable * 0.33), Math.ceil(totalAvailable * 0.66)).join("\n\n");
    return paragraphs.slice(Math.ceil(totalAvailable * 0.66)).join("\n\n");
  }
  return premise;
}

export function buildMinimalChunkPrompt(userPrompt: string, context: MinimalChunkContext): string {
  const { title, language, targetWords, premise, chunkIndex, totalChunks, lastParagraph } = context;
  const languageName = LANGUAGE_NAMES[language] || language;
  const sectionContent = extractPremiseSection(premise, chunkIndex + 1);

  let prompt = `
ATUE COMO: Roteirista Profissional (Narrativa Contínua).
TAREFA: Escrever a parte ${chunkIndex + 1} de ${totalChunks}.

DADOS:
- Título: "${title}"
- Idioma: ${languageName}
- Meta: ~${targetWords} palavras

---
EVENTOS DESTA PARTE (O que acontece agora):
${sectionContent}
---

ESTILO:
"""
${userPrompt}
"""

`;

  // --- LÓGICA DE CONTINUIDADE AJUSTADA ---

  if (chunkIndex === 0) {
    // PARTE 1: PODE TER INTRODUÇÃO
    prompt += `\nINSTRUÇÃO: Este é o início. Comece a história imediatamente.\n`;
  } else if (chunkIndex < totalChunks - 1) {
    // PARTE DO MEIO: PROIBIDO TER INTRO/OUTRO
    prompt += `
⚠️ INSTRUÇÃO CRÍTICA (MEIO DA HISTÓRIA):
1. Esta é uma continuação direta. NÃO faça introduções como "Bem-vindos de volta".
2. NÃO faça conclusões como "Inscreva-se para ver a parte 3".
3. NÃO resuma o que aconteceu antes.
4. Apenas continue a narrativa como se fosse um único texto longo.
`;
  } else {
    // ÚLTIMA PARTE: DEVE ENCERRAR
    prompt += `\nINSTRUÇÃO: Este é o FINAL. Encerre a história de forma satisfatória e definitiva.\n`;
  }

  if (chunkIndex > 0 && lastParagraph) {
    const words = lastParagraph.trim().split(/\s+/);
    const shortContext = words.slice(-20).join(" ");

    prompt += `
🔗 CONTINUIDADE:
O texto anterior terminou com: "...${shortContext}"

➡️ Comece IMEDIATAMENTE a partir daqui, completando a ação ou pensamento.
`;
  }

  prompt += `\nEscreva agora o roteiro da Parte ${chunkIndex + 1}:\n`;

  return prompt;
}

// Funções auxiliares
export function extractLastParagraph(text: string): string {
  if (!text) return "";
  const paras = text.split(/\n\n+/);
  return paras[paras.length - 1] || "";
}
export function sanitizeScript(text: string): string {
  let sanitized = text;
  sanitized = sanitized.replace(
    /\[(?:IMAGEM|IMAGEN|IMAGE|MÚSICA|MUSIC|SFX|CENA|SCENE|SOUND|IMG|FOTO|PHOTO|EFEITO|EFFECT)[:\s][^\]]*\]/gi,
    "",
  );
  sanitized = sanitized.replace(/\[[A-Z][A-Z\s]{2,30}:[^\]]*\]/g, "");
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n");
  return sanitized.trim();
}
export function buildEmergencyPrompt(userPrompt: string, context: any, duplicatedText: string): string {
  return "Evite duplicação.";
}
export function formatParagraphsForNarration(text: string): string {
  return text;
}
export function extractSemanticAnchors(text: string): string[] {
  return [];
}
export function detectParagraphDuplication(text: string, prev: string): any {
  return { hasDuplication: false };
}
