# 📊 Análise Completa: Sistema de Geração de Áudio Gemini TTS

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Processo de Geração de Áudio](#processo-de-geração-de-áudio)
4. [Gerenciamento de API Keys](#gerenciamento-de-api-keys)
5. [Sistema de Chunking (800 palavras)](#sistema-de-chunking)
6. [Pipeline de Conversão de Áudio](#pipeline-de-conversão-de-áudio)
7. [Sistema de Retry e Recuperação de Falhas](#sistema-de-retry-e-recuperação-de-falhas)
8. [Fluxo de Dados Completo](#fluxo-de-dados-completo)
9. [Vozes Disponíveis](#vozes-disponíveis)
10. [Pontos Técnicos Importantes](#pontos-técnicos-importantes)

---

## 1. Visão Geral

O sistema implementa uma solução completa e robusta para geração de áudio usando a **API Google Gemini TTS** (Text-to-Speech). O diferencial está na capacidade de:

- ✅ **Múltiplas API Keys**: Gerenciamento de várias chaves com rotação automática
- ✅ **Processamento em Paralelo**: Até 3 jobs simultâneos (configurável)
- ✅ **Chunking Inteligente**: Divisão automática de textos grandes em chunks de 800 palavras
- ✅ **Recuperação de Falhas**: Sistema sofisticado de retry e reprocessamento
- ✅ **Pipeline de Áudio**: Conversão PCM → WAV → MP3 com concatenação
- ✅ **19 Vozes Diferentes**: Incluindo português, inglês, espanhol, francês e alemão

---

## 2. Arquitetura do Sistema

### 2.1 Estrutura de Arquivos

```
src/
├── components/
│   ├── GeminiTtsTab.tsx          # Interface principal do TTS
│   └── ApiBatchModal.tsx         # Modal de importação em massa de API keys
│
├── hooks/
│   ├── useGeminiTtsQueue.ts      # Gerenciamento da fila de jobs TTS
│   └── useGeminiTtsKeys.ts       # Gerenciamento de API keys com reserva
│
├── utils/
│   ├── geminiTtsConfig.ts        # Configurações (modelo, vozes, endpoints)
│   ├── geminiTtsChunks.ts        # Sistema de divisão de texto em chunks
│   ├── pcmToWav.ts               # Conversão PCM → WAV
│   ├── wavToMp3.ts               # Conversão WAV → MP3
│   └── audioUtils.ts             # Utilitários de áudio (decode, concat, export)
│
└── types/
    └── geminiTts.ts              # Tipos TypeScript (GeminiTtsJob, GeminiTtsApiKey)
```

### 2.2 Tecnologias Utilizadas

- **React 18.3.1** com **TypeScript 5.8.3**
- **Web Audio API** para manipulação de áudio
- **lamejs** para codificação MP3
- **Gemini API** modelo `gemini-2.5-flash-preview-tts`
- **localStorage** para persistência de API keys

---

## 3. Processo de Geração de Áudio

### 3.1 Endpoint da API Gemini

```
Base URL: https://generativelanguage.googleapis.com/v1beta/models
Model: gemini-2.5-flash-preview-tts
```

**Construção da URL completa:**
```typescript
// src/utils/geminiTtsConfig.ts:48
export function buildGeminiApiUrl(apiKey: string): string {
  return `${GEMINI_TTS_API_BASE}/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`;
}
```

### 3.2 Estrutura da Requisição HTTP

```typescript
// Requisição POST para a API Gemini
const requestBody = {
  model: "gemini-2.5-flash-preview-tts",
  contents: [
    {
      parts: [
        { text: "Texto a ser convertido em áudio" }
      ]
    }
  ],
  generationConfig: {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: "Kore" // Nome da voz (19 opções disponíveis)
        }
      }
    }
  }
};

const response = await fetch(apiUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(requestBody),
});
```

### 3.3 Estrutura da Resposta

```typescript
// Resposta JSON da API
{
  candidates: [
    {
      content: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/pcm;rate=24000",  // PCM 16-bit mono 24kHz
              data: "base64_encoded_pcm_data..."  // Áudio em Base64
            }
          }
        ]
      },
      finishReason: "STOP"
    }
  ]
}
```

**Extração do áudio:**
```typescript
// src/hooks/useGeminiTtsQueue.ts:196-199
const result = await response.json();
const audioPart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
if (!audioPart?.inlineData?.data) {
  throw new Error("Nenhum áudio recebido da API.");
}
```

---

## 4. Gerenciamento de API Keys

### 4.1 Estrutura de uma API Key

```typescript
// src/types/geminiTts.ts:1-11
export interface GeminiTtsApiKey {
  id: string;                    // UUID gerado com crypto.randomUUID()
  key: string;                   // Chave da API (ex: AIza...)
  label: string;                 // Nome amigável (ex: "API Principal")
  requestCount: number;          // Contador de requests feitos
  lastUsed?: Date;               // Timestamp do último uso
  isActive: boolean;             // Se está ativa ou desabilitada
  status: 'unknown' | 'valid' | 'invalid' | 'no_credits' | 'suspended';
  statusMessage?: string;        // Mensagem descritiva do status
  lastValidated?: Date;          // Quando foi testada pela última vez
}
```

### 4.2 Sistema de Reserva de API Keys

**Problema resolvido:** Evitar que duas jobs usem a mesma API key simultaneamente, causando race conditions e violações de rate limit.

```typescript
// src/hooks/useGeminiTtsKeys.ts:7
const RESERVED_KEYS = new Map<string, string>(); // keyId -> jobId que está usando
```

**Funções principais:**

1. **reserveKeyForJob(keyId, jobId)** - Reserva uma key exclusivamente para um job
2. **releaseKeyFromJob(keyId, jobId)** - Libera a key ao finalizar o job
3. **isKeyReservedByOtherJob(keyId, currentJobId)** - Verifica se está reservada por outro job

```typescript
// src/hooks/useGeminiTtsKeys.ts:101-115
const reserveKeyForJob = useCallback((keyId: string, jobId: string) => {
  RESERVED_KEYS.set(keyId, jobId);
  console.log(`🔒 [JOB ${jobId.slice(0,8)}] Key "${keyLabel}" reservada`);
}, [apiKeys]);

const isKeyReservedByOtherJob = useCallback((keyId: string, currentJobId?: string) => {
  const reservedBy = RESERVED_KEYS.get(keyId);
  return reservedBy && reservedBy !== currentJobId;
}, []);
```

### 4.3 Seleção de API Key Disponível

**Algoritmo de seleção (src/hooks/useGeminiTtsKeys.ts:117-177):**

```
1º Prioridade: Keys VALIDADAS e ATIVAS
   - Filtra: isActive = true, status = 'valid'
   - Exclui: IDs em excludeIds (keys que falharam)
   - Exclui: Keys reservadas por outros jobs
   - Seleciona: A key com MENOR requestCount (distribuição de carga)

2º Prioridade: Keys DESCONHECIDAS (não testadas)
   - Filtra: isActive = true, status = 'unknown'
   - Útil quando nenhuma key foi validada ainda

3º Prioridade: Keys MARCADAS COMO INVÁLIDAS
   - Filtra: isActive = true, status = 'invalid'
   - Tenta de novo (pode ter sido erro temporário)

Se nenhuma disponível: Retorna null
```

### 4.4 Validação de API Keys

**Processo de teste (src/components/GeminiTtsTab.tsx:62-193):**

```typescript
const handleValidateApiKey = async (apiKey: GeminiTtsApiKey) => {
  // 1. Faz requisição de teste com texto "teste" e voz "Zephyr"
  const response = await fetch(testUrl, { method: "POST", ... });

  // 2. Analisa status HTTP
  if (response.status === 429 || response.status === 402) {
    // Sem créditos
    updateApiKey(apiKey.id, { status: 'no_credits', isActive: false });
  }
  else if (response.status === 403) {
    // API suspensa
    updateApiKey(apiKey.id, { status: 'suspended' });
  }
  else if (response.status === 400 || response.status === 401) {
    // API key inválida
    updateApiKey(apiKey.id, { status: 'invalid' });
  }
  else if (response.status >= 500) {
    // Erro temporário do servidor (NÃO marca como invalid)
    updateApiKey(apiKey.id, { status: 'unknown' });
  }
  else if (response.ok) {
    // ✅ Válida!
    updateApiKey(apiKey.id, {
      status: 'valid',
      statusMessage: 'API key autenticada com sucesso',
      isActive: true
    });
  }
}
```

**Tratamento de erros de rede:**
- **TypeError** ou **"Failed to fetch"** → NÃO marca como invalid (pode ser CORS/timeout)
- Mantém status como `unknown` para permitir retry futuro

### 4.5 Persistência em localStorage

```typescript
// src/hooks/useGeminiTtsKeys.ts:4
const STORAGE_KEY = 'gemini-tts-api-keys';

// Carregamento ao inicializar (linhas 10-25)
const [apiKeys, setApiKeys] = useState<GeminiTtsApiKey[]>(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    return parsed.map((key: any) => ({
      ...key,
      lastUsed: key.lastUsed ? new Date(key.lastUsed) : undefined,
      lastValidated: key.lastValidated ? new Date(key.lastValidated) : undefined
    }));
  }
  return [];
});

// Salvamento automático ao modificar (linhas 27-33)
const saveToStorage = useCallback((newKeys: GeminiTtsApiKey[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
}, []);
```

---

## 5. Sistema de Chunking

### 5.1 Limite de 800 Palavras

```typescript
// src/utils/geminiTtsChunks.ts:3
export const GEMINI_TTS_WORD_LIMIT = 800;
```

**Por que 800 palavras?**
- Limite da API Gemini TTS
- Garante qualidade de áudio
- Evita timeouts em requisições muito longas

### 5.2 Algoritmo de Divisão Inteligente

**Estratégia multi-nível (src/utils/geminiTtsChunks.ts:39-109):**

```
Nível 1: SENTENÇAS (. ! ?)
  ├─ Divide texto por pontos finais
  ├─ Tenta manter sentenças completas no mesmo chunk
  └─ Se cabe no limite de 800 palavras: adiciona ao chunk atual

Nível 2: VÍRGULAS (,)
  ├─ Se uma sentença tem >800 palavras
  ├─ Divide por vírgulas
  └─ Mantém coesão entre partes da frase

Nível 3: FORÇA BRUTA (forceSplitByWords)
  ├─ Se mesmo entre vírgulas tem >800 palavras
  ├─ Divide diretamente por contagem de palavras
  └─ Garante que NENHUM chunk ultrapasse o limite
```

**Implementação:**

```typescript
export function splitTextForGeminiTts(text: string, maxWords: number = 800): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  // 1. Divide em sentenças
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  for (const sentence of sentences) {
    const sentenceWordCount = countWords(sentence);

    // 2. Se sentença >800 palavras: divide por vírgulas
    if (sentenceWordCount > maxWords) {
      const parts = sentence.split(",");

      for (const part of parts) {
        const partWordCount = countWords(part);

        // 3. Se parte entre vírgulas AINDA >800: força bruta
        if (partWordCount > maxWords) {
          const hardSplits = forceSplitByWords(part, maxWords);
          chunks.push(...hardSplits);
        } else {
          // Adiciona ao chunk ou cria novo
          if (countWords(currentChunk) + partWordCount <= maxWords) {
            currentChunk += (currentChunk ? "," : "") + part;
          } else {
            chunks.push(currentChunk.trim());
            currentChunk = part;
          }
        }
      }
    } else {
      // Sentença cabe: adiciona ao chunk
      if (countWords(currentChunk) + sentenceWordCount <= maxWords) {
        currentChunk += (currentChunk ? " " : "") + sentence;
      } else {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }
  }

  // Salva último chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
```

### 5.3 Funções Auxiliares

```typescript
// Conta palavras
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Valida que nenhum chunk ultrapassa o limite
export function validateChunks(chunks: string[], maxWords: number = 800): boolean {
  return chunks.every((chunk) => countWords(chunk) <= maxWords);
}

// Divisão forçada por palavras (plano de emergência)
function forceSplitByWords(text: string, maxWords: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const forcedChunks: string[] = [];

  for (let i = 0; i < words.length; i += maxWords) {
    const chunkSlice = words.slice(i, i + maxWords);
    forcedChunks.push(chunkSlice.join(" "));
  }

  return forcedChunks;
}
```

---

## 6. Pipeline de Conversão de Áudio

### 6.1 Etapas de Conversão

```
API Gemini → PCM 16-bit Base64 → WAV → AudioBuffer → Concatenação → WAV final → MP3
```

### 6.2 PCM para WAV

**Formato recebido da API:**
- **Codec**: PCM 16-bit
- **Canais**: 1 (Mono)
- **Sample Rate**: 24000 Hz (24 kHz)
- **Encoding**: Base64

**Conversão (src/utils/pcmToWav.ts:52-75):**

```typescript
export function convertPcmToWav(base64Pcm: string, mimeType: string): Uint8Array {
  // 1. Extrai sample rate do mimeType (ex: "audio/pcm;rate=24000")
  const match = mimeType.match(/rate=(\d+)/);
  const sampleRate = match ? parseInt(match[1], 10) : 24000;

  // 2. Decodifica Base64 para ArrayBuffer
  const pcmData = base64ToArrayBuffer(base64Pcm);

  // 3. Parâmetros de áudio
  const bitsPerSample = 16;
  const numChannels = 1;
  const pcm16 = new Int16Array(pcmData);
  const numSamples = pcm16.length;

  // 4. Cria header WAV (44 bytes)
  const header = pcmToWavHeader(sampleRate, numChannels, numSamples, bitsPerSample);

  // 5. Concatena header + dados PCM
  const wavBytes = new Uint8Array(header.byteLength + pcmData.byteLength);
  wavBytes.set(new Uint8Array(header), 0);
  wavBytes.set(new Uint8Array(pcmData), header.byteLength);

  return wavBytes;
}
```

**Estrutura do header WAV:**
```
Offset  Size  Description
------  ----  -----------
0       4     "RIFF" (ChunkID)
4       4     FileSize - 8 (ChunkSize)
8       4     "WAVE" (Format)
12      4     "fmt " (Subchunk1ID)
16      4     16 (Subchunk1Size)
20      2     1 = PCM (AudioFormat)
22      2     1 = Mono (NumChannels)
24      4     24000 (SampleRate)
28      4     ByteRate (SampleRate * BlockAlign)
32      2     BlockAlign (NumChannels * BitsPerSample / 8)
34      2     16 (BitsPerSample)
36      4     "data" (Subchunk2ID)
40      4     DataSize (NumSamples * BlockAlign)
44      -     PCM audio data
```

### 6.3 Concatenação de AudioBuffers

**Processo (src/utils/audioUtils.ts:9-27):**

```typescript
export function concatAudioBuffers(buffers: AudioBuffer[], sampleRate?: number) {
  // 1. Determina canais e sample rate
  const channels = Math.max(...buffers.map(b => b.numberOfChannels));
  const rate = sampleRate || buffers[0].sampleRate;

  // 2. Calcula duração total
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);

  // 3. Cria contexto offline
  const ctx = new OfflineAudioContext(channels, totalLength, rate);
  const output = ctx.createBuffer(channels, totalLength, rate);

  // 4. Copia dados de cada buffer para o output
  let offset = 0;
  for (const b of buffers) {
    for (let ch = 0; ch < channels; ch++) {
      const out = output.getChannelData(ch);
      const src = b.getChannelData(Math.min(ch, b.numberOfChannels - 1));
      out.set(src, offset); // Copia amostras
    }
    offset += b.length;
  }

  return output;
}
```

### 6.4 AudioBuffer para WAV

**Conversão (src/utils/audioUtils.ts:29-82):**

```typescript
export function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;

  // 1. Calcula tamanho do arquivo
  const samples = buffer.length * numChannels;
  const bytesPerSample = bitDepth / 8;
  const bufferLength = 44 + samples * bytesPerSample;

  // 2. Cria ArrayBuffer e DataView
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // 3. Escreve header WAV (RIFF, fmt, data chunks)
  // ... (código de escrita do header)

  // 4. Interleave dos canais e escrita das amostras PCM
  const channelsData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelsData.push(buffer.getChannelData(ch));
  }

  // 5. Converte Float32 (-1.0 a 1.0) para Int16 (-32768 a 32767)
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let s = Math.max(-1, Math.min(1, channelsData[ch][i])); // Clamp
      s = s < 0 ? s * 0x8000 : s * 0x7fff; // Scale para Int16
      view.setInt16(offset, s, true); // Little-endian
      offset += 2;
    }
  }

  return arrayBuffer;
}
```

### 6.5 WAV para MP3

**Codificação MP3 (src/utils/wavToMp3.ts:6-86):**

```typescript
export function convertWavToMp3(wavBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const view = new DataView(arrayBuffer);

      // 1. Parse do header WAV
      const sampleRate = view.getUint32(24, true);
      const numChannels = view.getUint16(22, true);

      // 2. Extrai dados PCM (offset 44 = após header)
      const dataOffset = 44;
      const dataSize = view.getUint32(dataOffset - 4, true);
      const pcmData = new Int16Array(arrayBuffer, dataOffset, dataSize / 2);

      // 3. Inicializa encoder MP3 (lamejs)
      const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128); // 128kbps
      const mp3Data: Int8Array[] = [];

      // 4. Codifica em blocos de 1152 samples
      const sampleBlockSize = 1152;

      if (numChannels === 1) {
        // Mono
        for (let i = 0; i < pcmData.length; i += sampleBlockSize) {
          const sampleChunk = pcmData.subarray(i, i + sampleBlockSize);
          const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
          if (mp3buf.length > 0) mp3Data.push(mp3buf);
        }
      } else {
        // Stereo - separa canais
        const leftChannel = new Int16Array(pcmData.length / 2);
        const rightChannel = new Int16Array(pcmData.length / 2);

        for (let i = 0; i < pcmData.length / 2; i++) {
          leftChannel[i] = pcmData[i * 2];
          rightChannel[i] = pcmData[i * 2 + 1];
        }

        for (let i = 0; i < leftChannel.length; i += sampleBlockSize) {
          const leftChunk = leftChannel.subarray(i, i + sampleBlockSize);
          const rightChunk = rightChannel.subarray(i, i + sampleBlockSize);
          const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
          if (mp3buf.length > 0) mp3Data.push(mp3buf);
        }
      }

      // 5. Flush do encoder
      const mp3buf = mp3encoder.flush();
      if (mp3buf.length > 0) mp3Data.push(mp3buf);

      // 6. Cria Blob MP3
      const mp3Blob = new Blob(mp3Data as BlobPart[], { type: "audio/mp3" });
      resolve(mp3Blob);
    };

    reader.readAsArrayBuffer(wavBlob);
  });
}
```

**Parâmetros de codificação:**
- **Bitrate**: 128 kbps
- **Sample Rate**: Herdado do WAV (24000 Hz)
- **Canais**: Mono ou Stereo (geralmente Mono)

---

## 7. Sistema de Retry e Recuperação de Falhas

### 7.1 Estrutura de um Job

```typescript
// src/types/geminiTts.ts:13-31
export interface GeminiTtsJob {
  id: string;                        // UUID do job
  text: string;                      // Texto original
  voiceName: string;                 // Nome da voz (ex: "Kore")
  filename: string;                  // Nome do arquivo de saída
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;                  // 0-100%
  audioUrl?: string;                 // URL do áudio final (Blob URL)
  error?: string;                    // Mensagem de erro
  currentApiKeyId?: string;          // ID da API key reservada para este job

  // Chunking
  chunks: string[];                  // Array de chunks de texto (800 palavras cada)
  audioChunks: Blob[];               // Array de áudios WAV gerados
  currentChunk?: number;             // Índice do chunk sendo processado (0-based)
  failedChunks: number[];            // Índices dos chunks que falharam
  chunkRetries: Record<number, number>; // Contagem de retry por chunk
}
```

### 7.2 Sistema de Fila de Jobs

**Configuração (src/hooks/useGeminiTtsQueue.ts:22):**

```typescript
export function useGeminiTtsQueue(maxConcurrentJobs = 2) {
  const [jobs, setJobs] = useState<GeminiTtsJob[]>([]);
  const activeJobsCount = useRef(0);
  const queue = useRef<string[]>([]); // Fila de IDs de jobs
```

**Limite de jobs simultâneos:**
- **Padrão**: 2 jobs paralelos
- **Usado em GeminiTtsTab.tsx**: 3 jobs (`useGeminiTtsQueue(3)`)
- **Por quê?**: Evita sobrecarga de rate limiting nas APIs

### 7.3 Processo de um Job

**Fluxo completo (src/hooks/useGeminiTtsQueue.ts:42-426):**

```
1. Job é adicionado à fila
   ├─ addJob() cria o job com chunks
   ├─ Adiciona ID à queue.current
   └─ Aguarda vez de processar

2. processQueue() verifica se pode processar
   ├─ Checa se activeJobsCount < maxConcurrentJobs
   ├─ Remove jobId da fila
   └─ Incrementa activeJobsCount

3. Reserva API key EXCLUSIVA
   ├─ getNextValidKey([], jobId)
   ├─ reserveKeyForJob(keyId, jobId)
   └─ Se não houver key disponível: aguarda

4. LOOP 1: Processa TODOS os chunks
   ├─ Para cada chunk (0 até chunks.length - 1):
   │  ├─ processChunkWithRetry(chunkIndex, retry=0, failedKeys=[])
   │  ├─ Se falhar: marca chunk como falhado
   │  └─ Se sucesso: armazena Blob em generatedAudioChunks[i]
   └─ Identifica chunks falhados (onde generatedAudioChunks[i] === null)

5. LOOP DE REPROCESSAMENTO (até 3 tentativas)
   ├─ Para cada chunk falhado:
   │  ├─ processChunkWithRetry(failedIndex, retry=0, failedKeys=[])
   │  ├─ Testa TODAS as APIs disponíveis (lista de excludeIds vazia)
   │  └─ Remove da lista de falhados se sucesso
   └─ Repete até MAX_REPROCESS_ATTEMPTS ou sucesso

6. VALIDAÇÃO FINAL
   ├─ Calcula taxa de sucesso
   ├─ Se < 100%: ERRO CRÍTICO
   └─ Se = 100%: Prossegue para concatenação

7. CONCATENAÇÃO DE ÁUDIO
   ├─ Converte Blobs → ArrayBuffers
   ├─ Decodifica → AudioBuffers
   ├─ Concatena → AudioBuffer único
   ├─ Re-codifica → WAV
   └─ Converte → MP3

8. FINALIZAÇÃO
   ├─ Cria Blob URL
   ├─ Atualiza job: status="done", audioUrl, progress=100%
   ├─ Libera API key reservada
   ├─ Decrementa activeJobsCount
   └─ Chama processQueue() para próximo job
```

### 7.4 Retry por Chunk

**Função processChunkWithRetry (src/hooks/useGeminiTtsQueue.ts:102-230):**

```typescript
const processChunkWithRetry = async (
  chunkIndex: number,
  currentRetry: number = 0,
  failedKeyIds: string[] = []
): Promise<Blob> => {

  // 1. Calcula MAX_CHUNK_RETRIES dinamicamente
  const totalActiveKeys = apiKeys.filter(k =>
    k.isActive &&
    k.status !== 'suspended' &&
    k.status !== 'no_credits'
  ).length;
  const MAX_CHUNK_RETRIES = Math.max(totalActiveKeys - 1, 10);

  // 2. Seleciona API key
  let apiKeyObj = null;

  // Prioriza key reservada do job
  if (jobKeyId && !failedKeyIds.includes(jobKeyId)) {
    apiKeyObj = apiKeys.find(k => k.id === jobKeyId);
  }

  // Fallback: busca outra key
  if (!apiKeyObj) {
    apiKeyObj = getNextValidKey(failedKeyIds, jobId);
  }

  if (!apiKeyObj) {
    throw new Error("Nenhuma API key disponível");
  }

  // 3. Faz requisição à API
  const response = await fetch(apiUrl, { method: "POST", ... });

  // 4. Trata erros específicos
  if (response.status === 429 || response.status === 402 || response.status === 403) {
    // Marca key como problemática
    if (response.status !== 429) {
      markKeyNoCredits(apiKeyObj.id);
    }

    // Adiciona à lista de keys falhadas
    const updatedFailedKeys = [...failedKeyIds, apiKeyObj.id];

    // Retry com outra key
    if (currentRetry < MAX_CHUNK_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1s
      return processChunkWithRetry(chunkIndex, currentRetry + 1, updatedFailedKeys);
    }

    throw new Error("Todas as keys testadas falharam");
  }

  // 5. Se sucesso: converte PCM → WAV
  const wavBytes = convertPcmToWav(audioPart.inlineData.data, audioPart.inlineData.mimeType);
  return new Blob([wavBytes], { type: "audio/wav" });
};
```

**Estratégia de retry:**

1. **Rotação de APIs**: Ao falhar com uma key, tenta com outra
2. **Delay entre tentativas**: 1 segundo
3. **Máximo de retries dinâmico**: Baseado no número de APIs ativas (mínimo 10)
4. **Marcação de keys problemáticas**:
   - Status 402/403 → `markKeyNoCredits()` e `isActive = false`
   - Status 429 → Mantém ativa (pode ser rate limit temporário)

### 7.5 Reprocessamento de Chunks Falhados

**Loop de reprocessamento (src/hooks/useGeminiTtsQueue.ts:253-293):**

```typescript
let failedIndices = generatedAudioChunks
  .map((chunk, idx) => chunk === null ? idx : -1)
  .filter(idx => idx !== -1);

let reprocessAttempt = 0;
const MAX_REPROCESS_ATTEMPTS = 3;

while (failedIndices.length > 0 && reprocessAttempt < MAX_REPROCESS_ATTEMPTS) {
  reprocessAttempt++;
  console.log(`🔄 REPROCESSANDO (Tentativa ${reprocessAttempt}/${MAX_REPROCESS_ATTEMPTS})`);

  for (const failedIndex of [...failedIndices]) {
    try {
      // IMPORTANTE: Lista vazia de excludeIds para testar TODAS as APIs
      const wavBlob = await processChunkWithRetry(failedIndex, 0, []);
      generatedAudioChunks[failedIndex] = wavBlob;

      // Remove da lista de falhadas
      failedIndices.splice(failedIndices.indexOf(failedIndex), 1);

      console.log(`✅ Chunk ${failedIndex + 1} reprocessado com sucesso!`);
    } catch (retryError) {
      console.error(`❌ Chunk ${failedIndex + 1} continua falhando`);
    }
  }
}
```

**Diferença entre LOOP 1 e REPROCESSAMENTO:**

| Aspecto | LOOP 1 | REPROCESSAMENTO |
|---------|--------|-----------------|
| Objetivo | Processar todas as chunks pela 1ª vez | Recuperar chunks que falharam |
| excludeIds | Acumula keys que falharam | **Lista vazia** (testa TODAS) |
| Tentativas | MAX_CHUNK_RETRIES por chunk | 3 tentativas completas |
| Comportamento ao falhar | Marca chunk como falhado e continua | Tenta novamente até 3 vezes |

### 7.6 Validação de 100% de Sucesso

**Exigência estrita (src/hooks/useGeminiTtsQueue.ts:295-318):**

```typescript
const finalSuccessfulChunks = generatedAudioChunks.filter(chunk => chunk !== null);
const finalSuccessRate = (finalSuccessfulChunks.length / jobToProcess.chunks.length) * 100;

console.log(`📊 Taxa de sucesso: ${finalSuccessRate.toFixed(1)}%`);

// VALIDAÇÃO ESTRITA: Exige 100% ou ERRO
if (finalSuccessRate < 100) {
  const errorMsg = `
    ❌ FALHA CRÍTICA: Apenas ${finalSuccessfulChunks.length}/${jobToProcess.chunks.length} chunks foram geradas.

    Chunks falhadas: [${failedIndices.map(i => i + 1).join(', ')}]

    Todas as ${totalActiveKeys} APIs foram testadas após ${reprocessAttempt} tentativas de reprocessamento.

    Verifique:
    - Créditos das APIs
    - Conectividade de rede
    - Tamanho do texto nas chunks falhadas
  `;

  throw new Error(errorMsg);
}

console.log(`✅ TODAS as ${jobToProcess.chunks.length} chunks geradas com 100% de sucesso!`);
```

**Por que 100% de sucesso?**
- Evita áudios incompletos ou com partes faltando
- Garante qualidade do produto final
- Se não conseguir 100%, melhor falhar e informar o usuário

---

## 8. Fluxo de Dados Completo

### 8.1 Diagrama de Sequência

```
┌─────────────┐
│   Usuário   │
└─────┬───────┘
      │ 1. Digite texto + seleciona voz
      ▼
┌─────────────────────┐
│ GeminiTtsTab.tsx    │
│ handleGenerate()    │
└─────┬───────────────┘
      │ 2. addJob({ text, voiceName, filename })
      ▼
┌────────────────────────┐
│ useGeminiTtsQueue.ts   │
│ addJob()               │
└─────┬──────────────────┘
      │ 3. splitTextForGeminiTts(text) → chunks[]
      │ 4. Cria GeminiTtsJob com status='queued'
      │ 5. queue.current.push(jobId)
      ▼
┌────────────────────────┐
│ processQueue()         │
└─────┬──────────────────┘
      │ 6. Reserva API key exclusiva
      │    reserveKeyForJob(keyId, jobId)
      ▼
┌────────────────────────┐
│ LOOP 1: Processar      │
│ chunks                 │
└─────┬──────────────────┘
      │ 7. Para cada chunk:
      │    ┌─────────────────────────┐
      │    │ processChunkWithRetry() │
      │    └─────┬───────────────────┘
      │          │ 8. POST /generateContent
      │          ▼
      │    ┌──────────────────────┐
      │    │ API Gemini           │
      │    │ gemini-2.5-flash-tts │
      │    └─────┬────────────────┘
      │          │ 9. Retorna PCM Base64
      │          ▼
      │    ┌──────────────────────┐
      │    │ convertPcmToWav()    │
      │    └─────┬────────────────┘
      │          │ 10. Retorna Blob WAV
      │          ▼
      │    generatedAudioChunks[i] = wavBlob
      │
      ▼
┌────────────────────────┐
│ REPROCESSAMENTO        │
│ (chunks falhados)      │
└─────┬──────────────────┘
      │ 11. Até 3 tentativas
      │     Testa TODAS as APIs
      ▼
┌────────────────────────┐
│ VALIDAÇÃO 100%         │
└─────┬──────────────────┘
      │ 12. Se < 100%: ERRO
      │     Se = 100%: continua
      ▼
┌────────────────────────┐
│ CONCATENAÇÃO           │
└─────┬──────────────────┘
      │ 13. Blobs[] → ArrayBuffers[]
      │ 14. decodeToBuffer() → AudioBuffers[]
      │ 15. concatAudioBuffers() → AudioBuffer único
      │ 16. audioBufferToWav() → WAV final
      │ 17. convertWavToMp3() → MP3
      ▼
┌────────────────────────┐
│ FINALIZAÇÃO            │
└─────┬──────────────────┘
      │ 18. URL.createObjectURL(mp3Blob)
      │ 19. Atualiza job: status='done', audioUrl
      │ 20. releaseKeyFromJob(keyId, jobId)
      │ 21. activeJobsCount--
      │ 22. processQueue() → próximo job
      ▼
┌────────────────────────┐
│ Usuário recebe áudio   │
│ Player + botão Download│
└────────────────────────┘
```

### 8.2 Exemplo de Execução

**Entrada:**
```typescript
text: "Olá mundo. Este é um exemplo de geração de áudio. " +
      "Vamos criar um áudio longo para demonstrar o chunking. " +
      (repetir até ter 1500 palavras)

voiceName: "Kore" (voz feminina português)
filename: "exemplo_audio"
```

**Processamento:**

```
1. splitTextForGeminiTts() divide em 2 chunks:
   - Chunk 0: 800 palavras
   - Chunk 1: 700 palavras

2. Job criado:
   {
     id: "a1b2c3d4-e5f6-...",
     text: "...",
     voiceName: "Kore",
     filename: "exemplo_audio",
     status: "queued",
     progress: 0,
     chunks: ["chunk 0 text...", "chunk 1 text..."],
     audioChunks: [null, null],
     failedChunks: [],
     chunkRetries: {}
   }

3. processQueue() inicia:
   - activeJobsCount: 0 → 1
   - Reserva API key "Minha API Principal"
   - Status: "queued" → "processing"

4. LOOP 1:

   Chunk 0:
   - POST https://...gemini-2.5-flash-preview-tts:generateContent?key=AIza...
   - Body: { contents: [{ parts: [{ text: "chunk 0 text..." }] }], ... }
   - Response: { candidates: [{ content: { parts: [{ inlineData: { data: "base64..." } }] } }] }
   - convertPcmToWav() → Blob(54.3 KB, "audio/wav")
   - generatedAudioChunks[0] = Blob
   - Progress: 50%

   Chunk 1:
   - Mesma API key (reservada para o job)
   - convertPcmToWav() → Blob(47.8 KB, "audio/wav")
   - generatedAudioChunks[1] = Blob
   - Progress: 90%

5. VALIDAÇÃO:
   - successRate = 2/2 = 100% ✅
   - Prossegue para concatenação

6. CONCATENAÇÃO:
   [Blob 1, Blob 2] → [ArrayBuffer 1, ArrayBuffer 2]
   → decodeToBuffer() → [AudioBuffer 1, AudioBuffer 2]
   → concatAudioBuffers() → AudioBuffer único (duração: 1min 23s)
   → audioBufferToWav() → WAV final (2.1 MB)
   → convertWavToMp3() → MP3 (1.2 MB @ 128kbps)

7. FINALIZAÇÃO:
   - audioUrl = "blob:http://localhost:8080/abc123..."
   - status = "done"
   - progress = 100%
   - releaseKeyFromJob()
   - activeJobsCount: 1 → 0
```

**Saída:**
```html
<audio controls src="blob:http://localhost:8080/abc123..."></audio>
<a href="blob:http://localhost:8080/abc123..." download="exemplo_audio.mp3">
  📥 Baixar áudio (.mp3)
</a>
```

---

## 9. Vozes Disponíveis

### 9.1 Lista Completa (19 vozes)

```typescript
// src/utils/geminiTtsConfig.ts:12-32
export const GEMINI_VOICES: GeminiVoice[] = [
  { id: "Zephyr",      name: "Zephyr",      description: "Brilhante",     category: "neutral", languages: ["en-US"] },
  { id: "Puck",        name: "Puck",        description: "Animada",       category: "male",    languages: ["en-US"] },
  { id: "Charon",      name: "Charon",      description: "Informativa",   category: "male",    languages: ["en-US"] },
  { id: "Kore",        name: "Kore",        description: "Firme",         category: "female",  languages: ["pt-BR", "en-US"] },
  { id: "Fenrir",      name: "Fenrir",      description: "Excitável",     category: "male",    languages: ["en-US"] },
  { id: "Leda",        name: "Leda",        description: "Jovem",         category: "female",  languages: ["en-US"] },
  { id: "Orus",        name: "Orus",        description: "Firme",         category: "male",    languages: ["pt-BR"] },
  { id: "Aoede",       name: "Aoede",       description: "Ventilada",     category: "female",  languages: ["en-US"] },
  { id: "Callirrhoe",  name: "Callirrhoe",  description: "Descontraída",  category: "female",  languages: ["en-US"] },
  { id: "Autonoe",     name: "Autonoe",     description: "Brilhante",     category: "female",  languages: ["en-US"] },
  { id: "Enceladus",   name: "Enceladus",   description: "Sussurrada",    category: "male",    languages: ["en-US"] },
  { id: "Iapetus",     name: "Iapetus",     description: "Clara",         category: "male",    languages: ["en-US"] },
  { id: "Umbriel",     name: "Umbriel",     description: "Descontraída",  category: "male",    languages: ["en-US"] },
  { id: "Algieba",     name: "Algieba",     description: "Suave",         category: "male",    languages: ["es-US"] },
  { id: "Despina",     name: "Despina",     description: "Suave",         category: "female",  languages: ["es-US"] },
  { id: "Erinome",     name: "Erinome",     description: "Clara",         category: "female",  languages: ["fr-FR"] },
  { id: "Algenib",     name: "Algenib",     description: "Grave",         category: "male",    languages: ["fr-FR"] },
  { id: "Rasalgethi",  name: "Rasalgethi",  description: "Informativa",   category: "male",    languages: ["de-DE"] },
  { id: "Laomedeia",   name: "Laomedeia",   description: "Animada",       category: "female",  languages: ["de-DE"] },
];
```

### 9.2 Organização por Idioma

| Idioma | Vozes Masculinas | Vozes Femininas | Total |
|--------|------------------|-----------------|-------|
| **Português (pt-BR)** | Orus | Kore | **2** |
| **Inglês (en-US)** | Puck, Charon, Fenrir, Enceladus, Iapetus, Umbriel | Leda, Aoede, Callirrhoe, Autonoe | **10** (+Kore, +Zephyr) |
| **Espanhol (es-US)** | Algieba | Despina | **2** |
| **Francês (fr-FR)** | Algenib | Erinome | **2** |
| **Alemão (de-DE)** | Rasalgethi | Laomedeia | **2** |
| **Neutro** | - | - | **1** (Zephyr) |

### 9.3 Características das Vozes

**Português Brasileiro:**
- **Kore** (Feminina): Tom firme e profissional
- **Orus** (Masculino): Tom firme e autoritativo

**Inglês Americano:**
- **Puck** (Masculino): Animada e energética
- **Charon** (Masculino): Informativa e didática
- **Fenrir** (Masculino): Excitável e entusiasta
- **Enceladus** (Masculino): Sussurrada e suave
- **Iapetus** (Masculino): Clara e articulada
- **Umbriel** (Masculino): Descontraída e casual
- **Leda** (Feminino): Jovem e vibrante
- **Aoede** (Feminino): Ventilada e leve
- **Callirrhoe** (Feminino): Descontraída e amigável
- **Autonoe** (Feminino): Brilhante e expressiva

**Zephyr (Neutro):** Brilhante e versátil

---

## 10. Pontos Técnicos Importantes

### 10.1 Segurança e Validação

1. **API Keys em localStorage**: Armazenadas localmente (não enviadas para servidor)
2. **Validação antes de uso**: Sistema de teste antes de marcar como válida
3. **Ocultação de chaves**: Exibição mascarada por padrão (primeiros 8 + últimos 4 caracteres)
4. **Rate limiting local**: Evita requisições simultâneas na mesma key

### 10.2 Performance e Otimização

1. **Processamento paralelo**: Até 3 jobs simultâneos
2. **Chunking inteligente**: Mantém coesão semântica
3. **Reserva de API keys**: Evita race conditions
4. **Reuso de AudioContext**: Evita criar múltiplos contextos
5. **Blob URLs**: Uso de URLs temporárias para economia de memória

### 10.3 Tratamento de Erros

**Erros HTTP tratados:**

| Status | Significado | Ação |
|--------|-------------|------|
| 200 OK | Sucesso | Processa áudio |
| 400 Bad Request | Requisição inválida | Marca key como `invalid` |
| 401 Unauthorized | API key inválida | Marca key como `invalid` |
| 402 Payment Required | Sem créditos | Marca key como `no_credits`, `isActive = false` |
| 403 Forbidden | API suspensa | Marca key como `suspended` |
| 429 Too Many Requests | Rate limit | Tenta outra key (NÃO marca como invalid) |
| 500+ Server Error | Erro do servidor | Marca key como `unknown` (retry futuro) |

**Erros de rede:**
- **TypeError** / **"Failed to fetch"**: Mantém status `unknown` (pode ser CORS/timeout)

### 10.4 Logs e Debugging

**Console logs detalhados:**

```typescript
// Início do job
🚀 ============ INICIANDO JOB a1b2c3d4 ============
   📄 Arquivo: exemplo_audio
   🔢 Total de chunks: 2
   🔑 Buscando API key exclusiva...
✅ [JOB a1b2c3d4] Key "Minha API Principal" reservada com sucesso

// Processamento de chunks
🔄 [JOB a1b2c3d4] Chunk 1/2 | Key: "Minha API Principal" | Tentativa: 1/11 | APIs disponíveis: 5
✅ Chunk 1 gerado com sucesso usando Minha API Principal

// Reprocessamento
🔄 ============ REPROCESSANDO CHUNKS FALHADAS (Tentativa 1/3) ============
   Chunks a reprocessar: [2, 5, 7]

// Resultado final
📊 ============ RESULTADO FINAL ============
   Total de chunks: 10
   Chunks geradas: 10
   Chunks falhadas: 0
   Taxa de sucesso: 100.0%

✅ ============ JOB CONCLUÍDO COM 100% DE SUCESSO ============
   📄 Arquivo: exemplo_audio
   🔢 Total de chunks processadas: 10/10
   ✅ Taxa de sucesso: 100%
   ⏱️ Duração total: 5.23 minutos
   💾 Tamanho do MP3: 4.87 MB
   🔑 API key principal: Minha API Principal
```

### 10.5 Limitações Conhecidas

1. **Limite de 800 palavras por chunk**: Definido pela API Gemini
2. **Sample rate fixo**: 24 kHz (definido pela API)
3. **Formato de entrada**: Apenas texto plano (sem SSML)
4. **Bitrate MP3 fixo**: 128 kbps
5. **Mono apenas**: Todas as vozes são mono (1 canal)

### 10.6 Boas Práticas Implementadas

1. ✅ **Separação de responsabilidades**: Hooks, utils, components isolados
2. ✅ **Tipagem forte**: TypeScript em todos os arquivos
3. ✅ **Tratamento de erros**: Try-catch em operações assíncronas
4. ✅ **Logs estruturados**: Console logs com emojis e formatação
5. ✅ **Validação de dados**: Verificação antes de processar
6. ✅ **Persistência local**: localStorage para API keys
7. ✅ **UI responsiva**: Feedback visual de progresso
8. ✅ **Cleanup de recursos**: URL.revokeObjectURL após uso

---

## 📌 Conclusão

O sistema de geração de áudio Gemini TTS implementado é **robusto, escalável e resiliente**. Principais destaques:

- **Alta disponibilidade**: Sistema de rotação de múltiplas API keys
- **Recuperação automática**: Retry inteligente com reprocessamento
- **Qualidade garantida**: Validação de 100% de sucesso antes de finalizar
- **Pipeline completo**: PCM → WAV → Concatenação → MP3
- **Experiência do usuário**: Interface intuitiva com feedback em tempo real

Este sistema está pronto para **produção** e pode processar textos de qualquer tamanho, dividindo automaticamente em chunks e gerando áudios de alta qualidade usando as vozes do Google Gemini.

---

**Data da análise**: 30 de outubro de 2025
**Versão do modelo Gemini**: gemini-2.5-flash-preview-tts
**Vozes disponíveis**: 19 (5 idiomas)
**Formato de saída**: MP3 @ 128 kbps, 24 kHz, Mono
