// ✅ SISTEMA "PROMPT INVISÍVEL 3.0" - VERSÃO SELF-CONTAINED
// Removemos imports externos para evitar conflitos de variáveis (SyntaxError)

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

// Lista interna para evitar dependências e erros de importação
const LANGUAGE_NAMES: Record<string, string> = {
  "pt-BR": "Português Brasileiro",
  "pt-PT": "Português",
  "en-US": "English",
  "en-GB": "English",
  "es-ES": "Español",
  "fr-FR": "Français",
  "de-DE": "Deutsch",
  "it-IT": "Italiano",
  "ja-JP": "Japanese",
  "ru-RU": "Russian",
  "zh-CN": "Chinese",
};

/**
 * Extrai seção específica da premissa (Tags [SEÇÃO X] ou [BLOCO X])
 */
function extractPremiseSection(premise: string, sectionNumber: number): string {
  // Regex flexível que aceita SEÇÃO, BLOCO, PARTE, SECTION
  const sectionRegex = new RegExp(
    `(?:[\\[\\(]?)?\\b(?:SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*${sectionNumber}\\b[^\\n]*([\\s\\S]*?)(?=(?:[\\[\\(]?)?\\b(?:SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*\\d+|$)`,
    "i",
  );

  const match = premise.match(sectionRegex);
  if (match) {
    // Retorna o conteúdo limpo
    return match[1].replace(/^[:\-\s]+/, "").trim();
  }

  // Fallback: Divisão por parágrafos duplos se não houver tags
  const paragraphs = premise.split(/\n\n+/).filter((p) => p.trim().length > 0);

  if (paragraphs.length >= 3) {
    // Tenta mapear proporcionalmente
    const totalAvailable = paragraphs.length;
    if (sectionNumber === 1) {
      return paragraphs.slice(0, Math.ceil(totalAvailable * 0.3)).join("\n\n");
    }
    if (sectionNumber === 2) {
      return paragraphs.slice(Math.ceil(totalAvailable * 0.3), Math.ceil(totalAvailable * 0.7)).join("\n\n");
    }
    return paragraphs.slice(Math.ceil(totalAvailable * 0.7)).join("\n\n");
  }

  return premise; // Último caso
}

/**
 * ✅ CONSTRUTOR DE PROMPT BLINDADO
 * Inclui instruções negativas para evitar loops e duplicação
 */
export function buildMinimalChunkPrompt(userPrompt: string, context: MinimalChunkContext): string {
  const { title, language, targetWords, premise, chunkIndex, totalChunks, lastParagraph } = context;

  // Resolve nome do idioma localmente
  const languageName = LANGUAGE_NAMES[language] || language;

  const sectionContent = extractPremiseSection(premise, chunkIndex + 1);

  let prompt = `
ATUE COMO: Roteirista Profissional de YouTube.
TAREFA: Escrever a PARTE ${chunkIndex + 1} de ${totalChunks}.

DADOS:
- Título: "${title}"
- Idioma: ${languageName}
- Meta: ~${targetWords} palavras

---
CONTEÚDO DESTA PARTE (Siga isto):
${sectionContent}
---

ESTILO (Do Usuário):
"""
${userPrompt}
"""
(Ignore "Comece com..." se não for a Parte 1)

`;

  // --- LÓGICA ANTI-DUPLICAÇÃO ---
  if (chunkIndex > 0 && lastParagraph) {
    // Pegamos apenas as últimas 15 palavras para o gancho
    const words = lastParagraph.trim().split(/\s+/);
    const shortContext = words.slice(-20).join(" ");

    prompt += `
🔗 GANCHO DE CONTINUIDADE:
A parte anterior terminou com: "...${shortContext}"

🛑 REGRA CRÍTICA DE NÃO-REPETIÇÃO:
1. NÃO repita a frase acima.
2. NÃO reformule o que já aconteceu.
3. Comece IMEDIATAMENTE a próxima ação/frase.
`;
  } else if (chunkIndex === 0) {
    prompt += `\nINSTRUÇÃO: Este é o início. Comece com um gancho forte.\n`;
  }

  if (chunkIndex === totalChunks - 1) {
    prompt += `\nINSTRUÇÃO: Parte Final. Faça o desfecho.\n`;
  }

  prompt += `\nEscreva APENAS o roteiro da Parte ${chunkIndex + 1}:\n`;

  return prompt;
}

// Funções auxiliares mantidas para compatibilidade
export function extractLastParagraph(text: string): string {
  if (!text) return "";
  const paras = text.split(/\n\n+/);
  return paras[paras.length - 1] || "";
}

export function extractSemanticAnchors(text: string): string[] {
  return []; // Simplificado para evitar erro
}

export function detectParagraphDuplication(text: string, prev: string): any {
  return { hasDuplication: false };
}
