// src/utils/minimalPromptBuilder.ts
import { WorldState } from "@/types/scripts";
import { formatStateForPrompt } from "./factBible";

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
  const { title, language, targetWords, premise, chunkIndex, totalChunks, previousContent, currentState } = options;

  const stateContext = currentState ? formatStateForPrompt(currentState) : "";

  // Instrução de formato JSON rígido
  const jsonInstruction = `
🛑 REGRA DE FORMATO OBRIGATÓRIA (CRÍTICO):
Você NÃO deve retornar apenas texto. Você deve retornar um OBJETO JSON VÁLIDO com a seguinte estrutura:

{
  "script_content": "Aqui vai o texto narrativo do roteiro... (Escreva como uma história fluida)",
  "world_state_update": {
    "currentYear": 2024,
    "timeElapsed": "X minutos",
    "characters": {
      "NomeDoPersonagem": {
        "name": "Nome",
        "age": 10,
        "location": "Local atual",
        "status": "O que está fazendo",
        "role": "Profissão/Papel",
        "items": ["Item1", "Item2"]
      }
    },
    "keyFacts": ["Fato novo importante"]
  }
}
`;

  return `
ATUE COMO UM ROTEIRISTA E SIMULADOR LÓGICO.

CONTEXTO DA OBRA:
- Título: "${title}"
- Premissa Base: ${premise}
- Idioma: ${language}

${stateContext}

TAREFA ATUAL:
Escreva o CAPÍTULO ${chunkIndex + 1} de ${totalChunks}.
Meta de extensão: ~${targetWords} palavras.

${chunkIndex > 0 ? `RESUMO DO ANTERIOR: ...${extractLastParagraph(previousContent || "")}` : "INÍCIO DA HISTÓRIA."}

${jsonInstruction}

⚠️ IMPORTANTE:
1. Mantenha a coerência matemática das idades (Ano Atual - Ano Nascimento).
2. Não teletransporte personagens (eles precisam se mover no texto).
3. Escreva o roteiro em "script_content" e atualize a simulação em "world_state_update".
4. NÃO use Markdown no JSON. Apenas JSON puro.
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

  const newParagraphs = newText.split("\n\n");
  const prevParagraphs = previousText.split("\n\n");
  const lastPrev = prevParagraphs[prevParagraphs.length - 1];

  // Se o começo do novo texto for igual ao final do anterior
  if (newText.trim().startsWith(lastPrev.trim())) {
    return { hasDuplication: true, duplicatedText: lastPrev };
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
