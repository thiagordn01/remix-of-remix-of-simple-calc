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
 * Extrai a "Bíblia" (Dados fixos) da premissa.
 */
function extractBible(premise: string): string {
  const match = premise.match(/\[BIBLE\]([\s\S]*?)\[\/BIBLE\]/i);
  return match ? match[1].trim() : "Mantenha consistência com o contexto anterior.";
}

/**
 * Extrai o capítulo específico.
 */
function extractPremiseSection(premise: string, sectionNumber: number): string {
  const sectionRegex = new RegExp(
    `(?:[\\[\\(]?)?\\b(?:CAPITULO|CHAPTER|SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*${sectionNumber}\\b[^\\n]*([\\s\\S]*?)(?=(?:[\\[\\(]?)?\\b(?:CAPITULO|CHAPTER|SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*\\d+|$)`,
    "i",
  );

  const match = premise.match(sectionRegex);
  if (match) return match[1].replace(/^[:\-\s]+/, "").trim();

  // Fallback se a estrutura falhar
  return "Continue a história de onde parou.";
}

export function buildMinimalChunkPrompt(userPrompt: string, context: MinimalChunkContext): string {
  const { title, language, targetWords, premise, chunkIndex, totalChunks, lastParagraph } = context;
  const languageName = LANGUAGE_NAMES[language] || language;

  const bible = extractBible(premise);
  const sectionContent = extractPremiseSection(premise, chunkIndex + 1);

  let prompt = `
ATUE COMO: Roteirista de Série Contínua.
TAREFA: Escrever o CAPÍTULO ${chunkIndex + 1} de ${totalChunks}.

DADOS DO PROJETO:
- Título: "${title}"
- Idioma: ${languageName}
- Palavras Alvo: ~${targetWords}

---
📘 BÍBLIA DA HISTÓRIA (DADOS IMUTÁVEIS):
${bible}
(Use estes nomes e fatos. Não invente novos.)
---

🎬 O QUE ACONTECE NESTE CAPÍTULO (Siga APENAS isto):
${sectionContent}
---

ESTILO:
"""
${userPrompt}
"""

`;

  // --- TRAVAS DE CONTINUIDADE ---

  if (chunkIndex === 0) {
    prompt += `\nINSTRUÇÃO: Este é o INÍCIO. Apresente os personagens e o incidente inicial.\n`;
  } else if (chunkIndex < totalChunks - 1) {
    prompt += `
⚠️ INSTRUÇÃO DE MEIO (CRÍTICO):
1. Este texto será colado logo após o capítulo anterior.
2. NÃO faça introduções ("Bem-vindos de volta").
3. NÃO faça resumos ("Anteriormente...").
4. NÃO faça encerramentos ("Inscreva-se").
5. NÃO resolva a história ainda. Foque no desenvolvimento descrito acima.
`;
  } else {
    prompt += `\nINSTRUÇÃO: Este é o FINAL. Agora sim, resolva todos os conflitos e encerre a história.\n`;
  }

  if (chunkIndex > 0 && lastParagraph) {
    const words = lastParagraph.trim().split(/\s+/);
    const shortContext = words.slice(-25).join(" ");

    prompt += `
🔗 CONEXÃO PERFEITA:
O capítulo anterior terminou EXATAMENTE com:
"...${shortContext}"

➡️ Comece sua frase completando a ação acima ou iniciando a próxima imediata. Não repita o texto.
`;
  }

  prompt += `\nEscreva o roteiro do Capítulo ${chunkIndex + 1} (Sem títulos, apenas narração):\n`;

  return prompt;
}

// Funções auxiliares mantidas
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
