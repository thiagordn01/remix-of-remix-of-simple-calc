export interface Language {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  culturalContext: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  // Português
  {
    code: 'pt-BR',
    name: 'Português (Brasil)',
    nativeName: 'Português (Brasil)',
    region: 'Brasil',
    culturalContext: 'Cultura brasileira, gírias locais, referências nacionais',
    flag: '🇧🇷'
  },
  {
    code: 'pt-PT',
    name: 'Português (Portugal)',
    nativeName: 'Português (Portugal)',
    region: 'Portugal',
    culturalContext: 'Cultura portuguesa, expressões lusitanas',
    flag: '🇵🇹'
  },

  // Inglês
  {
    code: 'en-US',
    name: 'English (United States)',
    nativeName: 'English (US)',
    region: 'Estados Unidos',
    culturalContext: 'Cultura americana, referências dos EUA',
    flag: '🇺🇸'
  },
  {
    code: 'en-GB',
    name: 'English (United Kingdom)',
    nativeName: 'English (UK)',
    region: 'Reino Unido',
    culturalContext: 'Cultura britânica, expressões do Reino Unido',
    flag: '🇬🇧'
  },
  {
    code: 'en-AU',
    name: 'English (Australia)',
    nativeName: 'English (Australia)',
    region: 'Austrália',
    culturalContext: 'Cultura australiana, gírias locais',
    flag: '🇦🇺'
  },
  {
    code: 'en-CA',
    name: 'English (Canada)',
    nativeName: 'English (Canada)',
    region: 'Canadá',
    culturalContext: 'Cultura canadense, bilinguismo',
    flag: '🇨🇦'
  },

  // Espanhol
  {
    code: 'es-ES',
    name: 'Español (España)',
    nativeName: 'Español (España)',
    region: 'Espanha',
    culturalContext: 'Cultura espanhola, expressões peninsulares',
    flag: '🇪🇸'
  },
  {
    code: 'es-MX',
    name: 'Español (México)',
    nativeName: 'Español (México)',
    region: 'México',
    culturalContext: 'Cultura mexicana, modismos locais',
    flag: '🇲🇽'
  },
  {
    code: 'es-AR',
    name: 'Español (Argentina)',
    nativeName: 'Español (Argentina)',
    region: 'Argentina',
    culturalContext: 'Cultura argentina, lunfardo, voseo',
    flag: '🇦🇷'
  },
  {
    code: 'es-CO',
    name: 'Español (Colombia)',
    nativeName: 'Español (Colombia)',
    region: 'Colômbia',
    culturalContext: 'Cultura colombiana, expressões locais',
    flag: '🇨🇴'
  },

  // Francês
  {
    code: 'fr-FR',
    name: 'Français (France)',
    nativeName: 'Français (France)',
    region: 'França',
    culturalContext: 'Cultura francesa, refinamento linguístico',
    flag: '🇫🇷'
  },
  {
    code: 'fr-CA',
    name: 'Français (Canada)',
    nativeName: 'Français (Canada)',
    region: 'Canadá',
    culturalContext: 'Cultura quebequense, francês canadense',
    flag: '🇨🇦'
  },

  // Alemão
  {
    code: 'de-DE',
    name: 'Deutsch (Deutschland)',
    nativeName: 'Deutsch (Deutschland)',
    region: 'Alemanha',
    culturalContext: 'Cultura alemã, precisão linguística',
    flag: '🇩🇪'
  },
  {
    code: 'de-AT',
    name: 'Deutsch (Österreich)',
    nativeName: 'Deutsch (Österreich)',
    region: 'Áustria',
    culturalContext: 'Cultura austríaca, dialetos locais',
    flag: '🇦🇹'
  },

  // Italiano
  {
    code: 'it-IT',
    name: 'Italiano (Italia)',
    nativeName: 'Italiano (Italia)',
    region: 'Itália',
    culturalContext: 'Cultura italiana, expressividade mediterrânea',
    flag: '🇮🇹'
  },

  // Russo
  {
    code: 'ru-RU',
    name: 'Русский (Россия)',
    nativeName: 'Русский (Россия)',
    region: 'Rússia',
    culturalContext: 'Cultura russa, literatura clássica',
    flag: '🇷🇺'
  },

  // Chinês
  {
    code: 'zh-CN',
    name: '中文 (简体)',
    nativeName: '中文 (简体)',
    region: 'China',
    culturalContext: 'Cultura chinesa, tradições milenares',
    flag: '🇨🇳'
  },
  {
    code: 'zh-TW',
    name: '中文 (繁體)',
    nativeName: '中文 (繁體)',
    region: 'Taiwan',
    culturalContext: 'Cultura taiwanesa, chinês tradicional',
    flag: '🇹🇼'
  },

  // Japonês
  {
    code: 'ja-JP',
    name: '日本語',
    nativeName: '日本語',
    region: 'Japão',
    culturalContext: 'Cultura japonesa, cortesia linguística',
    flag: '🇯🇵'
  },

  // Coreano
  {
    code: 'ko-KR',
    name: '한국어',
    nativeName: '한국어',
    region: 'Coreia do Sul',
    culturalContext: 'Cultura coreana, hierarquia social',
    flag: '🇰🇷'
  },

  // Árabe
  {
    code: 'ar-SA',
    name: 'العربية (السعودية)',
    nativeName: 'العربية (السعودية)',
    region: 'Arábia Saudita',
    culturalContext: 'Cultura árabe, tradições islâmicas',
    flag: '🇸🇦'
  },
  {
    code: 'ar-EG',
    name: 'العربية (مصر)',
    nativeName: 'العربية (مصر)',
    region: 'Egito',
    culturalContext: 'Cultura egípcia, dialeto cairota',
    flag: '🇪🇬'
  },

  // Hindi
  {
    code: 'hi-IN',
    name: 'हिन्दी',
    nativeName: 'हिन्दी',
    region: 'Índia',
    culturalContext: 'Cultura indiana, diversidade regional',
    flag: '🇮🇳'
  },

  // Holandês
  {
    code: 'nl-NL',
    name: 'Nederlands (Nederland)',
    nativeName: 'Nederlands (Nederland)',
    region: 'Holanda',
    culturalContext: 'Cultura holandesa, pragmatismo',
    flag: '🇳🇱'
  },

  // Sueco
  {
    code: 'sv-SE',
    name: 'Svenska',
    nativeName: 'Svenska',
    region: 'Suécia',
    culturalContext: 'Cultura sueca, valores nórdicos',
    flag: '🇸🇪'
  },

  // Norueguês
  {
    code: 'no-NO',
    name: 'Norsk',
    nativeName: 'Norsk',
    region: 'Noruega',
    culturalContext: 'Cultura norueguesa, tradições nórdicas',
    flag: '🇳🇴'
  },

  // Dinamarquês
  {
    code: 'da-DK',
    name: 'Dansk',
    nativeName: 'Dansk',
    region: 'Dinamarca',
    culturalContext: 'Cultura dinamarquesa, hygge',
    flag: '🇩🇰'
  },

  // Finlandês
  {
    code: 'fi-FI',
    name: 'Suomi',
    nativeName: 'Suomi',
    region: 'Finlândia',
    culturalContext: 'Cultura finlandesa, sisu',
    flag: '🇫🇮'
  },

  // Polaco
  {
    code: 'pl-PL',
    name: 'Polski',
    nativeName: 'Polski',
    region: 'Polônia',
    culturalContext: 'Cultura polonesa, tradições católicas',
    flag: '🇵🇱'
  },

  // Tcheco
  {
    code: 'cs-CZ',
    name: 'Čeština',
    nativeName: 'Čeština',
    region: 'República Tcheca',
    culturalContext: 'Cultura tcheca, história centro-europeia',
    flag: '🇨🇿'
  },

  // Húngaro
  {
    code: 'hu-HU',
    name: 'Magyar',
    nativeName: 'Magyar',
    region: 'Hungria',
    culturalContext: 'Cultura húngara, tradições únicas',
    flag: '🇭🇺'
  },

  // Romeno
  {
    code: 'ro-RO',
    name: 'Română',
    nativeName: 'Română',
    region: 'Romênia',
    culturalContext: 'Cultura romena, herança latina',
    flag: '🇷🇴'
  },

  // Búlgaro
  {
    code: 'bg-BG',
    name: 'Български',
    nativeName: 'Български',
    region: 'Bulgária',
    culturalContext: 'Cultura búlgara, tradições eslavas',
    flag: '🇧🇬'
  },

  // Grego
  {
    code: 'el-GR',
    name: 'Ελληνικά',
    nativeName: 'Ελληνικά',
    region: 'Grécia',
    culturalContext: 'Cultura grega, berço da civilização',
    flag: '🇬🇷'
  },

  // Turco
  {
    code: 'tr-TR',
    name: 'Türkçe',
    nativeName: 'Türkçe',
    region: 'Turquia',
    culturalContext: 'Cultura turca, ponte entre oriente e ocidente',
    flag: '🇹🇷'
  },

  // Hebraico
  {
    code: 'he-IL',
    name: 'עברית',
    nativeName: 'עברית',
    region: 'Israel',
    culturalContext: 'Cultura israelense, tradições judaicas',
    flag: '🇮🇱'
  },

  // Tailandês
  {
    code: 'th-TH',
    name: 'ไทย',
    nativeName: 'ไทย',
    region: 'Tailândia',
    culturalContext: 'Cultura tailandesa, budismo theravada',
    flag: '🇹🇭'
  },

  // Vietnamita
  {
    code: 'vi-VN',
    name: 'Tiếng Việt',
    nativeName: 'Tiếng Việt',
    region: 'Vietnã',
    culturalContext: 'Cultura vietnamita, tradições do sudeste asiático',
    flag: '🇻🇳'
  },

  // Indonésio
  {
    code: 'id-ID',
    name: 'Bahasa Indonesia',
    nativeName: 'Bahasa Indonesia',
    region: 'Indonésia',
    culturalContext: 'Cultura indonésia, diversidade arquipelágica',
    flag: '🇮🇩'
  },

  // Malaio
  {
    code: 'ms-MY',
    name: 'Bahasa Melayu',
    nativeName: 'Bahasa Melayu',
    region: 'Malásia',
    culturalContext: 'Cultura malaia, multiculturalismo',
    flag: '🇲🇾'
  },

  // Filipino
  {
    code: 'fil-PH',
    name: 'Filipino',
    nativeName: 'Filipino',
    region: 'Filipinas',
    culturalContext: 'Cultura filipina, influências asiáticas e ocidentais',
    flag: '🇵🇭'
  },

  // Ucraniano
  {
    code: 'uk-UA',
    name: 'Українська',
    nativeName: 'Українська',
    region: 'Ucrânia',
    culturalContext: 'Cultura ucraniana, tradições eslavas orientais',
    flag: '🇺🇦'
  }
];

export const getLanguageByCode = (code: string): Language | undefined => {
  return LANGUAGES.find(lang => lang.code === code);
};

export const getLanguagesByRegion = (region: string): Language[] => {
  return LANGUAGES.filter(lang => lang.region.toLowerCase().includes(region.toLowerCase()));
};

export const getPopularLanguages = (): Language[] => {
  const popularCodes = ['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'ru-RU', 'zh-CN', 'ja-JP', 'ko-KR'];
  return LANGUAGES.filter(lang => popularCodes.includes(lang.code));
};

export const searchLanguages = (query: string): Language[] => {
  const lowerQuery = query.toLowerCase();
  return LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(lowerQuery) ||
    lang.nativeName.toLowerCase().includes(lowerQuery) ||
    lang.region.toLowerCase().includes(lowerQuery)
  );
};
