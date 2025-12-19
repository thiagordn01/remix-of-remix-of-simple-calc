import { getLanguageByCode } from "../data/languages";

export interface MinimalChunkContext {
  title: string;
  language: string;
  targetWords: number;
  premise: string;
  chunkIndex: number;
  totalChunks: number;
  lastParagraph?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  "pt-BR": "Português Brasileiro",
  "en-US": "English",
  "es-ES": "Español",
  "fr-FR": "Français",
  "de-DE": "Deutsch",
  "it-IT": "Italiano",
  "ja-JP": "Japanese",
  "ru-RU": "Russian",
  // Adicione outros conforme necessário, ou use o fallback do arquivo languages.ts
};

/**
 * Extrai a seção correta da premissa baseada nas tags [SEÇÃO X].
 * Se não encontrar tags, usa um fallback inteligente por parágrafos.
 */
function extractPremiseSection(premise: string, sectionNumber: number): string {
  // Regex flexível para encontrar [SEÇÃO 1], SEÇÃO 1, BLOCO 1, SECTION 1...
  const sectionRegex = new RegExp(
    `(?:[\\[\\(]?)?\\b(?:SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*${sectionNumber}\\b[^\\n]*([\\s\\S]*?)(?=(?:[\\[\\(]?)?\\b(?:SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*\\d+|$)`,
    "i",
  );

  const match = premise.match(sectionRegex);
  if (match) {
    // Retorna apenas o conteúdo limpo da seção
    return match[1].replace(/^[:\-\s]+/, "").trim();
  }

  // Fallback: Divisão por parágrafos duplos se não houver tags
  const paragraphs = premise.split(/\n\n+/).filter((p) => p.trim().length > 0);

  // Se temos parágrafos suficientes, tentamos distribuir
  if (paragraphs.length >= 3) {
    const totalAvailable = paragraphs.length;
    // Lógica simples: Seção 1 pega o início, Última seção pega o fim, Meio pega o resto
    if (sectionNumber === 1) {
      return paragraphs.slice(0, Math.max(1, Math.floor(totalAvailable * 0.3))).join("\n\n");
    }
    // (Simplificação para evitar código complexo no fallback)
    return premise;
  }

  return premise;
}

/**
 * Constrói o prompt para o chunk atual com TRAVAS ANTI-DUPLICAÇÃO.
 */
export function buildMinimalChunkPrompt(userPrompt: string, context: MinimalChunkContext): string {
  const { title, language, targetWords, premise, chunkIndex, totalChunks, lastParagraph } = context;

  // Resolve o nome do idioma
  const langObj = getLanguageByCode(language);
  const languageName = langObj ? langObj.name : LANGUAGE_NAMES[language] || language;

  // Pega apenas a premissa desta parte específica
  const sectionContent = extractPremiseSection(premise, chunkIndex + 1);

  let prompt = `
ATUE COMO: Roteirista Profissional de YouTube (Narrativa/Storytelling).
TAREFA: Escrever a PARTE ${chunkIndex + 1} de ${totalChunks} do roteiro.

DADOS DO PROJETO:
- Título: "${title}"
- Idioma de Saída: ${languageName} (Obrigatório)
- Meta de Palavras: ~${targetWords} palavras

---
📖 PREMISSA/GUIA PARA ESTA PARTE (O que deve acontecer agora):
${sectionContent}
---

🎨 ESTILO E TOM (Instruções do Usuário):
"""
${userPrompt}
"""
(Nota: Ignore comandos de "Comece com..." se esta não for a Parte 1. Mantenha o estilo, mas siga a premissa acima.)

`;

  // --- LÓGICA CRÍTICA ANTI-DUPLICAÇÃO ---
  if (chunkIndex > 0 && lastParagraph) {
    // Pegamos apenas as últimas 15-20 palavras para dar o "gancho".
    // NÃO enviamos o parágrafo inteiro para evitar que a IA o reescreva.
    const words = lastParagraph.trim().split(/\s+/);
    const shortContext = words.slice(-20).join(" ");

    prompt += `
🔗 CONEXÃO COM O ANTERIOR:
A parte anterior terminou EXATAMENTE com estas palavras:
"...${shortContext}"

🛑 REGRAS DE CONTINUIDADE (MUITO IMPORTANTE):
1. NÃO repita a frase acima.
2. NÃO reformule o que já foi dito.
3. Comece a sua resposta IMEDIATAMENTE completando a próxima ação ou pensamento.
4. O texto deve fluir como se não houvesse quebra.
`;
  } else if (chunkIndex === 0) {
    prompt += `
🚀 INSTRUÇÃO DE INÍCIO:
Este é o começo do vídeo. Comece com um gancho forte (hook) baseado na premissa.
`;
  }

  if (chunkIndex === totalChunks - 1) {
    prompt += `
🏁 INSTRUÇÃO DE FIM:
Esta é a parte final. Caminhe para o desfecho e encerramento.
`;
  }

  prompt += `
\n\n📢 ESCREVA ABAIXO APENAS O TEXTO DA NARRAÇÃO DA PARTE ${chunkIndex + 1}:
`;

  return prompt;
}

// Função auxiliar para detecção de duplicação grosseira (caso a limpeza falhe)
export function detectParagraphDuplication(
  currentText: string,
  previousText: string,
): { hasDuplication: boolean; duplicatedText: string } {
  if (!currentText || !previousText) return { hasDuplication: false, duplicatedText: "" };

  const currentLines = currentText.split("\n").filter((l) => l.length > 20);
  const prevLines = previousText.split("\n").filter((l) => l.length > 20);

  // Verifica se a primeira linha do novo texto já existe no final do texto anterior
  const firstLine = currentLines[0];
  if (firstLine && previousText.includes(firstLine)) {
    return { hasDuplication: true, duplicatedText: firstLine };
  }

  return { hasDuplication: false, duplicatedText: "" };
}

export function buildEmergencyPrompt(userPrompt: string, context: MinimalChunkContext, duplicatedText: string): string {
  // Prompt de correção caso a duplicação seja detectada
  return `
ERRO DETECTADO: Você repetiu o texto anterior: "${duplicatedText.slice(0, 50)}...".
TAREFA CORRETIVA: Escreva a continuação novamente, mas COMECE COM UMA NOVA FRASE.
NÃO REPITA O QUE JÁ ACONTECEU. AVANCE A HISTÓRIA.
  `;
}
import { getLanguageByCode } from "../data/languages";

export interface MinimalChunkContext {
  title: string;
  language: string;
  targetWords: number;
  premise: string;
  chunkIndex: number;
  totalChunks: number;
  lastParagraph?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  "pt-BR": "Português Brasileiro",
  "en-US": "English",
  "es-ES": "Español",
  "fr-FR": "Français",
  "de-DE": "Deutsch",
  "it-IT": "Italiano",
  "ja-JP": "Japanese",
  "ru-RU": "Russian",
  // Adicione outros conforme necessário, ou use o fallback do arquivo languages.ts
};

/**
 * Extrai a seção correta da premissa baseada nas tags [SEÇÃO X].
 * Se não encontrar tags, usa um fallback inteligente por parágrafos.
 */
function extractPremiseSection(premise: string, sectionNumber: number): string {
  // Regex flexível para encontrar [SEÇÃO 1], SEÇÃO 1, BLOCO 1, SECTION 1...
  const sectionRegex = new RegExp(
    `(?:[\\[\\(]?)?\\b(?:SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*${sectionNumber}\\b[^\\n]*([\\s\\S]*?)(?=(?:[\\[\\(]?)?\\b(?:SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*\\d+|$)`,
    "i",
  );

  const match = premise.match(sectionRegex);
  if (match) {
    // Retorna apenas o conteúdo limpo da seção
    return match[1].replace(/^[:\-\s]+/, "").trim();
  }

  // Fallback: Divisão por parágrafos duplos se não houver tags
  const paragraphs = premise.split(/\n\n+/).filter((p) => p.trim().length > 0);

  // Se temos parágrafos suficientes, tentamos distribuir
  if (paragraphs.length >= 3) {
    const totalAvailable = paragraphs.length;
    // Lógica simples: Seção 1 pega o início, Última seção pega o fim, Meio pega o resto
    if (sectionNumber === 1) {
      return paragraphs.slice(0, Math.max(1, Math.floor(totalAvailable * 0.3))).join("\n\n");
    }
    // (Simplificação para evitar código complexo no fallback)
    return premise;
  }

  return premise;
}

/**
 * Constrói o prompt para o chunk atual com TRAVAS ANTI-DUPLICAÇÃO.
 */
export function buildMinimalChunkPrompt(userPrompt: string, context: MinimalChunkContext): string {
  const { title, language, targetWords, premise, chunkIndex, totalChunks, lastParagraph } = context;

  // Resolve o nome do idioma
  const langObj = getLanguageByCode(language);
  const languageName = langObj ? langObj.name : LANGUAGE_NAMES[language] || language;

  // Pega apenas a premissa desta parte específica
  const sectionContent = extractPremiseSection(premise, chunkIndex + 1);

  let prompt = `
ATUE COMO: Roteirista Profissional de YouTube (Narrativa/Storytelling).
TAREFA: Escrever a PARTE ${chunkIndex + 1} de ${totalChunks} do roteiro.

DADOS DO PROJETO:
- Título: "${title}"
- Idioma de Saída: ${languageName} (Obrigatório)
- Meta de Palavras: ~${targetWords} palavras

---
📖 PREMISSA/GUIA PARA ESTA PARTE (O que deve acontecer agora):
${sectionContent}
---

🎨 ESTILO E TOM (Instruções do Usuário):
"""
${userPrompt}
"""
(Nota: Ignore comandos de "Comece com..." se esta não for a Parte 1. Mantenha o estilo, mas siga a premissa acima.)

`;

  // --- LÓGICA CRÍTICA ANTI-DUPLICAÇÃO ---
  if (chunkIndex > 0 && lastParagraph) {
    // Pegamos apenas as últimas 15-20 palavras para dar o "gancho".
    // NÃO enviamos o parágrafo inteiro para evitar que a IA o reescreva.
    const words = lastParagraph.trim().split(/\s+/);
    const shortContext = words.slice(-20).join(" ");

    prompt += `
🔗 CONEXÃO COM O ANTERIOR:
A parte anterior terminou EXATAMENTE com estas palavras:
"...${shortContext}"

🛑 REGRAS DE CONTINUIDADE (MUITO IMPORTANTE):
1. NÃO repita a frase acima.
2. NÃO reformule o que já foi dito.
3. Comece a sua resposta IMEDIATAMENTE completando a próxima ação ou pensamento.
4. O texto deve fluir como se não houvesse quebra.
`;
  } else if (chunkIndex === 0) {
    prompt += `
🚀 INSTRUÇÃO DE INÍCIO:
Este é o começo do vídeo. Comece com um gancho forte (hook) baseado na premissa.
`;
  }

  if (chunkIndex === totalChunks - 1) {
    prompt += `
🏁 INSTRUÇÃO DE FIM:
Esta é a parte final. Caminhe para o desfecho e encerramento.
`;
  }

  prompt += `
\n\n📢 ESCREVA ABAIXO APENAS O TEXTO DA NARRAÇÃO DA PARTE ${chunkIndex + 1}:
`;

  return prompt;
}

// Função auxiliar para detecção de duplicação grosseira (caso a limpeza falhe)
export function detectParagraphDuplication(
  currentText: string,
  previousText: string,
): { hasDuplication: boolean; duplicatedText: string } {
  if (!currentText || !previousText) return { hasDuplication: false, duplicatedText: "" };

  const currentLines = currentText.split("\n").filter((l) => l.length > 20);
  const prevLines = previousText.split("\n").filter((l) => l.length > 20);

  // Verifica se a primeira linha do novo texto já existe no final do texto anterior
  const firstLine = currentLines[0];
  if (firstLine && previousText.includes(firstLine)) {
    return { hasDuplication: true, duplicatedText: firstLine };
  }

  return { hasDuplication: false, duplicatedText: "" };
}

export function buildEmergencyPrompt(userPrompt: string, context: MinimalChunkContext, duplicatedText: string): string {
  // Prompt de correção caso a duplicação seja detectada
  return `
ERRO DETECTADO: Você repetiu o texto anterior: "${duplicatedText.slice(0, 50)}...".
TAREFA CORRETIVA: Escreva a continuação novamente, mas COMECE COM UMA NOVA FRASE.
NÃO REPITA O QUE JÁ ACONTECEU. AVANCE A HISTÓRIA.
  `;
}
