export const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
export const GEMINI_TTS_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiVoice {
  id: string;
  name: string;
  description: string;
  category: "male" | "female" | "neutral";
  languages: string[];
}

export const GEMINI_VOICES: GeminiVoice[] = [
  { id: "Zephyr", name: "Zephyr", description: "Brilhante", category: "neutral", languages: ["en-US"] },
  { id: "Puck", name: "Puck", description: "Animada", category: "male", languages: ["en-US"] },
  { id: "Charon", name: "Charon", description: "Informativa", category: "male", languages: ["en-US"] },
  { id: "Kore", name: "Kore", description: "Firme", category: "female", languages: ["pt-BR", "en-US"] },
  { id: "Fenrir", name: "Fenrir", description: "Excitável", category: "male", languages: ["en-US"] },
  { id: "Leda", name: "Leda", description: "Jovem", category: "female", languages: ["en-US"] },
  { id: "Orus", name: "Orus", description: "Firme", category: "male", languages: ["pt-BR"] },
  { id: "Aoede", name: "Aoede", description: "Ventilada", category: "female", languages: ["en-US"] },
  { id: "Callirrhoe", name: "Callirrhoe", description: "Descontraída", category: "female", languages: ["en-US"] },
  { id: "Autonoe", name: "Autonoe", description: "Brilhante", category: "female", languages: ["en-US"] },
  { id: "Enceladus", name: "Enceladus", description: "Sussurrada", category: "male", languages: ["en-US"] },
  { id: "Iapetus", name: "Iapetus", description: "Clara", category: "male", languages: ["en-US"] },
  { id: "Umbriel", name: "Umbriel", description: "Descontraída", category: "male", languages: ["en-US"] },
  { id: "Algieba", name: "Algieba", description: "Suave", category: "male", languages: ["es-US"] },
  { id: "Despina", name: "Despina", description: "Suave", category: "female", languages: ["es-US"] },
  { id: "Erinome", name: "Erinome", description: "Clara", category: "female", languages: ["fr-FR"] },
  { id: "Algenib", name: "Algenib", description: "Grave", category: "male", languages: ["fr-FR"] },
  { id: "Rasalgethi", name: "Rasalgethi", description: "Informativa", category: "male", languages: ["de-DE"] },
  { id: "Laomedeia", name: "Laomedeia", description: "Animada", category: "female", languages: ["de-DE"] },
];

const GEMINI_API_KEY_STORAGE = "gemini_tts_api_key";

export function getGeminiApiKey(): string | null {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE);
}

export function setGeminiApiKey(key: string): void {
  localStorage.setItem(GEMINI_API_KEY_STORAGE, key);
}

export function removeGeminiApiKey(): void {
  localStorage.removeItem(GEMINI_API_KEY_STORAGE);
}

export function buildGeminiApiUrl(apiKey: string): string {
  return `${GEMINI_TTS_API_BASE}/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`;
}

/**
 * Mapeia cada voz para seu languageCode primário.
 * Necessário para garantir consistência de tom e pronúncia.
 */
const VOICE_LANGUAGE_MAP: Record<string, string> = {
  // Português
  "Kore": "pt-BR",
  "Orus": "pt-BR",

  // Inglês
  "Puck": "en-US",
  "Charon": "en-US",
  "Fenrir": "en-US",
  "Leda": "en-US",
  "Aoede": "en-US",
  "Callirrhoe": "en-US",
  "Autonoe": "en-US",
  "Enceladus": "en-US",
  "Iapetus": "en-US",
  "Umbriel": "en-US",
  "Zephyr": "en-US",

  // Espanhol
  "Algieba": "es-US",
  "Despina": "es-US",

  // Francês
  "Erinome": "fr-FR",
  "Algenib": "fr-FR",

  // Alemão
  "Rasalgethi": "de-DE",
  "Laomedeia": "de-DE",
};

/**
 * Retorna o languageCode para uma voz específica.
 * Garante que a API Gemini use o idioma correto para cada voz.
 */
export function getLanguageCodeFromVoice(voiceName: string): string {
  return VOICE_LANGUAGE_MAP[voiceName] || "en-US";
}
