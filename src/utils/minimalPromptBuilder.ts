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

// Lista interna para evitar dependências circulares
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

/**
 * Extrai o conteúdo de um capítulo específico da premissa.
 * Suporta: [CAPITULO 1], [SEÇÃO 1], [PART 1]
 */
function extractPremiseSection(premise: string, sectionNumber: number): string {
  // Regex poderoso que busca várias nomenclaturas
  const sectionRegex = new RegExp(
    `(?:[\\[\\(]?)?\\b(?:CAPITULO|CHAPTER|SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*${sectionNumber}\\b[^\\n]*([\\s\\S]*?)(?=(?:[\\[\\(]?)?\\b(?:CAPITULO|CHAPTER|SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*\\d+|$)`,
    "i",
  );

  const match = premise.match(sectionRegex);
  if (match) {
    // Retorna o conteúdo limpo
    return match[1].replace(/^[:\-\s]+/, "").trim();
  }

  // Fallback: Se a IA não usou tags (raro com o novo prompt), divide por parágrafos
  const paragraphs = premise.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length >= 3) {
    const totalAvailable = paragraphs.length;
    // Tenta distribuir proporcionalmente
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
ATUE COMO: Roteirista Profissional.
TAREFA: Escrever o CAPÍTULO ${chunkIndex + 1} de ${totalChunks}.

DADOS:
- Título: "${title}"
- Idioma: ${languageName}
- Meta flexível: ~${targetWords} palavras

---
O QUE ACONTECE NESTE CAPÍTULO (Siga estritamente):
${sectionContent}
---

ESTILO (Do Usuário):
"""
${userPrompt}
"""

`;

  // --- TRAVA ANTI-LOOP ---
  if (chunkIndex > 0 && lastParagraph) {
    const words = lastParagraph.trim().split(/\s+/);
    const shortContext = words.slice(-20).join(" ");

    prompt += `
CONTEXTO ANTERIOR:
"...${shortContext}"

🛑 REGRAS CRÍTICAS:
1. NÃO repita o texto acima.
2. Comece IMEDIATAMENTE a próxima ação.
3. NÃO faça resumos do tipo "Anteriormente...".
`;
  } else if (chunkIndex === 0) {
    prompt += `\nINSTRUÇÃO: Este é o início. Comece com um gancho forte.\n`;
  }

  if (chunkIndex === totalChunks - 1) {
    prompt += `\nINSTRUÇÃO: Este é o ÚLTIMO capítulo. Encerre a história. NÃO deixe pontas soltas.\n`;
  }

  prompt += `\nEscreva agora o roteiro do Capítulo ${chunkIndex + 1}:\n`;

  return prompt;
}

// Funções auxiliares para manter compatibilidade
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
