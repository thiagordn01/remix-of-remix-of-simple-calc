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
  },
  // POLISH
  'pl': {
    formatRules: `=== ZASADY FORMATOWANIA ===
- Dostarcz TYLKO tekst historii (Narrację).
- NIE dodawaj tytułów, rozdziałów, gwiazdek (**), ani wstępów typu "Oczywiście, oto".
- ZABRONIONE: Luźne słowa kluczowe (np: *NAPIĘCIE*), lub instrukcje pauzy (np: PAUZA NA...).
- TEKST MUSI BYĆ PŁYNNY I GOTOWY DO CZYTANIA NA GŁOS.`,
    structureIntro: `STRUKTURA MENTALNA (KIERUJ SIĘ TYM, ALE NIE DRUKUJ TYTUŁÓW):
Podziel przepływ na 3 momenty, ale pisz jako jeden ciągły tekst bez widocznych nagłówków:
1. (Mentalnie) Hak i Immersyjne Wprowadzenie (0-3 min) - Opisz środowisko i "status quo".
2. (Mentalnie) Rozwój Kontekstu (3-6 min) - Wyjaśnij tło bez pośpiechu.
3. (Mentalnie) Incydent Wywołujący (6-10 min) - Moment zmiany, opowiedziany w zwolnionym tempie.`,
    structureMiddle: `STRUKTURA MENTALNA (KIERUJ SIĘ TYM, ALE NIE DRUKUJ TYTUŁÓW):
Podziel przepływ na 3 momenty, ale pisz jako jeden ciągły tekst:
1. (Mentalnie) Nowe Przeszkody - Sytuacja się pogarsza. Opisz trudności szczegółowo.
2. (Mentalnie) Pogłębienie Emocjonalne - Co czują postacie? Użyj monologów wewnętrznych.
3. (Mentalnie) Punkt Zwrotny - Nowa informacja lub wydarzenie zmienia wszystko.`,
    structureEnd: `STRUKTURA MENTALNA (KIERUJ SIĘ TYM, ALE NIE DRUKUJ TYTUŁÓW):
Podziel przepływ na 3 momenty, ale pisz jako jeden ciągły tekst:
1. (Mentalnie) Wielki Klimaks (Część Początkowa) - Napięcie rośnie do maksimum.
2. (Mentalnie) Szczyt i Upadek - Punkt bez powrotu.
3. (Mentalnie) Rozwiązanie i Refleksja (Koniec) - Konsekwencje i trwałe przesłanie końcowe.`,
    writeInLanguage: 'MUSISZ PISAĆ 100% PO POLSKU. KAŻDE SŁOWO MUSI BYĆ PO POLSKU.'
  },
  // RUSSIAN
  'ru': {
    formatRules: `=== ПРАВИЛА ФОРМАТИРОВАНИЯ ===
- Предоставьте ТОЛЬКО текст истории (Повествование).
- НЕ добавляйте заголовки, главы, звездочки (**) или вступления типа "Конечно, вот".
- ЗАПРЕЩЕНО: Отдельные ключевые слова (напр: *НАПРЯЖЕНИЕ*), или инструкции паузы (напр: ПАУЗА ДЛЯ...).
- ТЕКСТ ДОЛЖЕН БЫТЬ ПЛАВНЫМ И ГОТОВЫМ ДЛЯ ОЗВУЧИВАНИЯ.`,
    structureIntro: `МЕНТАЛЬНАЯ СТРУКТУРА (РУКОВОДСТВУЙТЕСЬ ЭТИМ, НО НЕ ПЕЧАТАЙТЕ ЗАГОЛОВКИ):
Разделите поток на 3 момента, но пишите как единый непрерывный текст без видимых заголовков:
1. (Мысленно) Крючок и Погружающее Введение (0-3 мин) - Опишите обстановку и "статус-кво".
2. (Мысленно) Развитие Контекста (3-6 мин) - Объясните предысторию не спеша.
3. (Мысленно) Побуждающий Инцидент (6-10 мин) - Момент перемен, рассказанный в замедленной съемке.`,
    structureMiddle: `МЕНТАЛЬНАЯ СТРУКТУРА (РУКОВОДСТВУЙТЕСЬ ЭТИМ, НО НЕ ПЕЧАТАЙТЕ ЗАГОЛОВКИ):
Разделите поток на 3 момента, но пишите как единый непрерывный текст:
1. (Мысленно) Новые Препятствия - Ситуация ухудшается. Подробно опишите трудности.
2. (Мысленно) Эмоциональное Углубление - Что чувствуют персонажи? Используйте внутренние монологи.
3. (Мысленно) Поворотный Момент - Новая информация или событие меняет всё.`,
    structureEnd: `МЕНТАЛЬНАЯ СТРУКТУРА (РУКОВОДСТВУЙТЕСЬ ЭТИМ, НО НЕ ПЕЧАТАЙТЕ ЗАГОЛОВКИ):
Разделите поток на 3 момента, но пишите как единый непрерывный текст:
1. (Мысленно) Великая Кульминация (Начальная Часть) - Напряжение достигает максимума.
2. (Мысленно) Вершина и Падение - Точка невозврата.
3. (Мысленно) Разрешение и Рефлексия (Конец) - Последствия и запоминающееся финальное послание.`,
    writeInLanguage: 'ВЫ ДОЛЖНЫ ПИСАТЬ 100% НА РУССКОМ ЯЗЫКЕ. КАЖДОЕ СЛОВО ДОЛЖНО БЫТЬ НА РУССКОМ.'
  },
  // DUTCH
  'nl': {
    formatRules: `=== OPMAAKREGELS ===
- Lever ALLEEN de verhaaltekst (Vertelling).
- GEEN titels, hoofdstukken, sterretjes (**), of introducties zoals "Natuurlijk, hier is het".
- VERBODEN: Losse trefwoorden (bijv: *SPANNING*), of pauze-instructies (bijv: PAUZEER VOOR...).
- DE TEKST MOET VLOEIEND ZIJN EN KLAAR VOOR VOORLEZEN.`,
    structureIntro: `MENTALE STRUCTUUR (LEID JEZELF, MAAR PRINT GEEN TITELS):
Verdeel de stroom in 3 momenten, maar schrijf als één doorlopende tekst zonder zichtbare headers:
1. (Mentaal) Haak en Meeslepende Introductie (0-3 min) - Beschrijf de omgeving en de "status quo".
2. (Mentaal) Contextontwikkeling (3-6 min) - Leg de achtergrond uit zonder haast.
3. (Mentaal) Het Aanzettende Incident (6-10 min) - Het moment van verandering, verteld in slow motion.`,
    structureMiddle: `MENTALE STRUCTUUR (LEID JEZELF, MAAR PRINT GEEN TITELS):
Verdeel de stroom in 3 momenten, maar schrijf als één doorlopende tekst:
1. (Mentaal) Nieuwe Obstakels - De situatie verslechtert. Beschrijf de moeilijkheden in detail.
2. (Mentaal) Emotionele Verdieping - Wat voelen de personages? Gebruik innerlijke monologen.
3. (Mentaal) Het Keerpunt - Nieuwe informatie of gebeurtenis verandert alles.`,
    structureEnd: `MENTALE STRUCTUUR (LEID JEZELF, MAAR PRINT GEEN TITELS):
Verdeel de stroom in 3 momenten, maar schrijf als één doorlopende tekst:
1. (Mentaal) De Grote Climax (Begindeel) - De spanning stijgt tot het maximum.
2. (Mentaal) De Piek en Val - Het punt van geen terugkeer.
3. (Mentaal) Oplossing en Reflectie (Einde) - De gevolgen en blijvende eindboodschap.`,
    writeInLanguage: 'JE MOET 100% IN HET NEDERLANDS SCHRIJVEN. ELK WOORD MOET IN HET NEDERLANDS ZIJN.'
  },
  // TURKISH
  'tr': {
    formatRules: `=== FORMAT KURALLARI ===
- SADECE hikaye metnini (Anlatım) teslim edin.
- Başlık, bölüm, yıldız işareti (**) veya "Tabii, işte burada" gibi girişler EKLEMEYİN.
- YASAK: Tek başına anahtar kelimeler (örn: *GERİLİM*), veya duraklama talimatları (örn: DURAKLAT...).
- METİN AKICI VE SESLE OKUMAYA HAZIR OLMALIDIR.`,
    structureIntro: `ZİHİNSEL YAPI (KENDİNİZİ YÖNLENDİRİN AMA BAŞLIKLARI YAZMAYIN):
Akışı 3 ana bölüme ayırın, ancak görünür başlıklar olmadan tek bir sürekli metin olarak yazın:
1. (Zihinsel) Kanca ve Sürükleyici Giriş (0-3 dk) - Ortamı ve "mevcut durumu" tanımlayın.
2. (Zihinsel) Bağlam Geliştirme (3-6 dk) - Arka planı acele etmeden açıklayın.
3. (Zihinsel) Tetikleyici Olay (6-10 dk) - Değişim anı, ağır çekimde anlatılmış.`,
    structureMiddle: `ZİHİNSEL YAPI (KENDİNİZİ YÖNLENDİRİN AMA BAŞLIKLARI YAZMAYIN):
Akışı 3 ana bölüme ayırın, ancak tek bir sürekli metin olarak yazın:
1. (Zihinsel) Yeni Engeller - Durum kötüleşiyor. Zorlukları detaylandırın.
2. (Zihinsel) Duygusal Derinleşme - Karakterler ne hissediyor? İç monologlar kullanın.
3. (Zihinsel) Dönüm Noktası - Yeni bilgi veya olay her şeyi değiştirir.`,
    structureEnd: `ZİHİNSEL YAPI (KENDİNİZİ YÖNLENDİRİN AMA BAŞLIKLARI YAZMAYIN):
Akışı 3 ana bölüme ayırın, ancak tek bir sürekli metin olarak yazın:
1. (Zihinsel) Büyük Doruk (Başlangıç Bölümü) - Gerilim maksimuma çıkar.
2. (Zihinsel) Zirve ve Düşüş - Geri dönüşü olmayan nokta.
3. (Zihinsel) Çözüm ve Yansıma (Son) - Sonuçlar ve kalıcı final mesajı.`,
    writeInLanguage: '100% TÜRKÇE YAZMALISINIZ. HER KELİME TÜRKÇE OLMALIDIR.'
  },
  // SWEDISH
  'sv': {
    formatRules: `=== FORMATREGLER ===
- Leverera ENDAST berättelsetexten (Berättande).
- INGA titlar, kapitel, asterisker (**), eller introduktioner som "Visst, här är det".
- FÖRBJUDET: Lösa nyckelord (t.ex: *SPÄNNING*), eller pausinstruktioner (t.ex: PAUSA FÖR...).
- TEXTEN MÅSTE VARA FLYTANDE OCH REDO FÖR UPPLÄSNING.`,
    structureIntro: `MENTAL STRUKTUR (VÄGLED DIG SJÄLV MEN SKRIV INTE UT TITLAR):
Dela upp flödet i 3 moment, men skriv som en enda sammanhängande text utan synliga rubriker:
1. (Mentalt) Krok och Uppslukande Introduktion (0-3 min) - Beskriv miljön och "status quo".
2. (Mentalt) Kontextutveckling (3-6 min) - Förklara bakgrunden utan brådska.
3. (Mentalt) Den Utlösande Händelsen (6-10 min) - Förändringens ögonblick, berättat i slowmotion.`,
    structureMiddle: `MENTAL STRUKTUR (VÄGLED DIG SJÄLV MEN SKRIV INTE UT TITLAR):
Dela upp flödet i 3 moment, men skriv som en enda sammanhängande text:
1. (Mentalt) Nya Hinder - Situationen förvärras. Beskriv svårigheterna i detalj.
2. (Mentalt) Emotionell Fördjupning - Vad känner karaktärerna? Använd inre monologer.
3. (Mentalt) Vändpunkten - Ny information eller händelse förändrar allt.`,
    structureEnd: `MENTAL STRUKTUR (VÄGLED DIG SJÄLV MEN SKRIV INTE UT TITLAR):
Dela upp flödet i 3 moment, men skriv som en enda sammanhängande text:
1. (Mentalt) Den Stora Klimaxen (Inledande Del) - Spänningen stiger till max.
2. (Mentalt) Toppen och Fallet - Punkten utan återvändo.
3. (Mentalt) Upplösning och Reflektion (Slut) - Konsekvenserna och det bestående slutbudskapet.`,
    writeInLanguage: 'DU MÅSTE SKRIVA 100% PÅ SVENSKA. VARJE ORD MÅSTE VARA PÅ SVENSKA.'
  },
  // GREEK
  'el': {
    formatRules: `=== ΚΑΝΟΝΕΣ ΜΟΡΦΟΠΟΙΗΣΗΣ ===
- Παραδώστε ΜΟΝΟ το κείμενο της ιστορίας (Αφήγηση).
- ΜΗΝ συμπεριλάβετε τίτλους, κεφάλαια, αστερίσκους (**), ή εισαγωγές όπως "Βεβαίως, ορίστε".
- ΑΠΑΓΟΡΕΥΕΤΑΙ: Μεμονωμένες λέξεις-κλειδιά (π.χ.: *ΕΝΤΑΣΗ*), ή οδηγίες παύσης (π.χ.: ΠΑΥΣΗ ΓΙΑ...).
- ΤΟ ΚΕΙΜΕΝΟ ΠΡΕΠΕΙ ΝΑ ΕΙΝΑΙ ΡΕΥΣΤΟ ΚΑΙ ΕΤΟΙΜΟ ΓΙΑ ΑΝΑΓΝΩΣΗ ΦΩΝΑΧΤΑ.`,
    structureIntro: `ΝΟΗΤΙΚΗ ΔΟΜΗ (ΚΑΘΟΔΗΓΗΣΤΕ ΤΟΝ ΕΑΥΤΟ ΣΑΣ ΑΛΛΑ ΜΗΝ ΕΚΤΥΠΩΝΕΤΕ ΤΙΤΛΟΥΣ):
Χωρίστε τη ροή σε 3 στιγμές, αλλά γράψτε ως ένα ενιαίο συνεχές κείμενο χωρίς ορατές επικεφαλίδες:
1. (Νοητικά) Άγκιστρο και Καθηλωτική Εισαγωγή (0-3 λεπτά) - Περιγράψτε το περιβάλλον και το "status quo".
2. (Νοητικά) Ανάπτυξη Πλαισίου (3-6 λεπτά) - Εξηγήστε το υπόβαθρο χωρίς βιασύνη.
3. (Νοητικά) Το Υποκινητικό Περιστατικό (6-10 λεπτά) - Η στιγμή της αλλαγής, αφηγημένη σε αργή κίνηση.`,
    structureMiddle: `ΝΟΗΤΙΚΗ ΔΟΜΗ (ΚΑΘΟΔΗΓΗΣΤΕ ΤΟΝ ΕΑΥΤΟ ΣΑΣ ΑΛΛΑ ΜΗΝ ΕΚΤΥΠΩΝΕΤΕ ΤΙΤΛΟΥΣ):
Χωρίστε τη ροή σε 3 στιγμές, αλλά γράψτε ως ένα ενιαίο συνεχές κείμενο:
1. (Νοητικά) Νέα Εμπόδια - Η κατάσταση χειροτερεύει. Περιγράψτε τις δυσκολίες λεπτομερώς.
2. (Νοητικά) Συναισθηματική Εμβάθυνση - Τι νιώθουν οι χαρακτήρες; Χρησιμοποιήστε εσωτερικούς μονολόγους.
3. (Νοητικά) Το Σημείο Καμπής - Νέα πληροφορία ή γεγονός αλλάζει τα πάντα.`,
    structureEnd: `ΝΟΗΤΙΚΗ ΔΟΜΗ (ΚΑΘΟΔΗΓΗΣΤΕ ΤΟΝ ΕΑΥΤΟ ΣΑΣ ΑΛΛΑ ΜΗΝ ΕΚΤΥΠΩΝΕΤΕ ΤΙΤΛΟΥΣ):
Χωρίστε τη ροή σε 3 στιγμές, αλλά γράψτε ως ένα ενιαίο συνεχές κείμενο:
1. (Νοητικά) Η Μεγάλη Κορύφωση (Αρχικό Μέρος) - Η ένταση ανεβαίνει στο μέγιστο.
2. (Νοητικά) Η Κορυφή και η Πτώση - Το σημείο χωρίς επιστροφή.
3. (Νοητικά) Επίλυση και Αναστοχασμός (Τέλος) - Οι συνέπειες και το διαρκές τελικό μήνυμα.`,
    writeInLanguage: 'ΠΡΕΠΕΙ ΝΑ ΓΡΑΨΕΤΕ 100% ΣΤΑ ΕΛΛΗΝΙΚΑ. ΚΑΘΕ ΛΕΞΗ ΠΡΕΠΕΙ ΝΑ ΕΙΝΑΙ ΣΤΑ ΕΛΛΗΝΙΚΑ.'
  },
  // CHINESE
  'zh': {
    formatRules: `=== 格式规则 ===
- 只提供故事文本（叙述）。
- 不要包含标题、章节、星号（**）或"好的，这是"之类的介绍。
- 禁止：单独的关键词（如：*紧张*），或暂停指示（如：暂停...）。
- 文本必须流畅，可直接用于配音朗读。`,
    structureIntro: `心理结构（以此引导自己，但不要打印标题）：
将流程分为3个时刻，但写成一个连续的文本，没有可见的标题：
1.（心理上）钩子和沉浸式介绍（0-3分钟）- 描述环境和"现状"。
2.（心理上）背景发展（3-6分钟）- 不急不慢地解释背景。
3.（心理上）引发事件（6-10分钟）- 变化的时刻，以慢动作叙述。`,
    structureMiddle: `心理结构（以此引导自己，但不要打印标题）：
将流程分为3个时刻，但写成一个连续的文本：
1.（心理上）新障碍 - 情况恶化。详细描述困难。
2.（心理上）情感深化 - 角色有什么感受？使用内心独白。
3.（心理上）转折点 - 新信息或事件改变一切。`,
    structureEnd: `心理结构（以此引导自己，但不要打印标题）：
将流程分为3个时刻，但写成一个连续的文本：
1.（心理上）大高潮（初始部分）- 紧张达到最高点。
2.（心理上）顶峰与下落 - 无法回头的点。
3.（心理上）解决与反思（结尾）- 后果和持久的最终信息。`,
    writeInLanguage: '你必须100%用中文写作。每个字都必须是中文。'
  },
  // JAPANESE
  'ja': {
    formatRules: `=== フォーマットルール ===
- ストーリーテキスト（ナレーション）のみを提供してください。
- タイトル、章、アスタリスク（**）、「はい、どうぞ」などの導入を含めないでください。
- 禁止：単独のキーワード（例：*緊張*）、または一時停止の指示（例：一時停止...）。
- テキストは流暢で、ナレーション読み上げにすぐに使用できる必要があります。`,
    structureIntro: `メンタル構造（自分をガイドしますが、タイトルは印刷しないでください）：
フローを3つの瞬間に分けますが、見出しなしで1つの連続したテキストとして書いてください：
1.（心の中で）フックと没入型の導入（0-3分）- 環境と「現状」を説明します。
2.（心の中で）コンテキストの展開（3-6分）- 急がずに背景を説明します。
3.（心の中で）きっかけとなる事件（6-10分）- 変化の瞬間、スローモーションで語られます。`,
    structureMiddle: `メンタル構造（自分をガイドしますが、タイトルは印刷しないでください）：
フローを3つの瞬間に分けますが、1つの連続したテキストとして書いてください：
1.（心の中で）新たな障害 - 状況が悪化します。困難を詳しく説明します。
2.（心の中で）感情の深化 - キャラクターは何を感じていますか？内面のモノローグを使用します。
3.（心の中で）転換点 - 新しい情報やイベントがすべてを変えます。`,
    structureEnd: `メンタル構造（自分をガイドしますが、タイトルは印刷しないでください）：
フローを3つの瞬間に分けますが、1つの連続したテキストとして書いてください：
1.（心の中で）大クライマックス（初期部分）- 緊張が最高潮に達します。
2.（心の中で）頂点と下降 - 戻れないポイント。
3.（心の中で）解決と振り返り（終わり）- 結果と永続的な最終メッセージ。`,
    writeInLanguage: '100%日本語で書かなければなりません。すべての言葉は日本語でなければなりません。'
  },
  // KOREAN
  'ko': {
    formatRules: `=== 형식 규칙 ===
- 스토리 텍스트(내레이션)만 제공하세요.
- 제목, 챕터, 별표(**) 또는 "네, 여기 있습니다"와 같은 소개를 포함하지 마세요.
- 금지: 단독 키워드(예: *긴장*), 또는 일시 중지 지시(예: 일시 중지...).
- 텍스트는 유창하고 음성 낭독에 바로 사용할 수 있어야 합니다.`,
    structureIntro: `정신적 구조(자신을 안내하되 제목은 인쇄하지 마세요):
흐름을 3개의 순간으로 나누되, 눈에 보이는 헤더 없이 하나의 연속된 텍스트로 작성하세요:
1. (정신적으로) 후크와 몰입형 소개 (0-3분) - 환경과 "현상 유지"를 설명합니다.
2. (정신적으로) 맥락 개발 (3-6분) - 서두르지 않고 배경을 설명합니다.
3. (정신적으로) 촉발 사건 (6-10분) - 변화의 순간, 슬로우 모션으로 서술됩니다.`,
    structureMiddle: `정신적 구조(자신을 안내하되 제목은 인쇄하지 마세요):
흐름을 3개의 순간으로 나누되, 하나의 연속된 텍스트로 작성하세요:
1. (정신적으로) 새로운 장애물 - 상황이 악화됩니다. 어려움을 자세히 설명합니다.
2. (정신적으로) 감정 심화 - 캐릭터들은 무엇을 느끼나요? 내면의 독백을 사용합니다.
3. (정신적으로) 전환점 - 새로운 정보나 사건이 모든 것을 바꿉니다.`,
    structureEnd: `정신적 구조(자신을 안내하되 제목은 인쇄하지 마세요):
흐름을 3개의 순간으로 나누되, 하나의 연속된 텍스트로 작성하세요:
1. (정신적으로) 대클라이맥스 (초기 부분) - 긴장이 최고조에 달합니다.
2. (정신적으로) 정점과 하강 - 돌이킬 수 없는 지점.
3. (정신적으로) 해결과 성찰 (끝) - 결과와 지속적인 최종 메시지.`,
    writeInLanguage: '100% 한국어로 작성해야 합니다. 모든 단어는 한국어여야 합니다.'
  },
  // ARABIC
  'ar': {
    formatRules: `=== قواعد التنسيق ===
- قدم فقط نص القصة (السرد).
- لا تضمن عناوين، فصول، نجوم (**)، أو مقدمات مثل "بالتأكيد، ها هو".
- ممنوع: كلمات مفتاحية منفردة (مثل: *توتر*)، أو تعليمات التوقف (مثل: توقف لـ...).
- يجب أن يكون النص سلساً وجاهزاً للقراءة الصوتية.`,
    structureIntro: `البنية الذهنية (اهتد بها لكن لا تطبع العناوين):
قسم التدفق إلى 3 لحظات، لكن اكتب كنص واحد متصل بدون عناوين مرئية:
1. (ذهنياً) الخطاف والمقدمة الغامرة (0-3 دقائق) - صف البيئة و"الوضع الراهن".
2. (ذهنياً) تطوير السياق (3-6 دقائق) - اشرح الخلفية بدون تسرع.
3. (ذهنياً) الحادثة المحرضة (6-10 دقائق) - لحظة التغيير، مروية بالتصوير البطيء.`,
    structureMiddle: `البنية الذهنية (اهتد بها لكن لا تطبع العناوين):
قسم التدفق إلى 3 لحظات، لكن اكتب كنص واحد متصل:
1. (ذهنياً) عقبات جديدة - الوضع يسوء. فصّل الصعوبات.
2. (ذهنياً) التعمق العاطفي - ماذا تشعر الشخصيات؟ استخدم المونولوجات الداخلية.
3. (ذهنياً) نقطة التحول - معلومات أو حدث جديد يغير كل شيء.`,
    structureEnd: `البنية الذهنية (اهتد بها لكن لا تطبع العناوين):
قسم التدفق إلى 3 لحظات، لكن اكتب كنص واحد متصل:
1. (ذهنياً) الذروة الكبرى (الجزء الأولي) - التوتر يصل للحد الأقصى.
2. (ذهنياً) القمة والسقوط - نقطة اللاعودة.
3. (ذهنياً) الحل والتأمل (النهاية) - العواقب والرسالة الختامية الدائمة.`,
    writeInLanguage: 'يجب أن تكتب 100% باللغة العربية. كل كلمة يجب أن تكون بالعربية.'
  },
  // HINDI
  'hi': {
    formatRules: `=== प्रारूप नियम ===
- केवल कहानी का पाठ (वर्णन) प्रदान करें।
- शीर्षक, अध्याय, तारक (**), या "ज़रूर, यहाँ है" जैसे परिचय शामिल न करें।
- वर्जित: अकेले कीवर्ड (जैसे: *तनाव*), या विराम निर्देश (जैसे: विराम के लिए...)।
- पाठ धाराप्रवाह होना चाहिए और आवाज़ में पढ़ने के लिए तैयार होना चाहिए।`,
    structureIntro: `मानसिक संरचना (खुद को मार्गदर्शन करें लेकिन शीर्षक न छापें):
प्रवाह को 3 क्षणों में विभाजित करें, लेकिन दृश्यमान शीर्षकों के बिना एक निरंतर पाठ के रूप में लिखें:
1. (मानसिक रूप से) हुक और इमर्सिव परिचय (0-3 मिनट) - वातावरण और "यथास्थिति" का वर्णन करें।
2. (मानसिक रूप से) संदर्भ विकास (3-6 मिनट) - बिना जल्दबाज़ी के पृष्ठभूमि समझाएं।
3. (मानसिक रूप से) उत्तेजक घटना (6-10 मिनट) - परिवर्तन का क्षण, धीमी गति में वर्णित।`,
    structureMiddle: `मानसिक संरचना (खुद को मार्गदर्शन करें लेकिन शीर्षक न छापें):
प्रवाह को 3 क्षणों में विभाजित करें, लेकिन एक निरंतर पाठ के रूप में लिखें:
1. (मानसिक रूप से) नई बाधाएं - स्थिति बिगड़ती है। कठिनाइयों का विस्तार से वर्णन करें।
2. (मानसिक रूप से) भावनात्मक गहराई - पात्र क्या महसूस करते हैं? आंतरिक एकालाप का उपयोग करें।
3. (मानसिक रूप से) मोड़ - नई जानकारी या घटना सब कुछ बदल देती है।`,
    structureEnd: `मानसिक संरचना (खुद को मार्गदर्शन करें लेकिन शीर्षक न छापें):
प्रवाह को 3 क्षणों में विभाजित करें, लेकिन एक निरंतर पाठ के रूप में लिखें:
1. (मानसिक रूप से) महान चरमोत्कर्ष (प्रारंभिक भाग) - तनाव अधिकतम तक बढ़ता है।
2. (मानसिक रूप से) शिखर और पतन - वापसी का कोई रास्ता नहीं।
3. (मानसिक रूप से) समाधान और प्रतिबिंब (अंत) - परिणाम और स्थायी अंतिम संदेश।`,
    writeInLanguage: 'आपको 100% हिंदी में लिखना होगा। हर शब्द हिंदी में होना चाहिए।'
  },
  // VIETNAMESE
  'vi': {
    formatRules: `=== QUY TẮC ĐỊNH DẠNG ===
- Chỉ cung cấp văn bản câu chuyện (Tường thuật).
- KHÔNG bao gồm tiêu đề, chương, dấu hoa thị (**), hoặc phần giới thiệu như "Chắc chắn, đây là".
- CẤM: Từ khóa đơn lẻ (ví dụ: *CĂNG THẲNG*), hoặc hướng dẫn tạm dừng (ví dụ: TẠM DỪNG CHO...).
- VĂN BẢN PHẢI TRÔI CHẢY VÀ SẴN SÀNG ĐỂ ĐỌC THÀNH TIẾNG.`,
    structureIntro: `CẤU TRÚC TINH THẦN (HƯỚNG DẪN BẢN THÂN NHƯNG KHÔNG IN TIÊU ĐỀ):
Chia luồng thành 3 khoảnh khắc, nhưng viết như một văn bản liên tục không có tiêu đề nhìn thấy:
1. (Tinh thần) Móc câu và Giới thiệu nhập vai (0-3 phút) - Mô tả môi trường và "hiện trạng".
2. (Tinh thần) Phát triển bối cảnh (3-6 phút) - Giải thích nền tảng không vội vàng.
3. (Tinh thần) Sự kiện kích hoạt (6-10 phút) - Khoảnh khắc thay đổi, kể bằng chuyển động chậm.`,
    structureMiddle: `CẤU TRÚC TINH THẦN (HƯỚNG DẪN BẢN THÂN NHƯNG KHÔNG IN TIÊU ĐỀ):
Chia luồng thành 3 khoảnh khắc, nhưng viết như một văn bản liên tục:
1. (Tinh thần) Trở ngại mới - Tình hình trở nên tồi tệ hơn. Chi tiết hóa những khó khăn.
2. (Tinh thần) Đào sâu cảm xúc - Các nhân vật cảm thấy gì? Sử dụng độc thoại nội tâm.
3. (Tinh thần) Bước ngoặt - Thông tin hoặc sự kiện mới thay đổi mọi thứ.`,
    structureEnd: `CẤU TRÚC TINH THẦN (HƯỚNG DẪN BẢN THÂN NHƯNG KHÔNG IN TIÊU ĐỀ):
Chia luồng thành 3 khoảnh khắc, nhưng viết như một văn bản liên tục:
1. (Tinh thần) Cao trào lớn (Phần đầu) - Căng thẳng tăng đến tối đa.
2. (Tinh thần) Đỉnh cao và Sụp đổ - Điểm không thể quay lại.
3. (Tinh thần) Giải quyết và Suy ngẫm (Kết thúc) - Hậu quả và thông điệp cuối cùng lâu dài.`,
    writeInLanguage: 'BẠN PHẢI VIẾT 100% BẰNG TIẾNG VIỆT. MỖI TỪ PHẢI LÀ TIẾNG VIỆT.'
  },
  // INDONESIAN
  'id': {
    formatRules: `=== ATURAN FORMAT ===
- Berikan HANYA teks cerita (Narasi).
- JANGAN sertakan judul, bab, tanda bintang (**), atau pendahuluan seperti "Tentu, ini dia".
- DILARANG: Kata kunci yang berdiri sendiri (mis: *KETEGANGAN*), atau instruksi jeda (mis: JEDA UNTUK...).
- TEKS HARUS MENGALIR DAN SIAP UNTUK DIBACAKAN.`,
    structureIntro: `STRUKTUR MENTAL (PANDU DIRI SENDIRI TAPI JANGAN CETAK JUDUL):
Bagi alur menjadi 3 momen, tapi tulis sebagai satu teks berkelanjutan tanpa header yang terlihat:
1. (Secara mental) Pengait dan Pendahuluan yang Imersif (0-3 menit) - Gambarkan lingkungan dan "status quo".
2. (Secara mental) Pengembangan Konteks (3-6 menit) - Jelaskan latar belakang tanpa terburu-buru.
3. (Secara mental) Insiden Pemicu (6-10 menit) - Momen perubahan, diceritakan dalam gerakan lambat.`,
    structureMiddle: `STRUKTUR MENTAL (PANDU DIRI SENDIRI TAPI JANGAN CETAK JUDUL):
Bagi alur menjadi 3 momen, tapi tulis sebagai satu teks berkelanjutan:
1. (Secara mental) Hambatan Baru - Situasi memburuk. Rincikan kesulitan-kesulitannya.
2. (Secara mental) Pendalaman Emosional - Apa yang dirasakan karakter? Gunakan monolog internal.
3. (Secara mental) Titik Balik - Informasi atau peristiwa baru mengubah segalanya.`,
    structureEnd: `STRUKTUR MENTAL (PANDU DIRI SENDIRI TAPI JANGAN CETAK JUDUL):
Bagi alur menjadi 3 momen, tapi tulis sebagai satu teks berkelanjutan:
1. (Secara mental) Klimaks Besar (Bagian Awal) - Ketegangan naik ke maksimum.
2. (Secara mental) Puncak dan Kejatuhan - Titik tanpa jalan kembali.
3. (Secara mental) Resolusi dan Refleksi (Akhir) - Konsekuensi dan pesan akhir yang bertahan lama.`,
    writeInLanguage: 'ANDA HARUS MENULIS 100% DALAM BAHASA INDONESIA. SETIAP KATA HARUS DALAM BAHASA INDONESIA.'
  },
  // THAI
  'th': {
    formatRules: `=== กฎการจัดรูปแบบ ===
- ส่งมอบเฉพาะข้อความเรื่องราว (การบรรยาย)
- อย่าใส่หัวข้อ บท เครื่องหมายดอกจัน (**) หรือคำนำเช่น "แน่นอน นี่คือ"
- ห้าม: คำสำคัญที่อยู่โดดเดี่ยว (เช่น: *ความตึงเครียด*) หรือคำสั่งหยุดชั่วคราว (เช่น: หยุดเพื่อ...)
- ข้อความต้องลื่นไหลและพร้อมสำหรับการอ่านออกเสียง`,
    structureIntro: `โครงสร้างทางจิต (นำทางตัวเองแต่อย่าพิมพ์หัวข้อ):
แบ่งการไหลเป็น 3 ช่วงเวลา แต่เขียนเป็นข้อความต่อเนื่องเดียวโดยไม่มีหัวข้อที่มองเห็นได้:
1. (ทางจิต) ตะขอและการแนะนำที่ดื่มด่ำ (0-3 นาที) - อธิบายสภาพแวดล้อมและ "สถานะเดิม"
2. (ทางจิต) การพัฒนาบริบท (3-6 นาที) - อธิบายภูมิหลังโดยไม่รีบร้อน
3. (ทางจิต) เหตุการณ์กระตุ้น (6-10 นาที) - ช่วงเวลาแห่งการเปลี่ยนแปลง เล่าในภาพสโลว์โมชัน`,
    structureMiddle: `โครงสร้างทางจิต (นำทางตัวเองแต่อย่าพิมพ์หัวข้อ):
แบ่งการไหลเป็น 3 ช่วงเวลา แต่เขียนเป็นข้อความต่อเนื่องเดียว:
1. (ทางจิต) อุปสรรคใหม่ - สถานการณ์แย่ลง รายละเอียดความยากลำบาก
2. (ทางจิต) การลงลึกทางอารมณ์ - ตัวละครรู้สึกอย่างไร? ใช้บทพูดคนเดียวภายใน
3. (ทางจิต) จุดเปลี่ยน - ข้อมูลหรือเหตุการณ์ใหม่เปลี่ยนแปลงทุกอย่าง`,
    structureEnd: `โครงสร้างทางจิต (นำทางตัวเองแต่อย่าพิมพ์หัวข้อ):
แบ่งการไหลเป็น 3 ช่วงเวลา แต่เขียนเป็นข้อความต่อเนื่องเดียว:
1. (ทางจิต) จุดไคลแมกซ์ใหญ่ (ส่วนเริ่มต้น) - ความตึงเครียดสูงสุด
2. (ทางจิต) จุดสูงสุดและการตก - จุดที่ไม่มีทางกลับ
3. (ทางจิต) การคลี่คลายและการไตร่ตรอง (จบ) - ผลที่ตามมาและข้อความสุดท้ายที่ยั่งยืน`,
    writeInLanguage: 'คุณต้องเขียน 100% เป็นภาษาไทย ทุกคำต้องเป็นภาษาไทย'
  },
  // HEBREW
  'he': {
    formatRules: `=== כללי עיצוב ===
- ספק רק את טקסט הסיפור (הקריינות).
- אל תכלול כותרות, פרקים, כוכביות (**), או הקדמות כמו "בטח, הנה זה".
- אסור: מילות מפתח בודדות (למשל: *מתח*), או הוראות השהייה (למשל: השהה ל...).
- הטקסט חייב להיות זורם ומוכן לקריאה בקול.`,
    structureIntro: `מבנה מנטלי (הנחה את עצמך אך אל תדפיס כותרות):
חלק את הזרימה ל-3 רגעים, אך כתוב כטקסט רציף אחד ללא כותרות נראות:
1. (מנטלית) וו והקדמה סוחפת (0-3 דקות) - תאר את הסביבה ואת "המצב הקיים".
2. (מנטלית) פיתוח הקשר (3-6 דקות) - הסבר את הרקע ללא חיפזון.
3. (מנטלית) האירוע המעורר (6-10 דקות) - רגע השינוי, מסופר בהילוך איטי.`,
    structureMiddle: `מבנה מנטלי (הנחה את עצמך אך אל תדפיס כותרות):
חלק את הזרימה ל-3 רגעים, אך כתוב כטקסט רציף אחד:
1. (מנטלית) מכשולים חדשים - המצב מחמיר. פרט את הקשיים.
2. (מנטלית) העמקה רגשית - מה הדמויות מרגישות? השתמש במונולוגים פנימיים.
3. (מנטלית) נקודת המפנה - מידע או אירוע חדש משנה הכל.`,
    structureEnd: `מבנה מנטלי (הנחה את עצמך אך אל תדפיס כותרות):
חלק את הזרימה ל-3 רגעים, אך כתוב כטקסט רציף אחד:
1. (מנטלית) השיא הגדול (חלק התחלתי) - המתח עולה למקסימום.
2. (מנטלית) הפסגה והנפילה - נקודת האל-חזור.
3. (מנטלית) פתרון והרהור (סוף) - ההשלכות והמסר הסופי המתמשך.`,
    writeInLanguage: 'עליך לכתוב 100% בעברית. כל מילה חייבת להיות בעברית.'
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
