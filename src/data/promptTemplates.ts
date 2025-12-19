export interface PromptTemplate {
  premise: string;
  script: string;
}

export const defaultPrompts: Record<string, PromptTemplate> = {
  "pt-BR": {
    premise: `Crie uma premissa estruturada para um vídeo sobre "[titulo]".

⚠️ ESTRUTURA OBRIGATÓRIA (Use exatamente estas tags):

[SEÇÃO 1 - INÍCIO]
(Descreva: contexto inicial, problema, gancho, primeiros eventos - aprox 30%)

[SEÇÃO 2 - DESENVOLVIMENTO]
(Descreva: evolução dos eventos, tensão crescente, descobertas - aprox 40%)

[SEÇÃO 3 - CONCLUSÃO]
(Descreva: clímax/confronto principal, resolução, reflexão final - aprox 30%)

🚨 REGRA CRÍTICA: 
Cada evento deve aparecer em APENAS UMA seção.
Não repita eventos entre seções.

Mantenha relevância para o público de [localizacao].
Duração alvo: [duracao] minutos.
Escreva em português brasileiro.`,

    // ... mantenha o resto do arquivo igual ...

    script: `Com base na premissa fornecida, crie um roteiro detalhado para YouTube sobre "[titulo]".

O roteiro deve:
- Ter duração aproximada de [duracao] minutos (150 palavras por minuto)
- Usar introdução cativante nos primeiros 15 segundos
- Ter desenvolvimento estruturado e envolvente
- Incluir conclusão que incentive interação (like, comentário, inscrição)
- Adaptar o tom para o canal "[canal]"
- Ser escrito em português brasileiro (NÃO importa o idioma do título)
- Considerar o público de [localizacao]
- Incluir momentos de engajamento ao longo do vídeo

Escreva o roteiro completo, pronto para ser narrado.

🎙️ FORMATO CRÍTICO - APENAS NARRATIVA:
Este é um roteiro de NARRAÇÃO PURA (formato audiobook), não roteiro de produção.
NÃO inclua indicações técnicas como "Silêncio.", "Pausa.", efeitos sonoros, ou notas de produção.
APENAS texto narrativo corrido que será lido em voz alta.
Se precisar transmitir pausas dramáticas, use a própria narrativa (ex: "Um silêncio pesado tomou conta...").`,
  },

  "en-US": {
    premise: `Create a structured premise for a video about "[titulo]".

⚠️ MANDATORY STRUCTURE (Use exactly these tags):

[SECTION 1 - BEGINNING]
(Describe: initial context, problem, hook, first events - approx 30%)

[SECTION 2 - DEVELOPMENT]
(Describe: event evolution, rising tension, discoveries - approx 40%)

[SECTION 3 - CONCLUSION]
(Describe: main climax/confrontation, resolution, final reflection - approx 30%)

🚨 CRITICAL RULE:
Each event must appear in ONLY ONE section.
Do not repeat events between sections.

Keep relevance for the audience from [localizacao].
Target duration: [duracao] minutes (150 words/min).
Write in English.`,

    script: `Based on the provided premise, create a detailed YouTube script about "[titulo]".

The script should:
- Have approximately [duracao] minutes duration (150 words per minute)
- Use captivating introduction in the first 15 seconds
- Have structured and engaging development
- Include conclusion that encourages interaction (like, comment, subscribe)
- Adapt the tone for "[canal]" channel
- Be written in English
- Consider the audience from [localizacao]
- Include engagement moments throughout the video

Write the complete script, ready to be narrated.

🎙️ CRITICAL FORMAT - NARRATIVE ONLY:
This is a PURE NARRATION script (audiobook format), not a production script.
DO NOT include technical cues like "Silence.", "Pause.", sound effects, or production notes.
ONLY continuous narrative text that will be read aloud.
If you need to convey dramatic pauses, use the narrative itself (e.g., "A heavy silence fell...").`,
  },
};

export function getDefaultPrompts(language: string): PromptTemplate {
  return defaultPrompts[language] || defaultPrompts["pt-BR"];
}

export function getSystemInstructions(language: string): string {
  const instructions = {
    "pt-BR": `INSTRUÇÕES CRÍTICAS DE SISTEMA - SIGA RIGOROSAMENTE:

🎯 FIDELIDADE ABSOLUTA AO TÍTULO E CONTEXTO:
1. O título "[titulo]" é SAGRADO - todo o conteúdo DEVE ser sobre este tema específico
2. JAMAIS desvie do assunto principal ou crie conteúdo não relacionado ao título
3. Mantenha COERÊNCIA TOTAL entre título, premissa e roteiro
4. Se o título for em inglês, o conteúdo DEVE abordar o tema em inglês mas responder em português

🌍 ADAPTAÇÃO CULTURAL OBRIGATÓRIA:
5. Para títulos em inglês: Adapte exemplos, referências e contexto para o público brasileiro
6. Use referências culturais brasileiras quando apropriado (empresas, personalidades, situações)
7. Mantenha relevância para a audiência de [localizacao]
8. Adapte moedas, medidas e contextos para o padrão brasileiro

🚫 PROIBIÇÕES ABSOLUTAS:
9. NÃO crie conteúdo sobre temas diferentes do título
10. NÃO use exemplos ou referências que não se relacionem com o título
11. NÃO adicione comentários extras ou formatações não solicitadas
12. NÃO adicione indicações técnicas (Silêncio, Pausa, efeitos sonoros, etc)
13. NÃO finalize prematuramente se não for o último chunk

✅ REGRAS DE RESPOSTA:
13. Responda SOMENTE com o conteúdo solicitado, nada mais
14. RESPONDA EXCLUSIVAMENTE EM PORTUGUÊS BRASILEIRO - ISSO É OBRIGATÓRIO
    - NÃO importa o idioma do título (pode estar em inglês, mas responda em português)
    - O idioma configurado pelo usuário é ABSOLUTO e INVIOLÁVEL
16. Mantenha continuidade narrativa entre chunks
17. Para último chunk: SEMPRE finalize COMPLETAMENTE com desfecho satisfatório e call-to-action

🔥 DURAÇÃO E QUALIDADE:
17. Respeite RIGOROSAMENTE a duração especificada (150 palavras por minuto)
18. Priorize QUALIDADE e RELEVÂNCIA sobre quantidade de palavras
19. Desenvolva o tema de forma aprofundada e envolvente`,

    "en-US": `CRITICAL SYSTEM INSTRUCTIONS - FOLLOW RIGOROUSLY:

🎯 ABSOLUTE FIDELITY TO TITLE AND CONTEXT:
1. The title "[titulo]" is SACRED - all content MUST be about this specific topic
2. NEVER deviate from the main subject or create unrelated content
3. Maintain TOTAL COHERENCE between title, premise, and script
4. If the title is in English, content MUST address the English topic but respond in English

🌍 MANDATORY CULTURAL ADAPTATION:
5. For English titles: Adapt examples, references, and context for the target audience
6. Use relevant cultural references when appropriate (companies, personalities, situations)
7. Maintain relevance for the audience from [localizacao]
8. Adapt currencies, measurements, and contexts to local standards

🚫 ABSOLUTE PROHIBITIONS:
9. DO NOT create content about topics different from the title
10. DO NOT use examples or references unrelated to the title
11. DO NOT add extra comments or unsolicited formatting
12. DO NOT add technical cues (Silence, Pause, sound effects, etc)
13. DO NOT finalize prematurely if it's not the last chunk

✅ RESPONSE RULES:
13. Respond ONLY with the requested content, nothing more
14. RESPOND EXCLUSIVELY IN ENGLISH - THIS IS MANDATORY
15. Maintain narrative continuity between chunks
16. For last chunk: ALWAYS finalize COMPLETELY with satisfying conclusion and call-to-action

🔥 DURATION AND QUALITY:
17. Respect RIGOROUSLY the specified duration (150 words per minute)
18. Prioritize QUALITY and RELEVANCE over word quantity
19. Develop the theme in depth and engagingly`,

    "es-ES": `INSTRUCCIONES CRÍTICAS DEL SISTEMA - SIGUE RIGUROSAMENTE:

🎯 FIDELIDAD ABSOLUTA AL TÍTULO Y CONTEXTO:
1. El título "[titulo]" es SAGRADO - todo el contenido DEBE ser sobre este tema específico
2. NUNCA te desvíes del tema principal o crees contenido no relacionado
3. Mantén COHERENCIA TOTAL entre título, premisa y guión
4. Si el título está en español, el contenido DEBE abordar el tema en español

🌍 ADAPTACIÓN CULTURAL OBLIGATORIA:
5. Para títulos en español: Adapta ejemplos, referencias y contexto para la audiencia objetivo
6. Usa referencias culturales relevantes cuando sea apropiado (empresas, personalidades, situaciones)
7. Mantén relevancia para la audiencia de [localizacao]
8. Adapta monedas, medidas y contextos a los estándares locales

🚫 PROHIBICIONES ABSOLUTAS:
9. NO crees contenido sobre temas diferentes al título
10. NO uses ejemplos o referencias no relacionadas con el título
11. NO agregues comentarios extra o formateo no solicitado
12. NO agregues indicaciones técnicas (Silencio, Pausa, efectos de sonido, etc)
13. NO finalices prematuramente si no es el último fragmento

✅ REGLAS DE RESPUESTA:
13. Responde SOLO con el contenido solicitado, nada más
14. RESPONDE EXCLUSIVAMENTE EN ESPAÑOL - ESTO ES OBLIGATORIO
15. Mantén continuidad narrativa entre fragmentos
16. Para el último fragmento: SIEMPRE finaliza COMPLETAMENTE con conclusión satisfactoria y call-to-action

🔥 DURACIÓN Y CALIDAD:
17. Respeta RIGUROSAMENTE la duración especificada (150 palabras por minuto)
18. Prioriza CALIDAD y RELEVANCIA sobre cantidad de palabras
19. Desarrolla el tema en profundidad y de manera atractiva`,
  };

  return instructions[language] || instructions["pt-BR"];
}
