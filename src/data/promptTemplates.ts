import { getLanguageByCode } from "./languages";

export interface PromptTemplate {
  premise: string;
  script: string;
}

// --- FUNÇÕES GERADORAS DINÂMICAS ---

const getNeutralPremise = (targetLanguage: string, culturalContext: string) => `
ATENÇÃO: Você é um motor de estruturação de roteiros.
Sua única função é organizar o PROMPT DO USUÁRIO em blocos lógicos para processamento.

---
PROMPT DO USUÁRIO (Conteúdo Real):
"""
[prompt_usuario]
"""
---

CONFIGURAÇÕES:
- IDIOMA DE SAÍDA: ${targetLanguage} (Obrigatório)
- CONTEXTO: ${culturalContext || "Padrão"}
- PÚBLICO: [localizacao]

⚠️ INSTRUÇÃO TÉCNICA DE ENGENHARIA (CRÍTICO):
Para o funcionamento do software, você DEVE dividir a resposta em blocos numerados usando a tag [SEÇÃO X].
NÃO altere a ideia do usuário. Apenas divida o texto para caber nos blocos.

FORMATO DE SAÍDA OBRIGATÓRIO (O Software só lê este formato):

[SEÇÃO 1]
(Primeira parte do conteúdo solicitado. Se for uma lista, itens 1-3. Se for história, início.)

[SEÇÃO 2]
(Parte central do conteúdo. Continuação direta.)

[SEÇÃO 3]
(Parte final do conteúdo.)

(Crie até [SEÇÃO 5] se o conteúdo for muito extenso).

REGRAS:
1. Respeite o idioma ${targetLanguage}.
2. NÃO repita tópicos entre as seções.
3. Cada seção deve ter conteúdo único.
`;

const getNeutralScript = (targetLanguage: string, culturalContext: string) => `
Gere o roteiro de narração (texto falado) para esta parte do vídeo.

IDIOMA: ${targetLanguage}
CONTEXTO: ${culturalContext}
CANAL: [canal]

INSTRUÇÕES DE ESTILO (Do Usuário):
"""
[prompt_usuario]
"""

Converta a premissa fornecida acima em texto de narração fluido.
Ignore instruções de "Comece com..." se esta não for a primeira parte.
`;

// --- EXPORTAÇÃO ---

export const defaultPrompts: Record<string, PromptTemplate> = {};

export function getDefaultPrompts(languageCode: string): PromptTemplate {
  // Busca dados ricos do idioma no seu arquivo languages.ts
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

  return `System: Você é um assistente de roteiro focado em fidelidade ao prompt do usuário e formatação técnica.
  Idioma prioritário: ${langName}.
  Mantenha as tags [SEÇÃO X] intactas.`;
}
