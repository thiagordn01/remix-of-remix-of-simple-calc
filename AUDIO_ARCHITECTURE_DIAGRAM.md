# Audio Generation System - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NOVO SYNTAX PLATFORM                                │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │  Script Generator    │  │   Agent Manager      │  │  Audio UI        │  │
│  │  (Gemini API)        │  │   (localStorage)     │  │  (3 tabs)        │  │
│  │                      │  │                      │  │                  │  │
│  │  - Generate premise  │  │  - voiceId           │  │  - OpenAI        │  │
│  │  - Generate script   │  │  - voicePrompt       │  │  - ElevenLabs    │  │
│  │  - Multi-agent job   │  │  - autoGenerateAudio │  │  - Gemini TTS    │  │
│  │    queue             │  │                      │  │                  │  │
│  └────────┬─────────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
│           │                           │                       │            │
│           └───────────────────────────┼───────────────────────┘            │
│                                       │                                    │
└───────────────────────────────────────┼────────────────────────────────────┘
                                        │
                                        ▼
                    ┌──────────────────────────────────────┐
                    │  Script Generation (useScriptHistory)│
                    │  Completed script triggers audio     │
                    │  Checks agent.autoGenerateAudio flag │
                    └──────────┬───────────────────────────┘
                               │
                    ┌──────────┴──────────────────────────────┐
                    │     Which TTS System to Use?           │
                    └──────────┬──────────────┬───────────────┘
                               │              │
        ┌──────────────────────┘              └──────────────────────────┐
        │                                                                 │
        ▼                                                                 ▼
┌──────────────────────────────┐                          ┌──────────────────────────────┐
│   TTS SYSTEM 1: OPENAI       │                          │   TTS SYSTEM 2: ELEVENLABS   │
│   (Proxy to openai.fm)       │                          │   (Official API)             │
│                              │                          │                              │
│  Frontend: Index.tsx         │                          │  Frontend: ElevenLabsTab.tsx │
│  - 11 voices                 │                          │  - 60+ voices across models  │
│  - Voice prompt customization│                          │  - 3 models available       │
│  - Round-robin load balance  │                          │  - Stability/similarity     │
│                              │                          │  - Single API key (user)    │
│  Backend: openai-fm-proxy    │                          │                              │
│  - Proxy to workers.dev      │                          │  Storage:                   │
│  - 10 Supabase endpoints     │                          │  localStorage.               │
│  - No user API key needed    │                          │  elevenlabs_api_key         │
│  - Load balancing            │                          │                              │
│                              │                          │  Queue: useElevenLabsQueue  │
│  Storage: Supabase ANON KEY  │                          │  (3 concurrent, chunked)    │
└──────────────────────────────┘                          └──────────────────────────────┘
                                                                         │
        ┌────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│   TTS SYSTEM 3: GOOGLE GEMINI                                    │
│   (Official API with native TTS)                                 │
│                                                                  │
│  Frontend: GeminiTtsTab.tsx                                      │
│  - 19 voices across 5 languages                                 │
│  - Advanced API key management (batch import)                   │
│  - Multi-key support with auto-rotation                        │
│  - Status tracking (valid/invalid/no_credits/suspended)        │
│  - 800-word chunk splitting                                     │
│  - Parallel processing (configurable)                          │
│                                                                  │
│  API: gemini-2.5-flash-preview-tts                             │
│  - PCM to WAV to MP3 conversion                                │
│  - Sophisticated retry logic                                    │
│  - Failed chunk tracking                                        │
│                                                                  │
│  Storage: localStorage.gemini-tts-api-keys                     │
│  Queue: useGeminiTtsQueue (advanced, chunk-aware)              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: From Script to Audio

```
USER ACTION
    ↓
┌─────────────────────────────────┐
│ 1. Generate Script via Agent    │
│    - Premise generation         │
│    - Script generation          │
│    - Auto-save to history       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 2. Detect Completion            │
│    - ScriptGeneratorWithModals  │
│    - useEffect hook checks      │
│    - Find agent.autoGenerateAudio│
└────────────┬────────────────────┘
             │
             ▼ YES, AUTO-GENERATE?
┌─────────────────────────────────┐
│ 3. Select Audio System          │
│    - Check agent.voiceId        │
│    - Determine TTS system       │
│    - Load voice config          │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┬────────────────────┐
    │                 │                    │
    ▼                 ▼                    ▼
┌─────────┐      ┌──────────┐        ┌─────────────┐
│ OpenAI  │      │ ElevenLabs│     │ Gemini TTS  │
│ Tab     │      │ Tab      │     │ Tab         │
└────┬────┘      └────┬─────┘     └────┬────────┘
     │                │                │
     ▼                ▼                ▼
┌──────────────────────────────────────────────┐
│ 4. Queue Generation Job                      │
│    - Text input                              │
│    - Voice parameters                        │
│    - Job ID created                          │
└────────────┬─────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│ 5. Process Queue (Parallel, concurrent limit)│
│    - Chunk splitting (for Gemini: 800 words) │
│    - API calls (with retries)               │
│    - Audio concatenation                     │
└────────────┬─────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│ 6. Audio Generation Complete                 │
│    - Blob/URL created                        │
│    - Display player in UI                    │
│    - Download option                         │
│    - Save to history (optional)             │
└──────────────────────────────────────────────┘
```

---

## localStorage Structure

```
browser.localStorage = {
  // Script Generation API Keys
  'gemini-api-keys': [
    {
      id: "uuid",
      name: "Main API",
      key: "AIza...",
      model: "gemini-2.5-flash",
      requestCount: 42,
      isActive: true,
      status: "valid",
      statusMessage: "...",
      lastValidated: "2024-01-15T10:30:00Z",
      lastUsed: "2024-01-15T10:29:00Z"
    }
  ],

  // Agent Configuration
  'script-agents': [
    {
      id: "uuid",
      name: "Agent Name",
      description: "...",
      premisePrompt: "...",
      scriptPrompt: "...",
      language: "pt-BR",
      location: "São Paulo",
      channelName: "YouTube Channel",
      duration: 5,
      premiseWordTarget: 800,
      
      // Audio Settings (OPTIONAL)
      autoGenerateAudio: true,
      voiceId: "Kore",              // Could be Gemini or ElevenLabs
      voicePrompt: "Firm, professional",
      
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z"
    }
  ],

  // Audio System Storage
  'elevenlabs_api_key': "sk-...",   // Single string (user-provided)

  'gemini-tts-api-keys': [          // Multiple keys
    {
      id: "uuid",
      key: "AIza...",
      label: "API Key 1",
      requestCount: 150,
      isActive: true,
      status: "valid",
      statusMessage: "API key autenticada com sucesso",
      lastValidated: "2024-01-15T10:30:00Z",
      lastUsed: "2024-01-15T10:29:00Z"
    }
  ],

  // Script History
  'script-history': [
    {
      id: "uuid",
      title: "Script Title",
      script: "Full script content...",
      premise: "Premise content...",
      agentId: "uuid",
      agentName: "Agent Name",
      duration: 5,
      status: "completed",
      createdAt: "2024-01-15T10:00:00Z",
      isFavorite: false,
      audioInfo: { /* audio metadata */ }
    }
  ]
}
```

---

## API Key Comparison Table

```
┌──────────────────┬──────────────┬──────────────┬────────────────┐
│  Aspect          │  OpenAI      │  ElevenLabs  │  Gemini TTS    │
├──────────────────┼──────────────┼──────────────┼────────────────┤
│ Storage Key      │ Supabase ANON│ elevenlabs_  │ gemini-tts-    │
│                  │ (in config)  │ api_key      │ api-keys       │
├──────────────────┼──────────────┼──────────────┼────────────────┤
│ Count            │ 1 (shared)   │ 1 (user)     │ Multiple       │
├──────────────────┼──────────────┼──────────────┼────────────────┤
│ Voices           │ 11           │ 60+          │ 19             │
├──────────────────┼──────────────┼──────────────┼────────────────┤
│ Status Tracking  │ None         │ None         │ Yes (5 states) │
├──────────────────┼──────────────┼──────────────┼────────────────┤
│ Request Count    │ No           │ No           │ Yes            │
├──────────────────┼──────────────┼──────────────┼────────────────┤
│ Batch Import     │ No           │ No           │ Yes            │
├──────────────────┼──────────────┼──────────────┼────────────────┤
│ Queue System     │ useAudioQueue│ useElevenLabs│ useGeminiTts   │
│                  │ (simple)     │ Queue        │ Queue (advanced)
├──────────────────┼──────────────┼──────────────┼────────────────┤
│ Chunking         │ None         │ 2500 chars   │ 800 words      │
├──────────────────┼──────────────┼──────────────┼────────────────┤
│ Retry Logic      │ Basic        │ Basic        │ Advanced       │
├──────────────────┼──────────────┼──────────────┼────────────────┤
│ Failed Tracking  │ No           │ No           │ Yes (by index) │
└──────────────────┴──────────────┴──────────────┴────────────────┘
```

---

## Code Organization

```
src/
├── components/
│   ├── Index.tsx ......................... OpenAI Tab UI (351 lines)
│   ├── ElevenLabsTab.tsx ................. ElevenLabs Tab UI (567 lines)
│   ├── GeminiTtsTab.tsx .................. Gemini TTS Tab UI (978 lines)
│   ├── GeminiApiManager.tsx .............. Script Generation API Manager
│   ├── AgentManager.tsx .................. Agent CRUD UI
│   ├── AgentModal.tsx .................... Agent creation/edit form
│   ├── ScriptGeneratorWithModals.tsx ..... Main generator (integration point)
│   ├── ApiBatchModal.tsx ................. Batch API key import
│   └── ScriptHistoryTab.tsx .............. History display
│
├── hooks/
│   ├── useAudioQueue.ts .................. OpenAI queue (simple)
│   ├── useElevenLabsQueue.ts ............ ElevenLabs queue
│   ├── useGeminiTtsQueue.ts .............. Gemini TTS queue (advanced)
│   ├── useGeminiTtsKeys.ts ............... Gemini TTS key management
│   ├── useGeminiKeys.ts .................. Script generation keys
│   ├── useAgents.ts ...................... Agent CRUD operations
│   ├── useScriptGenerator.ts ............ Single script generation
│   ├── useParallelScriptGenerator.ts .... Multiple parallel scripts
│   └── useScriptHistory.ts .............. History persistence
│
├── utils/
│   ├── config.ts ......................... ENDPOINTS (10 Supabase URLs)
│   ├── geminiTtsConfig.ts ............... Gemini voices, model, endpoints
│   ├── geminiTtsChunks.ts ............... 800-word chunking logic
│   ├── elevenLabsConfig.ts .............. ElevenLabs models, voices, API URL
│   ├── elevenLabsChunks.ts .............. 2500-char chunking logic
│   ├── pcmToWav.ts ....................... PCM → WAV conversion
│   ├── wavToMp3.ts ....................... WAV → MP3 conversion
│   ├── audioUtils.ts .................... Audio buffer manipulation
│   ├── languagePrompt.ts ................ Language-specific prompts
│   └── chunkText.ts ..................... Generic text chunking
│
├── types/
│   ├── agents.ts ......................... Agent interface
│   ├── geminiTts.ts ..................... GeminiTtsJob, GeminiTtsApiKey
│   ├── scripts.ts ........................ Script generation types
│   └── analytics.ts ..................... Analytics types
│
├── services/
│   ├── geminiApi.ts ..................... Script generation API
│   └── enhancedGeminiApi.ts ............ Enhanced generation logic
│
└── pages/
    ├── Index.tsx ......................... Main page (with all tabs)
    └── TestComplete.tsx .................. Test page
```

---

## Integration Points

### 1. Script Completion → Auto Audio Generation

```typescript
// File: src/components/ScriptGeneratorWithModals.tsx
// Lines: 67-80

useEffect(() => {
  const completedJobs = jobs.filter(j => j.status === 'completed');
  
  completedJobs.forEach(job => {
    const agent = agents.find(a => a.id === job.agentId);
    
    // Check if agent has audio auto-generation enabled
    if (agent?.autoGenerateAudio && agent.voiceId && agent.voicePrompt) {
      // Trigger audio generation with agent's voice settings
    }
  });
}, [jobs, agents]);
```

### 2. Script to Audio UI Flow

```typescript
// File: src/components/ScriptGeneratorWithModals.tsx
// Lines: 158-167

const handleScriptGenerated = (script: string, title: string) => {
  setText(script);
  setFileName(title);
  setActiveTab("openai");  // Switch to audio tab
  
  toast({
    title: "Script received!",
    description: "Script loaded in OpenAI tab. Configure voice and generate audio."
  });
};
```

### 3. Agent Voice Config Usage

```typescript
// File: src/types/agents.ts
export interface Agent {
  // ... other fields ...
  
  // These are set by user during agent creation/editing
  autoGenerateAudio?: boolean;    // When true, auto-trigger after script
  voiceId?: string;              // Voice identifier (system-agnostic)
  voicePrompt?: string;          // Voice characteristics description
}
```

---

## Key Insight: No Single "Registration" System

The system does NOT have a dedicated "registration" or "cadastro" system specifically for audio. Instead:

1. **Script Generation has Agents** - Acts as configuration profiles
2. **Agents include optional voice fields** - But these are NOT enforced
3. **Audio tabs are independent** - User must manually load/configure
4. **No validation** - voiceId field doesn't validate against available voices
5. **System agnostic** - voiceId could theoretically be for any TTS system

This design allows flexibility but sacrifices some UX (e.g., voice not found = silent failure).

---

## Recommended Architecture Evolution

```
CURRENT:
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│ Agent  │  │ OpenAI │  │ Eleven │  │ Gemini │
│        │  │ System │  │ Labs   │  │ TTS    │
└────────┘  └────────┘  └────────┘  └────────┘
  (No link to audio systems - independent)

RECOMMENDED:
┌────────────────────────────────────────────┐
│ Unified Voice Registry                      │
├────────────────────────────────────────────┤
│ - Voice ID                                  │
│ - System (openai/elevenlabs/gemini)        │
│ - Name, description, language              │
│ - Available parameters                     │
└─────────────┬──────────────────────────────┘
              │
      ┌───────┴───────┬───────────┬──────────┐
      │               │           │          │
      ▼               ▼           ▼          ▼
   Agent        OpenAI Tab   ElevenLabs   Gemini
   (references  (uses)       (uses)       (uses)
    voice ID)   registry     registry     registry
```

