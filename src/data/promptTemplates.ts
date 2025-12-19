import { getLanguageByCode } from "./languages";

export interface PromptTemplate {
  premise: string;
  script: string;
}

// --- GERADORES DE PROMPT DINÂMICOS (TEMPLATE "INVISÍVEL") ---

const getNeutralPremise = (targetLanguage: string, culturalContext: string) => `
ATENÇÃO: Você é um motor de execução de roteiros.
Sua função é processar o PROMPT DO USUÁRIO e estruturá-lo para o sistema.

---
PROMPT DO USUÁRIO (Conteúdo Real):
"""
[prompt_usuario]
"""
---

CONFIGURAÇÕES DE SAÍDA:
- IDIOMA OBRIGATÓRIO: ${targetLanguage}
- CONTEXTO CULTURAL: ${culturalContext || "Padrão Internacional"}
- PÚBLICO ALVO: [localizacao]

⚠️ INSTRUÇÃO TÉCNICA (SISTEMA):
Para o software funcionar, divida a resposta em blocos lógicos usando a tag [SEÇÃO X].
NÃO altere o conteúdo do usuário. Apenas fatie o texto para caber nos blocos.

FORMATO DE SAÍDA (Use este esqueleto):

[SEÇÃO 1]
(Primeira parte do conteúdo solicitado...)

[SEÇÃO 2]
(Continuação...)

[SEÇÃO 3]
(Parte final...)

(Use quantas seções forem necessárias para cobrir o conteúdo).
`;

const getNeutralScript = (targetLanguage: string, culturalContext: string) => `
Gere o roteiro de narração para esta parte do vídeo.

IDIOMA: ${targetLanguage}
CONTEXTO: ${culturalContext}
CANAL: [canal]

INSTRUÇÕES DO USUÁRIO (Estilo):
"""
[prompt_usuario]
"""

Converta a premissa desta seção em texto de narração (falado), seguindo o estilo solicitado acima.
`;

// --- FUNÇÕES DE EXPORTAÇÃO (INTEGRAÇÃO TOTAL) ---

// Mantemos um objeto vazio ou cache se necessário, mas o foco é a geração dinâmica
export const defaultPrompts: Record<string, PromptTemplate> = {};

/**
 * Gera os prompts automaticamente buscando o nome correto do idioma
 * no seu arquivo languages.ts
 */
export function getDefaultPrompts(languageCode: string): PromptTemplate {
  // Busca as informações ricas do idioma (Nome, Contexto Cultural)
  const langObj = getLanguageByCode(languageCode);

  // Define o nome legível (ex: "Português (Brasil)" em vez de "pt-BR")
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

  return `INSTRUÇÕES DE SISTEMA:
1. Você é um assistente especializado em roteiros multilíngues.
2. Sua prioridade máxima é escrever em **${langName}**.
3. Siga estritamente o prompt do usuário.
4. Mantenha a formatação técnica [SEÇÃO X] para o parser funcionar.`;
}
