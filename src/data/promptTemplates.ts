import { getLanguageByCode } from "./languages";

export interface PromptTemplate {
  premise: string;
  script: string;
}

// ------------------------------------------------------------------
// 1. TEMPLATE DE ESTRUTURA (O "ARQUITETO")
// ------------------------------------------------------------------
const getNeutralPremise = (targetLanguage: string, culturalContext: string) => `
ATENÇÃO: Você é um Arquiteto de Histórias.
Sua tarefa é estruturar a ideia do usuário em uma sequência lógica de CAPÍTULOS.

PROMPT DO USUÁRIO:
"""
[prompt_usuario]
"""

CONFIGURAÇÕES:
- IDIOMA DE SAÍDA: ${targetLanguage}
- PÚBLICO: [localizacao]
- DURAÇÃO ALVO: [duracao] minutos

⚠️ REGRA CRÍTICA DE ESTRUTURA (IMPORTANTE):
Você deve dividir a história em CAPÍTULOS para cobrir o tempo de duração.
- Vídeos Curtos (< 3 min): Crie 1 ou 2 Capítulos.
- Vídeos Médios (5-10 min): Crie 3 a 4 Capítulos.
- Vídeos Longos (> 10 min): Crie 5+ Capítulos.

SAÍDA OBRIGATÓRIA (Use estritamente este formato):

[CAPITULO 1]
(Resumo detalhado do início da história/conteúdo)

[CAPITULO 2]
(Resumo do desenvolvimento)

[CAPITULO 3]
(Resumo do clímax e conclusão)

(Adicione [CAPITULO 4], etc., apenas se a duração exigir).
`;

// ------------------------------------------------------------------
// 2. TEMPLATE DE ROTEIRO (O "ESCRITOR")
// ------------------------------------------------------------------
const getNeutralScript = (targetLanguage: string, culturalContext: string) => `
Gere o roteiro de narração para este capítulo específico.

IDIOMA: ${targetLanguage}
CONTEXTO CULTURAL: ${culturalContext}
CANAL: [canal]

INSTRUÇÕES DE ESTILO (Do Usuário):
"""
[prompt_usuario]
"""

⚠️ REGRAS VISUAIS (PARA LEITURA FÁCIL):
1. Use parágrafos curtos (máximo 2-3 frases).
2. Pule uma linha entre cada parágrafo.
3. Não use blocos de texto gigantes.

⚠️ REGRA DE FINALIZAÇÃO:
Se este for o último capítulo da estrutura, encerre a história de forma definitiva.
NÃO comece a contar a história de novo.
Se terminar, escreva a tag: [FIM]
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
  return `Você é um roteirista expert em ${langName}. Foco em estrutura lógica e parágrafos curtos.`;
}
