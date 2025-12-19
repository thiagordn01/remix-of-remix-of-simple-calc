export interface PromptTemplate {
  premise: string;
  script: string;
}

// ------------------------------------------------------------------
// 1. TEMPLATE MESTRE (A Lógica Única)
// ------------------------------------------------------------------
// Usamos instruções em Português (que o modelo entende bem) para ditar a lógica,
// mas forçamos o "Idioma de Saída" dinamicamente.
// ------------------------------------------------------------------

const getBasePremise = (targetLanguage: string) => `
OBJETIVO: Atue como um arquiteto de histórias experiente. Desenvolva uma estrutura de roteiro para um vídeo sobre "[titulo]".

🛠️ CONFIGURAÇÕES OBRIGATÓRIAS:
- IDIOMA DE SAÍDA: ${targetLanguage} (Escreva o conteúdo APENAS neste idioma)
- PÚBLICO ALVO: [localizacao]
- DURAÇÃO ALVO: [duracao] minutos

⚠️ INSTRUÇÃO TÉCNICA DE ESTRUTURA (CRÍTICO):
Para o funcionamento do gerador, você DEVE dividir sua resposta em blocos numerados usando a tag [SEÇÃO X].
NÃO force estilos (como "Jornada do Herói") se o usuário não pediu. Apenas organize o conteúdo solicitado de forma lógica.

FORMATO DE SAÍDA EXIGIDO:

[SEÇÃO 1]
(Defina aqui o conteúdo inicial/introdução - aprox 30%)

[SEÇÃO 2]
(Defina aqui o conteúdo central/desenvolvimento - aprox 40%)

[SEÇÃO 3]
(Defina aqui o conteúdo final/conclusão - aprox 30%)

REGRAS DE OURO:
1. Respeite RIGOROSAMENTE o idioma de saída: ${targetLanguage}.
2. Não repita tópicos entre as seções.
3. Se for uma lista, divida os itens equitativamente entre as seções.
`;

const getBaseScript = (targetLanguage: string) => `
Com base na premissa fornecida, crie um roteiro de narração completo para um vídeo de YouTube.

🛠️ CONFIGURAÇÕES:
- IDIOMA DO ROTEIRO: ${targetLanguage} (Obrigatório)
- TOM DE VOZ: Adequado ao canal "[canal]" e público de [localizacao]
- FORMATO: Texto corrido para narração (Audiobook style)

REGRAS DE ESCRITA:
1. Comece com um gancho forte nos primeiros 15 segundos.
2. Mantenha o texto fluido e natural para ser lido em voz alta.
3. NÃO inclua notas de direção (ex: "Corta para...", "Música sobe"). Escreva APENAS o que o locutor vai falar.
4. Use vocabulário e referências culturais adequadas para o idioma ${targetLanguage}.
`;

// ------------------------------------------------------------------
// 2. EXPORTAÇÃO DINÂMICA
// ------------------------------------------------------------------
// Aqui geramos os prompts específicos para cada idioma usando o mestre.

export const defaultPrompts: Record<string, PromptTemplate> = {
  "pt-BR": {
    premise: getBasePremise("Português Brasileiro"),
    script: getBaseScript("Português Brasileiro"),
  },
  "en-US": {
    premise: getBasePremise("English"),
    script: getBaseScript("English"),
  },
  "es-ES": {
    premise: getBasePremise("Español"),
    script: getBaseScript("Español"),
  },
};

export function getDefaultPrompts(language: string): PromptTemplate {
  // Se o idioma solicitado não existir, usa o template em Inglês mas com instrução para o idioma pedido,
  // ou cai no fallback padrão pt-BR.
  if (defaultPrompts[language]) {
    return defaultPrompts[language];
  }

  // Fallback inteligente: Gera um template na hora para o idioma desconhecido
  return {
    premise: getBasePremise(language),
    script: getBaseScript(language),
  };
}

// ------------------------------------------------------------------
// 3. INSTRUÇÕES DE SISTEMA (SYSTEM PROMPT)
// ------------------------------------------------------------------

export function getSystemInstructions(language: string): string {
  // Mapeamento simples para o nome do idioma nas instruções de sistema
  const langMap: Record<string, string> = {
    "pt-BR": "Português Brasileiro",
    "en-US": "English",
    "es-ES": "Español",
  };

  const targetLang = langMap[language] || language;

  return `
INSTRUÇÕES CRÍTICAS DE SISTEMA (SYSTEM PROMPT):

1. **FIDELIDADE AO IDIOMA**: Você DEVE responder EXCLUSIVAMENTE em ${targetLang}. 
   - Mesmo que o input do usuário seja em outro idioma, sua saída final (roteiro/premissa) TEM que ser em ${targetLang}.

2. **FIDELIDADE AO TEMA**: O título "[titulo]" é o guia absoluto. Não desvie do assunto.

3. **FORMATO LIMPO**: 
   - NÃO coloque "Obs:", "Nota:", ou texto fora da estrutura solicitada.
   - Para roteiros: APENAS o texto falado (Narração). Nada de [Música], [Aplausos].

4. **ADAPTAÇÃO CULTURAL**: Use moedas, medidas e referências que façam sentido para o público que fala ${targetLang}.
`;
}
