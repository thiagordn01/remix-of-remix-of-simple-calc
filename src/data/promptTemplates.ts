import { getLanguageByCode } from "./languages";

export interface PromptTemplate {
  premise: string;
  script: string;
}

const getNeutralPremise = (targetLanguage: string, culturalContext: string) => `
ATENÇÃO: Arquiteto de Histórias.
Estruture a ideia em CAPÍTULOS lógicos.

PROMPT DO UTILIZADOR:
"""
[prompt_usuario]
"""

CONFIGURAÇÕES:
- IDIOMA: ${targetLanguage}
- DURAÇÃO ALVO: [duracao] min

SAÍDA OBRIGATÓRIA:

[CAPITULO 1]
(Resumo do início)

[CAPITULO 2]
(Resumo do meio)

[CAPITULO 3]
(Resumo do fim)

(Crie [CAPITULO 4] etc. apenas se a duração exigir).
`;

const getNeutralScript = (targetLanguage: string, culturalContext: string) => `
Escreva o guião para este capítulo.

IDIOMA: ${targetLanguage}
CONTEXTO: ${culturalContext}

INSTRUÇÕES E CTA (Do Utilizador):
"""
[prompt_usuario]
"""

⚠️ REGRAS VISUAIS:
1. Use parágrafos curtos (2-3 frases).
2. Pule uma linha entre parágrafos.

🚨 REGRA DE ENCERRAMENTO (CRÍTICA):
Inclua os pedidos de "Like", "Subscreva" ou "Comente" conforme o utilizador pediu (no meio ou no fim).
MAS, assim que a história e a despedida terminarem, você DEVE escrever a tag: [FIM]
O sistema precisa da tag [FIM] para saber que não deve gerar mais texto.
`;

export const defaultPrompts: Record<string, PromptTemplate> = {};

export function getDefaultPrompts(languageCode: string): PromptTemplate {
  const langObj = getLanguageByCode(languageCode);
  const langName = langObj ? langObj.name : languageCode;
  const context = langObj ? langObj.culturalContext : "";

  return {
    premise: getNeutralPremise(langName, context),
    script: getNeutralScript(langName, context),
  };
}

export function getSystemInstructions(languageCode: string): string {
  const langObj = getLanguageByCode(languageCode);
  const langName = langObj ? langObj.name : languageCode;
  return `Você é um guionista expert em ${langName}. Siga o prompt do utilizador, inclua os CTAs pedidos e use a tag [FIM] para encerrar.`;
}
