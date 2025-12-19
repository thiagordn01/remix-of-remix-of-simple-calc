# Thorough Audio Generation System Analysis - Novo Syntax

## Executive Summary

This codebase has **3 distinct TTS/audio generation systems**:
1. **OpenAI/openai.fm** - Scraping-based service via worker proxy
2. **ElevenLabs** - Official API with multiple models
3. **Google Gemini** - Official API with native TTS support

There is **NO separate registration/cadastro system** for audio. Instead, the system uses an **Agent system** that associates voice configurations with script generation agents.

---

## 1. CURRENT OPENAI AUDIO IMPLEMENTATION

### 1.1 What is "OpenAI" in this codebase?

**It's NOT the official OpenAI API.** It's a proxy to `openai.fm` - a service that appears to scrape/mirror OpenAI's TTS capabilities.

### 1.2 Files Involved

**Backend (Supabase Edge Function):**
- `/home/user/novo-syntax/supabase/functions/openai-fm-proxy/index.ts` (Lines 1-68)

**Frontend:**
- `/home/user/novo-syntax/src/pages/Index.tsx` (Lines 25-351)
- `/home/user/novo-syntax/src/hooks/useAudioQueue.ts`

**Configuration:**
- `/home/user/novo-syntax/src/utils/config.ts` - ENDPOINTS array (Lines 10-61)

### 1.3 Architecture Overview

```
┌─────────────────────────────────────────────┐
│   React Frontend (Index.tsx)                │
│   - Text input                              │
│   - Voice selection (alloy, ash, ballad...) │
│   - Prompt for voice characteristics        │
└─────────────────┬───────────────────────────┘
                  │
                  │ POST with {text, prompt, voice}
                  ▼
┌─────────────────────────────────────────────────────────────┐
│   Supabase Edge Functions (openai-fm-proxy)                 │
│   - Receives: input, prompt, voice, generation UUID         │
│   - Routes to: noisy-sea-0076.ouroferrero008.workers.dev    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ GET with query params
                 ▼
┌─────────────────────────────────────────────────────────────┐
│   openai.fm Worker (Remote Service)                         │
│   - Generates audio via OpenAI TTS                          │
│   - Returns audio/mpeg stream                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Key Code Snippets

**Backend Proxy (supabase/functions/openai-fm-proxy/index.ts):**

```typescript
// Line 25-35: Extract parameters
const { input, prompt, voice, generation } = await req.json();

// Line 31-35: Build upstream URL to openai.fm worker
const url = new URL("https://noisy-sea-0076.ouroferrero008.workers.dev/");
url.searchParams.set("input", input);
url.searchParams.set("prompt", prompt);
url.searchParams.set("voice", voice);
url.searchParams.set("generation", gen);

// Line 37-49: Forward request with browser-like headers
const upstream = await fetch(url.toString(), {
  method: "GET",
  headers: {
    "sec-ch-ua-platform": '"Windows"',
    "Referer": "https://www.openai.fm/",
    "User-Agent": "Mozilla/5.0...",
  },
});
```

**Frontend Integration (src/pages/Index.tsx):**

```typescript
// Lines 26: Predefined voices
const VOICES = ["alloy","ash","ballad","coral","echo","fable","onyx","nova","sage","shimmer","verse"]

// Line 73-74: Round-robin server selection
const serverIndex = totalJobs % ENDPOINTS.length;
const choice = ENDPOINTS[serverIndex];

// Lines 87-100: Demo playback via endpoint
const res = await fetch(ENDPOINTS[0].url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    input: "Esta é uma demonstração de voz.",
    prompt: promptEffective,
    voice: v,
    generation: crypto.randomUUID(),
  }),
});
```

### 1.5 Voices Supported

From `src/pages/Index.tsx` Line 26:
- alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse (11 voices)

### 1.6 Voice Configuration System

**Where voices are stored:**
- **No centralized voice registry** - voices are hardcoded in the component
- **Voice prompt customization:** User provides a text prompt describing voice characteristics
- **Language support:** Via accent/language suffix injection in `buildPromptWithAccent()` function

### 1.7 API Key Management

- **Supabase ANON Key:** Stored in `/src/utils/config.ts` Line 1
- **No user-specific API keys required** - uses shared Supabase project
- **Rate limiting:** Handled by round-robin server selection (10 endpoints total)

---

## 2. ELEVENLAB AUDIO IMPLEMENTATION

### 2.1 Files Involved

**Components:**
- `/home/user/novo-syntax/src/components/ElevenLabsTab.tsx` (Lines 1-567)

**Configuration:**
- `/home/user/novo-syntax/src/utils/elevenLabsConfig.ts` (Lines 1-534)

**Hooks:**
- `/home/user/novo-syntax/src/hooks/useElevenLabsQueue.ts` (Lines 1-50+)

**Utilities:**
- `/home/user/novo-syntax/src/utils/elevenLabsChunks.ts`

### 2.2 API Key Storage

```typescript
// src/utils/elevenLabsConfig.ts Lines 524-530
export const getElevenLabsApiKey = (): string | null => {
  return localStorage.getItem('elevenlabs_api_key');
};

export const setElevenLabsApiKey = (apiKey: string): void => {
  localStorage.setItem('elevenlabs_api_key', apiKey);
};
```

**Storage Key:** `elevenlabs_api_key` (single key, user must provide)

### 2.3 Models and Voices

**Models Available (elevenLabsConfig.ts Lines 376-517):**

1. **eleven_multilingual_v2** - 29 languages, ~250-300ms latency
2. **eleven_flash_v2_5** - 32 languages, ~75ms latency (50% cheaper)
3. **eleven_turbo_v2_5** - 32 languages, ~250-300ms latency (balanced)

**Voice Count:** 60+ voices including:
- Aria, Charlotte, Laura (multilingual)
- Rachel, Sarah, Jessica, Grace (English female)
- Callum, River, Will, Eric (English male)
- Roger (Portuguese BR male)

### 2.4 Configuration System

```typescript
// ElevenLabsTab.tsx Lines 26-30: Local state
const [modelId, setModelId] = useState(ELEVENLABS_MODELS[0].id);
const [voiceId, setVoiceId] = useState(ELEVENLABS_MODELS[0].compatibleVoices?.[0]...);
const [stability, setStability] = useState([0.75]);
const [similarityBoost, setSimilarityBoost] = useState([0.75]);
const [apiKey, setApiKey] = useState(getElevenLabsApiKey() || "");
```

**Voice Parameters:**
- Stability: 0-1 (how consistent the voice is)
- Similarity Boost: 0-1 (how closely it follows voice characteristics)

### 2.5 API Endpoint

```
Base: https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
Method: POST
Headers: xi-api-key: {apiKey}
```

### 2.6 Audio Generation Flow

```typescript
// ElevenLabsTab.tsx Lines 144-170: Demo playback
const response = await fetch(`${ELEVENLABS_API_URL}/${selectedVoiceId}`, {
  method: 'POST',
  headers: {
    'Accept': 'audio/mpeg',
    'Content-Type': 'application/json',
    'xi-api-key': currentApiKey,
  },
  body: JSON.stringify({
    text: "Demo text",
    model_id: modelId,
    voice_settings: {
      stability: stability[0],
      similarity_boost: similarityBoost[0],
    },
  }),
});
```

---

## 3. GOOGLE GEMINI TTS IMPLEMENTATION

### 3.1 Files Involved

**Components:**
- `/home/user/novo-syntax/src/components/GeminiTtsTab.tsx` (Lines 1-978)
- `/home/user/novo-syntax/src/components/ApiBatchModal.tsx`

**Configuration:**
- `/home/user/novo-syntax/src/utils/geminiTtsConfig.ts` (Lines 1-94)

**Hooks:**
- `/home/user/novo-syntax/src/hooks/useGeminiTtsQueue.ts` (Advanced queue with chunk processing)
- `/home/user/novo-syntax/src/hooks/useGeminiTtsKeys.ts` (Multiple API key management)

**Utilities:**
- `/home/user/novo-syntax/src/utils/geminiTtsChunks.ts` (800-word chunking)
- `/home/user/novo-syntax/src/utils/pcmToWav.ts` (Audio conversion)
- `/home/user/novo-syntax/src/utils/wavToMp3.ts` (MP3 encoding)
- `/home/user/novo-syntax/src/utils/audioUtils.ts` (Audio concatenation)

**Types:**
- `/home/user/novo-syntax/src/types/geminiTts.ts` (Job and API key interfaces)

### 3.2 API Key Management - MULTI-KEY SYSTEM

```typescript
// src/hooks/useGeminiTtsKeys.ts Lines 1-100
const STORAGE_KEY = 'gemini-tts-api-keys';  // DIFFERENT from script generation!

// Returns array of keys with status tracking
export const useGeminiTtsKeys = () => {
  const [apiKeys, setApiKeys] = useState<GeminiTtsApiKey[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Keys have: id, key, label, requestCount, isActive, status, statusMessage
  });
```

**Storage Key:** `gemini-tts-api-keys` (Multiple keys supported, separate from script generation)

**Key Features:**
- Track request count per key
- Monitor status (valid, invalid, no_credits, suspended)
- Support for batch import
- Rotation system: `getNextValidKey()` returns the next available key

### 3.3 Voices Available

```typescript
// src/utils/geminiTtsConfig.ts Lines 12-32
export const GEMINI_VOICES: GeminiVoice[] = [
  { id: "Zephyr", name: "Zephyr", description: "Brilhante", category: "neutral", languages: ["en-US"] },
  { id: "Puck", name: "Puck", description: "Animada", category: "male", languages: ["en-US"] },
  { id: "Kore", name: "Kore", description: "Firme", category: "female", languages: ["pt-BR", "en-US"] },
  { id: "Orus", name: "Orus", description: "Firme", category: "male", languages: ["pt-BR"] },
  // ... 15 more voices
];

// Organized by language:
- Portuguese: Kore (F), Orus (M)
- English: 8+ voices
- Spanish: Algieba (M), Despina (F)
- French: Erinome (F), Algenib (M)
- German: Rasalgethi (M), Laomedeia (F)
```

**Total:** 19 voices with multilingual support

### 3.4 Model & Endpoint

```typescript
// src/utils/geminiTtsConfig.ts Lines 1-2
export const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
export const GEMINI_TTS_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// URL builder (Line 48-50)
export function buildGeminiApiUrl(apiKey: string): string {
  return `${GEMINI_TTS_API_BASE}/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`;
}
```

### 3.5 API Request Format

```typescript
// From GeminiTtsTab.tsx Lines 247-262 (demo playback)
const requestBody = {
  model: GEMINI_TTS_MODEL,
  contents: [
    {
      parts: [{ text: "Texto para converter em áudio" }],
    },
  ],
  generationConfig: {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: voiceName },
      },
    },
  },
};
```

### 3.6 Chunking System

```typescript
// src/hooks/useGeminiTtsQueue.ts Line 9
import { splitTextForGeminiTts, countWords } from "@/utils/geminiTtsChunks";

// Configuration
- Chunk size: ~800 words (based on analysis in ANALISE_GEMINI_TTS.md)
- Processing: Sequential or parallel with retry logic
- Output: WAV format converted to MP3
```

### 3.7 Advanced Features

**Key Reservation System:**
```typescript
// useGeminiTtsQueue.ts Line 65-86
const dedicatedKey = getNextValidKey([], jobToProcess.id);
if (!dedicatedKey) {
  updateJobState(setJobs, jobToProcess.id, { 
    status: "error", 
    error: `All API keys in use. Waiting for ${activeJobsCount - 1} job(s)...` 
  });
}
```

**Failure Recovery:**
```typescript
// Job tracks:
- failedChunks: number[]      // Array of failed chunk indices
- chunkRetries: Record<number, number> // Retry count per chunk
- currentChunk?: number       // What's being processed
- audioChunks: Blob[]         // Completed audio chunks
```

---

## 4. AGENT SYSTEM (REGISTRATION/CADASTRO EQUIVALENT)

### 4.1 What is "Cadastro"?

There's no system explicitly called "registration" or "cadastro". Instead, the codebase uses an **Agent system** that serves as a configuration profile for script generation **WITH optional voice settings**.

### 4.2 Agent Type Definition

```typescript
// src/types/agents.ts Lines 1-17
export interface Agent {
  id: string;
  name: string;
  description?: string;
  premisePrompt: string;        // For generating premise
  scriptPrompt: string;          // For generating script
  language: string;             // pt-BR, en-US, es-ES, etc.
  location: string;             // Geographic context
  channelName?: string;         // YouTube channel, etc.
  duration: number;             // Video duration in minutes
  premiseWordTarget: number;    // Target premise length
  
  // AUDIO SETTINGS (Optional)
  autoGenerateAudio?: boolean;   // Auto-generate audio after script?
  voiceId?: string;             // Voice to use (system doesn't enforce which)
  voicePrompt?: string;         // Voice characteristics description
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.3 Agent Storage

```typescript
// src/hooks/useAgents.ts Lines 1-60
const STORAGE_KEY = 'script-agents';

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Each agent stored with date serialization
  });
  
  const saveToStorage = useCallback((newAgents: Agent[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAgents));
    window.dispatchEvent(new Event('agents-storage-updated'));
  }, []);
};
```

**Storage Key:** `script-agents` (localStorage)

### 4.4 Agent Management UI

```typescript
// src/components/AgentManager.tsx Lines 16-80
export const AgentManager = ({ onSelectAgent, selectedAgentId }: AgentManagerProps) => {
  const { agents, createAgent, updateAgent, deleteAgent, duplicateAgent } = useAgents();
  
  // UI provides:
  // - Create new agent
  // - Edit agent settings
  // - Delete agent
  // - Duplicate agent
};
```

### 4.5 Integration with Audio Generation

```typescript
// src/components/ScriptGeneratorWithModals.tsx Lines 67-80
useEffect(() => {
  const completedJobs = jobs.filter(j => 
    j.status === 'completed' && 
    j.script && 
    !history.some(h => h.id === j.id)
  );
  
  if (completedJobs.length > 0) {
    completedJobs.forEach(job => {
      const agent = agents.find(a => a.id === job.agentId);
      addToHistory(job, agent?.name || 'Unknown Agent', job.premise);
      
      // AUTO-GENERATE AUDIO IF CONFIGURED
      if (agent?.autoGenerateAudio && agent.voiceId && agent.voicePrompt) {
        // Trigger audio generation
      }
    });
  }
}, [jobs, agents, history]);
```

---

## 5. API KEY MANAGEMENT COMPARISON

| Aspect | OpenAI/openai.fm | ElevenLabs | Gemini TTS | Gemini Script Gen |
|--------|------------------|-----------|-----------|------------------|
| **Storage Key** | None (shared Supabase) | `elevenlabs_api_key` | `gemini-tts-api-keys` | `gemini-api-keys` |
| **Key Count** | 1 (Supabase) | 1 | Multiple | Multiple |
| **User-Provided** | No | Yes | Yes | Yes |
| **Status Tracking** | No | No | Yes (valid/invalid/no_credits/suspended) | Yes |
| **Request Counting** | No | No | Yes | No |
| **Last Used Tracking** | No | No | Yes | No |
| **Batch Import** | No | No | Yes | No |
| **Location** | localStorage + Supabase | localStorage | localStorage | localStorage |

### Storage Locations:
```
localStorage:
├── elevenlabs_api_key              (string)
├── gemini-tts-api-keys             (JSON array)
├── gemini-api-keys                 (JSON array)
├── script-agents                   (JSON array with voice config)
└── script-history                  (JSON array)
```

---

## 6. INTEGRATION FLOW

### 6.1 Typical User Workflow

```
1. USER CREATES AGENT (Optional Voice Config)
   └─ Agent.voiceId: "Kore" (or ElevenLabs voice ID)
   └─ Agent.voicePrompt: "Firm, professional"
   └─ Agent.autoGenerateAudio: true
   
2. USER GENERATES SCRIPT
   └─ Script is generated via Gemini API
   └─ Script completes and saved to history
   
3. AUTO-TRIGGER AUDIO (if enabled)
   └─ System detects completed script
   └─ Checks Agent.autoGenerateAudio
   └─ Selects voice system based on Agent.voiceId
   └─ Generates audio
   
4. MANUAL AUDIO GENERATION
   └─ User can switch to ElevenLabs or Gemini TTS tabs
   └─ Configure voice parameters
   └─ Generate audio independently
```

### 6.2 Script-to-Audio Data Flow

```
ScriptGeneratorWithModals.tsx
└─ onScriptGenerated(script, title)
   └─ Sets activeTab = "openai" or "gemini"
   └─ Loads script into text field
   └─ Loads voice config if from agent
   
User selects TTS system and generates audio
└─ ElevenLabsTab.tsx (addJob)
└─ GeminiTtsTab.tsx (addJob)
└─ Index.tsx OpenAI tab (useAudioQueue)
```

---

## 7. FEASIBILITY ANALYSIS: REPLACING OPENAI WITH GEMINI

### 7.1 Current State
- **OpenAI tab** uses scraping/proxy service (openai.fm worker)
- System is functional but depends on external service

### 7.2 Replacement Strategy

#### Option A: Complete Migration to Gemini TTS
✅ **Pros:**
- Official API with guaranteed support
- Better multilingual support
- Advanced voice control
- Already partially implemented

❌ **Cons:**
- Requires UI redesign (voices and parameters are different)
- Different quality expectations
- Cost considerations (Gemini has free tier)

**Effort:** Medium (2-3 days)

#### Option B: Keep Both (Current State)
✅ **Pros:**
- User choice
- Fallback if one service fails
- Caters to different quality preferences

**Effort:** None (already implemented)

#### Option C: Use Gemini for OpenAI Tab
- Replace openai-fm-proxy to use Gemini internally
- Keep same UI/voices

**Effort:** Low (1 day)

### 7.3 Implementation Path for Gemini Replacement

**Files to modify:**

1. `/src/pages/Index.tsx` (OpenAI tab)
   - Replace voice list (11 → 19 voices)
   - Replace API call logic to use Gemini config
   - Add API key configuration UI

2. `/supabase/functions/openai-fm-proxy/index.ts`
   - Replace with Gemini proxy logic
   - Use `buildGeminiApiUrl()` function
   - Handle Gemini response format (PCM audio)

3. `/src/utils/config.ts`
   - May not need ENDPOINTS array if going single Gemini
   - Or keep for distributed load

**New dependencies needed:**
- Already have: `pcmToWav`, `wavToMp3` conversion utilities
- Reuse: Gemini TTS API logic from GeminiTtsTab

---

## 8. KEY FINDINGS SUMMARY

### What's Implemented
- ✅ 3 independent TTS systems (OpenAI proxy, ElevenLabs, Gemini)
- ✅ Agent configuration system with voice settings
- ✅ Auto-generation trigger on script completion
- ✅ Advanced queue management for parallel processing
- ✅ Multi-key support with rotation for Gemini TTS
- ✅ Comprehensive error handling and retry logic

### What's Missing
- ❌ No unified UI for all TTS systems
- ❌ No automatic system selection based on voice availability
- ❌ No voice preview across systems
- ❌ No TTS cost calculator
- ❌ No API quota monitoring per system

### Architecture Strengths
1. **Modular design** - Each TTS system is independent
2. **Flexible storage** - Each system manages its own API keys
3. **Queue-based processing** - Prevents overload
4. **Error recovery** - Retry logic with exponential backoff
5. **Chunk processing** - Handles long texts gracefully

### Architecture Weaknesses
1. **No central API registry** - Hard to compare availability
2. **Storage duplication** - Multiple API key systems
3. **No system fallback** - If one fails, no automatic switch
4. **Voice ID mismatch** - voiceId field doesn't specify which system

---

## 9. SPECIFIC FILE REFERENCES

### OpenAI System
- `/supabase/functions/openai-fm-proxy/index.ts` - Backend proxy
- `/src/pages/Index.tsx` - Frontend UI (Lines 25-351)
- `/src/utils/config.ts` - ENDPOINTS configuration
- `/src/hooks/useAudioQueue.ts` - Queue management

### ElevenLabs System
- `/src/components/ElevenLabsTab.tsx` - Full UI implementation
- `/src/utils/elevenLabsConfig.ts` - Models, voices, API URL
- `/src/hooks/useElevenLabsQueue.ts` - Queue processing
- `/src/utils/elevenLabsChunks.ts` - Text splitting

### Gemini TTS System
- `/src/components/GeminiTtsTab.tsx` - Advanced UI (978 lines!)
- `/src/utils/geminiTtsConfig.ts` - Model, voices, URL builder
- `/src/hooks/useGeminiTtsQueue.ts` - Advanced queue with chunks
- `/src/hooks/useGeminiTtsKeys.ts` - Multi-key management
- `/src/utils/geminiTtsChunks.ts` - 800-word chunking
- `/src/types/geminiTts.ts` - Type definitions

### Agent/Registration System
- `/src/types/agents.ts` - Agent interface
- `/src/hooks/useAgents.ts` - Agent CRUD operations
- `/src/components/AgentManager.tsx` - Agent UI
- `/src/components/ScriptGeneratorWithModals.tsx` - Integration point

### Script Generation (Different API Keys)
- `/src/hooks/useGeminiKeys.ts` - Script generation API keys
- `/src/services/geminiApi.ts` - Script generation API calls
- `/src/services/enhancedGeminiApi.ts` - Enhanced generation logic

---

## 10. RECOMMENDATIONS

1. **For Audio Replacement:** Migrate OpenAI tab to official API (Stripe, AssemblyAI, or stick with Gemini)

2. **For Better Integration:** 
   - Create unified voice registry mapping
   - Implement system auto-selection based on voice availability
   - Add fallback chain (e.g., try Gemini → fallback to ElevenLabs)

3. **For Better UX:**
   - Create "Audio Settings" section in agents
   - Support voice selection with preview across all systems
   - Show API quota/balance for each system

4. **For Code Organization:**
   - Extract common TTS logic into abstract class
   - Create unified API key manager
   - Centralize audio format conversion utilities

