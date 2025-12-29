// src/utils/minimalPromptBuilder.ts
import { WorldState } from "@/types/scripts";
import { getWriteInLanguageInstruction } from "./languageDetection";


// ============================================================================
// TIPAGEM (Compatível com o novo e o velho sistema)
// ============================================================================

export interface MinimalChunkContext {
  title: string;
  language: string;
  targetWords: number;
  premise: string;
  chunkIndex: number;
  totalChunks: number;
  previousContent?: string;
  lastParagraph?: string;
  currentState?: WorldState; // Adicionado para a nova lógica
  anchors?: string[]; // Mantido para compatibilidade
}

// ============================================================================
// NOVA LÓGICA: CONSTRUTOR DE PROMPT "AUTOR-AUDITOR" (JSON)
// ============================================================================

/**
 * Constrói o prompt "Autor-Auditor" que exige JSON e validação lógica.
 * Esta é a função principal usada pelo useScriptGenerator novo.
 * ✅ ATUALIZADO: Adiciona instrução de idioma no TOPO do prompt
 */
export function buildMinimalChunkPrompt(basePrompt: string, options: MinimalChunkContext): string {
  const { title, language, targetWords, premise, chunkIndex, totalChunks, previousContent } = options;

  // Obter instrução de idioma na língua nativa
  const writeInLanguageInstruction = getWriteInLanguageInstruction(language);

  // Instrução de formato JSON (bilíngue para garantir compreensão)
  const jsonInstruction = `
🛑 MANDATORY FORMAT RULE (CRITICAL):
You must NOT return loose text. You must return a VALID JSON OBJECT with the following exact structure:

{
  "script_content": "Script text, continuous, as if it were a chapter of a book or video script.",
  "coherence_notes": [
    "Important fact 1 you established in this section (e.g.: The girl is 8 years old, or It's winter).",
    "Fact 2 (e.g.: Bitcoin dropped today, or Concept X was already explained)."
  ]
}

Rules for "coherence_notes":
- It's a LIST of short sentences in natural language.
- Each item should describe ONE important fact or state established in this chapter.
- Use 2 to 6 items per chapter.
- These facts will be used to maintain coherence in the next chapters.
`;

  return `
🚨🚨🚨 CRITICAL LANGUAGE REQUIREMENT - READ FIRST 🚨🚨🚨
OUTPUT LANGUAGE: ${language}
${writeInLanguageInstruction}
DO NOT MIX LANGUAGES. DO NOT USE ANY OTHER LANGUAGE.
ALL TEXT IN "script_content" MUST BE 100% IN ${language}.
🚨🚨🚨 END OF LANGUAGE REQUIREMENT 🚨🚨🚨

ACT AS A SCRIPTWRITER AND NARRATIVE COHERENCE CURATOR.

WORK CONTEXT:
- Title: "${title}"
- Base Premise: ${premise}
- Language: ${language}

CURRENT TASK:
Write CHAPTER ${chunkIndex + 1} of ${totalChunks}.
Target length: ~${targetWords} words.

${chunkIndex > 0 ? `PREVIOUS SUMMARY: ...${extractLastParagraph(previousContent || "")}` : "BEGINNING OF THE STORY."}

${jsonInstruction}

⚠️ IMPORTANT:
1. Write the chapter in a fluid, immersive and continuous way in "script_content".
2. DO NOT use Markdown in JSON. Only pure JSON.
3. In "coherence_notes", list important facts that need to be maintained in the next chapters (characters, relationships, events, secrets, revelations, temporal context, etc.).
4. Do not put the script text inside "coherence_notes". Use only summary sentences of the facts.
5. 🚨 REMINDER: Write ALL content in ${language}. ${writeInLanguageInstruction}
`;
}


// ============================================================================
// FUNÇÕES UTILITÁRIAS & COMPATIBILIDADE (Restauradas para corrigir o erro)
// ============================================================================

/**
 * Remove metadados, tags JSON e formatações do texto gerado
 */
export function sanitizeScript(content: string): string {
  // Se o conteúdo vier com blocos de código markdown (comum em LLMs), remove
  let cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/, "");

  // Remove tags de metadados antigos se houver
  cleaned = cleaned.replace(/\[(?:IMAGEM|MÚSICA|SFX)[^\]]*\]/gi, "");

  return cleaned.trim();
}

/**
 * Extrai o último parágrafo de um texto (usado para contexto)
 */
export function extractLastParagraph(text: string): string {
  if (!text) return "";
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 20);
  if (paragraphs.length === 0) return text.slice(-200);
  return paragraphs[paragraphs.length - 1].trim();
}

/**
 * Extrai âncoras semânticas (nomes próprios, locais)
 * Restaurado para evitar erro no promptInjector.ts
 */
export function extractSemanticAnchors(text: string): string[] {
  if (!text || text.length < 50) return [];

  const anchors: Set<string> = new Set();

  // Extrair nomes com letra maiúscula (simplificado)
  const properNouns = text.match(/(?<=[a-z]\s)([A-Z][a-záéíóúàèìòùâêîôûãõç]+)/g) || [];
  properNouns.forEach((noun) => {
    if (noun.length > 2 && noun.length < 20) {
      anchors.add(noun);
    }
  });

  return Array.from(anchors).slice(0, 15);
}

/**
 * Detecta duplicação de parágrafos (Stub de compatibilidade)
 */
export function detectParagraphDuplication(
  newText: string,
  previousText: string,
): { hasDuplication: boolean; duplicatedText?: string } {
  // Lógica simplificada para não depender de narrativeMemory complexo
  if (!previousText || !newText) return { hasDuplication: false };

  const prevParagraphs = previousText.split("\n\n");
  const lastPrev = prevParagraphs[prevParagraphs.length - 1]?.trim();
  if (!lastPrev) return { hasDuplication: false };

  const trimmedNew = newText.trim();

  // 1) Se o começo do novo texto for igual ao final do anterior (parágrafo inteiro)
  if (trimmedNew.startsWith(lastPrev)) {
    return { hasDuplication: true, duplicatedText: lastPrev };
  }

  // 2) Verificar duplicação pela última frase do parágrafo anterior
  const sentences = lastPrev.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const lastSentence = sentences[sentences.length - 1];
  if (!lastSentence) return { hasDuplication: false };

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/["'“”„”]/g, "").trim();

  if (normalize(trimmedNew).startsWith(normalize(lastSentence))) {
    return { hasDuplication: true, duplicatedText: lastSentence };
  }

  return { hasDuplication: false };
}

/**
 * Constrói prompt de emergência (Stub de compatibilidade)
 */
export function buildEmergencyPrompt(
  userPrompt: string,
  context: MinimalChunkContext,
  duplicatedText?: string,
): string {
  // Retorna uma versão simples que pede para reescrever
  return `
ERRO: O texto anterior continha duplicação.
Texto duplicado: "${duplicatedText || "..."}"

POR FAVOR, REESCREVA O CAPÍTULO ${context.chunkIndex + 1} DE FORMA DIFERENTE.
Siga as instruções originais:
${userPrompt}
  `;
}

/**
 * Formata parágrafos para narração (Stub de compatibilidade)
 */
export function formatParagraphsForNarration(text: string): string {
  if (!text) return "";
  // Garante quebras de linha duplas para leitura fácil
  return text.split(/\n\n+/).join("\n\n").trim();
}
