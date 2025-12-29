// Utilitário para detecção automática de idioma baseado no conteúdo do título

interface LanguagePattern {
  code: string;
  name: string;
  patterns: RegExp[];
  commonWords: string[];
  charSets: string[];
}

// Padrões de detecção de idioma - expandido para 50+ idiomas
const languagePatterns: LanguagePattern[] = [
  // PORTUGUÊS
  {
    code: 'pt-BR',
    name: 'Português (Brasil)',
    patterns: [/[áàâãéêíóôõúç]/i, /\b(que|para|com|uma|não|mais|como|ser|por|seu|foi|fazer|muito|onde)\b/i],
    commonWords: ['que', 'de', 'para', 'não', 'com', 'uma', 'mais', 'como', 'muito', 'brasileiro', 'brasil'],
    charSets: ['áàâãéêíóôõúç']
  },
  {
    code: 'pt-PT',
    name: 'Português (Portugal)',
    patterns: [/[áàâãéêíóôõúç]/i, /\b(que|para|com|uma|não|mais|como|ser|por|seu|foi|fazer|muito)\b/i],
    commonWords: ['que', 'de', 'para', 'não', 'com', 'uma', 'mais', 'como', 'muito', 'português', 'portugal'],
    charSets: ['áàâãéêíóôõúç']
  },

  // INGLÊS
  {
    code: 'en-US',
    name: 'English (US)',
    patterns: [/\b(the|is|of|and|to|in|that|have|it|for|not|on|with|he|as|you|do|at)\b/i],
    commonWords: ['the', 'is', 'and', 'to', 'in', 'that', 'have', 'it', 'for', 'american', 'usa', 'united states'],
    charSets: []
  },
  {
    code: 'en-GB',
    name: 'English (UK)',
    patterns: [/\b(the|is|of|and|to|in|that|have|it|for|not|on|with|he|as|you|do|at|whilst|colour)\b/i],
    commonWords: ['the', 'is', 'and', 'to', 'in', 'that', 'have', 'it', 'for', 'british', 'uk', 'britain', 'colour', 'whilst'],
    charSets: []
  },

  // ESPANHOL
  {
    code: 'es-ES',
    name: 'Español (España)',
    patterns: [/[áéíóúñ¿¡]/i, /\b(que|de|el|la|y|en|un|ser|se|no|haber|por|con|su|para|como|estar)\b/i],
    commonWords: ['que', 'de', 'el', 'la', 'y', 'en', 'un', 'ser', 'se', 'no', 'españa', 'español', 'vosotros'],
    charSets: ['áéíóúñ¿¡']
  },
  {
    code: 'es-MX',
    name: 'Español (México)',
    patterns: [/[áéíóúñ¿¡]/i, /\b(que|de|el|la|y|en|un|ser|se|no|haber|por|con|su|para|como)\b/i],
    commonWords: ['que', 'de', 'el', 'la', 'y', 'en', 'un', 'ser', 'se', 'no', 'méxico', 'mexicano', 'órale'],
    charSets: ['áéíóúñ¿¡']
  },

  // FRANCÊS
  {
    code: 'fr-FR',
    name: 'Français (France)',
    patterns: [/[àâæçéèêëïîôùûü]/i, /\b(le|la|de|un|être|et|à|il|avoir|ne|je|son|que|se|qui|ce|dans)\b/i],
    commonWords: ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'france', 'français'],
    charSets: ['àâæçéèêëïîôùûü']
  },

  // ALEMÃO
  {
    code: 'de-DE',
    name: 'Deutsch (Deutschland)',
    patterns: [/[äöüß]/i, /\b(der|die|das|und|in|zu|den|von|ist|mit|für|auf|eine|ein)\b/i],
    commonWords: ['der', 'die', 'das', 'und', 'in', 'zu', 'den', 'von', 'ist', 'deutschland', 'deutsch'],
    charSets: ['äöüß']
  },

  // ITALIANO
  {
    code: 'it-IT',
    name: 'Italiano (Italia)',
    patterns: [/[àèéìòù]/i, /\b(il|di|e|la|che|un|a|per|in|è|da|non|con|sono|del|le)\b/i],
    commonWords: ['il', 'di', 'e', 'la', 'che', 'un', 'a', 'per', 'in', 'è', 'italia', 'italiano'],
    charSets: ['àèéìòù']
  },

  // RUSSO
  {
    code: 'ru-RU',
    name: 'Русский (Россия)',
    patterns: [/[а-яё]/i, /\b(в|и|не|на|я|быть|что|он|с|как|а|то|все|она|так|его|но|да|ты)\b/i],
    commonWords: ['в', 'и', 'не', 'на', 'я', 'быть', 'что', 'он', 'с', 'как', 'россия', 'русский'],
    charSets: ['а-яё']
  },

  // CHINÊS
  {
    code: 'zh-CN',
    name: '简体中文 (中国)',
    patterns: [/[\u4e00-\u9fa5]/],
    commonWords: ['的', '一', '是', '在', '不', '了', '有', '和', '人', '这', '中国'],
    charSets: ['\u4e00-\u9fa5']
  },

  // JAPONÊS
  {
    code: 'ja-JP',
    name: '日本語 (日本)',
    patterns: [/[\u3040-\u309f\u30a0-\u30ff]/],
    commonWords: ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', '日本'],
    charSets: ['\u3040-\u309f\u30a0-\u30ff']
  },

  // COREANO
  {
    code: 'ko-KR',
    name: '한국어 (대한민국)',
    patterns: [/[\uac00-\ud7af]/],
    commonWords: ['의', '가', '이', '은', '들', '는', '좀', '잘', '걍', '과', '한국'],
    charSets: ['\uac00-\ud7af']
  },

  // ÁRABE
  {
    code: 'ar-SA',
    name: 'العربية (السعودية)',
    patterns: [/[\u0600-\u06ff]/],
    commonWords: ['في', 'من', 'على', 'إلى', 'هذا', 'أن', 'هو', 'لا', 'ما', 'كان', 'السعودية'],
    charSets: ['\u0600-\u06ff']
  },

  // HINDI
  {
    code: 'hi-IN',
    name: 'हिन्दी (भारत)',
    patterns: [/[\u0900-\u097f]/],
    commonWords: ['के', 'का', 'एक', 'में', 'की', 'है', 'यह', 'और', 'से', 'हो', 'भारत'],
    charSets: ['\u0900-\u097f']
  },

  // TURCO
  {
    code: 'tr-TR',
    name: 'Türkçe (Türkiye)',
    patterns: [/[çğıöşü]/i, /\b(bir|ve|bu|için|ne|o|mi|en|de|da|ile|daha|çok)\b/i],
    commonWords: ['bir', 've', 'bu', 'için', 'ne', 'o', 'mi', 'en', 'de', 'türkiye', 'türk'],
    charSets: ['çğıöşü']
  },

  // HOLANDÊS
  {
    code: 'nl-NL',
    name: 'Nederlands (Nederland)',
    patterns: [/\b(de|het|een|van|en|in|op|dat|die|te|voor|is|met|zijn|aan|er|hij)\b/i],
    commonWords: ['de', 'het', 'een', 'van', 'en', 'in', 'op', 'dat', 'die', 'nederland'],
    charSets: []
  },

  // POLONÊS
  {
    code: 'pl-PL',
    name: 'Polski (Polska)',
    patterns: [/[ąćęłńóśźż]/i, /\b(w|i|na|z|do|o|się|jest|to|nie|że|za|być|po|a|czy)\b/i],
    commonWords: ['w', 'i', 'na', 'z', 'do', 'o', 'się', 'jest', 'to', 'polska', 'polski'],
    charSets: ['ąćęłńóśźż']
  },

  // SUECO
  {
    code: 'sv-SE',
    name: 'Svenska (Sverige)',
    patterns: [/[åäö]/i, /\b(och|i|att|det|som|en|är|på|för|av|med|till|den|har|de|om)\b/i],
    commonWords: ['och', 'i', 'att', 'det', 'som', 'en', 'är', 'på', 'för', 'sverige', 'svensk'],
    charSets: ['åäö']
  },

  // GREGO
  {
    code: 'el-GR',
    name: 'Ελληνικά (Ελλάδα)',
    patterns: [/[α-ωά-ώ]/i],
    commonWords: ['και', 'να', 'το', 'της', 'στο', 'με', 'για', 'από', 'που', 'ελλάδα'],
    charSets: ['α-ωά-ώ']
  },

  // TAILANDÊS
  {
    code: 'th-TH',
    name: 'ไทย (ประเทศไทย)',
    patterns: [/[\u0e00-\u0e7f]/],
    commonWords: ['ที่', 'และ', 'ใน', 'ของ', 'มี', 'จะ', 'ไป', 'นี้', 'ไทย'],
    charSets: ['\u0e00-\u0e7f']
  },

  // VIETNAMITA
  {
    code: 'vi-VN',
    name: 'Tiếng Việt (Việt Nam)',
    patterns: [/[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i],
    commonWords: ['và', 'của', 'có', 'trong', 'cho', 'là', 'được', 'đã', 'việt nam', 'việt'],
    charSets: ['àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ']
  },

  // INDONÉSIO
  {
    code: 'id-ID',
    name: 'Bahasa Indonesia (Indonesia)',
    patterns: [/\b(yang|dan|di|untuk|dari|dengan|pada|adalah|ini|ke|tidak|dalam|akan)\b/i],
    commonWords: ['yang', 'dan', 'di', 'untuk', 'dari', 'dengan', 'pada', 'adalah', 'indonesia'],
    charSets: []
  },

  // HEBRAICO
  {
    code: 'he-IL',
    name: 'עברית (ישראל)',
    patterns: [/[\u0590-\u05ff]/],
    commonWords: ['של', 'את', 'על', 'זה', 'לא', 'מה', 'אני', 'הוא', 'ישראל'],
    charSets: ['\u0590-\u05ff']
  }
];

export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  scores: { [languageCode: string]: number };
  reasoning: string[];
}

export function detectLanguageFromTitle(title: string): LanguageDetectionResult {
  if (!title || title.trim().length === 0) {
    return {
      detectedLanguage: 'pt-BR',
      confidence: 0,
      scores: {},
      reasoning: ['Título vazio, usando idioma padrão pt-BR']
    };
  }

  const cleanTitle = title.toLowerCase().trim();
  const scores: { [languageCode: string]: number } = {};
  const reasoning: string[] = [];

  // Calcular pontuação para cada idioma
  languagePatterns.forEach(lang => {
    let score = 0;
    const langReasons: string[] = [];

    // 1. Verificar padrões regex específicos
    lang.patterns.forEach((pattern, index) => {
      const matches = cleanTitle.match(pattern);
      if (matches) {
        const patternScore = matches.length * 10;
        score += patternScore;
        langReasons.push(`Padrão ${index + 1}: ${matches.length} matches (+${patternScore})`);
      }
    });

    // 2. Verificar palavras comuns
    const words = cleanTitle.split(/\s+/);
    let commonWordMatches = 0;
    words.forEach(word => {
      if (lang.commonWords.includes(word)) {
        commonWordMatches++;
        score += 5;
      }
    });
    if (commonWordMatches > 0) {
      langReasons.push(`Palavras comuns: ${commonWordMatches} matches (+${commonWordMatches * 5})`);
    }

    // 3. Verificar conjuntos de caracteres
    lang.charSets.forEach((charSet, index) => {
      const regex = new RegExp(`[${charSet}]`, 'gi');
      const matches = cleanTitle.match(regex);
      if (matches) {
        const charScore = matches.length * 2;
        score += charScore;
        langReasons.push(`Caracteres ${index + 1}: ${matches.length} matches (+${charScore})`);
      }
    });

    // 4. Penalizar por caracteres não típicos do idioma
    if (lang.code === 'en-US') {
      // Para inglês, penalizar acentos
      const accentMatches = cleanTitle.match(/[àáâãäçèéêëìíîïñòóôõöùúûüý]/gi);
      if (accentMatches) {
        const penalty = accentMatches.length * 5;
        score -= penalty;
        langReasons.push(`Penalidade acentos: -${penalty}`);
      }
    }

    scores[lang.code] = Math.max(0, score);
    
    if (langReasons.length > 0) {
      reasoning.push(`${lang.name} (${lang.code}): ${langReasons.join(', ')} = ${scores[lang.code]}`);
    }
  });

  // Determinar idioma com maior pontuação
  const sortedLanguages = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  const detectedLanguage = sortedLanguages.length > 0 ? sortedLanguages[0][0] : 'pt-BR';
  const maxScore = sortedLanguages.length > 0 ? sortedLanguages[0][1] : 0;
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  
  // Calcular confiança (0-100)
  const confidence = totalScore > 0 ? Math.min(100, (maxScore / totalScore) * 100) : 0;

  // Adicionar raciocínio final
  reasoning.push(`Resultado: ${detectedLanguage} com ${confidence.toFixed(1)}% de confiança`);

  return {
    detectedLanguage,
    confidence,
    scores,
    reasoning
  };
}

export function getLanguageFromTitleOrDefault(title: string, defaultLanguage: string = 'pt-BR'): string {
  const detection = detectLanguageFromTitle(title);
  
  // Se a confiança for muito baixa, usar o idioma padrão
  if (detection.confidence < 30) {
    console.log(`🔍 Detecção de idioma com baixa confiança (${detection.confidence.toFixed(1)}%), usando padrão: ${defaultLanguage}`);
    return defaultLanguage;
  }

  console.log(`🔍 Idioma detectado: ${detection.detectedLanguage} (${detection.confidence.toFixed(1)}% confiança)`);
  console.log(`📊 Pontuações:`, detection.scores);
  
  return detection.detectedLanguage;
}

// Função para validar se um idioma é suportado
export function isSupportedLanguage(languageCode: string): boolean {
  return languagePatterns.some(lang => lang.code === languageCode);
}

// Função para obter lista de idiomas suportados
export function getSupportedLanguages(): { code: string; name: string }[] {
  return languagePatterns.map(lang => ({
    code: lang.code,
    name: lang.name
  }));
}

// ============================================================================
// LANGUAGE-SPECIFIC CONFIGURATION FOR SCRIPT GENERATION
// ============================================================================

/**
 * Words Per Minute (WPM) for narration by language
 * These values are based on average speaking rates for native speakers
 */
const LANGUAGE_WPM: Record<string, number> = {
  // Portuguese - baseline
  'pt-BR': 150,
  'pt-PT': 150,

  // English - similar to Portuguese
  'en-US': 150,
  'en-GB': 145,
  'en-AU': 150,

  // Spanish - faster speaking rate
  'es-ES': 180,
  'es-MX': 175,
  'es-AR': 175,

  // French - moderate pace
  'fr-FR': 160,

  // German - slower due to compound words
  'de-DE': 130,

  // Italian - faster
  'it-IT': 170,

  // Russian - moderate
  'ru-RU': 140,

  // Asian languages - character-based, use different calculation
  'zh-CN': 160, // Characters per minute (approx 2.5 chars = 1 word equivalent)
  'zh-TW': 160,
  'ja-JP': 350, // Characters per minute (mixed hiragana/kanji)
  'ko-KR': 280, // Syllables per minute

  // Arabic - moderate
  'ar-SA': 140,

  // Hindi - moderate
  'hi-IN': 145,

  // Turkish - fast
  'tr-TR': 165,

  // Others - default to 150
  'nl-NL': 150,
  'pl-PL': 145,
  'sv-SE': 150,
  'da-DK': 150,
  'no-NO': 150,
  'fi-FI': 140,
  'el-GR': 150,
  'th-TH': 350, // Character-based
  'vi-VN': 160,
  'id-ID': 155,
  'he-IL': 145
};

/**
 * Languages that use character-based counting instead of word-based
 */
const CHARACTER_BASED_LANGUAGES = ['zh-CN', 'zh-TW', 'ja-JP', 'th-TH'];

/**
 * Approximate characters per "word equivalent" for character-based languages
 */
const CHARS_PER_WORD_EQUIVALENT: Record<string, number> = {
  'zh-CN': 2.5,
  'zh-TW': 2.5,
  'ja-JP': 3.5,  // Mix of hiragana/katakana/kanji
  'th-TH': 5     // Thai words are typically longer in characters
};

/**
 * Get WPM for a specific language
 */
export function getLanguageWPM(languageCode: string): number {
  return LANGUAGE_WPM[languageCode] || LANGUAGE_WPM[languageCode.split('-')[0] + '-' + languageCode.split('-')[0].toUpperCase()] || 150;
}

/**
 * Check if a language uses character-based counting
 */
export function isCharacterBasedLanguage(languageCode: string): boolean {
  return CHARACTER_BASED_LANGUAGES.includes(languageCode);
}

/**
 * Count words or word-equivalents for a text in a specific language
 */
export function countWordsForLanguage(text: string, languageCode: string): number {
  if (!text || !text.trim()) return 0;

  if (isCharacterBasedLanguage(languageCode)) {
    // For character-based languages, count characters and divide by chars-per-word
    const chars = text.replace(/\s+/g, '').length;
    const charsPerWord = CHARS_PER_WORD_EQUIVALENT[languageCode] || 3;
    return Math.ceil(chars / charsPerWord);
  }

  // For space-separated languages, use normal word counting
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calculate target word/character count for a duration in a specific language
 */
export function calculateTargetLength(durationMinutes: number, languageCode: string): {
  targetWords: number;
  isCharacterBased: boolean;
  targetChars?: number;
} {
  const wpm = getLanguageWPM(languageCode);
  const isCharBased = isCharacterBasedLanguage(languageCode);

  if (isCharBased) {
    // For character-based languages, calculate target characters
    const charsPerWord = CHARS_PER_WORD_EQUIVALENT[languageCode] || 3;
    const targetWords = durationMinutes * wpm;
    const targetChars = Math.ceil(targetWords * charsPerWord);
    return { targetWords, isCharacterBased: true, targetChars };
  }

  return {
    targetWords: durationMinutes * wpm,
    isCharacterBased: false
  };
}

// ============================================================================
// MULTILINGUAL SYSTEM PROMPTS FOR SCRIPT GENERATION
// ============================================================================

interface LanguagePrompts {
  formatRules: string;
  structureIntro: string;
  structureMiddle: string;
  structureEnd: string;
  writeInLanguage: string;
}

const MULTILINGUAL_PROMPTS: Record<string, LanguagePrompts> = {
  'en': {
    formatRules: `=== FORMAT RULES ===
- Deliver ONLY the story text (Narration).
- DO NOT include titles, chapters, asterisks (**), or introductions like "Sure, here it is".
- FORBIDDEN: Loose keywords (e.g., *TENSION*), or pause instructions (e.g., PAUSE FOR...).
- TEXT MUST BE FLUID AND READY FOR VOICE-OVER READING.`,
    structureIntro: `MENTAL STRUCTURE (GUIDE YOURSELF BUT DON'T PRINT TITLES):
Divide the flow into 3 moments, but write as a single continuous text without visible headers:
1. (Mentally) Hook and Immersive Introduction (0-3 min) - Describe the environment and "status quo".
2. (Mentally) Context Development (3-6 min) - Explain the background without rushing.
3. (Mentally) The Inciting Incident (6-10 min) - The moment of change, narrated in slow motion.`,
    structureMiddle: `MENTAL STRUCTURE (GUIDE YOURSELF BUT DON'T PRINT TITLES):
Divide the flow into 3 moments, but write as a single continuous text:
1. (Mentally) New Obstacles - The situation worsens. Detail the difficulties.
2. (Mentally) Emotional Deepening - What do the characters feel? Use internal monologues.
3. (Mentally) The Turning Point - New information or event changes everything.`,
    structureEnd: `MENTAL STRUCTURE (GUIDE YOURSELF BUT DON'T PRINT TITLES):
Divide the flow into 3 moments, but write as a single continuous text:
1. (Mentally) The Great Climax (Initial Part) - Tension rises to maximum.
2. (Mentally) The Peak and Fall - The point of no return.
3. (Mentally) Resolution and Reflection (End) - Consequences and lasting final message.`,
    writeInLanguage: 'YOU MUST WRITE 100% IN ENGLISH. EVERY SINGLE WORD MUST BE IN ENGLISH.'
  },
  'es': {
    formatRules: `=== REGLAS DE FORMATO ===
- Entrega SOLO el texto de la historia (Narración).
- NO incluyas títulos, capítulos, asteriscos (**), ni introducciones como "Claro, aquí está".
- PROHIBIDO: Palabras clave sueltas (ej: *TENSIÓN*), o instrucciones de pausa (ej: PAUSA PARA...).
- EL TEXTO DEBE SER FLUIDO Y LISTO PARA LECTURA EN VOZ ALTA.`,
    structureIntro: `ESTRUCTURA MENTAL (GUÍATE PERO NO IMPRIMAS TÍTULOS):
Divide el flujo en 3 momentos, pero escribe como un texto único y continuo sin encabezados visibles:
1. (Mentalmente) Gancho e Introducción Inmersiva (0-3 min) - Describe el ambiente y el "status quo".
2. (Mentalmente) Desarrollo del Contexto (3-6 min) - Explica los antecedentes sin prisa.
3. (Mentalmente) El Incidente Incitante (6-10 min) - El momento del cambio, narrado en cámara lenta.`,
    structureMiddle: `ESTRUCTURA MENTAL (GUÍATE PERO NO IMPRIMAS TÍTULOS):
Divide el flujo en 3 momentos, pero escribe como un texto único y continuo:
1. (Mentalmente) Nuevos Obstáculos - La situación empeora. Detalla las dificultades.
2. (Mentalmente) Profundización Emocional - ¿Qué sienten los personajes? Usa monólogos internos.
3. (Mentalmente) El Giro - Nueva información o evento cambia todo.`,
    structureEnd: `ESTRUCTURA MENTAL (GUÍATE PERO NO IMPRIMAS TÍTULOS):
Divide el flujo en 3 momentos, pero escribe como un texto único y continuo:
1. (Mentalmente) El Gran Clímax (Parte Inicial) - La tensión sube al máximo.
2. (Mentalmente) El Ápice y la Caída - El punto de no retorno.
3. (Mentalmente) Resolución y Reflexión (Fin) - Las consecuencias y el mensaje final duradero.`,
    writeInLanguage: 'DEBES ESCRIBIR 100% EN ESPAÑOL. CADA PALABRA DEBE SER EN ESPAÑOL.'
  },
  'fr': {
    formatRules: `=== RÈGLES DE FORMAT ===
- Livrez UNIQUEMENT le texte de l'histoire (Narration).
- N'incluez PAS de titres, chapitres, astérisques (**), ni d'introductions comme "Bien sûr, voici".
- INTERDIT: Mots-clés isolés (ex: *TENSION*), ou instructions de pause (ex: PAUSE POUR...).
- LE TEXTE DOIT ÊTRE FLUIDE ET PRÊT POUR LA LECTURE À VOIX HAUTE.`,
    structureIntro: `STRUCTURE MENTALE (GUIDEZ-VOUS MAIS N'IMPRIMEZ PAS LES TITRES):
Divisez le flux en 3 moments, mais écrivez comme un texte unique et continu sans en-têtes visibles:
1. (Mentalement) Accroche et Introduction Immersive (0-3 min) - Décrivez l'environnement et le "status quo".
2. (Mentalement) Développement du Contexte (3-6 min) - Expliquez les antécédents sans précipitation.
3. (Mentalement) L'Incident Déclencheur (6-10 min) - Le moment du changement, narré au ralenti.`,
    structureMiddle: `STRUCTURE MENTALE (GUIDEZ-VOUS MAIS N'IMPRIMEZ PAS LES TITRES):
Divisez le flux en 3 moments, mais écrivez comme un texte unique et continu:
1. (Mentalement) Nouveaux Obstacles - La situation empire. Détaillez les difficultés.
2. (Mentalement) Approfondissement Émotionnel - Que ressentent les personnages? Utilisez des monologues internes.
3. (Mentalement) Le Tournant - Une nouvelle information ou événement change tout.`,
    structureEnd: `STRUCTURE MENTALE (GUIDEZ-VOUS MAIS N'IMPRIMEZ PAS LES TITRES):
Divisez le flux en 3 moments, mais écrivez comme un texte unique et continu:
1. (Mentalement) Le Grand Climax (Partie Initiale) - La tension monte au maximum.
2. (Mentalement) L'Apogée et la Chute - Le point de non-retour.
3. (Mentalement) Résolution et Réflexion (Fin) - Les conséquences et le message final durable.`,
    writeInLanguage: 'VOUS DEVEZ ÉCRIRE 100% EN FRANÇAIS. CHAQUE MOT DOIT ÊTRE EN FRANÇAIS.'
  },
  'de': {
    formatRules: `=== FORMATREGELN ===
- Liefern Sie NUR den Geschichtstext (Erzählung).
- KEINE Titel, Kapitel, Sternchen (**) oder Einleitungen wie "Klar, hier ist es".
- VERBOTEN: Lose Schlüsselwörter (z.B. *SPANNUNG*) oder Pausenanweisungen (z.B. PAUSE FÜR...).
- DER TEXT MUSS FLIESSEND UND BEREIT ZUM VORLESEN SEIN.`,
    structureIntro: `MENTALE STRUKTUR (ORIENTIEREN SIE SICH DARAN, DRUCKEN SIE ABER KEINE TITEL):
Teilen Sie den Fluss in 3 Momente, aber schreiben Sie als einen einzigen durchgehenden Text ohne sichtbare Überschriften:
1. (Mental) Aufhänger und Immersive Einführung (0-3 min) - Beschreiben Sie die Umgebung und den "Status quo".
2. (Mental) Kontextentwicklung (3-6 min) - Erklären Sie die Vorgeschichte ohne Eile.
3. (Mental) Der auslösende Vorfall (6-10 min) - Der Moment der Veränderung, in Zeitlupe erzählt.`,
    structureMiddle: `MENTALE STRUKTUR (ORIENTIEREN SIE SICH DARAN, DRUCKEN SIE ABER KEINE TITEL):
Teilen Sie den Fluss in 3 Momente, aber schreiben Sie als einen einzigen durchgehenden Text:
1. (Mental) Neue Hindernisse - Die Situation verschlechtert sich. Beschreiben Sie die Schwierigkeiten.
2. (Mental) Emotionale Vertiefung - Was fühlen die Charaktere? Verwenden Sie innere Monologe.
3. (Mental) Der Wendepunkt - Neue Information oder Ereignis ändert alles.`,
    structureEnd: `MENTALE STRUKTUR (ORIENTIEREN SIE SICH DARAN, DRUCKEN SIE ABER KEINE TITEL):
Teilen Sie den Fluss in 3 Momente, aber schreiben Sie als einen einzigen durchgehenden Text:
1. (Mental) Der große Höhepunkt (Anfangsteil) - Die Spannung steigt aufs Maximum.
2. (Mental) Der Gipfel und Fall - Der Punkt ohne Wiederkehr.
3. (Mental) Auflösung und Reflexion (Ende) - Die Konsequenzen und die bleibende Abschlussbotschaft.`,
    writeInLanguage: 'SIE MÜSSEN 100% AUF DEUTSCH SCHREIBEN. JEDES WORT MUSS AUF DEUTSCH SEIN.'
  },
  'it': {
    formatRules: `=== REGOLE DI FORMATO ===
- Consegna SOLO il testo della storia (Narrazione).
- NON includere titoli, capitoli, asterischi (**), o introduzioni come "Certo, eccolo".
- VIETATO: Parole chiave isolate (es: *TENSIONE*), o istruzioni di pausa (es: PAUSA PER...).
- IL TESTO DEVE ESSERE FLUIDO E PRONTO PER LA LETTURA AD ALTA VOCE.`,
    structureIntro: `STRUTTURA MENTALE (GUIDATI MA NON STAMPARE I TITOLI):
Dividi il flusso in 3 momenti, ma scrivi come un testo unico e continuo senza intestazioni visibili:
1. (Mentalmente) Gancio e Introduzione Immersiva (0-3 min) - Descrivi l'ambiente e lo "status quo".
2. (Mentalmente) Sviluppo del Contesto (3-6 min) - Spiega gli antecedenti senza fretta.
3. (Mentalmente) L'Incidente Scatenante (6-10 min) - Il momento del cambiamento, narrato al rallentatore.`,
    structureMiddle: `STRUTTURA MENTALE (GUIDATI MA NON STAMPARE I TITOLI):
Dividi il flusso in 3 momenti, ma scrivi come un testo unico e continuo:
1. (Mentalmente) Nuovi Ostacoli - La situazione peggiora. Dettaglia le difficoltà.
2. (Mentalmente) Approfondimento Emotivo - Cosa sentono i personaggi? Usa monologhi interni.
3. (Mentalmente) La Svolta - Nuova informazione o evento cambia tutto.`,
    structureEnd: `STRUTTURA MENTALE (GUIDATI MA NON STAMPARE I TITOLI):
Dividi il flusso in 3 momenti, ma scrivi come un testo unico e continuo:
1. (Mentalmente) Il Grande Climax (Parte Iniziale) - La tensione sale al massimo.
2. (Mentalmente) L'Apice e la Caduta - Il punto di non ritorno.
3. (Mentalmente) Risoluzione e Riflessione (Fine) - Le conseguenze e il messaggio finale duraturo.`,
    writeInLanguage: 'DEVI SCRIVERE 100% IN ITALIANO. OGNI PAROLA DEVE ESSERE IN ITALIANO.'
  },
  'pt': {
    formatRules: `=== REGRAS DE FORMATAÇÃO ===
- Entregue APENAS o texto da história (Narração).
- NÃO coloque títulos, capítulos, asteriscos (**), nem introduções do tipo 'Claro, aqui vai'.
- PROIBIDO: Palavras-chave soltas (ex: *TENSÃO*), ou instruções de pausa (ex: PAUSA PARA...).
- O TEXTO DEVE SER FLUÍDO E PRONTO PARA LEITURA EM VOZ ALTA.`,
    structureIntro: `ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido, sem headers visíveis:
1. (Mentalmente) Gancho e Introdução Imersiva (0-3 min) - Descreva o ambiente e o "status quo".
2. (Mentalmente) Desenvolvimento do Contexto (3-6 min) - Explique os antecedentes sem pressa.
3. (Mentalmente) O Incidente Incitante (6-10 min) - O momento da mudança, narrado em câmera lenta.`,
    structureMiddle: `ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido:
1. (Mentalmente) Novos Obstáculos - A situação piora. Detalhe as dificuldades.
2. (Mentalmente) Aprofundamento Emocional - O que os personagens sentem? Use monólogos internos.
3. (Mentalmente) A Virada - Uma nova informação ou evento muda tudo.`,
    structureEnd: `ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido:
1. (Mentalmente) O Grande Clímax (Parte Inicial) - A tensão sobe ao máximo.
2. (Mentalmente) O Ápice e a Queda - O ponto de não retorno.
3. (Mentalmente) Resolução e Reflexão (Fim) - As consequências e a mensagem final duradoura.`,
    writeInLanguage: 'VOCÊ DEVE ESCREVER 100% EM PORTUGUÊS. CADA PALAVRA DEVE SER EM PORTUGUÊS.'
  }
};

/**
 * Get the base language code (e.g., 'en' from 'en-US')
 */
function getBaseLanguageCode(languageCode: string): string {
  return languageCode.split('-')[0].toLowerCase();
}

/**
 * Get language-specific prompts for script generation
 */
export function getLanguagePrompts(languageCode: string): LanguagePrompts {
  const baseCode = getBaseLanguageCode(languageCode);
  return MULTILINGUAL_PROMPTS[baseCode] || MULTILINGUAL_PROMPTS['en'];
}

/**
 * Get structure instruction based on language and part number
 */
export function getStructureInstruction(languageCode: string, partNumber: number, totalParts: number): string {
  const prompts = getLanguagePrompts(languageCode);

  if (partNumber === 1) {
    return prompts.structureIntro;
  } else if (partNumber === totalParts) {
    return prompts.structureEnd;
  } else {
    return prompts.structureMiddle;
  }
}

/**
 * Get format rules in the target language
 */
export function getFormatRules(languageCode: string): string {
  const prompts = getLanguagePrompts(languageCode);
  return prompts.formatRules;
}

/**
 * Get "write in language" instruction
 */
export function getWriteInLanguageInstruction(languageCode: string): string {
  const prompts = getLanguagePrompts(languageCode);
  return prompts.writeInLanguage;
}
