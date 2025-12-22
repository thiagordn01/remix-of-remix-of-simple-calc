import { getLanguageByCode } from "./languages";

export interface PromptTemplate {
  premise: string;
  script: string;
}

const getNeutralPremise = (targetLanguage: string, culturalContext: string) => `
ATENÇÃO: Você é um arquiteto de histórias.
Sua função é estruturar a ideia do usuário em blocos lógicos.

---
PROMPT DO USUÁRIO:
"""
[prompt_usuario]
"""
---

CONFIGURAÇÕES:
- IDIOMA: ${targetLanguage}
- PÚBLICO: [localizacao]

⚠️ INSTRUÇÃO TÉCNICA:
Divida a resposta em [SEÇÃO X].
Se a história for curta, use apenas 2 ou 3 seções. NÃO force 5 seções se não houver conteúdo.

FORMATO DE SAÍDA:

[SEÇÃO 1]
(Início...)

[SEÇÃO 2]
(Meio...)

[SEÇÃO 3]
(Fim...)
`;

const getNeutralScript = (targetLanguage: string, culturalContext: string) => `
Gere o roteiro de narração para esta parte.

IDIOMA: ${targetLanguage}
TOM: [canal]

INSTRUÇÕES DO USUÁRIO:
"""
[prompt_usuario]
"""

⚠️ REGRAS DE FORMATO VISUAL:
1. Use parágrafos curtos (máximo 2-3 frases).
2. Pule uma linha entre cada parágrafo.

🚨 REGRA DE OURO (ANTI-REPETIÇÃO):
A meta de palavras é apenas uma sugestão.
SE A HISTÓRIA ACABAR, PARE.
NÃO repita a história para encher linguiça.
NÃO reinicie a narrativa.
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
  return `Você é um roteirista expert em ${langName}. Priorize qualidade sobre quantidade. Se a história acabou, encerre.`;
}
