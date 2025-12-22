// src/utils/minimalPromptBuilder.ts
import { WorldState } from "@/types/scripts";
import { formatStateForPrompt } from "./factBible";

interface ChunkPromptOptions {
  title: string;
  language: string;
  targetWords: number;
  premise: string;
  chunkIndex: number;
  totalChunks: number;
  previousContent?: string;
  lastParagraph?: string;
  currentState?: WorldState; // Adicionado
}

/**
 * Constrói o prompt "Autor-Auditor" que exige JSON
 */
export function buildMinimalChunkPrompt(basePrompt: string, options: ChunkPromptOptions): string {
  const { title, language, targetWords, premise, chunkIndex, totalChunks, previousContent, currentState } = options;

  const stateContext = currentState ? formatStateForPrompt(currentState) : "";

  // Instrução de formato JSON rígido
  const jsonInstruction = `
🛑 REGRA DE FORMATO OBRIGATÓRIA (CRÍTICO):
Você NÃO deve retornar apenas texto. Você deve retornar um OBJETO JSON VÁLIDO com a seguinte estrutura:

{
  "script_content": "Aqui vai o texto narrativo do roteiro...",
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

${chunkIndex > 0 ? `RESUMO DO ANTERIOR: ...${options.lastParagraph || "continuação direta"}` : "INÍCIO DA HISTÓRIA."}

${jsonInstruction}

⚠️ IMPORTANTE:
1. Mantenha a coerência matemática das idades (Ano Atual - Ano Nascimento).
2. Não teletransporte personagens (eles precisam se mover no texto).
3. Escreva o roteiro em "script_content" e atualize a simulação em "world_state_update".
`;
}

// Utilitários de limpeza (mantidos para compatibilidade)
export function sanitizeScript(content: string): string {
  // Remove blocos de código markdown se a IA colocar
  return content.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
}
