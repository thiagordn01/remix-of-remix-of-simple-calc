// src/utils/simplePromptBuilder.ts
/**
 * Sistema Simplificado de Construção de Prompts
 *
 * Baseado no sistema de referência (thiguinhasrote21) que funciona melhor.
 *
 * PRINCÍPIOS:
 * 1. Premissa passada em TODOS os chunks (não só no primeiro)
 * 2. Script acumulado passado como contexto
 * 3. Prompts simples e diretos
 * 4. Confia na IA para manter consistência
 * 5. SEM extração de fatos, SEM bíblia, SEM validações complexas
 */

export interface SimpleChunkContext {
  title: string;
  language: string;
  location: string;
  targetWords: number;
  premise: string;
  previousScript: string;
  chunkIndex: number;
  totalChunks: number;
  durationMinutes: number;
}

const LANGUAGE_MAP: Record<string, string> = {
  "pt-BR": "Português Brasileiro",
  "pt-PT": "Português Europeu",
  "en-US": "English (USA)",
  "en-GB": "English (UK)",
  "es-ES": "Español",
  "es-MX": "Español Latinoamericano",
  "fr-FR": "Français",
  "de-DE": "Deutsch",
  "it-IT": "Italiano",
  "pl-PL": "Polski",
  "ru-RU": "Русский",
  "ja-JP": "日本語",
  "zh-CN": "中文",
  "ko-KR": "한국어",
};

/**
 * Constrói o System Instruction (estilo do sistema de referência)
 */
export function buildSystemInstruction(context: SimpleChunkContext): string {
  const languageName = LANGUAGE_MAP[context.language] || context.language;

  return `VOCÊ É UM CONTADOR DE HISTÓRIAS PROFISSIONAL.

=== A CONSTITUIÇÃO DO ESTILO (REGRAS SUPREMAS E IMUTÁVEIS) ===
Estas regras devem ser seguidas em 100% do texto:
1. TOM CONVERSACIONAL: Escreva como se estivesse contando um caso para um amigo num bar.
2. VOCABULÁRIO SIMPLES: Use palavras do dia a dia. Proibido termos rebuscados ou poéticos.
3. DIRETO AO PONTO: A narrativa deve fluir naturalmente. Não trave em descrições excessivas.

=== REGRA DE OURO (FORMATO) ===
- Entregue APENAS o texto da história (Narração).
- NÃO coloque títulos, capítulos, asteriscos (**), nem introduções do tipo 'Claro, aqui vai'.
- PROIBIDO: Palavras-chave soltas (ex: *TENSÃO*), ou instruções de pausa (ex: PAUSA PARA...).
- O TEXTO DEVE SER FLUÍDO E PRONTO PARA LEITURA EM VOZ ALTA.

=== CONTEXTO TÉCNICO ===
- Localização do público: ${context.location}.
- Idioma: ${languageName}.
- Meta de Duração Total: ${context.durationMinutes} minutos.

=== CONTROLE DE TAMANHO ===
- Você está escrevendo a parte ${context.chunkIndex + 1} de ${context.totalChunks}.
- META DE PALAVRAS: ~${context.targetWords} palavras para esta parte.
- TENTE ATINGIR ESSA META.`;
}

/**
 * Constrói o prompt para um chunk (estilo do sistema de referência)
 */
export function buildSimpleChunkPrompt(userScriptPrompt: string, context: SimpleChunkContext): string {
  const languageName = LANGUAGE_MAP[context.language] || context.language;
  const isFirst = context.chunkIndex === 0;
  const isLast = context.chunkIndex === context.totalChunks - 1;

  // Estrutura interna mental (guia a IA mas não imprime)
  let structureInstruction = "";

  if (isFirst) {
    structureInstruction = `
ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido, sem headers visíveis:
1. (Mentalmente) Gancho e Introdução Imersiva - Descreva o ambiente e o "status quo".
2. (Mentalmente) Desenvolvimento do Contexto - Explique os antecedentes sem pressa.
3. (Mentalmente) O Incidente Incitante - O momento da mudança, narrado em câmera lenta.
`;
  } else if (isLast) {
    structureInstruction = `
ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido:
1. (Mentalmente) O Grande Clímax - A tensão sobe ao máximo.
2. (Mentalmente) O Ápice e a Queda - O ponto de não retorno.
3. (Mentalmente) Resolução e Reflexão - As consequências e a mensagem final duradoura.
`;
  } else {
    structureInstruction = `
ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido:
1. (Mentalmente) Novos Obstáculos - A situação piora. Detalhe as dificuldades.
2. (Mentalmente) Aprofundamento Emocional - O que os personagens sentem? Use monólogos internos.
3. (Mentalmente) A Virada - Uma nova informação ou evento muda tudo.
`;
  }

  // Construir o prompt
  let prompt = "";

  // SEMPRE incluir a premissa (para manter consistência)
  prompt += `=== CONTEXTO (PREMISSA DA HISTÓRIA) ===
${context.premise}

=== TÍTULO ===
${context.title}

`;

  // Se não é o primeiro chunk, incluir o script anterior como referência
  if (!isFirst && context.previousScript) {
    // Passar as últimas ~500 palavras do script anterior para contexto
    const words = context.previousScript.split(/\s+/);
    const lastWords = words.slice(-500).join(" ");

    prompt += `=== O QUE JÁ FOI ESCRITO (últimas partes) ===
${lastWords}

=== IMPORTANTE ===
Continue a história de onde parou. NÃO repita o que já foi escrito.
Use os MESMOS nomes de personagens que já apareceram.

`;
  }

  prompt += `=== TAREFA ===
ESCREVA A PARTE ${context.chunkIndex + 1} DE ${context.totalChunks}.
IDIOMA: ${languageName}.
META DE VOLUME: ~${context.targetWords} palavras.

${structureInstruction}

=== INSTRUÇÕES DO CRIADOR ===
${userScriptPrompt}

=== LEMBRETE FINAL ===
- Seja coloquial, moderno e direto.
- PROIBIDO: Metáforas, poesia ou enrolação.
- NÃO ESCREVA OS NOMES DOS TÓPICOS ACIMA. APENAS A NARRAÇÃO.
- Entregue APENAS texto narrativo pronto para leitura em voz alta.

COMECE A ESCREVER:`;

  return prompt;
}

/**
 * Limpa artefatos do texto gerado (estilo do sistema de referência)
 */
export function cleanGeneratedText(text: string): string {
  if (!text) return "";

  let cleaned = text
    .split("\n")
    .filter((line) => {
      const lower = line.toLowerCase();
      const trimmed = line.trim();

      // Filtrar metadados em negrito
      if (
        trimmed.startsWith("**") &&
        (lower.includes("fim da parte") ||
          lower.includes("parte") ||
          lower.includes("duração") ||
          lower.includes("status") ||
          lower.includes("roteiro:") ||
          lower.includes("cena"))
      ) {
        return false;
      }

      // Filtrar headers de estrutura
      if (
        trimmed.toUpperCase().includes("PAUSA PARA") ||
        trimmed.toUpperCase().includes("BLOCO NARRATIVO") ||
        trimmed.toUpperCase().includes("ESTRUTURA:")
      ) {
        return false;
      }

      // Filtrar palavras-chave soltas em asteriscos
      if (/^(\*[A-ZÃÁÀÂÉÊÍÓÔÚÇ\s\.]+\*\s*)+$/.test(trimmed)) {
        return false;
      }

      // Filtrar headers curtos em maiúsculas
      if (trimmed.endsWith(":") && trimmed.length < 40 && trimmed.toUpperCase() === trimmed) {
        return false;
      }

      // Filtrar itens numerados estruturais
      if (/^\d+\.\s+[A-Z]/.test(trimmed) && trimmed.length < 60) {
        return false;
      }

      return true;
    })
    .join("\n");

  // Remover tags entre colchetes
  cleaned = cleaned.replace(/\[.*?\]/g, "");

  // Remover artefatos de negrito numerados
  cleaned = cleaned.replace(/\*\*[0-9].*?\*\*/g, "");

  // Remover negrito
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");

  // Remover headers markdown
  cleaned = cleaned.replace(/^#+\s+/gm, "");

  // Normalizar espaços
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * Extrai apenas a narração limpa (sem premissa)
 */
export function extractNarration(fullOutput: string): string {
  const cleaned = cleanGeneratedText(fullOutput);

  // Tentar encontrar onde o roteiro começa
  const scriptMarkers = ["## 📝 ROTEIRO", "---", "ROTEIRO"];

  for (const marker of scriptMarkers) {
    const idx = cleaned.indexOf(marker);
    if (idx !== -1) {
      return cleaned
        .substring(idx)
        .replace(/^[#\-\s📝ROTEIRO()]+/g, "")
        .trim();
    }
  }

  return cleaned;
}
