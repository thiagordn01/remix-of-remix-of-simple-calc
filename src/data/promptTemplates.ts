import { getLanguageByCode } from "./languages";

export interface PromptTemplate {
  premise: string;
  script: string;
}

const getNeutralPremise = (targetLanguage: string, culturalContext: string) => `
ATENÇÃO: Você é um motor de estruturação de roteiros.
Sua única função é organizar o PROMPT DO USUÁRIO em blocos lógicos.

---
PROMPT DO USUÁRIO:
"""
[prompt_usuario]
"""
---

CONFIGURAÇÕES:
- IDIOMA: ${targetLanguage}
- PÚBLICO: [localizacao]

⚠️ INSTRUÇÃO TÉCNICA (CRÍTICO):
Divida a resposta em blocos numerados usando a tag [SEÇÃO X].

FORMATO DE SAÍDA OBRIGATÓRIO:

[SEÇÃO 1]
(Início da história/conteúdo)

[SEÇÃO 2]
(Meio/Desenvolvimento)

[SEÇÃO 3]
(Final/Clímax e Conclusão)

(Crie mais seções APENAS se o conteúdo for muito extenso).
`;

const getNeutralScript = (targetLanguage: string, culturalContext: string) => `
Gere o roteiro de narração para esta parte.

IDIOMA: ${targetLanguage}
TOM: [canal]

INSTRUÇÕES DO USUÁRIO:
"""
[prompt_usuario]
"""

⚠️ REGRAS DE FORMATAÇÃO VISUAL (OBRIGATÓRIO):
1. PARÁGRAFOS CURTOS: Use no máximo 2 ou 3 frases por parágrafo.
2. ESPAÇAMENTO: Pule uma linha entre cada parágrafo.
3. FLUIDEZ: Escreva como se fosse falado (natural).

⚠️ REGRA DE FINALIZAÇÃO:
Se esta for a última parte da história e você a concluiu, escreva a tag [FIM] no final do texto.
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
  return `Você é um roteirista expert. Escreva em ${langName}. Use parágrafos curtos.`;
}
