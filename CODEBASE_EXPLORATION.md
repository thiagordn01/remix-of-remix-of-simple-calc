# Codebase Exploration Report: Novo Syntax Project

**Project Name:** vite_react_shadcn_ts (Novo Syntax)  
**Type:** Video Script Generation System with Gemini API Integration  
**Tech Stack:** React 18, TypeScript, Vite, shadcn-ui, Tailwind CSS, Supabase  
**Status:** Production-ready with sophisticated rate limiting and error handling

---

## 1. OVERALL PROJECT STRUCTURE

### Root Directory Layout
```
/home/user/novo-syntax/
├── src/                          # Main source code
│   ├── components/               # React UI components
│   ├── hooks/                    # Custom React hooks
│   ├── services/                 # API and business logic services
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── integrations/             # External integrations (Supabase)
│   ├── pages/                    # Page components
│   ├── data/                     # Static data/configs
│   └── App.tsx, main.tsx         # App entry points
├── public/                       # Static assets
├── supabase/                     # Supabase migrations and functions
├── package.json                  # Dependencies and scripts
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── .env                          # Environment variables
└── [Various .md reports]         # Analysis and fix documentation
```

### Key Statistics
- **Total Source Files:** ~119 TypeScript/TSX files
- **Component Count:** 50+ UI and feature components
- **Service Modules:** 2 main API services + multiple utilities
- **Custom Hooks:** 13+ hooks for state and API management

---

## 2. CONFIGURATION & ENVIRONMENT SETUP

### Environment Variables (.env)
```
VITE_SUPABASE_PROJECT_ID="egywqkqrgifautasinhi"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://egywqkqrgifautasinhi.supabase.co"
```
**Note:** These are non-production (anon) keys. Sensitive credentials should not be in .env.

### Vite Configuration (vite.config.ts)
- **Server Port:** 8080
- **Plugin:** lovable-tagger for component tagging in development
- **Path Alias:** `@/` → `./src/`
- **Build:** TypeScript + React using SWC for fast compilation

### TypeScript Configuration
- **Strict Mode:** Disabled for flexibility (`noImplicitAny: false`, `strictNullChecks: false`)
- **Module Resolution:** Configured with `@/` alias for clean imports
- **Target:** Modern ES modules

### Package Dependencies (Key)
- **React:** 18.3.1
- **Vite:** 5.4.19
- **TypeScript:** 5.8.3
- **UI Framework:** shadcn-ui + Radix UI components
- **State Management:** React Hooks + React Query
- **Database:** Supabase (v2.75.1)
- **Audio Processing:** lamejs (MP3 conversion)
- **Form Validation:** Zod + React Hook Form

---

## 3. GEMINI API INTEGRATION

### Overview
The system uses Google Gemini API (both free tier and potentially paid) to generate video scripts and premises. It implements sophisticated multi-key rotation with extensive rate limiting and error handling.

### Core Services

#### A. `geminiApi.ts` (Basic Service)
**Location:** `/src/services/geminiApi.ts`

**Responsibilities:**
- Direct Gemini API communication
- Basic error mapping and handling
- API key validation

**Key Features:**
- Supports both `/v1/` and `/v1beta/` endpoints
- Fallback mechanism for newer models (2.5, 2.0)
- Comprehensive error classification (429, 403, 404, 400, 5xx)
- 120-second timeout for requests
- Response validation

**Error Types Handled:**
```typescript
- API_RATE_LIMIT (429)
- API_KEY_SUSPENDED (403)
- API_KEY_INVALID (403)
- API_KEY_PRO_BILLING_REQUIRED (403)
- MODEL_NOT_FOUND (404)
- API_SERVER_ERROR (5xx)
- NO_CONTENT_GENERATED
- NETWORK_ERROR
- API_TIMEOUT
```

**Key Methods:**
```typescript
generateContent(prompt, apiKey, temperature)  // Main generation
validateApiKey(apiKey)                         // Lightweight validation
validateApiKeyLight(apiKey)                    // Ultra-minimal validation
getErrorMessage(errorCode)                     // User-friendly messages
```

#### B. `enhancedGeminiApi.ts` (Advanced Service - PRODUCTION)
**Location:** `/src/services/enhancedGeminiApi.ts` (~1,500 lines)

**This is the REAL production service with sophisticated features:**

**Singleton Pattern:** Single instance manages all API state across the app

**Rate Limiting Implementation:**

1. **Model-Specific Limits (Free Tier Google AI Studio):**
```typescript
Model Limits: {
  'gemini-2.5-pro':        { rpm: 5,   rpd: 100,  tpm: 125000 },
  'gemini-2.5-flash':      { rpm: 10,  rpd: 250,  tpm: 250000 },
  'gemini-2.5-flash-lite': { rpm: 15,  rpd: 1000, tpm: 250000 },
  'gemini-2.0-flash':      { rpm: 15,  rpd: 200,  tpm: 1000000 },
  'gemini-2.0-flash-lite': { rpm: 30,  rpd: 200,  tpm: 1000000 },
  'gemini-1.5-pro':        { rpm: 2,   rpd: 50,   tpm: 32000 }
}

Tracking: RPM (requests/minute), RPD (requests/day), TPM (tokens/minute)
```

2. **Cooldown Periods:**
```typescript
MIN_TIME_BETWEEN_REQUESTS = 31000ms  // 31 seconds between requests on SAME API
RATE_LIMIT_COOLDOWN = 60000ms        // 60 seconds after 429 error
DELAY_BETWEEN_API_ATTEMPTS = 500ms   // 0.5 seconds between trying different APIs
```

3. **API Locking (Concurrency Prevention):**
```typescript
apiInUse Map<string, boolean>           // Prevents simultaneous use of same key
apiLastRequestTime Map<string, number>  // Tracks last request timestamp
```

**Error Differentiation (CRITICAL FIX):**

The system differentiates 429 errors:

```typescript
// CASE 1: Billing/Credits Error → Permanent block
Message: "You exceeded your current quota, please check your plan and billing details"
Action: Block permanently until account fixed
Duration: 999999999ms (until restart)

// CASE 2: TPM (Tokens Per Minute) → Temporary cooldown
Condition: RPM < 2 but Google returns rate limit
Message: "Resource has been exhausted"
Action: Cooldown for 60 seconds
Duration: 60000ms

// CASE 3: RPM (Requests Per Minute) → Temporary cooldown  
Condition: Hit 2 requests/minute limit
Message: "Resource has been exhausted"
Action: Cooldown for 30 seconds
Duration: 30000ms

// CASE 4: RPD (Requests Per Day) → Daily reset
Condition: Hit 50 requests/day limit
Message: "Resource has been exhausted" 
Action: Mark exhausted until midnight UTC
Duration: Until 00:00 UTC next day
```

**Storage Persistence:**
```typescript
localStorage: 'gemini_exhausted_keys'    // RPD exhaustion tracking across sessions
localStorage: 'gemini_quarantined_keys'  // Blocked keys with reasons
```

**Key Blocking System (PHASE 1):**

Automatic blocking based on error patterns:
- 5 consecutive failures → 3-minute block
- Auth errors (401, 403) → Permanent block
- Billing issues (429 with "billing") → Permanent block
- Bad request (400) → 3-minute block
- Server error (500) → 1-minute block

**Main Generation Method:**

```typescript
generateWithFidelity(
  prompt: string,
  availableApis: GeminiApiKey[],
  context: GenerationContext,
  options: GenerationOptions
): Promise<{ content: string; usedApiId: string }>
```

Features:
- Exponential backoff (10s, 20s, 40s up to 120s)
- Jitter (0-5s random delay)
- Validates response content
- Tracks which API was used
- Handles 5-minute global timeout
- Returns object with content AND usedApiId
- Tracks max 5 consecutive rate limits before giving up

**Chunk-Based Script Generation:**

```typescript
generateScriptChunk(
  prompt: string,
  availableApis: GeminiApiKey[],
  context: GenerationContext
): Promise<{ content: string; usedApiId: string }>
```

Context includes:
- Premise (the story/concept)
- Previous content (for continuity)
- Chunk index and total chunks
- Target words for this chunk
- Language and location info

Max tokens: 
- Regular chunks: 50,000 tokens
- Last chunk: 80,000 tokens (up to 2,000 words)

**Premise Generation (Single Request):**

```typescript
generatePremise(
  prompt: string,
  availableApis: GeminiApiKey[],
  targetWords: number = 1000
): Promise<{ content: string; usedApiId: string }>
```

- Always generates in ONE request (no chunking)
- Timeout: 3 minutes
- Max tokens: 40,000
- Temperature: 0.6 (more controlled)

**Cultural Context Injection:**

Automatic cultural adaptation for 20+ languages:
```typescript
pt-BR, pt-PT, en-US, en-GB, en-AU, es-ES, es-MX, es-AR,
fr-FR, fr-CA, de-DE, it-IT, ru-RU, zh-CN, zh-TW,
ja-JP, ko-KR, ar-SA, hi-IN, tr-TR, nl-NL, pl-PL, sv-SE
```

Adds currency, idioms, cultural references, measurement systems per language.

**Public Methods for Status:**

```typescript
isKeyAvailable(apiId: string): boolean           // Can this key be used now?
isKeyInCooldown(apiId: string): boolean          // Is it rate limited?
isKeyExhausted(apiId: string): boolean           // Hit daily quota?
getKeyBlockReason(apiId: string): string | undefined
getApiUsageStats(apiId: string): { rpm, rpd }
getShortestCooldownMs(apiIds: string[]): number | null
resetApiStats(apiId: string): void               // Full reset button
getApiStats(): { [apiId: string]: {...} }
```

---

## 4. SCRIPT/ROTEIRO GENERATION FUNCTIONALITY

### Generation Workflow

```
User Input (Title, Channel, Duration, Prompts)
    ↓
[useScriptGenerator Hook]
    ↓
1. PREMISE GENERATION (Enhanced Service)
   └─ Single request, ~1000 words
   └─ Temperature: 0.6
   └─ Used for all script chunks
    ↓
2. SCRIPT GENERATION (Chunked if > 1000 words)
   ├─ Chunk 1: Beginning (up to 1000 words)
   ├─ Chunk 2-N: Development (up to 1000 words each)
   └─ Chunk N: Conclusion (up to 2000 words)
    ↓
3. ASSEMBLY
   └─ Combine chunks with continuity checking
    ↓
[Result: Full Script with Metadata]
```

### Hook: `useScriptGenerator.ts`

**Location:** `/src/hooks/useScriptGenerator.ts` (150+ lines)

**State:**
```typescript
isGenerating: boolean                  // Generation in progress
progress: ScriptGenerationProgress     // Percentage, current chunk, etc.
result: ScriptGenerationResult | null  // Final generated script
```

**Main Method:**
```typescript
generateScript(
  request: ScriptGenerationRequest,
  agent: Agent | null,
  apiKeys: GeminiApiKey[]
): Promise<ScriptGenerationResult>
```

**Process:**
1. Validate language (use explicit > agent > default to pt-BR)
2. Merge user overrides with agent config
3. Filter active/valid API keys
4. Generate premise (1 request)
5. If targetWords > 1000:
   - Split into chunks of 1000 words
   - Generate each chunk with context
   - Track continuity
6. Assemble result with metadata

**Result Structure:**
```typescript
{
  premise: string,              // Premise text
  script: string[],             // Array of chunks
  chunks: ScriptChunk[],        // Detailed chunk info
  totalWords: number,           // Total word count
  estimatedDuration: number,    // In minutes (words / 150)
  agentUsed?: string            // Agent name if used
}
```

**Progress Tracking:**
```typescript
{
  stage: 'premise' | 'script',
  currentChunk: number,
  totalChunks: number,
  completedWords: number,
  targetWords: number,
  isComplete: boolean,
  percentage: number,           // 0-100
  message?: string
}
```

### Types: `scripts.ts`

**Location:** `/src/types/scripts.ts`

**GeminiApiKey:**
```typescript
{
  id: string;
  name: string;
  key: string;                  // Actual API key
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  isActive: boolean;
  requestCount: number;
  lastUsed?: Date;
  status?: 'valid' | 'invalid' | 'suspended' | 'rate_limited' | 'unknown' | 'checking';
  statusMessage?: string;
  lastValidated?: Date;
}
```

**ScriptGenerationRequest:**
```typescript
{
  title: string;
  agentId?: string;             // Optional agent preset
  channelName?: string;         // Can override agent
  premisePrompt?: string;       // Can override agent
  scriptPrompt?: string;        // Can override agent
  duration?: number;            // Minutes (can override)
  language?: string;            // Can override agent
  location?: string;            // Can override agent
  premiseWordTarget?: number;   // Can override agent
}
```

### Prompt Engineering: `promptInjector.ts`

**Location:** `/src/utils/promptInjector.ts` (315 lines)

**Key Functions:**

1. **injectPremiseContext()** - Wraps premise prompt with:
   - Video title
   - Duration
   - Language
   - Location/target audience
   - Channel name (optional)

2. **buildChunkPrompt()** - MOST COMPLEX - Wraps chunk prompt with:

   **Block 1: Title**
   ```
   ━━━━━━━━━━━━━━━━━━━━
   📌 TÍTULO DO VÍDEO:
   "Video Title Here"
   ```

   **Block 2: Premise (BIBLE)**
   ```
   🎯 PREMISSA (SIGA FIELMENTE - ESTA É SUA BÍBLIA):
   [Full premise text here]
   ```

   **Block 3: Progress Tracking**
   ```
   📊 PROGRESSO: Chunk 1/3 (33%)
   🎯 VOCÊ DEVE DESENVOLVER: 📍 BLOCO 1 - INÍCIO
   ⚠️ SIGA EXATAMENTE A PREMISSA:
   - Desenvolva APENAS os eventos do Bloco 1
   - NÃO volte a eventos de blocos anteriores
   - NÃO pule para eventos de blocos futuros
   ```

   **Block 4: Duplicate Prevention (if not first chunk)**
   ```
   ⚠️⚠️⚠️ INSTRUÇÕES CRÍTICAS ANTI-DUPLICAÇÃO ⚠️⚠️⚠️
   🚫 VOCÊ JÁ ESCREVEU 3,456 PALAVRAS DO ROTEIRO
   🚫 NÃO REESCREVA NADA DO CONTEXTO ABAIXO
   🚫 NÃO REPITA NENHUMA CENA, CONCEITO OU EXEMPLO JÁ MENCIONADO
   🚫 NÃO VOLTE ATRÁS NA NARRATIVA
   
   [Previous content - up to 6000 words]
   
   📍 ÚLTIMAS FRASES QUE VOCÊ ESCREVEU:
   "[Last 4 sentences]"
   ```

   **Block 5: Chunk-Specific Instructions**
   - For Chunk 1: "INÍCIO DO ROTEIRO - Start engagingly"
   - For Chunk 2-N: "DESENVOLVIMENTO - Continue from last sentence"
   - For Last Chunk: "CHUNK FINAL - Complete the story, include CTA"

   **Block 6: Format Rules**
   ```
   ✅ TEXTO CORRIDO APENAS - SEM FORMATAÇÕES:
   - NÃO use numerações (1., 2., 3.)
   - NÃO use marcadores (•, -, *)
   - NÃO use títulos ("Capítulo 1", "Introdução")
   - APENAS parágrafos naturais separados por linha em branco
   
   ✅ NARRAÇÃO PURA - SEM INDICAÇÕES TÉCNICAS:
   - NÃO escreva: "Silêncio.", "Pausa.", "Música tensa"
   - SIM escreva: "Um silêncio pesado tomou conta"
   ```

   **Block 7: Cultural Context (if applicable)**
   ```
   === ADAPTAÇÃO CULTURAL OBRIGATÓRIA ===
   🌍 IDIOMA: Português (Brasil)
   📍 REGIÃO: Brasil
   🎭 CONTEXTO CULTURAL: [Specific cultural notes]
   
   🚨 INSTRUÇÕES CULTURAIS CRÍTICAS:
   - ADAPTE completamente o conteúdo para a cultura Brasil
   - USE expressões, gírias e referências locais apropriadas
   - CONSIDERE feriados, tradições e valores culturais locais
   
   [Language-specific adaptations for 20+ languages]
   ```

**Cultural Adaptations Included:**
- Portuguese (Brazil): Gírias, futebol, carnaval, novelas, BBB, sertanejo
- Spanish: Tapas, siesta, La Liga, flamenco, marimba
- English variants: American/British/Australian culture references
- And 17 more languages with specific cultural notes

**Max Context Words:** 6000 (prevents token overflow)

---

## 5. RATE LIMITING & FREE TIER HANDLING

### Free Tier Limits (Google AI Studio)

**Per Model Breakdown:**

| Model | RPM | RPD | TPM |
|-------|-----|-----|-----|
| gemini-2.5-pro | 5 | 100 | 125K |
| gemini-2.5-flash | 10 | 250 | 250K |
| gemini-2.5-flash-lite | 15 | 1000 | 250K |
| gemini-2.0-flash | 15 | 200 | 1M |
| gemini-2.0-flash-lite | 30 | 200 | 1M |
| gemini-1.5-pro | 2 | 50 | 32K |

**RPM:** Requests Per Minute - hard limit on request frequency  
**RPD:** Requests Per Day - daily quota reset at 00:00 UTC  
**TPM:** Tokens Per Minute - prevents large batch processing  

### Rate Limit Handling Strategy

**1. API Key Rotation:**
- Support multiple API keys in parallel
- Automatic rotation between keys
- Each key tracked independently

**2. Smart Cooldown:**
```
When RPM hit (2 req/min): Wait 30 seconds
When TPM hit: Wait 60 seconds  
When RPD hit: Mark exhausted until 00:00 UTC
When Billing error: Block permanently
```

**3. Request Sequencing:**
```
0.5s delay between trying different API keys
31s minimum between requests on SAME key
(31s instead of 30s for safety margin)
```

**4. Concurrent Request Prevention (LOCK):**
```typescript
apiInUse Map<string, boolean>
// Prevents simultaneous requests using same key
// Locks before request, unlocks after completion
```

**5. Billing Issue Detection:**

Looks for keywords in error messages:
- "billing"
- "payment"
- "plan and billing details"
- "credits"

→ Permanently blocks key (user needs to enable billing)

**6. Error Recovery:**

Errors classified as recoverable (retry next API):
- MAX_TOKENS reached (increase tokens elsewhere)
- Network timeout
- Security filters (safety ratings)
- No content generated

Errors classified as non-recoverable (block permanently):
- Invalid API key
- API key suspended
- Billing issues
- Bad request (400) without recovery

### Free Tier Workarounds Implemented

1. **Multiple API Keys:**
   - System supports unlimited API keys
   - Maintains separate limits for each
   - Rotates between them

2. **Smart Waiting:**
   - Calculates minimum wait time across all keys
   - Shows user estimated wait time
   - Retries when cooldown expires

3. **Chunked Generation:**
   - Splits large scripts (>1000 words) into chunks
   - Each chunk uses up ~1000-2000 words of RPD quota
   - Reduces TPM per request

4. **Adaptive Parameters:**
   - Reduces temperature in retries (more deterministic)
   - Reformulates prompts to be safer (avoid security filters)
   - Retries with adjusted parameters before giving up

5. **Session Persistence:**
   - Tracks exhausted keys across page reloads
   - Loads blocked keys from localStorage
   - Remembers which keys are unavailable

6. **Batch Processing Support:**
   - Can generate multiple scripts with delays
   - Queues requests to respect rate limits
   - Automatic retry with cooldown

### Monitoring & Status Tracking

**UI Components for Monitoring:**

1. **GeminiApiManager.tsx** - API key management
   - Add/remove/toggle keys
   - Validate individual keys
   - Bulk upload CSV with multiple keys
   - See status of each key

2. **ApiStatusMonitor.tsx** - Real-time status
   - Current RPM/RPD usage per key
   - Cooldown timer
   - Block status and reason
   - Reset button

3. **StatisticsDashboard.tsx** - Historical stats
   - Total requests per API
   - Success/failure rates
   - Timing information

---

## 6. COMPONENT ARCHITECTURE

### Script Generation Components

**ScriptGenerator.tsx** (Main)
- User form for script generation request
- Agent selection
- API key management
- Progress display
- Result preview/download

**SimpleScriptGenerator.tsx** (Fallback)
- Minimal form for basic generation
- Mock implementation

**ScriptGeneratorFixed.tsx**
- Alternate implementation

**ScriptGeneratorWithModals.tsx**
- Integrated modals for API/Agent management

**ScriptPreviewModal.tsx**
- Display generated script
- Copy/download functionality

### Agent & API Management

**AgentManager.tsx**
- Create/edit/delete agents
- Configure prompts, language, location, duration
- Set premise word targets

**GeminiApiManager.tsx** (PRIMARY)
- Add/remove API keys
- Validate keys
- Bulk import (CSV)
- Toggle active status
- See current status

**ApiStatusMonitor.tsx**
- Real-time monitoring
- RPM/RPD tracking
- Cooldown timers
- Block reasons
- Reset controls

**ApiModal.tsx** / **ApiBatchModal.tsx**
- Modal interfaces for API management

---

## 7. PROJECT CHARACTERISTICS

### Strengths
✅ Sophisticated multi-key rotation system  
✅ Comprehensive error differentiation (Billing vs Rate Limits vs TPM)  
✅ Persistent state across sessions  
✅ Cultural context injection for 20+ languages  
✅ Prevent duplicate content in chunked generation  
✅ Exponential backoff with jitter  
✅ Locking mechanism prevents concurrent key usage  
✅ Automatic recovery strategies  
✅ Clear progress tracking and user feedback  

### Potential Issues
⚠️ REQUESTS_PER_MINUTE_LIMIT and REQUESTS_PER_DAY_LIMIT referenced but not explicitly defined (hardcoded as 2 and 50)  
⚠️ localStorage depends on browser - cleared on cache  
⚠️ No server-side backup of rate limit state  
⚠️ Complex prompt engineering could be overwhelming for non-technical users  
⚠️ Error messages in Portuguese only (hardcoded)  

---

## 8. DEPLOYMENT & PRODUCTION NOTES

**Platform:** Lovable.dev (No-code/Low-code AI IDE)  
**Git Integration:** Auto-commits from Lovable, can also push locally  
**Database:** Supabase (managed PostgreSQL)  
**Hosting:** Lovable platform handles deployment  

**Environment:**
- Node.js required locally
- npm for dependency management
- Vite for dev server and build

**Build:** 
```bash
npm run build      # Production build
npm run dev        # Development server
npm run preview    # Preview prod build locally
npm run lint       # ESLint check
```

---

## 9. KEY FILES REFERENCE

**Critical Production Files:**
- `/src/services/enhancedGeminiApi.ts` - Main API service (1500+ lines)
- `/src/services/geminiApi.ts` - Basic API communication
- `/src/hooks/useScriptGenerator.ts` - Script generation logic
- `/src/utils/promptInjector.ts` - Prompt engineering
- `/src/types/scripts.ts` - Type definitions
- `/src/components/GeminiApiManager.tsx` - API management UI
- `/src/hooks/useGeminiKeys.ts` - API key storage/management

**Analysis Documents (Root Level):**
- `CORRECAO_429_BILLING_TPM.md` - Error differentiation fixes
- `CORRECAO_RPM_LOCK.md` - Concurrency locking mechanism
- `CORRECAO_MAX_TOKENS.md` - Token limit fixes
- `CORRECAO_RETRY_503.md` - Server error handling
- `CORRECAO_RPD_RESET.md` - Daily quota reset logic

---

## CONCLUSION

This is a **well-engineered production system** for generating video scripts using Google's Gemini API. The architecture demonstrates:

1. **Deep understanding of API rate limiting** across multiple dimensions (RPM, RPD, TPM)
2. **Defensive programming** with extensive error handling and recovery strategies
3. **User experience focus** with progress tracking, clear error messages, and smart waiting
4. **Sophisticated prompt engineering** for cultural adaptation and content consistency
5. **Multi-key support** that enables free tier workarounds through key rotation

The system is designed to handle the constraints of Google's free tier while providing a seamless user experience for generating long-form video scripts with cultural adaptation.
