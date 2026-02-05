import { getLanguageByCode } from "./languages";

export interface PromptTemplate {
  premise: string;
  script: string;
}

const getNeutralPremise = (targetLanguage: string, culturalContext: string) => `
ATENÇÃO: Você é um Arquiteto de Narrativas (Showrunner).
Sua tarefa é criar a BÍBLIA e a ESTRUTURA de uma história, mas NÃO escrever o roteiro ainda.

PROMPT DO USUÁRIO:
"""
[prompt_usuario]
"""

CONFIGURAÇÕES:
- IDIOMA DE SAÍDA: ${targetLanguage}
- DURAÇÃO ALVO: [duracao] minutos

⚠️ DIRETRIZ SUPREMA:
1. O PROMPT DO USUÁRIO É A LEI. Siga apenas o que está escrito nele.

FORMATO DE SAÍDA OBRIGATÓRIO (Apenas para organização interna do código):

[BIBLE]
- TEMA: [Resumo do que foi pedido]
- ESTILO: [Estilo solicitado]
- OBSERVACOES: [Pontos importantes citados no prompt]
[/BIBLE]

[CAPITULO 1]
(Início...)

[CAPITULO 2]
(Meio...)

[CAPITULO 3]
(Fim...)

(Adapte a quantidade de capítulos conforme a duração solicitada).
`;

const getNeutralScript = (targetLanguage: string, culturalContext: string) => `
ATENÇÃO: Você é um Roteirista focado em CONTINUIDADE.
Escreva APENAS o conteúdo deste capítulo específico.

IDIOMA: ${targetLanguage}
CONTEXTO: ${culturalContext}

INSTRUÇÕES DO USUÁRIO:
"""
[prompt_usuario]
"""

⚠️ REGRAS DE OURO (ANTI-ALUCINAÇÃO):
1. Use APENAS os nomes definidos na BÍBLIA (Bible). Não invente novos nomes.
2. Siga ESTRITAMENTE o resumo do capítulo atual. NÃO avance para o próximo capítulo.
3. NÃO repita cenas que já aconteceram.
4. NÃO peça "Likes/Inscrição" no meio do texto. Apenas no final do ÚLTIMO capítulo.
5. Se a história não acabou neste capítulo, NÃO escreva um final. Apenas pare a ação.

TAG DE FINALIZAÇÃO:
Somente quando a história estiver 100% concluída no Último Capítulo, escreva: [FIM]
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
  return `Você é um roteirista expert em ${langName}. Mantenha consistência absoluta de nomes e fatos.`;
}
