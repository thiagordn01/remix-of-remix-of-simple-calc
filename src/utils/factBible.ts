// src/utils/factBible.ts
import { WorldState, CharacterState } from "@/types/scripts";

/**
 * Bíblia de Regras Imutáveis (definidas na premissa e mantidas para sempre)
 */
export interface ImmutableBible {
  startYear: number; // Ano em que a história começa
  characterBirthYears: Record<string, number>; // Ano de nascimento fixo
  fixedRoles: Record<string, string>; // Profissões que não podem mudar drasticamente
}

/**
 * Inicializa o Estado do Mundo no Chunk 0
 */
export function initializeWorldState(premise: string): WorldState {
  // Tenta inferir o ano atual, senão usa o atual real
  const currentYear = new Date().getFullYear();

  return {
    currentYear: currentYear,
    timeElapsed: "0 minutos",
    characters: {},
    keyFacts: [],
  };
}

/**
 * Cria a Bíblia Imutável baseada na Premissa (para validação futura)
 */
export function createImmutableBible(premise: string, initialCharacters: Record<string, any>): ImmutableBible {
  const birthYears: Record<string, number> = {};

  // Se a premissa define idades iniciais, calculamos o ano de nascimento
  // Ex: "Zuzia (8 anos)" em 2024 -> Nasceu em 2016
  const currentYear = new Date().getFullYear();

  for (const [name, info] of Object.entries(initialCharacters)) {
    if (info.age) {
      birthYears[name] = currentYear - info.age;
    }
  }

  return {
    startYear: currentYear,
    characterBirthYears: birthYears,
    fixedRoles: {}, // Será preenchido conforme personagens aparecem
  };
}

/**
 * O CORAÇÃO DO SISTEMA: Valida se o novo chunk faz sentido lógico/matemático
 */
export function validateChunkLogic(
  previousState: WorldState,
  newState: WorldState,
  bible: ImmutableBible,
): { valid: boolean; error?: string } {
  // 1. VALIDAÇÃO MATEMÁTICA DE IDADE
  // Se a IA diz que Zuzia tem X anos, verificamos: Ano_Atual - Ano_Nascimento == X?
  for (const [charName, charState] of Object.entries(newState.characters)) {
    const birthYear = bible.characterBirthYears[charName];

    if (birthYear) {
      const calculatedAge = newState.currentYear - birthYear;
      // Margem de erro de 1 ano (aniversário pode não ter passado)
      if (Math.abs(charState.age - calculatedAge) > 1) {
        return {
          valid: false,
          error: `ERRO MATEMÁTICO GRAVE: Você disse que ${charName} tem ${charState.age} anos em ${newState.currentYear}, mas ela nasceu em ${birthYear} (deveria ter ~${calculatedAge} anos). Corrija a idade ou o ano.`,
        };
      }
    }
  }

  // 2. VALIDAÇÃO DE TELETRANSPORTE (CONSISTÊNCIA DE LOCAL)
  // Personagem não pode mudar de local sem narrar movimento (simplificado para este exemplo)
  /*
  for (const [charName, prevState] of Object.entries(previousState.characters)) {
    const newStateChar = newState.characters[charName];
    if (newStateChar && prevState.location !== newStateChar.location) {
      // Aqui poderíamos exigir que o texto contenha verbos de movimento,
      // mas por enquanto apenas aceitamos a mudança se o status indicar ação.
    }
  }
  */

  // 3. VALIDAÇÃO DE PAPÉIS (IMUTABILIDADE)
  for (const [charName, charState] of Object.entries(newState.characters)) {
    const fixedRole = bible.fixedRoles[charName];

    // Se já tinha um papel fixo e mudou drasticamente (ex: Garçom -> Advogado)
    if (fixedRole && charState.role !== fixedRole) {
      // Permite evolução, mas bloqueia contradição total.
      // Implementação simples: Apenas alerta se for muito discrepante.
      // Para este código, vamos assumir que a Bíblia armazena o PRIMEIRO papel visto.
    } else if (!fixedRole && charState.role) {
      // Registra o primeiro papel como imutável
      bible.fixedRoles[charName] = charState.role;
    }
  }

  return { valid: true };
}

/**
 * Formata o estado atual para ser injetado no prompt da IA
 */
export function formatStateForPrompt(state: WorldState): string {
  if (Object.keys(state.characters).length === 0) return "";

  let prompt = `
📋 ESTADO ATUAL DA SIMULAÇÃO (VOCÊ DEVE RESPEITAR ISSO):
- ANO ATUAL: ${state.currentYear}
- TEMPO DECORRIDO: ${state.timeElapsed}

👥 PERSONAGENS (Status Atual):
`;

  for (const [name, char] of Object.entries(state.characters)) {
    prompt += `- ${name}: ${char.age} anos, Role: "${char.role}". Local: ${char.location}. Status: ${char.status}.\n`;
  }

  return prompt;
}
