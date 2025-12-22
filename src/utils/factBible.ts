// src/utils/factBible.ts
/**
 * Sistema de "Bíblia de Fatos" - Mantém consistência de personagens, relações e fatos
 *
 * IMPORTANTE: Este sistema NÃO impõe nomes fixos!
 * Ele EXTRAI os nomes/relações que A PRÓPRIA IA JÁ CRIOU no texto gerado
 * e garante que ela continue usando os MESMOS nomes nos chunks seguintes.
 *
 * Cada história é ÚNICA - os personagens vêm do prompt do usuário e da criação da IA.
 */

export interface Character {
  name: string;
  alternativeNames: string[];
  role: string; // ex: "protagonista", "vilão", "criança", "mãe"
  description: string;
  relationships: Array<{
    targetName: string;
    relationship: string; // ex: "irmã de", "pai de", "amor de"
  }>;
}

export interface FactBible {
  /** Personagens com seus nomes e relações fixas */
  characters: Character[];

  /** Relações chave entre personagens */
  relationships: string[];

  /** Fatos temporais (datas, períodos, idades) */
  timeline: string[];

  /** Objetos importantes e suas descrições */
  objects: string[];

  /** Locais importantes */
  locations: string[];

  /** Fatos que NÃO PODEM mudar */
  immutableFacts: string[];
}

/**
 * Extrai personagens do texto usando padrões de linguagem natural
 */
function extractCharacters(text: string): Character[] {
  const characters: Map<string, Character> = new Map();

  // Padrões para encontrar nomes e suas funções
  const patterns = [
    // "X, protagonista/vilão/criança"
    /([A-Z][a-záàâãéèêíïóôõöúçñ]+),?\s*(?:o|a)?\s*(?:protagonista|vilão|vilã|criança|menina|menino|homem|mulher|pai|mãe|irmã|irmão|avô|avó)/gi,
    // "protagonista X", "vilão chamado X"
    /(?:protagonista|vilão|vilã|criança|menina|menino|homem|mulher)\s+(?:chamado|chamada|de nome)?\s*([A-Z][a-záàâãéèêíïóôõöúçñ]+)/gi,
    // "X, de N anos"
    /([A-Z][a-záàâãéèêíïóôõöúçñ]+),?\s*(?:de)?\s*\d+\s*(?:anos|lat)/gi,
    // "sua/seu irmã/amor X"
    /(?:sua|seu|a|o)\s+(?:irmã|irmão|filha|filho|amor|amante|esposa|esposo|namorada|namorado)\s+([A-Z][a-záàâãéèêíïóôõöúçñ]+)/gi,
    // Nomes próprios seguidos de ações (verbos)
    /([A-Z][a-záàâãéèêíïóôõöúçñ]+)\s+(?:disse|falou|olhou|correu|andou|sentiu|viu|ouviu|sabia|lembrou|pensou|decidiu)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      if (name && name.length > 2 && name.length < 20) {
        // Ignorar palavras comuns que podem parecer nomes
        const commonWords = ['Ele', 'Ela', 'Isso', 'Aquilo', 'Este', 'Esta', 'Esse', 'Essa', 'The', 'And', 'But', 'For'];
        if (!commonWords.includes(name)) {
          if (!characters.has(name.toLowerCase())) {
            characters.set(name.toLowerCase(), {
              name: name,
              alternativeNames: [],
              role: '',
              description: '',
              relationships: []
            });
          }
        }
      }
    }
  }

  return Array.from(characters.values());
}

/**
 * Extrai relações entre personagens
 */
function extractRelationships(text: string): string[] {
  const relationships: Set<string> = new Set();

  const patterns = [
    // "X é irmã/pai/mãe de Y"
    /([A-Z][a-záàâãéèêíïóôõöúçñ]+)\s+(?:é|era|foi)\s+(?:a\s+)?(?:irmã|irmão|pai|mãe|filha|filho|avô|avó|tia|tio|prima|primo|amor|namorada|namorado|esposa|esposo)\s+(?:de|do|da)\s+([A-Z][a-záàâãéèêíïóôõöúçñ]+)/gi,
    // "filha de X"
    /(?:filha|filho|irmã|irmão|sobrinha|sobrinho)\s+(?:de|do|da)\s+([A-Z][a-záàâãéèêíïóôõöúçñ]+)/gi,
    // "X, sua irmã"
    /([A-Z][a-záàâãéèêíïóôõöúçñ]+),?\s+(?:sua|seu)\s+(?:irmã|irmão|filha|filho|amor|esposa|esposo)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0].trim();
      if (fullMatch.length > 5) {
        relationships.add(fullMatch);
      }
    }
  }

  return Array.from(relationships);
}

/**
 * Extrai fatos temporais (datas, períodos, idades)
 */
function extractTimeline(text: string): string[] {
  const timeline: Set<string> = new Set();

  const patterns = [
    // "X anos atrás", "há X anos"
    /(?:há|faz|fazem)?\s*\d+\s*(?:anos?|meses?|dias?|semanas?)\s*(?:atrás)?/gi,
    // "X tinha N anos"
    /([A-Z][a-záàâãéèêíïóôõöúçñ]+)\s+(?:tinha|tem|tinha)\s+\d+\s*(?:anos|lat)/gi,
    // Datas específicas
    /(?:em|no ano de|desde)\s*\d{4}/gi,
    // "quando X tinha N anos"
    /quando\s+([A-Z][a-záàâãéèêíïóôõöúçñ]+)\s+tinha\s+\d+\s*(?:anos|lat)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0].trim();
      if (fullMatch.length > 3) {
        timeline.add(fullMatch);
      }
    }
  }

  return Array.from(timeline);
}

/**
 * Extrai objetos importantes mencionados
 */
function extractObjects(text: string): string[] {
  const objects: Set<string> = new Set();

  const patterns = [
    // "um/uma/o/a [adjetivo] objeto"
    /(?:um|uma|o|a)\s+(?:\w+\s+)?(?:medalh[ãa]o|colar|anel|carta|foto|fotografia|documento|chave|relógio|pingente|pulseira|livro|diário|bilhete)/gi,
    // Descrições de objetos simbólicos
    /(?:medalh[ãa]o|colar|anel|pingente|relíquia|lembrança)\s+(?:de|da|do)\s+\w+/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0].trim();
      if (fullMatch.length > 5) {
        objects.add(fullMatch);
      }
    }
  }

  return Array.from(objects);
}

/**
 * Extrai locais importantes
 */
function extractLocations(text: string): string[] {
  const locations: Set<string> = new Set();

  const patterns = [
    // Cidades conhecidas
    /(?:em|na|no|para)\s+(Warszaw[ay]|Kraków|Gdańsk|Poznań|Wrocław|Łódź|São Paulo|Rio de Janeiro|Lisboa|Porto|Madrid|Barcelona|Paris|Londres|Berlin|Roma)/gi,
    // "cidade de X"
    /(?:cidade|vila|aldeia|bairro)\s+(?:de|da|do)\s+([A-Z][a-záàâãéèêíïóôõöúçñ]+)/gi,
    // Distritos/bairros específicos
    /(?:bairro|distrito)\s+(?:de\s+)?([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-Z][a-záàâãéèêíïóôõöúçñ]+)?)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const location = match[1] || match[0];
      if (location && location.length > 2) {
        locations.add(location.trim());
      }
    }
  }

  return Array.from(locations);
}

/**
 * Constrói a Bíblia de Fatos a partir do TEXTO JÁ GERADO
 *
 * IMPORTANTE: NÃO usa a premissa! A premissa é instrução, não conteúdo.
 * Extrai apenas do texto que a IA já escreveu para manter consistência.
 *
 * Se não há texto gerado (primeiro chunk), retorna Bíblia vazia.
 */
export function buildFactBible(premise: string, generatedText: string = ''): FactBible {
  // Se não há texto gerado, retornar vazio (primeiro chunk - IA ainda vai criar)
  if (!generatedText || generatedText.trim().length < 50) {
    return {
      characters: [],
      relationships: [],
      timeline: [],
      objects: [],
      locations: [],
      immutableFacts: []
    };
  }

  // Extrair APENAS do texto já gerado pela IA
  return {
    characters: extractCharacters(generatedText),
    relationships: extractRelationships(generatedText),
    timeline: extractTimeline(generatedText),
    objects: extractObjects(generatedText),
    locations: extractLocations(generatedText),
    immutableFacts: []
  };
}

/**
 * Formata a Bíblia de Fatos para inclusão no prompt
 *
 * IMPORTANTE: Estes são fatos que A PRÓPRIA IA JÁ CRIOU.
 * O objetivo é manter consistência, não impor nomes fixos.
 */
export function formatFactBibleForPrompt(bible: FactBible, premise: string): string {
  // Se não há fatos extraídos, não adicionar bloco (primeiro chunk)
  if (bible.characters.length === 0 && bible.relationships.length === 0) {
    return '';
  }

  let block = `
╔══════════════════════════════════════════════════════════════════╗
║  📖 PERSONAGENS E FATOS JÁ ESTABELECIDOS NA HISTÓRIA             ║
╠══════════════════════════════════════════════════════════════════╣
║  ⚠️ Você já criou estes personagens - continue usando os mesmos  ║
╚══════════════════════════════════════════════════════════════════╝

`;

  // Personagens
  if (bible.characters.length > 0) {
    block += `👥 PERSONAGENS (use EXATAMENTE estes nomes):\n`;
    bible.characters.forEach(char => {
      block += `• ${char.name}`;
      if (char.role) block += ` - ${char.role}`;
      if (char.description) block += `: ${char.description}`;
      block += `\n`;
    });
    block += `\n`;
  }

  // Relações
  if (bible.relationships.length > 0) {
    block += `🔗 RELAÇÕES FIXAS (NÃO MUDE):\n`;
    bible.relationships.forEach(rel => {
      block += `• ${rel}\n`;
    });
    block += `\n`;
  }

  // Timeline
  if (bible.timeline.length > 0) {
    block += `📅 TIMELINE (mantenha consistência temporal):\n`;
    bible.timeline.forEach(time => {
      block += `• ${time}\n`;
    });
    block += `\n`;
  }

  // Objetos
  if (bible.objects.length > 0) {
    block += `🎁 OBJETOS IMPORTANTES (não mude descrições):\n`;
    bible.objects.forEach(obj => {
      block += `• ${obj}\n`;
    });
    block += `\n`;
  }

  // Locais
  if (bible.locations.length > 0) {
    block += `📍 LOCAIS:\n`;
    bible.locations.forEach(loc => {
      block += `• ${loc}\n`;
    });
    block += `\n`;
  }

  block += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ MANTENHA CONSISTÊNCIA:
- Continue usando os MESMOS nomes que você já usou
- Se chamou alguém de "irmã", continue chamando de "irmã"
- Mantenha as idades e datas consistentes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return block;
}

/**
 * Detecta contradições entre novo texto e fatos estabelecidos
 */
export function detectContradictions(
  newText: string,
  bible: FactBible,
  previousText: string
): { hasContradiction: boolean; contradictions: string[] } {
  const contradictions: string[] = [];

  // Extrair fatos do novo texto
  const newRelationships = extractRelationships(newText);
  const newTimeline = extractTimeline(newText);

  // Verificar se relações mudaram
  for (const newRel of newRelationships) {
    for (const existingRel of bible.relationships) {
      // Verificar se o mesmo personagem tem relações diferentes
      const namesInNew = newRel.match(/[A-Z][a-záàâãéèêíïóôõöúçñ]+/g) || [];
      const namesInExisting = existingRel.match(/[A-Z][a-záàâãéèêíïóôõöúçñ]+/g) || [];

      // Se mencionam os mesmos personagens mas com relações diferentes
      const commonNames = namesInNew.filter(n => namesInExisting.includes(n));
      if (commonNames.length >= 1) {
        // Verificar se a relação é diferente
        const relWordsNew = newRel.match(/(?:irmã|irmão|pai|mãe|filha|filho|amor|namorada|esposa)/i);
        const relWordsExisting = existingRel.match(/(?:irmã|irmão|pai|mãe|filha|filho|amor|namorada|esposa)/i);

        if (relWordsNew && relWordsExisting && relWordsNew[0].toLowerCase() !== relWordsExisting[0].toLowerCase()) {
          contradictions.push(`Contradição de relação: "${newRel}" vs "${existingRel}"`);
        }
      }
    }
  }

  // Verificar nomes novos que podem ser o mesmo personagem
  const existingNames = new Set(bible.characters.map(c => c.name.toLowerCase()));
  const newChars = extractCharacters(newText);

  for (const newChar of newChars) {
    // Se aparece um nome novo em posição similar a um existente, pode ser erro
    // Isso é heurístico e pode ter falsos positivos
    if (!existingNames.has(newChar.name.toLowerCase())) {
      // Verificar se este "novo" nome aparece no contexto de um personagem existente
      for (const existingChar of bible.characters) {
        // Verificar se o novo nome aparece logo após menção do personagem existente
        const pattern = new RegExp(`${existingChar.name}[^.]*${newChar.name}`, 'i');
        if (pattern.test(newText)) {
          // Possível confusão de nomes
          contradictions.push(`Possível confusão: ${newChar.name} pode ser o mesmo que ${existingChar.name}`);
        }
      }
    }
  }

  return {
    hasContradiction: contradictions.length > 0,
    contradictions
  };
}

/**
 * Atualiza a Bíblia com novos fatos encontrados (apenas adiciona, nunca remove)
 */
export function updateFactBible(bible: FactBible, newText: string): FactBible {
  const newChars = extractCharacters(newText);
  const newRels = extractRelationships(newText);
  const newTimeline = extractTimeline(newText);
  const newObjects = extractObjects(newText);
  const newLocations = extractLocations(newText);

  // Merge sem duplicatas
  const existingCharNames = new Set(bible.characters.map(c => c.name.toLowerCase()));
  const newUniqueChars = newChars.filter(c => !existingCharNames.has(c.name.toLowerCase()));

  return {
    characters: [...bible.characters, ...newUniqueChars],
    relationships: [...new Set([...bible.relationships, ...newRels])],
    timeline: [...new Set([...bible.timeline, ...newTimeline])],
    objects: [...new Set([...bible.objects, ...newObjects])],
    locations: [...new Set([...bible.locations, ...newLocations])],
    immutableFacts: bible.immutableFacts
  };
}
