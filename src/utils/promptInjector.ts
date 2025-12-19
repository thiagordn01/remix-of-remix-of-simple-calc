/**
 * Sistema de injeção automática de contexto para prompts
 * Permite que usuários escrevam prompts livremente sem precisar usar placeholders
 *
 * ✅ VERSÃO 3.0 - SISTEMA "PROMPT INVISÍVEL"
 * Inclui nova função buildMinimalChunkPrompt para roteiros humanizados
 */

// Re-exportar funções do novo sistema minimalista
export { 
  buildMinimalChunkPrompt, 
  extractSemanticAnchors,
  detectParagraphDuplication,
  sanitizeScript,
  extractLastParagraph,
  buildEmergencyPrompt,
  formatParagraphsForNarration,
  type MinimalChunkContext
} from './minimalPromptBuilder';

/**
 * ✅ CRÍTICO: Mapeamento de nomes nativos de idiomas para enforcement
 * Usado para construir instruções bilíngues de idioma
 */
const LANGUAGE_NATIVE_NAMES: Record<string, { name: string; instruction: string }> = {
  'en-US': { name: 'English', instruction: 'YOU MUST WRITE 100% IN ENGLISH. EVERY SINGLE WORD MUST BE IN ENGLISH.' },
  'en-GB': { name: 'English', instruction: 'YOU MUST WRITE 100% IN ENGLISH. EVERY SINGLE WORD MUST BE IN ENGLISH.' },
  'en-AU': { name: 'English', instruction: 'YOU MUST WRITE 100% IN ENGLISH. EVERY SINGLE WORD MUST BE IN ENGLISH.' },
  'es-ES': { name: 'Español', instruction: 'DEBES ESCRIBIR 100% EN ESPAÑOL. CADA PALABRA DEBE SER EN ESPAÑOL.' },
  'es-MX': { name: 'Español', instruction: 'DEBES ESCRIBIR 100% EN ESPAÑOL. CADA PALABRA DEBE SER EN ESPAÑOL.' },
  'es-AR': { name: 'Español', instruction: 'DEBES ESCRIBIR 100% EN ESPAÑOL. CADA PALABRA DEBE SER EN ESPAÑOL.' },
  'fr-FR': { name: 'Français', instruction: 'VOUS DEVEZ ÉCRIRE 100% EN FRANÇAIS. CHAQUE MOT DOIT ÊTRE EN FRANÇAIS.' },
  'de-DE': { name: 'Deutsch', instruction: 'SIE MÜSSEN 100% AUF DEUTSCH SCHREIBEN. JEDES WORT MUSS AUF DEUTSCH SEIN.' },
  'it-IT': { name: 'Italiano', instruction: 'DEVI SCRIVERE 100% IN ITALIANO. OGNI PAROLA DEVE ESSERE IN ITALIANO.' },
  'pt-BR': { name: 'Português', instruction: 'VOCÊ DEVE ESCREVER 100% EM PORTUGUÊS. CADA PALAVRA DEVE SER EM PORTUGUÊS.' },
  'pt-PT': { name: 'Português', instruction: 'VOCÊ DEVE ESCREVER 100% EM PORTUGUÊS. CADA PALAVRA DEVE SER EM PORTUGUÊS.' },
  'ja-JP': { name: '日本語', instruction: '100%日本語で書いてください。すべての言葉が日本語でなければなりません。' },
  'ko-KR': { name: '한국어', instruction: '100% 한국어로 작성해야 합니다. 모든 단어는 한국어여야 합니다.' },
  'zh-CN': { name: '中文', instruction: '您必须100%用中文写作。每个字都必须是中文。' },
  'zh-TW': { name: '中文', instruction: '您必須100%用中文寫作。每個字都必須是中文。' },
  'ru-RU': { name: 'Русский', instruction: 'ВЫ ДОЛЖНЫ ПИСАТЬ 100% НА РУССКОМ ЯЗЫКЕ. КАЖДОЕ СЛОВО ДОЛЖНО БЫТЬ НА РУССКОМ.' },
  'ar-SA': { name: 'العربية', instruction: 'يجب أن تكتب 100٪ باللغة العربية. يجب أن تكون كل كلمة بالعربية.' },
  'hi-IN': { name: 'हिन्दी', instruction: 'आपको 100% हिंदी में लिखना होगा। प्रत्येक शब्द हिंदी में होना चाहिए।' },
  'tr-TR': { name: 'Türkçe', instruction: '100% TÜRKÇE YAZMANIZ GEREKMEKTEDİR. HER KELİME TÜRKÇE OLMALIDIR.' },
  'nl-NL': { name: 'Nederlands', instruction: 'JE MOET 100% IN HET NEDERLANDS SCHRIJVEN. ELK WOORD MOET IN HET NEDERLANDS ZIJN.' },
  'pl-PL': { name: 'Polski', instruction: 'MUSISZ PISAĆ 100% PO POLSKU. KAŻDE SŁOWO MUSI BYĆ PO POLSKU.' },
  'sv-SE': { name: 'Svenska', instruction: 'DU MÅSTE SKRIVA 100% PÅ SVENSKA. VARJE ORD MÅSTE VARA PÅ SVENSKA.' },
  'da-DK': { name: 'Dansk', instruction: 'DU SKAL SKRIVE 100% PÅ DANSK. HVERT ORD SKAL VÆRE PÅ DANSK.' },
  'no-NO': { name: 'Norsk', instruction: 'DU MÅ SKRIVE 100% PÅ NORSK. HVERT ORD MÅ VÆRE PÅ NORSK.' },
  'fi-FI': { name: 'Suomi', instruction: 'SINUN ON KIRJOITETTAVA 100% SUOMEKSI. JOKAISEN SANAN ON OLTAVA SUOMEKSI.' }
};

/**
 * ✅ CRÍTICO: Gera bloco de enforcement de idioma AGRESSIVO e BILÍNGUE
 * Garante que a IA NUNCA misture idiomas, independentemente do idioma das instruções técnicas
 */
function buildLanguageEnforcementBlock(languageCode: string, languageName: string): string {
  // Buscar instrução no idioma nativo, ou construir uma genérica
  const nativeInfo = LANGUAGE_NATIVE_NAMES[languageCode];
  const nativeName = nativeInfo?.name || languageName;
  const nativeInstruction = nativeInfo?.instruction || `Você deve escrever 100% em ${languageName.toUpperCase()}.`;

  return `
[REGRAS DE IDIOMA - TÉCNICAS]
- Escreva TODO o texto em ${nativeName} (${languageCode}).
- Não misture outros idiomas.
- O texto gerado será narrado diretamente.

${nativeInstruction}
`.trim();
}

interface AgentContext {
  title: string;
  channelName?: string;
  duration: number;
  language: string;
  location: string;
  premise?: string;
  isLastChunk?: boolean;
}

/**
 * Injeta automaticamente o contexto básico do vídeo antes do prompt do usuário.
 */
function injectAgentContext(userPrompt: string, context: AgentContext): string {
  const contextBlock = `=== INFORMAÇÕES DO VÍDEO ===
Título: ${context.title}
${context.channelName ? `Canal: ${context.channelName}\n` : ''}Duração alvo: ${context.duration} minutos
Idioma: ${context.language}
Localização/Público: ${context.location}
${context.premise ? `\nPremissa:\n${context.premise}\n` : ''}
=== INSTRUÇÕES ===
${userPrompt}`;

  return contextBlock;
}

export function injectPremiseContext(
  userPrompt: string,
  context: Omit<AgentContext, 'premise'>,
  _numberOfSections?: number
): string {
  const languageEnforcement = buildLanguageEnforcementBlock(context.language, context.language);

  const contextBlock = `
${languageEnforcement}

Título do Vídeo: ${context.title}
Canal: ${context.channelName || 'Canal'}
Idioma: ${context.language}
Localização/Público: ${context.location}

Instruções para a Premissa (SIGA EXATAMENTE O TEXTO ABAIXO):
${userPrompt}
`;

  return contextBlock.trim();
}

/**
 * Versão para geração de roteiro (inclui premissa)
 */
export function injectScriptContext(userPrompt: string, context: AgentContext): string {
  if (!context.premise) {
    throw new Error('Premissa é obrigatória para geração de roteiro');
  }

  const basePrompt = injectAgentContext(userPrompt, context);

  // ✅ CRÍTICO: Wrapper para que AI entenda que userPrompt são INSTRUÇÕES, não TEXTO LITERAL
  const wrappedPrompt = `
=== INSTRUÇÕES DE ESTILO E TOM (NÃO COPIAR LITERALMENTE) ===
⚠️ ATENÇÃO CRÍTICA: O texto abaixo contém DIRETRIZES DE COMO ESCREVER, não texto para copiar!

${userPrompt}

🚨 REGRA ABSOLUTA:
- O texto acima são APENAS DIRETRIZES de estilo, tom e abordagem
- NÃO copie frases ou expressões literalmente do texto acima
- Se houver EXEMPLOS (ex: "use transições como X"), são APENAS EXEMPLOS, não texto literal
- Use as diretrizes como INSPIRAÇÃO para o estilo, mas crie seu próprio texto original
- NUNCA insira frases soltas ou exemplos mencionados nas diretrizes
=== FIM DAS INSTRUÇÕES DE ESTILO ===
`;

  // Adicionar instrução automática para garantir texto corrido
  const textoCorrido = `

=== IMPORTANTE - FORMATO DE ENTREGA ===
⚠️ O roteiro DEVE ser entregue em TEXTO CORRIDO, sem formatações especiais:
- NÃO use numerações (1., 2., 3., etc)
- NÃO use marcadores (•, -, *, etc)
- NÃO use títulos como "Capítulo 1", "Parte 1", "Introdução", "Conclusão"
- NÃO use caracteres especiais para separar seções
- NÃO use colchetes, parênteses ou anotações [como esta]
- APENAS texto corrido natural, como se fosse ser narrado diretamente
- Mantenha coesão e fluidez entre as partes

🎙️ REGRA CRÍTICA - NARRATIVA SEM INSTRUÇÕES TÉCNICAS:
⚠️ Este roteiro é TEXTO PARA SER NARRADO, sem indicações técnicas de produção:

NÃO INCLUA:
❌ Indicações técnicas: "Silêncio.", "Pausa.", "Som ambiente", etc
❌ Parênteses com instruções: "(pausa dramática)", "(suspiro)", etc
❌ Descrições de efeitos: "Música tensa", "Ruído de fundo", etc
❌ Notas de produção: "[inserir som aqui]", "(fade out)", etc
❌ Marcações técnicas: "NARRADOR:", "SFX:", "MÚSICA:", etc
❌ Frases soltas sem contexto: "Presta atenção.", "Veja bem.", "Escute:", etc

APENAS INCLUA:
✅ Texto narrativo que será lido em voz alta
✅ Prosa contínua e natural
✅ História/conteúdo que flui naturalmente
✅ Transições integradas naturalmente na narrativa

COMO TRANSMITIR PAUSAS E MOMENTOS DRAMÁTICOS:
❌ ERRADO: "...perdi a força. Silêncio. O tempo parou..."
✅ CORRETO: "...perdi a força. Um silêncio profundo tomou conta. O tempo parou..."

❌ ERRADO: "...ele chegou. (pausa longa) Mas era tarde."
✅ CORRETO: "...ele chegou. Tarde demais. Já não havia mais nada a fazer."

❌ ERRADO: "Presta atenção. Agora vou te contar algo importante."
✅ CORRETO: "O que aconteceu em seguida mudou tudo. Algo extraordinário estava prestes a ser revelado."

Todo o texto gerado será lido diretamente por um narrador.
Não há produção, não há edição de áudio, não há efeitos.
APENAS a história sendo contada de forma natural e fluida.`;

  return basePrompt.replace(userPrompt, wrappedPrompt) + textoCorrido;
}

/**
 * ✅ CRÍTICO: Envolve prompt do usuário com instruções para NÃO copiar literalmente
 * Garante que AI entenda que são DIRETRIZES de estilo, não TEXTO LITERAL
 */
function wrapUserPromptAsInstructions(userPrompt: string): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DIRETRIZES DE ESTILO E TOM (NÃO COPIAR LITERALMENTE!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ATENÇÃO CRÍTICA: O texto abaixo são INSTRUÇÕES sobre COMO escrever, NÃO são frases para você COPIAR!

${userPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 REGRAS ABSOLUTAS DE INTERPRETAÇÃO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ O texto acima são APENAS DIRETRIZES de estilo, tom e abordagem
2️⃣ NÃO copie frases, expressões ou exemplos literalmente
3️⃣ Se houver EXEMPLOS (ex: "use ganchos como 'X'", "frases tipo 'Y'"), são APENAS EXEMPLOS!
4️⃣ Use as diretrizes como INSPIRAÇÃO para entender o ESTILO, mas crie texto 100% ORIGINAL
5️⃣ NUNCA insira frases soltas, exemplos ou expressões mencionadas nas diretrizes
6️⃣ Exemplos mostram o TIPO/ESTILO de linguagem, NÃO são palavras para COPIAR

📚 COMO INTERPRETAR CORRETAMENTE:

Exemplo de diretriz:
"Use ganchos impactantes como 'Você não vai acreditar no que aconteceu'"

🚫 RESPOSTA ERRADA:
"Você não vai acreditar no que aconteceu neste caso incrível..."

✅ RESPOSTA CORRETA:
"O que aconteceu a seguir desafia toda lógica..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Outro exemplo de diretriz:
"Faça transições do tipo 'Mas há algo que você precisa saber'"

🚫 RESPOSTA ERRADA:
"Mas há algo que você precisa saber sobre isso..."

✅ RESPOSTA CORRETA:
"Porém, existe um detalhe crucial que muda tudo..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 MÉTODO CORRETO:
1. Leia o exemplo e identifique o PROPÓSITO (gancho? transição? suspense?)
2. Identifique o TOM (casual? dramático? didático?)
3. ESQUEÇA as palavras exatas do exemplo
4. CRIE sua própria frase com o MESMO propósito e tom, mas palavras DIFERENTES

🚨 SE VOCÊ COPIAR EXEMPLOS LITERALMENTE, SUA RESPOSTA SERÁ REJEITADA E DESCARTADA!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

/**
 * Extrai as últimas N frases de um texto
 */
function extractLastSentences(text: string, numSentences: number = 3): string {
  if (!text || !text.trim()) return '';
  
  // Tentar extrair frases completas (terminadas em . ! ou ?)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length > 0) {
    const lastSentences = sentences.slice(-numSentences).join(' ').trim();
    return lastSentences;
  }
  
  // Fallback: últimos 400 caracteres se não conseguir identificar frases
  return text.slice(-400).trim();
}

/**
 * ✅ VERSÃO 2.0 - ARQUITETURA DE SEÇÕES INDEPENDENTES
 *
 * PRINCÍPIO FUNDAMENTAL:
 * - Cada chunk gera uma SEÇÃO ESPECÍFICA da premissa
 * - NÃO há "continuação" - cada seção é INDEPENDENTE
 * - NÃO enviamos texto anterior - isso ELIMINA a duplicação
 * - O prompt é CURTO e FOCADO - modelo entende melhor
 */

/**
 * ✅ NOVO: Extrai o bloco de CONTEXTO GLOBAL da premissa
 * Este bloco contém nomes de personagens, lugares e período
 * DEVE ser incluído em TODOS os chunks para garantir consistência
 */
function extractGlobalContext(premise: string): string {
  // Regex para encontrar o bloco [CONTEXTO GLOBAL]
  const contextRegex = /\[CONTEXTO\s*GLOBAL\][\s\S]*?(?=\[SEÇÃO\s*1|$)/i;
  const match = premise.match(contextRegex);

  if (match) {
    return match[0].trim();
  }

  // Fallback: tentar extrair informações básicas do início da premissa
  // Se não houver bloco formal, pegar as primeiras linhas antes de [SEÇÃO 1]
  const beforeSection1 = premise.split(/\[SEÇÃO\s*1/i)[0];
  if (beforeSection1 && beforeSection1.trim().length > 50) {
    return `[CONTEXTO GLOBAL]\n${beforeSection1.trim()}`;
  }

  return '';
}

/**
 * Extrai uma seção específica da premissa
 * Ex: extractSection(premise, 2) retorna o conteúdo de "[SEÇÃO 2 - ...]"
 */
function extractSection(premise: string, sectionNumber: number): string {
  // Regex para encontrar a seção específica
  const sectionRegex = new RegExp(
    `\\[SEÇÃO\\s*${sectionNumber}\\s*[-–]\\s*([^\\]]+)\\]([\\s\\S]*?)(?=\\[SEÇÃO\\s*\\d|$)`,
    'i'
  );

  const match = premise.match(sectionRegex);

  if (match) {
    const sectionTitle = match[1].trim();
    const sectionContent = match[2].trim();
    return `[SEÇÃO ${sectionNumber} - ${sectionTitle}]\n${sectionContent}`;
  }

  // Fallback: se não encontrar formato exato, retornar parte proporcional
  const lines = premise.split('\n').filter(line => line.trim());
  const totalLines = lines.length;
  const linesPerSection = Math.ceil(totalLines / 5); // Assume 5 seções
  const startLine = (sectionNumber - 1) * linesPerSection;
  const endLine = Math.min(startLine + linesPerSection, totalLines);

  return lines.slice(startLine, endLine).join('\n');
}

/**
 * Conta quantas seções existem na premissa
 */
function countSections(premise: string): number {
  const matches = premise.match(/\[SEÇÃO\s*\d+/gi);
  return matches ? matches.length : 3; // Default 3 se não encontrar
}

/**
 * ✅ NOVO: Extrai a última frase completa de um texto
 * Usada para criar transição suave entre seções
 */
function extractLastSentence(text: string): string {
  if (!text || !text.trim()) return '';

  // Encontrar todas as frases completas (terminadas em . ! ou ?)
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    // Retornar a última frase, limitada a 200 caracteres
    const lastSentence = sentences[sentences.length - 1].trim();
    return lastSentence.length > 200 ? lastSentence.slice(-200) : lastSentence;
  }

  // Fallback: últimos 150 caracteres se não encontrar frases
  return text.slice(-150).trim();
}

/**
 * ✅ VERSÃO 3.1 - SISTEMA DE CONTEXTO PROGRESSIVO
 *
 * Interface para o resumo progressivo acumulado entre seções
 */
export interface ProgressiveSummary {
  /** Eventos/cenas principais que já foram narrados */
  eventsNarrated: string[];
  /** Revelações importantes já feitas */
  revelationsMade: string[];
  /** Últimas 3 frases da seção anterior (para transição) */
  lastSentences: string;
  /** Número de palavras já escritas */
  totalWordsWritten: number;
  /** Seções já completadas */
  sectionsCompleted: number;
}

/**
 * ✅ NOVO: Gera resumo progressivo do que já foi narrado
 * Este resumo é passado para cada nova seção para evitar repetição
 */
export function generateProgressiveSummary(
  previousContent: string,
  previousSummary?: ProgressiveSummary
): ProgressiveSummary {
  if (!previousContent || !previousContent.trim()) {
    return {
      eventsNarrated: [],
      revelationsMade: [],
      lastSentences: '',
      totalWordsWritten: 0,
      sectionsCompleted: 0
    };
  }

  // Extrair últimas 3 frases para transição
  const sentences = previousContent.match(/[^.!?]+[.!?]+/g) || [];
  const lastSentences = sentences.slice(-3).join(' ').trim();

  // Contar palavras
  const wordCount = previousContent.split(/\s+/).filter(w => w.length > 0).length;

  // Acumular com resumo anterior se existir
  const eventsNarrated = previousSummary?.eventsNarrated || [];
  const revelationsMade = previousSummary?.revelationsMade || [];
  const sectionsCompleted = (previousSummary?.sectionsCompleted || 0) + 1;

  return {
    eventsNarrated,
    revelationsMade,
    lastSentences,
    totalWordsWritten: wordCount,
    sectionsCompleted
  };
}

/**
 * ✅ NOVO: Extrai eventos principais de um texto narrativo
 * Usado para criar lista de "eventos já narrados"
 */
export function extractMainEvents(text: string, maxEvents: number = 8): string[] {
  if (!text || !text.trim()) return [];

  const events: string[] = [];

  // Dividir em parágrafos
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);

  for (const paragraph of paragraphs) {
    if (events.length >= maxEvents) break;

    // Pegar a primeira frase de cada parágrafo como "evento"
    const firstSentence = paragraph.match(/^[^.!?]+[.!?]/);
    if (firstSentence) {
      // Limitar a 100 caracteres e limpar
      let event = firstSentence[0].trim();
      if (event.length > 100) {
        event = event.slice(0, 97) + '...';
      }
      events.push(event);
    }
  }

  // Se não encontrou parágrafos suficientes, usar frases
  if (events.length < 3) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const step = Math.max(1, Math.floor(sentences.length / maxEvents));

    for (let i = 0; i < sentences.length && events.length < maxEvents; i += step) {
      let event = sentences[i].trim();
      if (event.length > 100) {
        event = event.slice(0, 97) + '...';
      }
      if (!events.includes(event)) {
        events.push(event);
      }
    }
  }

  return events;
}

/**
 * ✅ NOVO: Constrói bloco de anti-repetição para o prompt
 * Lista explicitamente o que NÃO deve ser repetido
 */
export function buildAntiRepetitionBlock(
  summary: ProgressiveSummary,
  previousContent: string
): string {
  if (!previousContent || summary.sectionsCompleted === 0) {
    return '';
  }

  // Extrair eventos principais do conteúdo anterior
  const mainEvents = extractMainEvents(previousContent, 10);

  if (mainEvents.length === 0) {
    return '';
  }

  let block = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫🚫🚫 CONTEÚDO JÁ NARRADO - NÃO REPETIR! 🚫🚫🚫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ As seções anteriores (${summary.sectionsCompleted} seção(ões), ~${summary.totalWordsWritten} palavras) JÁ NARRARAM:

`;

  // Listar eventos já narrados
  mainEvents.forEach((event, index) => {
    block += `${index + 1}. ${event}\n`;
  });

  block += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 REGRAS ABSOLUTAS DE NÃO-REPETIÇÃO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ NÃO recontar cenas que já foram descritas acima
❌ NÃO repetir diálogos ou momentos dramáticos já narrados
❌ NÃO descrever novamente descobertas/revelações já feitas
❌ NÃO voltar no tempo narrativo - a história deve PROGREDIR
❌ NÃO usar as mesmas frases ou estruturas das seções anteriores

✅ CONTINUE a história a partir de onde parou
✅ AVANCE para novos eventos e desenvolvimentos
✅ ASSUMA que o leitor já conhece o que foi narrado
✅ REFERENCIE eventos passados brevemente se necessário, mas NÃO recontar

💡 DICA: Se a premissa menciona algo que já foi narrado,
   NÃO narre novamente - apenas continue a partir daí.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return block;
}

/**
 * ✅ NOVO: Constrói bloco de transição entre seções
 * Mostra as últimas frases e instrui como continuar
 */
function buildTransitionBlock(summary: ProgressiveSummary): string {
  if (!summary.lastSentences || summary.sectionsCompleted === 0) {
    return '';
  }

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 PONTO DE CONTINUAÇÃO (onde a seção anterior terminou):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"${summary.lastSentences}"

⚠️ COMO CONTINUAR:
- NÃO repita esta frase ou variações dela
- NÃO reconte o que levou a este momento
- COMECE com uma NOVA frase que DÁ CONTINUIDADE natural
- A narrativa deve FLUIR como se fosse um texto único

❌ ERRADO: Repetir "...terminou assim. E então terminou assim novamente..."
✅ CERTO: Continuar naturalmente "A escuridão que se seguiu trouxe consigo..."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

/**
 * Construtor de prompts para chunks de roteiro - VERSÃO 2.1 COM TRANSIÇÕES
 */
// Limite seguro para prompt do usuário (10.000 caracteres ~ 2500 tokens)
const MAX_USER_PROMPT_LENGTH = 10000;

/**
 * Processa o prompt do usuário com limite seguro
 */
function processUserPrompt(userPrompt: string): string {
  if (userPrompt.length > MAX_USER_PROMPT_LENGTH) {
    console.warn(`⚠️ Prompt do usuário muito longo (${userPrompt.length} chars), truncando para ${MAX_USER_PROMPT_LENGTH}`);
    return userPrompt.slice(0, MAX_USER_PROMPT_LENGTH) + '\n\n[⚠️ Prompt truncado por exceder limite de caracteres]';
  }
  return userPrompt;
}

/**
 * Verifica se o usuário mencionou CTA no prompt
 */
function checkUserCTAPreference(userPrompt: string): { wantsCTA: boolean; prohibitsCTA: boolean } {
  const wantsCTA = /cta|call.to.action|inscrev|curt|coment|like|subscribe|sininho/i.test(userPrompt);
  const prohibitsCTA = /sem cta|não.*(cta|inscri)|no cta|without cta|sem.*(like|inscri)/i.test(userPrompt);
  return { wantsCTA, prohibitsCTA };
}

/**
 * ✅ VERSÃO 3.1 - SISTEMA DE CONTEXTO PROGRESSIVO
 *
 * Mudanças principais:
 * 1. Prompt do usuário no INÍCIO (alta prioridade)
 * 2. Bloco de ANTI-REPETIÇÃO com eventos já narrados
 * 3. Contexto progressivo acumulado entre seções
 * 4. CTA condicional baseado nas preferências do usuário
 */
export function buildChunkPrompt(
  userPrompt: string,
  context: AgentContext & {
    premise: string;
    previousContent?: string;
    chunkIndex: number;
    totalChunks: number;
    targetWords: number;
    /** ✅ NOVO: Resumo progressivo do que já foi narrado */
    progressiveSummary?: ProgressiveSummary;
  }
): string {
  const { title, premise, previousContent, chunkIndex, totalChunks, targetWords, progressiveSummary } = context;

  const sectionNumber = chunkIndex + 1; // Seção 1, 2, 3...
  const isFirstSection = chunkIndex === 0;
  const isLastSection = chunkIndex === totalChunks - 1;

  // ✅ Extrair CONTEXTO GLOBAL (nomes, lugares, período)
  const globalContext = extractGlobalContext(premise);

  // Extrair APENAS a seção específica da premissa
  const currentSection = extractSection(premise, sectionNumber);

  // ✅ NOVO: Gerar ou usar resumo progressivo
  const summary = progressiveSummary || generateProgressiveSummary(previousContent || '', undefined);

  // ✅ NOVO: Construir bloco de anti-repetição (se não for primeira seção)
  const antiRepetitionBlock = !isFirstSection && previousContent
    ? buildAntiRepetitionBlock(summary, previousContent)
    : '';

  // ✅ NOVO: Construir bloco de transição
  const transitionBlock = !isFirstSection && summary.sectionsCompleted > 0
    ? buildTransitionBlock(summary)
    : '';

  // Bloco de idioma SIMPLIFICADO
  const nativeInfo = LANGUAGE_NATIVE_NAMES[context.language];
  const languageInstruction = nativeInfo?.instruction || `Write 100% in ${context.language}`;

  // ✅ Processar prompt do usuário (sem truncamento agressivo)
  const processedUserPrompt = processUserPrompt(userPrompt);

  // ✅ Verificar preferências de CTA do usuário
  const { wantsCTA, prohibitsCTA } = checkUserCTAPreference(userPrompt);

  // ✅ Log de diagnóstico
  console.log(`📝 Diagnóstico do prompt (Seção ${sectionNumber}/${totalChunks}):
  - Tamanho do prompt do usuário: ${userPrompt.length} caracteres
  - CTA mencionado: ${wantsCTA ? 'Sim' : 'Não'}
  - CTA proibido: ${prohibitsCTA ? 'Sim' : 'Não'}
  - É última seção: ${isLastSection ? 'Sim' : 'Não'}
  - Seções já completadas: ${summary.sectionsCompleted}
  - Palavras já escritas: ${summary.totalWordsWritten}
  - Anti-repetição ativo: ${antiRepetitionBlock ? 'Sim' : 'Não'}`);

  // ✅ VERSÃO 3.2: REGRA DE OURO NO TOPO + ESTILO PRIORIZADO
  let prompt = `
╔══════════════════════════════════════════════════════════════════╗
║  🏆🏆🏆 REGRA DE OURO - PRIORIDADE MÁXIMA 🏆🏆🏆                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  📜 ENTREGUE APENAS O TEXTO DA HISTÓRIA                          ║
║                                                                  ║
║  ❌ NÃO coloque títulos, capítulos ou numerações                 ║
║  ❌ NÃO use asteriscos, bullets ou formatações                   ║
║  ❌ NÃO escreva introduções tipo "Claro, aqui vai"               ║
║  ❌ NÃO adicione comentários ou explicações                      ║
║  ❌ NÃO use [tags] ou (instruções técnicas)                      ║
║                                                                  ║
║  ✅ APENAS texto narrativo puro, como se fosse lido em voz alta  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  🎭 REGRAS DE ESTILO - OBRIGATÓRIAS                              ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1️⃣ Escreva como se estivesse contando a história AO VIVO       ║
║     para uma plateia atenta e envolvida                          ║
║                                                                  ║
║  2️⃣ Use palavras SIMPLES, POPULARES e ACESSÍVEIS                ║
║     → "começou" em vez de "principiou"                           ║
║     → "medo" em vez de "temor"                                   ║
║     → "olhou" em vez de "fitou"                                  ║
║     → "disse" em vez de "proferiu"                               ║
║     → EVITE termos rebuscados ou literários demais               ║
║                                                                  ║
║  3️⃣ A narrativa deve ser FLUIDA como uma CONVERSA emocionante   ║
║     → Frases curtas e diretas                                    ║
║     → Ritmo natural de quem conta uma história                   ║
║     → Sem construções artificiais ou pomposas                    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

🚨 IDIOMA OBRIGATÓRIO: ${context.language}
${languageInstruction}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 INSTRUÇÕES DO CRIADOR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${processedUserPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${antiRepetitionBlock}${transitionBlock}
📌 TÍTULO: "${title}"

🎯 SUA TAREFA: ESCREVER A SEÇÃO ${sectionNumber} DE ${totalChunks}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${globalContext ? `
🔒 CONTEXTO GLOBAL (USE EXATAMENTE ESTES NOMES):
${globalContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}
📖 CONTEÚDO DESTA SEÇÃO:
${currentSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 ESPECIFICAÇÕES:
- Escreva ~${targetWords} palavras
- Texto CORRIDO, prosa narrativa pura
- Comece DIRETO com a história
- USE OS NOMES EXATOS do contexto global
${!isFirstSection ? `- CONTINUE de onde parou - NÃO recontar eventos passados` : ''}`;

  // Instruções específicas por posição
  if (isFirstSection) {
    prompt += `
⚡ ESTA É A ABERTURA DO VÍDEO:
- Comece com GANCHO FORTE nos primeiros segundos
- Capture a atenção IMEDIATAMENTE
- O espectador decide se continua assistindo AGORA
`;
  } else if (isLastSection) {
    prompt += `
🏁 ESTE É O FECHAMENTO FINAL DO VÍDEO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫🚫🚫 REGRA CRÍTICA - NÃO FAZER RECAPITULAÇÃO! 🚫🚫🚫

❌ NÃO resuma o que aconteceu na história
❌ NÃO faça "flashback" recontando eventos passados
❌ NÃO liste o que os personagens fizeram/aprenderam
❌ NÃO escreva parágrafos do tipo "E assim, depois de tudo..."

✅ APENAS continue e CONCLUA a narrativa de forma natural
✅ Mostre o DESFECHO através de AÇÃO, não resumo
✅ A última cena deve MOSTRAR a resolução, não CONTAR sobre ela

EXEMPLO DO QUE NÃO FAZER:
❌ "E assim, após toda a jornada, Marek finalmente encontrou a paz.
   Ele aprendeu que o dinheiro não traz felicidade e que..."
   (ISSO É RECAPITULAÇÃO - PROIBIDO!)

✅ COMO FAZER CORRETAMENTE:
"Marek olhou pela janela da nova casa. Zuzia brincava no jardim
 com os gêmeos. Pela primeira vez em anos, ele sorriu de verdade."
   (ISSO É MOSTRAR O DESFECHO - CORRETO!)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 INSTRUÇÕES DO FECHAMENTO:
- Conclua a narrativa de forma SATISFATÓRIA
- Resolva todas as pontas soltas através de CENAS, não resumos
- O espectador deve SENTIR que a história terminou
`;

    // ✅ CTA CONDICIONAL baseado nas preferências do usuário
    if (!prohibitsCTA) {
      prompt += `
💡 SUGESTÃO DE FECHAMENTO${wantsCTA ? ' (o criador solicitou CTA)' : ''}:
- Termine com REFLEXÃO ou MENSAGEM FINAL
${wantsCTA ? '- Inclua CALL-TO-ACTION conforme solicitado pelo criador (like, inscrição, comentário)' : '- Considere incluir call-to-action se apropriado ao estilo do criador'}
`;
    }

    prompt += `
🚨 CRÍTICO - TÉRMINO OBRIGATÓRIO:
- Esta é a ÚLTIMA seção - você DEVE terminar a história COMPLETAMENTE
- NÃO termine no meio de uma cena ou pensamento
- Se precisar, reduza um pouco o conteúdo para garantir um final COMPLETO
`;
  } else {
    prompt += `
📈 ESTA É UMA SEÇÃO DE DESENVOLVIMENTO:
- Aprofunde os pontos desta seção
- Mantenha o espectador ENGAJADO
- Crie tensão ou curiosidade para próxima seção
`;
  }

  // Regras técnicas finais
  prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGRAS TÉCNICAS ABSOLUTAS (NUNCA VIOLAR):
1. Escreva APENAS texto de narração pura (sem explicações, sem meta-texto)
2. NÃO use tags como [IMAGEM: ...], [MÚSICA: ...], [CENA: ...] - PROIBIDO!
3. NÃO use colchetes [ ] ou parênteses ( ) para instruções de produção
4. NÃO mencione "seção", "bloco", "parte", "capítulo" no texto
5. NÃO use emojis, marcadores, numerações ou formatações
6. Use linguagem SIMPLES e ACESSÍVEL - evite termos rebuscados
7. Escreva como uma CONVERSA fluida e envolvente
8. TERMINE sempre em fim de FRASE COMPLETA (com ponto final)
9. TERMINE sempre em fim de PARÁGRAFO COMPLETO
10. NUNCA corte uma palavra no meio
11. NUNCA deixe uma frase incompleta
12. NUNCA repita conteúdo que já foi escrito em seções anteriores

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 LEMBRETE FINAL: ESCREVA 100% EM ${context.language}!
${languageInstruction}
NÃO ESCREVA EM INGLÊS OU QUALQUER OUTRO IDIOMA!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return prompt;
}
