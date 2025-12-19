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
