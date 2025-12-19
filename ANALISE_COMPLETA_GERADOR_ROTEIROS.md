# ANÁLISE EXTREMAMENTE COMPLETA DO SISTEMA DE GERADOR DE ROTEIROS

## DOCUMENTO EXECUTIVO

Este documento fornece uma análise profunda, minuciosa e detalhada de CADA aspecto do sistema de gerador de roteiros AI. Ele cobre arquivos, componentes, fluxos de dados, funcionalidades, arquitetura e detalhes técnicos específicos.

**Última Atualização**: 2024  
**Projeto**: Fun Compute Mate - Gerador de Roteiros AI  
**Arquivos Analisados**: 126 arquivos TypeScript/TSX  
**Linhas de Código**: ~15,000+

---

# ÍNDICE

1. [Estrutura Geral do Projeto](#estrutura-geral)
2. [Tipos e Interfaces](#tipos-interfaces)
3. [Componentes React](#componentes-react)
4. [Hooks Customizados](#hooks-customizados)
5. [Serviços e APIs](#serviços-apis)
6. [Utilitários](#utilitários)
7. [Fluxos de Dados](#fluxos-dados)
8. [UI/UX Elements](#ui-ux)
9. [Arquitetura de Estado](#arquitetura-estado)
10. [Armazenamento Persistente](#armazenamento-persistente)

---

# <a name="estrutura-geral"></a>1. ESTRUTURA GERAL DO PROJETO

## Hierarquia de Diretórios

```
/src
├── /components
│   ├── ScriptGenerator.tsx             # Componente principal
│   ├── ScriptGeneratorWithModals.tsx   # Versão com modais
│   ├── ScriptGeneratorFixed.tsx        # Versão corrigida
│   ├── SimpleScriptGenerator.tsx       # Versão simplificada
│   ├── AgentManager.tsx                # Gerenciar agentes
│   ├── AgentModal.tsx                  # Modal para criar/editar agentes
│   ├── GeminiApiManager.tsx            # Gerenciar chaves API
│   ├── ApiModal.tsx                    # Modal para adicionar API
│   ├── ApiBatchModal.tsx               # Modal para adicionar múltiplas APIs
│   ├── ApiStatusMonitor.tsx            # Monitorar status das APIs
│   ├── ScriptHistoryTab.tsx            # Histórico de roteiros
│   ├── ScriptPreviewModal.tsx          # Preview de roteiros
│   ├── GeminiTtsTab.tsx                # Tab para TTS do Gemini
│   ├── ElevenLabsTab.tsx               # Tab para ElevenLabs TTS
│   ├── StatisticsDashboard.tsx         # Dashboard de estatísticas
│   ├── TrackingProvider.tsx            # Provedor de rastreamento
│   ├── ApprovedGuard.tsx               # Guard para acesso aprovado
│   ├── /admin                          # Componentes administrativos
│   └── /ui                             # Componentes UI da Shadcn/UI
├── /hooks
│   ├── useScriptGenerator.ts           # Hook principal de geração
│   ├── useParallelScriptGenerator.ts   # Hook para geração paralela
│   ├── useScriptHistory.ts             # Hook para histórico
│   ├── useGeminiKeys.ts                # Hook para gerenciar chaves API
│   ├── useGeminiTtsKeys.ts             # Hook para gerenciar chaves TTS
│   ├── useAgents.ts                    # Hook para gerenciar agentes
│   ├── useAudioQueue.ts                # Hook para fila de áudio
│   ├── useGeminiTtsQueue.ts            # Hook para fila TTS Gemini
│   ├── useElevenLabsQueue.ts           # Hook para fila ElevenLabs
│   ├── useAuth.ts                      # Hook de autenticação
│   └── useUserTracking.ts              # Hook de rastreamento de usuário
├── /services
│   ├── geminiApi.ts                    # Serviço básico da API Gemini
│   └── enhancedGeminiApi.ts            # Serviço aprimorado com retry/rate-limit
├── /types
│   ├── scripts.ts                      # Tipos para scripts e roteiros
│   ├── agents.ts                       # Tipos para agentes
│   ├── analytics.ts                    # Tipos para analytics
│   └── geminiTts.ts                    # Tipos para TTS
├── /utils
│   ├── promptInjector.ts               # Injetor de contexto em prompts
│   ├── chunkValidation.ts              # Validação de chunks
│   ├── chunkCalculator.ts              # Cálculo de chunks
│   ├── chunkText.ts                    # Divisão de texto em chunks
│   ├── srtGenerator.ts                 # Gerador de SRT
│   ├── languageDetection.ts            # Detecção de idioma
│   ├── languagePrompt.ts               # Prompts para idiomas
│   ├── contextCoherence.ts             # Coerência de contexto
│   ├── placeholderUtils.ts             # Utilitários de placeholders
│   ├── audioUtils.ts                   # Utilitários de áudio
│   ├── wavToMp3.ts                     # Conversão WAV para MP3
│   ├── pcmToWav.ts                     # Conversão PCM para WAV
│   ├── config.ts                       # Configurações
│   ├── elevenLabsChunks.ts             # Chunking para ElevenLabs
│   ├── geminiTtsChunks.ts              # Chunking para Gemini TTS
│   ├── elevenLabsConfig.ts             # Config de ElevenLabs
│   ├── geminiTtsConfig.ts              # Config de Gemini TTS
│   └── utils.ts                        # Utilitários gerais
├── /data
│   ├── languages.ts                    # Lista de idiomas suportados
│   └── promptTemplates.ts              # Templates de prompts
├── /pages
│   ├── Index.tsx                       # Página principal
│   ├── Auth.tsx                        # Página de autenticação
│   ├── Settings.tsx                    # Página de configurações
│   ├── Admin.tsx                       # Página admin
│   └── NotFound.tsx                    # Página 404
└── /integrations
    └── /supabase
        ├── client.ts                   # Cliente Supabase
        └── types.ts                    # Tipos do Supabase
```

---

# <a name="tipos-interfaces"></a>2. TIPOS E INTERFACES

## 2.1 Scripts (`/types/scripts.ts`)

### GeminiApiKey
```typescript
interface GeminiApiKey {
  id: string;                          // UUID único da chave
  name: string;                        // Nome descritivo
  key: string;                         // A chave API em si
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';  // Modelo Gemini
  isActive: boolean;                   // Ativa/desativa a chave
  requestCount: number;                // Número de requisições feitas
  lastUsed?: Date;                     // Última vez usada
  status?: 'valid'|'invalid'|'suspended'|'rate_limited'|'unknown'|'checking';
  statusMessage?: string;              // Mensagem de status
  lastValidated?: Date;                // Última validação
}
```

**Propósito**: Armazena credenciais de API Gemini com metadados de uso e validação.

### ScriptGenerationRequest
```typescript
interface ScriptGenerationRequest {
  title: string;                       // Título do vídeo
  agentId?: string;                    // ID do agente (usa configs do agente)
  channelName?: string;                // Nome do canal (sobrescreve agente)
  premisePrompt?: string;              // Prompt para premissa (sobrescreve agente)
  scriptPrompt?: string;               // Prompt para roteiro (sobrescreve agente)
  duration?: number;                   // Duração em minutos (sobrescreve agente)
  language?: string;                   // Idioma (sobrescreve agente)
  location?: string;                   // Localização/público (sobrescreve agente)
  premiseWordTarget?: number;          // Palavras alvo para premissa (sobrescreve agente)
}
```

**Propósito**: Especifica parâmetros para gerar um roteiro. Pode usar agente como base e sobrescrever campos específicos.

### ScriptGenerationResult
```typescript
interface ScriptGenerationResult {
  premise: string;                     // Premissa gerada (planejamento)
  script: string[];                    // Array de chunks do roteiro
  chunks: ScriptChunk[];               // Detalhes de cada chunk
  totalWords: number;                  // Total de palavras
  estimatedDuration: number;           // Duração estimada em minutos
  agentUsed?: string;                  // Nome do agente usado
}
```

**Propósito**: Resultado completo de uma geração de roteiro.

### ScriptChunk
```typescript
interface ScriptChunk {
  id: string;                          // UUID único do chunk
  content: string;                     // Conteúdo do chunk
  wordCount: number;                   // Palavras neste chunk
  chunkIndex: number;                  // Índice (0, 1, 2, ...)
  isComplete: boolean;                 // Completamente gerado?
}
```

**Propósito**: Representa um segmento gerado do roteiro.

### ScriptGenerationProgress
```typescript
interface ScriptGenerationProgress {
  stage: 'premise' | 'script';         // Estágio atual (premissa ou roteiro)
  currentChunk: number;                // Chunk atual sendo gerado
  totalChunks: number;                 // Total de chunks
  completedWords: number;              // Palavras completadas até agora
  targetWords: number;                 // Meta de palavras
  isComplete: boolean;                 // Geração completa?
  percentage: number;                  // Progresso em %
  currentApiKey?: string;              // Qual API key está sendo usada
  message?: string;                    // Mensagem de progresso
}
```

**Propósito**: Rastreia o progresso em tempo real durante a geração.

### BatchScriptRequest
```typescript
interface BatchScriptRequest {
  titles: string[];                    // Lista de títulos para gerar
  agentId?: string;                    // Agente para usar
  batchSettings: {
    delayBetweenItems: number;         // Delay entre roteiros (ms)
    delayBetweenChunks: number;        // Delay entre chunks (ms)
    maxRetries: number;                // Máximo de tentativas
    autoSaveToHistory: boolean;        // Salvar automaticamente?
  }
}
```

**Propósito**: Configuração para gerar múltiplos roteiros em lote.

## 2.2 Agentes (`/types/agents.ts`)

### Agent
```typescript
interface Agent {
  id: string;                          // UUID único
  name: string;                        // Nome do agente
  description?: string;                // Descrição
  premisePrompt: string;               // Template de prompt para premissa
  scriptPrompt: string;                // Template de prompt para roteiro
  language: string;                    // Idioma padrão (ex: 'pt-BR')
  location: string;                    // Localização/público alvo
  channelName?: string;                // Nome do canal padrão
  duration: number;                    // Duração padrão em minutos
  premiseWordTarget: number;           // Palavras alvo para premissa
  autoGenerateAudio?: boolean;         // Gerar áudio automaticamente?
  voiceId?: string;                    // ID da voz padrão
  createdAt: Date;                     // Data de criação
  updatedAt: Date;                     // Data da última atualização
}
```

**Propósito**: Configura um "persona" com prompts e preferências pré-definidas.

---

# <a name="componentes-react"></a>3. COMPONENTES REACT

## 3.1 ScriptGenerator.tsx (Componente Principal)

### Estrutura

```typescript
interface ScriptGeneratorProps {
  onScriptGenerated?: (script: string, title: string) => void;
}
```

### Estado Local

- `selectedAgentId`: ID do agente selecionado
- `request`: Dados da requisição de geração
- `isDialogOpen`: Modal de adicionar API aberta?

### Funcionalidades Principais

1. **Seleção de Agente**
   - Dropdown com agentes carregados
   - Exibe informações do agente selecionado
   - Limpa overrides ao selecionar novo agente

2. **Entrada do Título**
   - Input obrigatório para título do vídeo
   - Validação antes da geração

3. **Configuração Manual** (quando sem agente)
   - Nome do canal (obrigatório)
   - Duração em minutos
   - Idioma (dropdown: pt-BR, en-US)
   - Localização
   - Palavras alvo para premissa
   - Prompt para premissa (textarea)
   - Prompt para roteiro (textarea)

4. **Indicador de API**
   - Mostra quantas APIs estão ativas
   - Desabilita "Gerar" se nenhuma API ativa

5. **Geração**
   - Botão "Gerar Roteiro" dispara `generateScript()`
   - Desabilitado durante geração ou sem APIs ativas

### UI Components Usados

```
Tabs (3 abas)
├── "Gerar Roteiro"
│   ├── Card com inputs
│   ├── Progress bar (durante geração)
│   └── Resultado (premissa + roteiro)
├── "Agentes"
│   └── AgentManager
└── "APIs"
    └── GeminiApiManager
```

### Fluxo de Geração

1. Usuário clica "Gerar Roteiro"
2. Validações: título, agente ou canal, APIs ativas
3. Chamada `generateScript(request, selectedAgent, apiKeys)`
4. Hook atualiza `progress` em tempo real
5. Exibe resultado com opções:
   - Copiar premissa/roteiro
   - Baixar como TXT
   - Enviar para áudio

---

## 3.2 AgentManager.tsx

### Responsabilidades

1. **Criar Agente**
   - Botão "+ Novo Agente" abre modal
   - Modal vazio para preencher dados

2. **Listar Agentes**
   - Grid 3 colunas em desktop
   - Cards com informações do agente
   - Destaca agente selecionado com ring dourado

3. **Editar Agente**
   - Clique em card abre AgentModal para edição
   - Prévia dos dados do agente

4. **Deletar Agente**
   - Confirma antes de deletar
   - Remove do estado

5. **Duplicar Agente**
   - Cria cópia com "(Cópia)" no nome
   - Nova data de criação
   - Novo UUID

---

## 3.3 AgentModal.tsx

### Campos do Formulário

```typescript
{
  name: string;                  // Nome do agente
  channelName: string;           // Nome do canal
  description: string;           // Descrição
  language: string;              // Idioma (dropdown searchável)
  location: string;              // Localização
  duration: number;              // Duração em minutos
  premiseWordTarget: number;     // Palavras para premissa
  premisePrompt: string;         // Prompt de premissa (textarea)
  scriptPrompt: string;          // Prompt de roteiro (textarea)
}
```

### Funcionalidades Especiais

1. **Dropdown de Idiomas com Busca**
   - Lista popular: pt-BR, en-US, es-ES, fr-FR
   - Busca em todos os idiomas suportados
   - Debounce de 150ms
   - Mostra bandeiras

2. **Upload de Arquivo de Prompt**
   - Botão de upload para premisePrompt
   - Botão de upload para scriptPrompt
   - Apenas arquivos .txt
   - Carrega conteúdo para textarea

3. **Auto-resize de Textareas**
   - Crescem conforme usuário digita

---

## 3.4 GeminiApiManager.tsx

### Fluxo Principal

1. **Adicionar API Key Única**
   - Dialog com 3 campos:
     - Nome (obrigatório)
     - Chave API (obrigatório)
     - Modelo (dropdown)
   - Valida antes de adicionar

2. **Adicionar Múltiplas APIs em Lote**
   - Abre ApiBatchModal
   - Permite colar múltiplas chaves (uma por linha)
   - Processa todas de uma vez

3. **Validar API Key**
   - Botão "Testar" para cada chave
   - Faz requisição leve à API Gemini
   - Atualiza status (válida, inválida, suspended, rate_limited)
   - Mostra mensagem descritiva

4. **Toggle Ativa/Inativa**
   - Checkbox para ativar/desativar chave
   - Apenas chaves ativas são usadas

5. **Deletar API Key**
   - Confirma antes de deletar
   - Remove do estado

6. **Mostrar/Ocultar Chave**
   - Toggle de olho para revelar chave

7. **Monitorar Status**
   - ApiStatusMonitor exibe:
     - Total de chaves
     - Chaves ativas
     - Chaves com problemas
     - Limite de uso por chave

---

## 3.5 ScriptHistoryTab.tsx

### Funcionalidades

1. **Listar Histórico**
   - Exibe todos os roteiros gerados previamente
   - Ordenado por data (mais recentes primeiro)

2. **Buscar**
   - Input de busca por:
     - Título
     - Conteúdo do roteiro
     - Nome do agente

3. **Filtrar**
   - Toggle: "Todos" ou "Favoritos"

4. **Favoritar**
   - Estrela para marcar como favorito
   - Persiste no localStorage

5. **Ações por Roteiro**
   - Copiar premissa/roteiro
   - Baixar premissa/roteiro como TXT
   - Baixar como SRT (para legendas)
   - Deletar do histórico
   - Visualizar em modal

6. **Preview Modal**
   - Mostra título, premissa, roteiro
   - Opção de copiar/baixar do modal
   - Toggle favoritar dentro do modal

---

## 3.6 Componentes de UI

### Componentes Shadcn/UI Usados

- **Button**: Com variantes (ghost, outline, default)
- **Card**: CardHeader, CardContent, CardTitle
- **Input**: Campos de texto
- **Textarea**: Áreas de texto multilinha
- **Select**: Dropdowns
- **Tabs**: Abas (TabsList, TabsTrigger, TabsContent)
- **Dialog**: Modais
- **Badge**: Pequenos rótulos de status
- **Progress**: Barra de progresso
- **DropdownMenu**: Menus suspensos
- **Alert**: Alertas de informação

---

# <a name="hooks-customizados"></a>4. HOOKS CUSTOMIZADOS

## 4.1 useScriptGenerator.ts

### Hook Principal de Geração

```typescript
export const useScriptGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ScriptGenerationProgress | null>(null);
  const [result, setResult] = useState<ScriptGenerationResult | null>(null);
  const { toast } = useToast();

  const generateScript = async (
    request: ScriptGenerationRequest,
    agent: Agent | null,
    apiKeys: GeminiApiKey[]
  ): Promise<ScriptGenerationResult>

  const clearResult = () => void

  return {
    generateScript,
    clearResult,
    isGenerating,
    progress,
    result
  };
};
```

### Algoritmo de Geração (CRÍTICO)

**Etapa 1: Validações Iniciais**
```
✓ Validar que agente OU channelName está definido
✓ Validar que premisePrompt e scriptPrompt existem
✓ Filtrar apenas APIs ativas e válidas
```

**Etapa 2: Gerar Premissa**
```
1. Injetar contexto automaticamente no prompt
2. Chamar enhancedGeminiService.generatePremise()
3. Receber premissa (estrutura do vídeo)
4. Contar palavras da premissa
5. Atualizar progress a 10%
```

**Etapa 3: Gerar Roteiro**

Se roteiro > 1000 palavras (múltiplos chunks):
```
Para cada chunk (i = 0 até numberOfChunks - 1):
  1. Calcular targetWords para este chunk
  2. Construir prompt com buildChunkPrompt()
     - Incluir contexto COMPLETO (não apenas 600 chars)
     - Incluir toda a premissa
     - Incluir TODO o roteiro acumulado até agora
     - Flag isLastChunk = true se último
  3. Chamar generateScriptChunk()
  4. Adicionar chunk ao roteiro acumulado
  5. Validar contra duplicação
  6. Atualizar progresso (35% + ((i / totalChunks) * 55%))
```

Se roteiro <= 1000 palavras (único chunk):
```
1. Chamar generateScriptChunk() uma vez
2. Manter isLastChunk = true
```

**Etapa 4: Retornar Resultado**
```
Calcular:
- totalWords = soma de wordCounts
- estimatedDuration = totalWords / 150
Atualizar progress a 100%
Mostrar toast de sucesso
```

### Pontos Críticos de Continuidade

1. **Contexto Completo**: Cada chunk recebe TODO o roteiro anterior (não truncado)
2. **Flag isLastChunk**: AI sabe quando deve finalizar
3. **Validação de Idioma**: Força idioma na construção do prompt
4. **Duplicação**: Detecta trechos repetidos de 30+ palavras
5. **Injeção de Contexto**: Adiciona automaticamente informações de vídeo antes do prompt

---

## 4.2 useParallelScriptGenerator.ts

### Para Geração em Lote

```typescript
export const useParallelScriptGenerator = (agents: Agent[]) => {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [concurrentLimit, setConcurrentLimit] = useState(1);

  // Funções principais
  const addJob = (title: string, agentId: string) => void;
  const processJob = (jobId: string) => Promise<void>;
  const cancelJob = (jobId: string) => void;
  const clearCompleted = () => void;

  return { jobs, concurrentLimit, addJob, processJob, cancelJob, ... };
};
```

### Controle de Concorrência

- `concurrentLimit`: Quantos roteiros gerar simultaneamente (padrão: 1)
- `activeJobCount`: Rastreamento de jobs em execução
- `globalApisInUse`: Evita usar mesma API em múltiplos jobs

### Por Job:
- Rotação de APIs para iniciar com diferentes chaves
- Rastreamento de APIs já usadas neste job
- Logs detalhados de cada etapa

---

## 4.3 useScriptHistory.ts

### Gerenciamento de Histórico

```typescript
export const useScriptHistory = () => {
  const [history, setHistory] = useState<ScriptHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const addToHistory = (job: GenerationJob, agentName: string) => void;
  const removeFromHistory = (jobId: string) => void;
  const clearHistory = () => void;
  const toggleFavorite = (jobId: string) => void;
  const getFavorites = () => ScriptHistoryItem[];
  const updateAudioInfo = (scriptId: string, audioData: {...}) => void;

  return { history, addToHistory, removeFromHistory, ... };
};
```

### Persistência

- **Storage Key**: `script-generation-history-v2`
- **Máximo**: 100 itens (trunca ao adicionar novo)
- **Sincronização**: Entre abas via Storage Event
- **Dados por Item**:
  - title, premise, script, wordCount
  - isFavorite, generatedAt
  - agentName, status
  - audioJobId, audioUrl, audioStatus, audioProgress

---

## 4.4 useGeminiKeys.ts

### Gerenciar Chaves API Gemini

```typescript
export const useGeminiKeys = () => {
  const [apiKeys, setApiKeys] = useState<GeminiApiKey[]>([]);

  const addApiKey = (newApiKey: Omit<GeminiApiKey, 'id'|'requestCount'|'isActive'>) => GeminiApiKey;
  const addMultipleApiKeys = (newApiKeys: [...]) => GeminiApiKey[];
  const removeApiKey = (id: string) => void;
  const toggleApiKey = (id: string) => void;
  const updateApiKey = (id: string, updates: Partial<GeminiApiKey>) => void;
  const getActiveApiKeys = () => GeminiApiKey[];

  return { apiKeys, activeApiKeys, addApiKey, removeApiKey, ... };
};
```

### Storage

- **Storage Key**: `gemini-api-keys`
- **Formato**: JSON serializado com conversão de datas
- **Sincronização**: Evento `gemini-keys-storage-updated`

---

## 4.5 useAgents.ts

### Gerenciar Agentes

```typescript
export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);

  const createAgent = (request: CreateAgentRequest) => Agent;
  const updateAgent = (request: UpdateAgentRequest) => Agent | null;
  const deleteAgent = (id: string) => boolean;
  const getAgent = (id: string) => Agent | null;
  const duplicateAgent = (id: string, newName?: string) => Agent | null;

  return { agents, createAgent, updateAgent, deleteAgent, getAgent, duplicateAgent };
};
```

### Storage

- **Storage Key**: `script-agents`
- **Sincronização**: Evento `agents-storage-updated`

---

# <a name="serviços-apis"></a>5. SERVIÇOS E APIs

## 5.1 GeminiApiService (`geminiApi.ts`)

### Classe Estática

```typescript
export class GeminiApiService {
  static async generateContent(
    prompt: string,
    apiKey: GeminiApiKey,
    temperature?: number
  ): Promise<string>

  static async validateApiKey(
    apiKey: GeminiApiKey
  ): Promise<ApiKeyStatus>

  static async validateApiKeyLight(
    apiKey: GeminiApiKey
  ): Promise<string>

  static getErrorMessage(error: string): string
}
```

### Geração de Conteúdo

1. **Construção de Request**
   - URL: `https://generativelanguage.googleapis.com/v1/models/{model}:generateContent`
   - Fallback para `/v1beta/models` se 404

2. **Configuração de Generation**
   - `temperature`: 0.7 (padrão)
   - `topK`: 40
   - `topP`: 0.95
   - `maxOutputTokens`: 8192

3. **Timeout**: 120 segundos

4. **Tratamento de Erro**
   - 429: `API_RATE_LIMIT` (retry 429 Too Many Requests)
   - 403: `API_KEY_SUSPENDED`, `API_KEY_INVALID`, `API_KEY_PRO_BILLING_REQUIRED`
   - 404: `MODEL_NOT_FOUND`
   - 400: `API_REQUEST_INVALID`
   - 500+: `API_SERVER_ERROR`

### Validação de API Key

- Requisição leve com prompt: "Responda apenas com 'sucesso'"
- Timeout: 15 segundos
- Retorna: `isValid`, `status`, `message`, `lastChecked`

---

## 5.2 EnhancedGeminiService (`enhancedGeminiApi.ts`)

### Serviço Avançado com Retry e Rate Limiting

```typescript
export class EnhancedGeminiService {
  private static instance: EnhancedGeminiService;
  
  static getInstance(): EnhancedGeminiService
  
  async generatePremise(
    prompt: string,
    apiKeys: GeminiApiKey[],
    targetWords: number,
    onProgress?: (msg: string) => void
  ): Promise<{ content: string; usedApiId: string }>

  async generateScriptChunk(
    prompt: string,
    apiKeys: GeminiApiKey[],
    context: GenerationContext,
    onProgress?: (msg: string) => void
  ): Promise<{ content: string; usedApiId: string }>

  isKeyAvailable(apiId: string): boolean
}
```

### Controle de Rate Limiting

**Limites por Modelo** (Plano Gratuito do Google):

```typescript
{
  'gemini-2.5-pro': { rpm: 5, rpd: 100, tpm: 125000 },
  'gemini-2.5-flash': { rpm: 10, rpd: 250, tpm: 250000 },
  'gemini-2.5-flash-lite': { rpm: 15, rpd: 1000, tpm: 250000 },
  'gemini-2.0-flash': { rpm: 15, rpd: 200, tpm: 1000000 },
  // ... outros modelos
}
```

**Gerenciamento de Estado por Chave**

```typescript
// Rastreamento
apiRequestsPerMinute: Map<string, number[]>       // timestamps
apiRequestsPerDay: Map<string, number[]>          // timestamps
apiTokensPerMinute: Map<string, { timestamp, tokens }[]>  // TPM

// Bloqueios
keyCooldownUntil: Map<string, number>             // RPM cooldown
keyExhaustedUntil: Map<string, number>            // RPD esgotada até
keyBlockedUntil: Map<string, number>              // Bloqueio temporário
keyBlockReason: Map<string, string>               // Razão do bloqueio

// Locks
apiInUse: Map<string, boolean>                    // Evita uso simultâneo
apiLastRequestTime: Map<string, number>           // Controle RPM (31s mín)
```

### Algoritmo de Seleção de API

1. **Filtro de Disponibilidade**:
   - ❌ Suspensas
   - ❌ Inválidas
   - ❌ Bloqueadas (quarentena)
   - ❌ Esgotadas (RPD)
   - ❌ Em cooldown RPM
   - ❌ Em uso neste momento

2. **Rotação Simples**: Usa `apiRotationIndex` para circular

3. **Retry Automático**:
   - Máximo 100 falhas antes de pular chave
   - Reset a cada 5 minutos

### Tratamento de Erro com Recuperação

```typescript
429 (Rate Limit)
  → Ativa cooldown de 60s
  → Marca chave em cooldown RPM
  → Tenta próxima chave

403 (Forbidden) com CONSUMER_SUSPENDED
  → Marca como SUSPENDED
  → Quarentena por 24h

403 com "permission"
  → Se gemini-2.5-pro: Marca como PRO_BILLING_REQUIRED
  → Se outro: Marca como INVALID

503 (Server Error)
  → Retry com backoff exponencial
```

### Persistência

- **Chaves Exauridas**: localStorage `gemini_exhausted_keys`
- **Chaves em Quarentena**: localStorage `gemini_quarantined_keys`
- **Sincronização**: Carrega ao inicializar

---

# <a name="utilitários"></a>6. UTILITÁRIOS

## 6.1 promptInjector.ts

### Injeção Automática de Contexto

**3 Funções Principais:**

#### `buildLanguageEnforcementBlock(languageCode, languageName)`

Cria bloco AGRESSIVO bilíngue para forçar idioma:

```
🚨 REGRA CRÍTICA #0 - IDIOMA DE SAÍDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Instruções técnicas em PORTUGUÊS
🎯 MAS conteúdo gerado em ${IDIOMA_ALVO}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ NUNCA misture idiomas
✅ SEMPRE 100% no idioma alvo
```

Mapeamento de 18 idiomas com instruções nativas.

#### `injectPremiseContext(userPrompt, context)`

Estrutura para geração de premissa:

```
1. Language Enforcement Block (SEMPRE primeiro!)
2. Informações do Vídeo (título, duração, idioma, público)
3. Diretrizes para Criação da Premissa
   - Aviso: São INSTRUÇÕES, não FRASES para copiar
4. Definição de Premissa vs Roteiro
5. User Prompt (wrapped em avisos)
```

#### `buildChunkPrompt(userPrompt, context)`

Construtor avançado para chunks do roteiro:

```
1. Language Enforcement (CRÍTICO)
2. REGRA CRÍTICA #1: Não escrever meta-texto
   - ❌ "De acuerdo, aquí tienes..."
   - ✅ Começar direto com narrativa
3. REGRA CRÍTICA #2: Exemplos NÃO são para copiar
4. Título do Vídeo
5. Premissa (SIGA FIELMENTE)
6. Se tem contexto anterior:
   - Bloco anti-duplicação
   - Contexto completo (truncado a 6000 palavras)
   - Últimas 4 frases (ponto de continuação)
7. Instruções específicas:
   - Se Chunk 1: Gancho forte, não recapitule
   - Se Chunk N: Continue normalmente
   - Se Chunk Final: Complete tudo, finalize bem
8. User Prompt (wrapped em avisos)
9. Regras obrigatórias de formato
```

### Força de Contexto

- **MAX_CONTEXT_WORDS**: 6000 (não excede limites de token)
- **Language Enforcement**: Bilíngüe em PORTUGUÊS + idioma alvo
- **Anti-Duplicação**: Detecta 30+ palavras repetidas
- **Anti-Cópia**: Marca exemplos como "INSPIRAÇÃO, não CÓPIA"

---

## 6.2 chunkValidation.ts

### Validação de Chunks Gerados

```typescript
export function validateChunk(
  newChunk: string,
  previousChunk: string | null,
  chunkIndex: number,
  fullPreviousContent?: string,
  expectedLanguage?: string
): ChunkValidationResult
```

**Validações Implementadas:**

| Validação | Descrição | Erro/Aviso |
|-----------|-----------|-----------|
| **A: Palavra Cortada** | Primeira palavra < 3 chars e minúscula | ERRO |
| **B: Começa Minúscula** | Primeira letra é `[a-z]` | ERRO |
| **C: Duplicação Recente** | Últimas 50 palavras do anterior aparecem | ERRO |
| **D: Duplicação Long-Range** | 30+ palavras já existem no roteiro | ERRO |
| **F: Mistura de Idiomas** | PT% > 3 E EN% > 3 | ERRO |
| **G: Chunk Muito Curto** | < 280 palavras (70% de 400) | AVISO |

**Detecção de Idioma:**

```typescript
PORTUGUESE_INDICATORS = [
  'você', 'não', 'também', 'até', 'então', 'está', 'são', ...
]

ENGLISH_INDICATORS = [
  'you', 'have', 'been', 'will', 'could', 'should', 'can', ...
]

// Considera "misturado" se ambos > 3%
isMixed = (ptPercentage > 3) && (enPercentage > 3)
```

### Função `findNaturalCutPoint()`

Corta texto em ponto natural próximo do alvo:

1. **1ª Prioridade**: Quebra de parágrafo (linha em branco)
2. **2ª Prioridade**: Ponto final `.!?`
3. **Fallback**: Exato no número de palavras

---

## 6.3 srtGenerator.ts

### Gerador de Legendas SRT

```typescript
export function generateSrtContent(
  script: string,
  duration: number,
  config?: SrtConfig
): string

export function calculateSrtStats(script: string): {
  sentences: number;
  words: number;
  estimatedDuration: number;
}
```

**Configuração Padrão:**

```typescript
{
  blockDurationSeconds: 30,      // Tempo de cada bloco
  blockIntervalMs: 20,           // Intervalo de sincronização
  maxCharsPerBlock: 500,         // Máximo de caracteres por bloco
  minWordsPerBlock: 30,          // Mínimo de palavras
  maxWordsPerBlock: 100          // Máximo de palavras
}
```

**Algoritmo:**

1. Divide em sentenças por `.!?`
2. Agrupa em blocos respeitando limites
3. Calcula timestamps (HH:MM:SS,mmm)
4. Retorna formato SRT:
   ```
   1
   00:00:00,000 --> 00:00:30,000
   Primeiro bloco de texto...

   2
   00:00:30,000 --> 00:01:00,000
   Segundo bloco de texto...
   ```

---

## 6.4 languageDetection.ts

### Detecção de Idioma

```typescript
export function getLanguageFromTitleOrDefault(
  title: string,
  defaultLanguage?: string
): string

export function detectLanguageFromTitle(
  title: string
): { detected: string; confidence: number }
```

**Estratégia:**

1. Analisa palavras em português vs inglês
2. Retorna idioma com maior confiança
3. Fallback: `defaultLanguage` ou `'pt-BR'`

---

# <a name="fluxos-dados"></a>7. FLUXOS DE DADOS

## 7.1 Fluxo Principal de Geração

```
┌─────────────────────────────────────────────────────────────┐
│                     PÁGINA INDEX                            │
│                                                             │
│  ScriptGeneratorWithModals (wrapper principal)             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           ScriptGenerator (component)               │   │
│  │                                                     │   │
│  │  Estado:                                            │   │
│  │  - selectedAgentId                                  │   │
│  │  - request (ScriptGenerationRequest)                │   │
│  │  - isDialogOpen                                     │   │
│  │                                                     │   │
│  │  Hooks:                                             │   │
│  │  - useAgents()        → agents[]                    │   │
│  │  - useGeminiKeys()    → apiKeys[]                   │   │
│  │  - useScriptGenerator()                             │   │
│  │    → generateScript, progress, result               │   │
│  │  - useToast()         → toast notifications         │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ Tab 1: Gerar Roteiro                       │   │   │
│  │  │ ┌──────────────────────────────────────┐  │   │   │
│  │  │ │ Seletor de Agente (Select)          │  │   │   │
│  │  │ │ [Agent 1 ▼] ← getAgent(selectedId) │  │   │   │
│  │  │ └──────────────────────────────────────┘  │   │   │
│  │  │                                           │   │   │
│  │  │ ┌──────────────────────────────────────┐  │   │   │
│  │  │ │ Input: Título do Vídeo              │  │   │   │
│  │  │ │ [________________]                  │  │   │   │
│  │  │ └──────────────────────────────────────┘  │   │   │
│  │  │                                           │   │   │
│  │  │ ┌──────────────────────────────────────┐  │   │   │
│  │  │ │ Config Manual (Se sem agente):      │  │   │   │
│  │  │ │ - Nome do Canal                     │  │   │   │
│  │  │ │ - Duração (minutos)                 │  │   │   │
│  │  │ │ - Idioma (Select)                   │  │   │   │
│  │  │ │ - Localização                       │  │   │   │
│  │  │ │ - Palavras Premissa                 │  │   │   │
│  │  │ │ - Prompt Premissa (Textarea)        │  │   │   │
│  │  │ │ - Prompt Roteiro (Textarea)         │  │   │   │
│  │  │ └──────────────────────────────────────┘  │   │   │
│  │  │                                           │   │   │
│  │  │ ┌──────────────────────────────────────┐  │   │   │
│  │  │ │ APIs Gemini: 3 ativa                │  │   │   │
│  │  │ │ [Gerar Roteiro ▶]                  │  │   │   │
│  │  │ └──────────────────────────────────────┘  │   │   │
│  │  │                                           │   │   │
│  │  │ ┌─ Progress (durante geração) ────────┐  │   │   │
│  │  │ │ Gerando Premissa...                 │  │   │   │
│  │  │ │ [████████░░░░░░░░░░] 30%           │  │   │   │
│  │  │ └─────────────────────────────────────┘  │   │   │
│  │  │                                           │   │   │
│  │  │ ┌─ Resultado ─────────────────────────┐  │   │   │
│  │  │ │ Premissa Gerada: [Copy] [Down]    │  │   │   │
│  │  │ │ [Premissa text...]                  │  │   │   │
│  │  │ │                                     │  │   │   │
│  │  │ │ Roteiro Completo: [Copy] [Down]   │  │   │   │
│  │  │ │ [XXX palavras, ~YY min]             │  │   │   │
│  │  │ │ [Roteiro text...]                   │  │   │   │
│  │  │ └─────────────────────────────────────┘  │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ Tab 2: Gerenciar Agentes                   │   │   │
│  │  │ [+ Novo Agente] [Agente 1] [Agente 2]    │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ Tab 3: Gerenciar APIs                      │   │   │
│  │  │ [+ Adicionar API] [Adicionar Lote]        │   │   │
│  │  │ [API 1: ✓ Válida]                         │   │   │
│  │  │ [API 2: ⚠ Rate Limited]                   │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

                          ⬇⬇⬇ QUANDO CLICA "GERAR"

┌─────────────────────────────────────────────────────────────┐
│              HOOK: useScriptGenerator()                     │
│                                                             │
│  generateScript(request, agent, apiKeys)                   │
│                                                             │
│  1. Validações:                                             │
│     ✓ Tem título?                                           │
│     ✓ Tem agente ou channelName?                            │
│     ✓ Tem APIs ativas?                                      │
│                                                             │
│  2. Determinar configuração final:                          │
│     config = {                                              │
│       channelName: request.channelName OR agent.channelName │
│       duration: request.duration OR agent.duration           │
│       language: request.language OR agent.language           │
│       ... (resto dos campos)                                 │
│     }                                                        │
│                                                             │
│  3. Gerar PREMISSA:                                          │
│     ┌─────────────────────────────────────────────────┐    │
│     │ injectPremiseContext(config.premisePrompt, ctx) │    │
│     │ → Prompt com language enforcement + contexto     │    │
│     └─────────────────────────────────────────────────┘    │
│                          ⬇                                  │
│     ┌──────────────────────────────────────────────────┐   │
│     │ enhancedGeminiService.generatePremise(prompt)    │   │
│     │                                                   │   │
│     │ Algoritmo:                                        │   │
│     │ 1. Selecionar API disponível                     │   │
│     │ 2. Fazer requisição POST a API Gemini            │   │
│     │ 3. Se erro 429: Esperar e retry com outra chave  │   │
│     │ 4. Se erro 403: Marcar chave como inválida       │   │
│     │ 5. Retornar { content, usedApiId }              │   │
│     └──────────────────────────────────────────────────┘   │
│                          ⬇                                  │
│     progress = {                                            │
│       stage: 'premise', percentage: 10                      │
│     }                                                        │
│                                                             │
│  4. Gerar ROTEIRO:                                           │
│                                                             │
│     Se targetWords > 1000:  ┌─ MÚLTIPLOS CHUNKS           │
│       for cada chunk i:    │                              │
│         ┌──────────────────────────────────┐              │
│         │ buildChunkPrompt(                │              │
│         │   config.scriptPrompt,           │              │
│         │   {                              │              │
│         │     premise: premissa,           │              │
│         │     previousContent: tudo até i-1, (COMPLETO) │
│         │     chunkIndex: i,               │              │
│         │     totalChunks: N,              │              │
│         │     isLastChunk: (i === N-1)     │              │
│         │   }                              │              │
│         │ )                                │              │
│         │ → Prompt com anti-duplicação     │              │
│         └──────────────────────────────────┘              │
│                    ⬇                                       │
│         enhancedGeminiService.generateScriptChunk()        │
│                    ⬇                                       │
│         validateChunk(chunk, context)                      │
│                    ⬇                                       │
│         scriptContent += chunk                             │
│         progress = { stage: 'script', percentage: ... }    │
│                                                             │
│     Senão: ┌─ ÚNICO CHUNK                                  │
│       Mesma lógica mas com totalChunks=1                   │
│                                                             │
│  5. Compilar Resultado:                                     │
│     result = {                                              │
│       premise: premissa,                                   │
│       script: [chunk1, chunk2, ...],                       │
│       chunks: [ScriptChunk[], ...],                        │
│       totalWords: sum(...),                                │
│       estimatedDuration: totalWords / 150,                 │
│       agentUsed: agent?.name                               │
│     }                                                        │
│                                                             │
│  6. Atualizar Estado e Toast:                               │
│     setResult(result)                                       │
│     progress = { ..., percentage: 100 }                    │
│     toast({ title: "Sucesso!", ... })                      │
│                                                             │
│  7. Persistir no Histórico:                                 │
│     [Usuário pode clicar para salvar ou é automático]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7.2 Fluxo de Chamada de API

```
┌────────────────────────────────────────────────────────────┐
│        enhancedGeminiService.generateScriptChunk()         │
│                                                            │
│  Input:                                                    │
│  - prompt: string (construído com contexto)               │
│  - apiKeys: GeminiApiKey[] (chaves disponíveis)           │
│  - context: GenerationContext                             │
│  - onProgress?: callback                                  │
│                                                            │
│  Início:                                                   │
│  1. Filtrar chaves DISPONÍVEIS:                            │
│     ✓ isActive                                             │
│     ✓ status !== 'suspended'|'invalid'                     │
│     ✓ !blockedUntil || now > blockedUntil                 │
│     ✓ !exhaustedUntil || now > exhaustedUntil             │
│     ✓ !cooldownUntil || now > cooldownUntil               │
│     ✓ !apiInUse[id] (não está em uso agora)               │
│                                                            │
│  2. Selecionar próxima chave por rotação:                  │
│     chave = availableKeys[apiRotationIndex % length]      │
│     apiRotationIndex++                                    │
│                                                            │
│  3. Marcar como em uso:                                    │
│     apiInUse[chave.id] = true                              │
│     apiLastRequestTime[chave.id] = now                     │
│                                                            │
│  4. Construir payload:                                     │
│     POST https://generativelanguage.googleapis.com/v1/...  │
│     {                                                      │
│       contents: [{                                         │
│         role: "user",                                      │
│         parts: [{ text: prompt }]                          │
│       }],                                                  │
│       generationConfig: {                                  │
│         temperature: 0.7,                                  │
│         topK: 40,                                          │
│         topP: 0.95,                                        │
│         maxOutputTokens: 8192                              │
│       }                                                    │
│     }                                                      │
│                                                            │
│  5. Fazer requisição:                                      │
│     try {                                                  │
│       response = await fetch(url, {                        │
│         method: 'POST',                                    │
│         headers: { 'Content-Type': 'application/json' },   │
│         body: JSON.stringify(payload),                     │
│         signal: AbortController(120s timeout)              │
│       })                                                   │
│     } catch (error) {                                      │
│       → Manejar AbortError, TypeError, etc                 │
│     }                                                      │
│                                                            │
│  6. Processar resposta:                                    │
│                                                            │
│     Se response.ok:                                        │
│       ✓ Extrair content: data.candidates[0].content...     │
│       ✓ Registrar tempo de requisição                      │
│       ✓ Registrar tokens usados (se disponível)            │
│       ✓ apiInUse[chave.id] = false                         │
│       ✓ Retornar { content, usedApiId: chave.id }         │
│                                                            │
│     Se response.status === 429:                            │
│       ! Ativar cooldown RPM (60s)                          │
│       ! Marcar chave em cooldown                           │
│       ! Tentar próxima chave (recursivamente)              │
│                                                            │
│     Se response.status === 403:                            │
│       errorMessage = response.json().error.message          │
│       Se contém 'CONSUMER_SUSPENDED':                      │
│         ! Marcar como SUSPENDED                            │
│         ! Quarentena por 24h                               │
│       Se contém 'permission' && pro:                       │
│         ! Marcar como PRO_BILLING_REQUIRED                 │
│       Senão:                                               │
│         ! Marcar como INVALID                              │
│       ! Tentar próxima chave                               │
│                                                            │
│     Se response.status === 404:                            │
│       Se contém 'model':                                   │
│         ! Tentar /v1beta em vez de /v1                     │
│       Senão:                                               │
│         ! Marcar como INVALID                              │
│       ! Tentar próxima chave                               │
│                                                            │
│     Se response.status >= 500:                             │
│       ! Marcar para retry automático                       │
│       ! Tentar próxima chave                               │
│                                                            │
│  7. Se todas as chaves falharem:                            │
│     throw new Error('Todas as APIs falharam')              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 7.3 Fluxo de Armazenamento Persistente

```
┌────────────────────────────────────────────────────────┐
│           COMPONENT STATE ↔ LOCALSTORAGE                │
└────────────────────────────────────────────────────────┘

┌─ AGENTES ────────────────────────────────────┐
│ Hook: useAgents()                            │
│ Storage Key: 'script-agents'                 │
│                                              │
│ Fluxo:                                       │
│ 1. Carregar ao montar hook                   │
│    JSON.parse(localStorage['script-agents']) │
│ 2. Sincronizar entre instâncias              │
│    Listener: 'agents-storage-updated'        │
│ 3. Salvar após cada operação                 │
│    createAgent()                             │
│    updateAgent()                             │
│    deleteAgent()                             │
│    duplicateAgent()                          │
│ 4. Emitir evento:                            │
│    dispatchEvent('agents-storage-updated')   │
└──────────────────────────────────────────────┘

┌─ API KEYS ───────────────────────────────────┐
│ Hook: useGeminiKeys()                        │
│ Storage Key: 'gemini-api-keys'               │
│                                              │
│ Fluxo: (idêntico aos agentes)                │
│ Listener: 'gemini-keys-storage-updated'      │
└──────────────────────────────────────────────┘

┌─ HISTÓRICO DE ROTEIROS ──────────────────────┐
│ Hook: useScriptHistory()                     │
│ Storage Key: 'script-generation-history-v2'  │
│                                              │
│ Fluxo:                                       │
│ 1. Carregar ao montar                        │
│ 2. Sincronizar via Storage Event             │
│ 3. Salvar em addToHistory()                  │
│ 4. Máximo 100 itens (trunca)                 │
│ 5. Atualizar audioInfo via updateAudioInfo() │
└──────────────────────────────────────────────┘

┌─ CHAVES TTS (ELEVENLABS/GEMINI) ─────────────┐
│ Hook: useGeminiTtsKeys()                     │
│ Storage Key: 'gemini-tts-api-keys'           │
│                                              │
│ Fluxo: (similar a API keys)                  │
└──────────────────────────────────────────────┘

┌─ APIs EXAURIDAS/EM QUARENTENA ──────────────┐
│ EnhancedGeminiService                        │
│ Storage Keys:                                │
│  - 'gemini_exhausted_keys'                   │
│  - 'gemini_quarantined_keys'                 │
│                                              │
│ Fluxo:                                       │
│ 1. Carregamento no getInstance()              │
│ 2. Salva quando marcar como exaurida         │
│ 3. Salva quando colocar em quarentena        │
│ 4. Verifica ao selecionar API                │
└──────────────────────────────────────────────┘
```

---

# <a name="ui-ux"></a>8. UI/UX ELEMENTS

## 8.1 Componentes Principais

### ScriptGenerator (Layout com Tabs)

```
┌──────────────────────────────────────────────────┐
│ [Gerar Roteiro] [Agentes] [APIs]               │
├──────────────────────────────────────────────────┤
│                                                  │
│ TAB 1: GERAR ROTEIRO                            │
│ ┌────────────────────────────────────────────┐  │
│ │ Card: Gerador de Roteiros                 │  │
│ │ ┌──────────────────────────────────────┐  │  │
│ │ │ Agente (Select) [Agente 1      ▼] │  │  │
│ │ │                                     │  │  │
│ │ │ Se agente selecionado:             │  │  │
│ │ │ ┌─────────────────────────────────┐ │  │  │
│ │ │ │ [Bot] Agente 1  [pt-BR]        │ │  │  │
│ │ │ │ Canal: Meu Canal               │ │  │  │
│ │ │ │ Duração: 10 min | Localização   │ │  │  │
│ │ │ │ Descrição: ...                  │ │  │  │
│ │ │ └─────────────────────────────────┘ │  │  │
│ │ │                                     │  │  │
│ │ │ Título do Vídeo *                  │  │  │
│ │ │ [________________________________] │  │  │
│ │ │                                     │  │  │
│ │ │ Se SEM agente:                     │  │  │
│ │ │ ┌─────────────────────────────────┐ │  │  │
│ │ │ │ Configuração Manual             │ │  │  │
│ │ │ │ Nome do Canal * [__________]     │ │  │  │
│ │ │ │ Duração [10] Idioma [pt-BR ▼]  │ │  │  │
│ │ │ │ Localização [Brasil]            │ │  │  │
│ │ │ │ Palavras Premissa [700]         │ │  │  │
│ │ │ │ Prompt Premissa                 │ │  │  │
│ │ │ │ [________________________]       │ │  │  │
│ │ │ │ Prompt Roteiro                  │ │  │  │
│ │ │ │ [________________________]       │ │  │  │
│ │ │ └─────────────────────────────────┘ │  │  │
│ │ │                                     │  │  │
│ │ │ [Settings] APIs Gemini: 3 ativas   │  │  │
│ │ │ [Gerar Roteiro ▶]                  │  │  │
│ │ └──────────────────────────────────────┘  │  │
│ │                                             │  │
│ │ Durante geração:                            │  │
│ │ ┌────────────────────────────────────────┐  │  │
│ │ │ Gerando Premissa...        30%         │  │  │
│ │ │ [████████░░░░░░░░░░░░░░░░░░]          │  │  │
│ │ │ 0 / 700 palavras                       │  │  │
│ │ └────────────────────────────────────────┘  │  │
│ │                                             │  │
│ │ Resultado:                                  │  │
│ │ ┌─ Premissa Gerada ─────────────────────┐  │  │
│ │ │ [Copy] [Download]                     │  │  │
│ │ │ [Texto da premissa...]                │  │  │
│ │ └───────────────────────────────────────┘  │  │
│ │                                             │  │
│ │ ┌─ Roteiro Completo ────────────────────┐  │  │
│ │ │ 5234 palavras | ~35 minutos            │  │  │
│ │ │ [Copy] [Download] [Enviar para Áudio]  │  │  │
│ │ │ [Chunk 1 text...]                       │  │  │
│ │ │ [Chunk 2 text...]                       │  │  │
│ │ └───────────────────────────────────────┘  │  │
│ └─────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Cores e Tema

**Paleta Golden/Amber** (Shadcn/UI):
- Primary: `from-golden-500 via-amber-500 to-yellow-500`
- Borders: `border-golden-200 dark:border-golden-800`
- Background: `from-golden-50 via-amber-50/50 to-yellow-50`
- Hovers: `hover:from-golden-600 hover:to-amber-600`

---

## 8.2 Ícones Usados (lucide-react)

| Ícone | Uso |
|-------|-----|
| `Play` | Botão Gerar |
| `Copy` | Copiar texto |
| `Download` | Baixar arquivo |
| `Trash2` | Deletar |
| `Bot` | Agentes |
| `Settings` | Configurações |
| `FileText` | Roteiros |
| `Sparkles` | AI/Gerador |
| `Plus` | Novo item |
| `Edit` | Editar |
| `Star` | Favoritar |
| `Eye` / `EyeOff` | Mostrar/ocultar |
| `CheckCircle` / `XCircle` / `AlertCircle` | Status |
| `Loader2` | Carregando |

---

# <a name="arquitetura-estado"></a>9. ARQUITETURA DE ESTADO

## 9.1 Estados Globais

O projeto usa principalmente **localStorage** para persistência (não Redux/Zustand):

```typescript
// Agentes
window.localStorage['script-agents'] = JSON.stringify(Agent[])

// API Keys Gemini
window.localStorage['gemini-api-keys'] = JSON.stringify(GeminiApiKey[])

// API Keys TTS Gemini
window.localStorage['gemini-tts-api-keys'] = JSON.stringify(GeminiTtsKey[])

// Histórico de Roteiros
window.localStorage['script-generation-history-v2'] = JSON.stringify(ScriptHistoryItem[])

// APIs Exauridas (do serviço)
window.localStorage['gemini_exhausted_keys'] = JSON.stringify({
  apiId: string,
  exhaustedUntil: number (timestamp)
}[])

// APIs em Quarentena (do serviço)
window.localStorage['gemini_quarantined_keys'] = JSON.stringify({
  apiId: string,
  blockedUntil: number (timestamp),
  reason: string
}[])

// Limite de Concorrência (parallelGenerator)
window.localStorage['script_concurrent_limit'] = string (número)
```

## 9.2 Estados Locais por Componente

### ScriptGenerator
```typescript
{
  selectedAgentId: string;
  request: ScriptGenerationRequest;
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  editingAgent: Agent | null;
}
```

### AgentModal
```typescript
{
  formData: {
    name, channelName, description, language, location,
    duration, premiseWordTarget, premisePrompt, scriptPrompt
  };
  languageSearch: string;
  debouncedLanguageSearch: string;
  showLanguageDropdown: boolean;
  languageTab: 'popular' | 'all';
  isPremiseFileLoading: boolean;
  isScriptFileLoading: boolean;
}
```

### GeminiApiManager
```typescript
{
  isDialogOpen: boolean;
  isBatchModalOpen: boolean;
  validatingKeys: Set<string>;
  showKeys: Set<string>;
  formData: {
    name: string;
    key: string;
    model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  };
}
```

---

# <a name="armazenamento-persistente"></a>10. ARMAZENAMENTO PERSISTENTE

## 10.1 Localização de Dados

Todos os dados são armazenados no **localStorage do navegador** (browser-based):

```javascript
// Para acessar/limpar tudo:
Object.keys(localStorage).forEach(key => {
  if (key.includes('script') || key.includes('gemini')) {
    console.log(key, localStorage.getItem(key))
  }
})

// Para limpar tudo:
localStorage.clear()
```

## 10.2 Sincronização Between Tabs

Usa **Storage Events** e **Custom Events**:

```typescript
// Quando um tab muda dados
window.dispatchEvent(new Event('agents-storage-updated'))
window.dispatchEvent(new Event('gemini-keys-storage-updated'))

// Outros tabs escutam
window.addEventListener('storage', (e) => {
  if (e.key === 'script-agents') {
    reloadAgentsFromStorage()
  }
})
```

---

# RESUMO EXECUTIVO

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         APLICAÇÃO FRONTEND                      │
│                       (React + TypeScript)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   COMPONENTES REACT                     │   │
│  │  - ScriptGenerator (Principal)                          │   │
│  │  - AgentManager, AgentModal                             │   │
│  │  - GeminiApiManager                                     │   │
│  │  - ScriptHistoryTab                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ⬇ ⬆                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              HOOKS CUSTOMIZADOS (State)                 │   │
│  │  - useScriptGenerator (Geração)                         │   │
│  │  - useAgents (CRUD de agentes)                          │   │
│  │  - useGeminiKeys (CRUD de APIs)                         │   │
│  │  - useScriptHistory (Histórico)                         │   │
│  │  - useParallelScriptGenerator (Lotes)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ⬇ ⬆                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              SERVIÇOS (Lógica de Negócio)               │   │
│  │  - enhancedGeminiService (Rate limit, retry, rotação)   │   │
│  │  - GeminiApiService (Validação, geração básica)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ⬇ ⬆                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              UTILITÁRIOS (Helper Functions)              │   │
│  │  - promptInjector (Contexto automático)                 │   │
│  │  - chunkValidation (Validação de chunks)                │   │
│  │  - srtGenerator (Legendas)                              │   │
│  │  - languageDetection (Idiomas)                          │   │
│  │  - ... outros utilitários                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ⬇ ⬆                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │          ARMAZENAMENTO LOCAL (localStorage)              │   │
│  │  - Agentes                                               │   │
│  │  - API Keys                                              │   │
│  │  - Histórico de Roteiros                                 │   │
│  │  - APIs Exauridas/em Quarentena                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         APIs EXTERNAS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  Google Gemini API   │  │   ElevenLabs API     │            │
│  │  (Texto + TTS)       │  │  (Síntese de Voz)    │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Fluxo Principal Resumido

1. **Usuário preenche formulário** → Agente + Título (obrigatórios)
2. **Clica "Gerar Roteiro"** → Validações
3. **Hook useScriptGenerator** → Chama enhancedGeminiService
4. **Service selecionaciona API** → Faz requisição POST ao Gemini
5. **Gera PREMISSA** → Atualiza progress (10%)
6. **Gera ROTEIRO** → Em chunks se > 1000 palavras → Progress (35%-90%)
7. **Valida chunks** → Duplicação, idioma, continuidade
8. **Retorna resultado** → Premissa + Roteiro + Metadados
9. **UI exibe resultado** → Com opções de copiar/baixar
10. **Usuário pode salvar** → Adiciona ao histórico automaticamente

## Capacidades Principais

- ✅ Geração de roteiros com IA Gemini
- ✅ Múltiplas chaves API com rate limiting
- ✅ Geração em chunks para roteiros longos
- ✅ Injeção automática de contexto em prompts
- ✅ Detecção e prevenção de duplicação
- ✅ Detecção e enforcement de idioma
- ✅ Histórico persistente (localStorage)
- ✅ Gerenciamento de agentes (persona)
- ✅ Geração em lote com controle de concorrência
- ✅ Validação de chaves API
- ✅ Geração de legendas SRT
- ✅ Integração com TTS (Gemini + ElevenLabs)

