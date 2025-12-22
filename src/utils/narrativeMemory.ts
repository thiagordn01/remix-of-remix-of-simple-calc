// src/utils/narrativeMemory.ts
/**
 * Sistema de Memória Narrativa
 *
 * Objetivo: Manter contexto do que já foi escrito SEM impor estrutura.
 * O prompt do usuário define a estrutura - este sistema apenas:
 * 1. Lembra o que já foi narrado
 * 2. Extrai eventos principais
 * 3. Gera lista do que NÃO repetir
 * 4. Passa contexto adequado para continuação
 */

export interface NarrativeMemory {
  /** Resumo conciso do que já foi narrado (~150 palavras) */
  summary: string;

  /** Eventos/ações principais que já aconteceram */
  eventsNarrated: string[];

  /** Últimas 3-5 frases do texto (para continuação fluida) */
  lastContext: string;

  /** Nomes de personagens mencionados */
  characters: string[];

  /** Locais/cenários mencionados */
  locations: string[];

  /** Total de palavras já escritas */
  wordCount: number;

  /** Número do chunk atual (0-indexed) */
  chunkIndex: number;
}

/**
 * Extrai nomes próprios do texto (personagens e locais)
 * Usa heurística: palavras capitalizadas que não iniciam frases
 */
function extractProperNouns(text: string): { characters: string[]; locations: string[] } {
  const characters: Set<string> = new Set();
  const locations: Set<string> = new Set();

  // Padrões comuns de nomes de personagens (precedidos por artigos ou verbos)
  const charPatterns = [
    /\b(?:o|a|os|as|um|uma)\s+([A-Z][a-záéíóúàèìòùâêîôûãõç]+)/g,
    /\b(?:disse|falou|gritou|murmurou|respondeu|perguntou)\s+([A-Z][a-záéíóúàèìòùâêîôûãõç]+)/g,
    /\b([A-Z][a-záéíóúàèìòùâêîôûãõç]+)\s+(?:disse|falou|olhou|correu|andou|sentiu)/g,
  ];

  // Padrões de locais (precedidos por preposições)
  const locPatterns = [
    /\b(?:em|no|na|para|pelo|pela|do|da)\s+([A-Z][a-záéíóúàèìòùâêîôûãõç]+)/g,
  ];

  charPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].length > 2) {
        characters.add(match[1]);
      }
    }
  });

  locPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].length > 2) {
        locations.add(match[1]);
      }
    }
  });

  return {
    characters: Array.from(characters).slice(0, 10),
    locations: Array.from(locations).slice(0, 5)
  };
}

/**
 * Extrai as últimas N frases completas de um texto
 */
function extractLastSentences(text: string, count: number = 5): string {
  if (!text || !text.trim()) return '';

  // Encontrar frases completas (terminadas em . ! ou ?)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

  if (sentences.length === 0) {
    // Fallback: últimos 300 caracteres
    return text.slice(-300).trim();
  }

  return sentences.slice(-count).join(' ').trim();
}

/**
 * Extrai eventos principais do texto
 * Foca em ações e acontecimentos, não descrições
 */
function extractMainEvents(text: string, maxEvents: number = 8): string[] {
  if (!text || !text.trim()) return [];

  const events: string[] = [];

  // Dividir em parágrafos
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 30);

  for (const paragraph of paragraphs) {
    if (events.length >= maxEvents) break;

    // Pegar a primeira frase significativa de cada parágrafo
    const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();

      // Filtrar frases muito curtas ou que são apenas descrições
      if (trimmed.length < 20) continue;
      if (trimmed.length > 150) continue;

      // Preferir frases com verbos de ação
      const hasAction = /\b(disse|fez|foi|chegou|descobriu|encontrou|viu|ouviu|sentiu|decidiu|começou|terminou|morreu|nasceu|casou|fugiu|lutou|ganhou|perdeu|salvou|matou|roubou|revelou|confessou)\b/i.test(trimmed);

      if (hasAction || events.length < 3) {
        // Limitar tamanho
        const event = trimmed.length > 100 ? trimmed.slice(0, 97) + '...' : trimmed;
        if (!events.includes(event)) {
          events.push(event);
        }
      }

      if (events.length >= maxEvents) break;
    }
  }

  return events;
}

/**
 * Gera um resumo conciso do texto
 * Extrai as ideias principais sem impor estrutura
 */
function generateSummary(text: string, maxWords: number = 150): string {
  if (!text || !text.trim()) return '';

  const words = text.split(/\s+/);
  const totalWords = words.length;

  if (totalWords <= maxWords) {
    return text.trim();
  }

  // Estratégia: pegar início, meio e fim proporcionalmente
  const events = extractMainEvents(text, 6);

  if (events.length > 0) {
    // Usar eventos extraídos como resumo
    return events.join(' ');
  }

  // Fallback: primeiras e últimas frases
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length <= 4) {
    return sentences.join(' ');
  }

  const first = sentences.slice(0, 2);
  const last = sentences.slice(-2);

  return [...first, '...', ...last].join(' ');
}

/**
 * Constrói a memória narrativa a partir do texto já gerado
 */
export function buildNarrativeMemory(
  previousContent: string,
  chunkIndex: number
): NarrativeMemory {
  if (!previousContent || !previousContent.trim()) {
    return {
      summary: '',
      eventsNarrated: [],
      lastContext: '',
      characters: [],
      locations: [],
      wordCount: 0,
      chunkIndex
    };
  }

  const { characters, locations } = extractProperNouns(previousContent);
  const events = extractMainEvents(previousContent);
  const lastContext = extractLastSentences(previousContent, 5);
  const summary = generateSummary(previousContent, 150);
  const wordCount = previousContent.split(/\s+/).filter(w => w.length > 0).length;

  return {
    summary,
    eventsNarrated: events,
    lastContext,
    characters,
    locations,
    wordCount,
    chunkIndex
  };
}

/**
 * Formata a memória narrativa para inclusão no prompt
 * NÃO impõe estrutura - apenas informa o que já foi escrito
 */
export function formatMemoryForPrompt(memory: NarrativeMemory): string {
  if (memory.wordCount === 0) {
    return '';
  }

  let block = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 CONTEXTO DO QUE JÁ FOI ESCRITO (${memory.wordCount} palavras)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

  // Resumo do que aconteceu
  if (memory.summary) {
    block += `📖 RESUMO ATÉ AGORA:
${memory.summary}

`;
  }

  // Eventos que já aconteceram (NÃO REPETIR)
  if (memory.eventsNarrated.length > 0) {
    block += `🚫 EVENTOS JÁ NARRADOS (NÃO REPETIR):
`;
    memory.eventsNarrated.forEach((event, i) => {
      block += `${i + 1}. ${event}\n`;
    });
    block += `\n`;
  }

  // Personagens e locais (para consistência)
  if (memory.characters.length > 0 || memory.locations.length > 0) {
    block += `📌 ELEMENTOS JÁ ESTABELECIDOS:\n`;
    if (memory.characters.length > 0) {
      block += `- Personagens: ${memory.characters.join(', ')}\n`;
    }
    if (memory.locations.length > 0) {
      block += `- Locais: ${memory.locations.join(', ')}\n`;
    }
    block += `\n`;
  }

  // Contexto para continuação
  if (memory.lastContext) {
    block += `🔗 ÚLTIMAS FRASES (continue a partir daqui):
"${memory.lastContext}"

`;
  }

  block += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGRAS DE CONTINUAÇÃO:
- Continue a narrativa de onde parou
- NÃO repita eventos listados acima
- NÃO reconte cenas já descritas
- Mantenha os nomes e locais consistentes
- Avance a história, não recapitule
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return block;
}

/**
 * Detecta se há duplicação semântica entre novo texto e texto anterior
 * Retorna true se detectar repetição significativa
 */
export function detectSemanticDuplication(
  newText: string,
  previousText: string,
  threshold: number = 0.4
): { hasDuplication: boolean; duplicatedText?: string; similarity: number } {
  if (!newText || !previousText) {
    return { hasDuplication: false, similarity: 0 };
  }

  // Normalizar textos
  const normalize = (text: string) =>
    text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const newNorm = normalize(newText);
  const prevNorm = normalize(previousText);

  // Extrair frases do novo texto
  const newSentences = newText.match(/[^.!?]+[.!?]+/g) || [];

  let maxSimilarity = 0;
  let duplicatedText = '';

  for (const sentence of newSentences) {
    const sentNorm = normalize(sentence);
    if (sentNorm.length < 20) continue;

    // Verificar se a frase aparece literalmente no texto anterior
    if (prevNorm.includes(sentNorm)) {
      return {
        hasDuplication: true,
        duplicatedText: sentence.trim(),
        similarity: 1.0
      };
    }

    // Calcular similaridade por n-gramas (bigrams)
    const similarity = calculateBigramSimilarity(sentNorm, prevNorm);

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      if (similarity >= threshold) {
        duplicatedText = sentence.trim();
      }
    }
  }

  return {
    hasDuplication: maxSimilarity >= threshold,
    duplicatedText: duplicatedText || undefined,
    similarity: maxSimilarity
  };
}

/**
 * Calcula similaridade usando bigramas (pares de palavras)
 */
function calculateBigramSimilarity(text1: string, text2: string): number {
  const getBigrams = (text: string): Set<string> => {
    const words = text.split(' ').filter(w => w.length > 2);
    const bigrams = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.add(`${words[i]} ${words[i + 1]}`);
    }
    return bigrams;
  };

  const bigrams1 = getBigrams(text1);
  const bigrams2 = getBigrams(text2);

  if (bigrams1.size === 0 || bigrams2.size === 0) return 0;

  let intersection = 0;
  bigrams1.forEach(bg => {
    if (bigrams2.has(bg)) intersection++;
  });

  // Jaccard similarity
  const union = bigrams1.size + bigrams2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Gera prompt de emergência quando duplicação é detectada
 */
export function buildAntiDuplicationPrompt(
  duplicatedText: string,
  memory: NarrativeMemory
): string {
  return `
⚠️⚠️⚠️ ALERTA DE DUPLICAÇÃO DETECTADA ⚠️⚠️⚠️

Você estava prestes a repetir algo que já foi escrito.

🚫 TEXTO DUPLICADO DETECTADO:
"${duplicatedText.slice(0, 200)}..."

📌 REGRAS OBRIGATÓRIAS:
1. NÃO repita este trecho ou ideias similares
2. NÃO parafraseie o mesmo evento
3. AVANCE para algo NOVO na narrativa
4. Se necessário, pule para a próxima cena/momento

${memory.eventsNarrated.length > 0 ? `
🚫 OUTROS EVENTOS JÁ NARRADOS (NÃO REPETIR):
${memory.eventsNarrated.map((e, i) => `${i + 1}. ${e}`).join('\n')}
` : ''}

Continue a história com conteúdo 100% NOVO.
`;
}
