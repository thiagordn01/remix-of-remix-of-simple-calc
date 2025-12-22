// src/utils/minimalPromptBuilder.ts
import { WorldState } from "@/types/scripts";


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
 */
export function buildMinimalChunkPrompt(basePrompt: string, options: MinimalChunkContext): string {
  const { title, language, targetWords, premise, chunkIndex, totalChunks, previousContent } = options;

  // Instrução de formato JSON flexível com notas de coerência
  const jsonInstruction = `
🛑 REGRA DE FORMATO OBRIGATÓRIA (CRÍTICO):
Você NÃO deve retornar texto solto. Você deve retornar um OBJETO JSON VÁLIDO com a seguinte estrutura exata:

{
  "script_content": "Texto do roteiro, contínuo, como se fosse um capítulo de um livro ou roteiro de vídeo.",
  "coherence_notes": [
    "Fato 1 importante que você estabeleceu neste trecho (ex: A menina tem 8 anos, ou Estamos no inverno).",
    "Fato 2 (ex: O Bitcoin caiu hoje, ou O conceito X já foi explicado)."
  ]
}

Regras para "coherence_notes":
- É uma LISTA de frases curtas em linguagem natural.
- Cada item deve descrever UM fato importante ou estado estabelecido neste capítulo.
- Use de 2 a 6 itens por capítulo.
- Esses fatos serão usados para manter a coerência nos próximos capítulos.
`;

  return `
ATUE COMO UM ROTEIRISTA E CURADOR DE COERÊNCIA NARRATIVA.

CONTEXTO DA OBRA:
- Título: "${title}"
- Premissa Base: ${premise}
- Idioma: ${language}

TAREFA ATUAL:
Escreva o CAPÍTULO ${chunkIndex + 1} de ${totalChunks}.
Meta de extensão: ~${targetWords} palavras.

${chunkIndex > 0 ? `RESUMO DO ANTERIOR: ...${extractLastParagraph(previousContent || "")}` : "INÍCIO DA HISTÓRIA."}

${jsonInstruction}

⚠️ IMPORTANTE:
1. Escreva o capítulo de forma fluida, imersiva e contínua em "script_content".
2. NÃO use Markdown no JSON. Apenas JSON puro.
3. Em "coherence_notes", liste fatos importantes que precisam ser mantidos nos próximos capítulos (personagens, relações, eventos, segredos, revelações, contexto temporal, etc.).
4. Não coloque o texto do roteiro dentro de "coherence_notes". Use apenas frases-resumo dos fatos.
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
