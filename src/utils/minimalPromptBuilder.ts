// ✅ src/utils/minimalPromptBuilder.ts
// Versão Final - Sem dependências externas conflitantes

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

// Lista interna para evitar erros de importação circular
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
  "pl-PL": "Polski",
};

/**
 * 1. Extrai seção específica da premissa
 * Evita que o Chunk 2 leia a premissa do Chunk 1
 */
function extractPremiseSection(premise: string, sectionNumber: number): string {
  // Regex flexível: aceita [SEÇÃO 1], [BLOCO 1], PART 1, etc.
  const sectionRegex = new RegExp(
    `(?:[\\[\\(]?)?\\b(?:SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*${sectionNumber}\\b[^\\n]*([\\s\\S]*?)(?=(?:[\\[\\(]?)?\\b(?:SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*\\d+|$)`,
    "i",
  );

  const match = premise.match(sectionRegex);
  if (match) {
    // Retorna o conteúdo limpo da seção
    return match[1].replace(/^[:\-\s]+/, "").trim();
  }

  // Fallback: Divisão por parágrafos duplos (Caso a IA esqueça as tags)
  const paragraphs = premise.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length >= 3) {
    const totalAvailable = paragraphs.length;
    // Lógica proporcional para distribuir o conteúdo
    if (sectionNumber === 1) return paragraphs.slice(0, Math.ceil(totalAvailable * 0.3)).join("\n\n");
    if (sectionNumber === 2)
      return paragraphs.slice(Math.ceil(totalAvailable * 0.3), Math.ceil(totalAvailable * 0.7)).join("\n\n");
    return paragraphs.slice(Math.ceil(totalAvailable * 0.7)).join("\n\n");
  }

  // Último recurso: retorna tudo (mas isso é raro se o Template estiver certo)
  return premise;
}

/**
 * 2. Constrói o Prompt Blindado
 */
export function buildMinimalChunkPrompt(userPrompt: string, context: MinimalChunkContext): string {
  const { title, language, targetWords, premise, chunkIndex, totalChunks, lastParagraph } = context;
  const languageName = LANGUAGE_NAMES[language] || language;

  // Extrai APENAS a parte da premissa relevante para agora
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
(Ignore instruções de "Comece com..." se esta não for a Parte 1)

`;

  // --- TRAVA DE SEGURANÇA ANTI-DUPLICAÇÃO ---
  if (chunkIndex > 0 && lastParagraph) {
    // Pegamos apenas as últimas 20 palavras.
    // Se enviarmos o parágrafo todo, a IA tenta reescrevê-lo (efeito eco).
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
    prompt += `\nINSTRUÇÃO: Parte Final. Caminhe para o desfecho definitivo. Não reinicie a história.\n`;
  }

  prompt += `\nEscreva APENAS o roteiro da Parte ${chunkIndex + 1}:\n`;

  return prompt;
}

// --- FUNÇÕES AUXILIARES NECESSÁRIAS (Para evitar erros no console) ---

export function extractLastParagraph(text: string): string {
  if (!text) return "";
  const paras = text.split(/\n\n+/);
  return paras[paras.length - 1] || "";
}

export function extractSemanticAnchors(text: string): string[] {
  return []; // Placeholder para manter compatibilidade
}

export function detectParagraphDuplication(text: string, prev: string): any {
  return { hasDuplication: false }; // Placeholder
}

/**
 * Sanitiza o script removendo metadados e tags de produção.
 * (Restaurado para que outros arquivos possam importar)
 */
export function sanitizeScript(text: string): string {
  let sanitized = text;
  // Remove tags [IMAGEM:...], [MÚSICA:...]
  sanitized = sanitized.replace(
    /\[(?:IMAGEM|IMAGEN|IMAGE|MÚSICA|MUSIC|SFX|CENA|SCENE|SOUND|IMG|FOTO|PHOTO|EFEITO|EFFECT)[:\s][^\]]*\]/gi,
    "",
  );
  // Remove instruções de direção em maiúsculas (ex: [RISE MUSIC])
  sanitized = sanitized.replace(/\[[A-Z][A-Z\s]{2,30}:[^\]]*\]/g, "");
  // Limpeza de espaços
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n");
  sanitized = sanitized.replace(/^\s*\n/, "");
  return sanitized.trim();
}

export function buildEmergencyPrompt(userPrompt: string, context: MinimalChunkContext, duplicatedText: string): string {
  return `
ERRO: Você repetiu o texto anterior: "${duplicatedText.slice(0, 50)}...".
CORREÇÃO: Escreva a continuação novamente, mas COMECE COM UMA NOVA FRASE.
NÃO REPITA O CONTEXTO.
  `;
}

export function formatParagraphsForNarration(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n\n");
}
