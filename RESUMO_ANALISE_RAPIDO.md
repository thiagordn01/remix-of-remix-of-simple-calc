# RESUMO RÁPIDO - GERADOR DE ROTEIROS

## STATUS
✅ **Análise Completa Realizada**
- 126 arquivos TypeScript/TSX analisados
- Documento completo: `ANALISE_COMPLETA_GERADOR_ROTEIROS.md` (72KB)

---

## ESTRUTURA RESUMIDA

### 1. ENTRADA DO USUÁRIO
```
┌─────────────────────────────────┐
│  ScriptGenerator Component      │
│  - Selecionar Agente (ou conf)  │
│  - Inserir Título do Vídeo      │
│  - Escolher API Keys ativas     │
│  → Clicar "Gerar Roteiro"       │
└─────────────────────────────────┘
```

### 2. PROCESSAMENTO
```
┌─────────────────────────────────────────────────┐
│  Hook: useScriptGenerator()                     │
│                                                 │
│  1. Validações                                  │
│  2. Gerar PREMISSA (planejamento)               │
│     → enhancedGeminiService.generatePremise()   │
│     → Injeção automática de contexto            │
│     → Enforcement de idioma                     │
│                                                 │
│  3. Gerar ROTEIRO (1 ou múltiplos chunks)       │
│     → Se > 1000 palavras: dividir em chunks     │
│     → Cada chunk:                               │
│        - Incluir contexto COMPLETO              │
│        - Flag isLastChunk para finalizar        │
│        - Validar duplicação (30+ palavras)      │
│        - Validar mistura de idiomas             │
│                                                 │
│  4. Retornar resultado                          │
│     → Premissa + Array de chunks                │
│     → Total de palavras                         │
│     → Duração estimada                          │
└─────────────────────────────────────────────────┘
```

### 3. API GEMINI (Rate Limiting Inteligente)
```
┌─────────────────────────────────────────────────┐
│  EnhancedGeminiService (Singleton)              │
│                                                 │
│  Por Chave:                                     │
│  - RPM: 5-30 (Requests Per Minute)              │
│  - RPD: 50-1000 (Requests Per Day)              │
│  - TPM: 32k-1M (Tokens Per Minute)              │
│                                                 │
│  Inteligência:                                  │
│  ✓ Rotação automática entre chaves              │
│  ✓ Detecção 429 (rate limit) → cooldown 60s     │
│  ✓ Detecção 403 → marca como inválida/suspensa  │
│  ✓ Quarentena (24h) para suspensas               │
│  ✓ Bloqueio automático se muitas falhas         │
│  ✓ Fallback v1 → v1beta se 404                  │
│  ✓ Persistência no localStorage                  │
└─────────────────────────────────────────────────┘
```

### 4. SAÍDA E PERSISTÊNCIA
```
┌─────────────────────────────────────────────────┐
│  UI: Exibe Resultado                            │
│  - [Copy] Premissa                              │
│  - [Download] Roteiro                           │
│  - [Send to Audio] Enviar para áudio             │
│                                                 │
│  Persistência:                                  │
│  localStorage['script-generation-history-v2']   │
│  - Último 100 roteiros gerados                  │
│  - Favoritos (★)                                │
│  - Status de áudio (se gerado)                  │
│                                                 │
│  Sincronização:                                 │
│  - Entre abas via Storage Event                 │
│  - Custom Event quando atualiza                 │
└─────────────────────────────────────────────────┘
```

---

## CHAVE 🔑: CONTEXTO COMPLETO EM CADA CHUNK

Diferença crítica do sistema:

### ❌ ERRADO (Outros sistemas)
```
Chunk 1: "Gerado com contexto inicial"
Chunk 2: "Continua aqui... [apenas últimos 600 chars]"
→ Problema: Perde contexto, gera duplicação

```

### ✅ CORRETO (Este sistema)
```
Chunk 1: "Gerado com contexto inicial... (500 words)"
Chunk 2 Prompt contém:
  - Título do vídeo
  - Premissa COMPLETA
  - TODO o Chunk 1 (500 words)
  - Últimas 4 frases (ponto de continuação)
  → Flag isLastChunk=false → AI sabe que há mais
→ Resultado: Perfeita continuidade, sem duplicação
```

---

## FLUXOS DE DADO (Simplificado)

### Fluxo 1: Criar Agente
```
AgentModal (form) 
  → useAgents.createAgent() 
  → localStorage['script-agents'] 
  → Custom Event 'agents-storage-updated' 
  → ScriptGenerator recarrega agentes
```

### Fluxo 2: Adicionar API
```
GeminiApiManager (form) 
  → useGeminiKeys.addApiKey() 
  → localStorage['gemini-api-keys'] 
  → Custom Event 'gemini-keys-storage-updated' 
  → ScriptGenerator vê nova API disponível
```

### Fluxo 3: Gerar Roteiro (PRINCIPAL)
```
ScriptGenerator (clica "Gerar")
  → useScriptGenerator.generateScript(request, agent, apiKeys)
  
  → injectPremiseContext() + enhancedGeminiService.generatePremise()
    → Requisição POST ao Gemini (/v1/models/gemini-2.5-flash:generateContent)
    → Se 429: Cooldown 60s + tenta próxima chave
    → Progress: 10%
  
  → buildChunkPrompt() + enhancedGeminiService.generateScriptChunk()
    → Requisição POST ao Gemini (com contexto COMPLETO)
    → Validação de chunk (duplicação, idioma, etc)
    → Se erro: Retry automático
    → Progress: 35% + ((chunk / totalChunks) * 55%)
  
  → setResult() + toast
    → UI atualiza com premissa + roteiro
    → Mostra opções de copiar/baixar/enviar

  → Salvamento automático
    → useScriptHistory.addToHistory()
    → localStorage['script-generation-history-v2']
```

---

## CONFIGURAÇÃO DE MODELOS

### Limites Oficiais (Plano Gratuito Google)

| Modelo | RPM | RPD | TPM |
|--------|-----|-----|-----|
| gemini-2.5-pro | 5 | 100 | 125k |
| gemini-2.5-flash | 10 | 250 | 250k |
| gemini-2.5-flash-lite | 15 | 1000 | 250k |
| gemini-2.0-flash | 15 | 200 | 1M |

**RPM** = Requisições por Minuto  
**RPD** = Requisições por Dia  
**TPM** = Tokens por Minuto

---

## VALIDAÇÕES INTELIGENTES

### Chunk Validation (`chunkValidation.ts`)

```typescript
Validar cada chunk gerado:

❌ ERRO - Palavra cortada: Primeira palavra < 3 chars minúscula
❌ ERRO - Começa minúscula: [a-z] no início (frase cortada)
❌ ERRO - Duplicação recente: Últimas 50 palavras do anterior
❌ ERRO - Duplicação long-range: 30+ palavras já no roteiro
❌ ERRO - Mistura idiomas: PT% > 3 E EN% > 3
⚠️  AVISO - Chunk curto: < 280 palavras (70% do alvo)
```

### Language Enforcement (`promptInjector.ts`)

```
🚨 REGRA CRÍTICA #0 - IDIOMA DE SAÍDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Instruções técnicas: PORTUGUÊS
Conteúdo gerado: 100% IDIOMA_ALVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ NUNCA misture idiomas
✅ SEMPRE escrevam 100% no idioma configurado

Mapeamento: 18 idiomas suportados
Cada um com instrução nativa (pt-BR, en-US, es-ES, etc)
```

---

## ARQUIVOS PRINCIPAIS

| Arquivo | Linhas | Responsabilidade |
|---------|--------|-----------------|
| `useScriptGenerator.ts` | 309 | **CORE**: Algoritmo de geração |
| `enhancedGeminiApi.ts` | 200+ | Rate limit, retry, rotação de APIs |
| `geminiApi.ts` | 404 | Requisições básicas ao Gemini |
| `promptInjector.ts` | 673 | Injeção de contexto e enforcement |
| `chunkValidation.ts` | 237 | Validação de continuidade |
| `ScriptGenerator.tsx` | 423 | **UI**: Componente principal |
| `AgentManager.tsx` | 200+ | CRUD de agentes |
| `GeminiApiManager.tsx` | 200+ | CRUD de chaves API |
| `useAgents.ts` | 155 | State de agentes |
| `useGeminiKeys.ts` | 151 | State de API keys |

---

## PRINCIPAIS CARACTERÍSTICAS

### ✅ Implementadas

1. **Geração Inteligente**
   - Automação de contexto
   - Chunks com continuidade perfeita
   - Detecção de duplicação (30+ palavras)

2. **Gerenciamento de API**
   - Múltiplas chaves
   - Rate limiting (RPM, RPD, TPM)
   - Rotação automática
   - Quarentena inteligente

3. **Suporte Multi-idioma**
   - 18+ idiomas
   - Enforcement agressivo
   - Detecção de mistura (PT/EN)

4. **Persistência**
   - localStorage
   - Sincronização entre abas
   - Histórico de 100 roteiros

5. **UI/UX**
   - Progresso em tempo real
   - Validações antes de gerar
   - Copiar/Baixar resultados
   - Sistema de favoritos

### 🔄 Em Lote

1. **Geração Paralela** (`useParallelScriptGenerator`)
   - Controle de concorrência
   - Limite configurável (1-N jobs)
   - Rotação de APIs por job
   - Logs detalhados

2. **Batch Settings**
   - Delay entre itens (ms)
   - Delay entre chunks (ms)
   - Max retries
   - Auto save to history

---

## DADOS NO LOCALSTORAGE

```javascript
{
  // Agentes
  'script-agents': [
    { id, name, language, channelName, duration, 
      premisePrompt, scriptPrompt, ... }
  ],

  // API Keys Gemini
  'gemini-api-keys': [
    { id, name, key, model, isActive, status, 
      requestCount, lastUsed, ... }
  ],

  // Histórico de Roteiros
  'script-generation-history-v2': [
    { id, title, premise, script, wordCount, 
      generatedAt, isFavorite, agentName, ... }
  ],

  // APIs Exauridas
  'gemini_exhausted_keys': [
    { apiId, exhaustedUntil: timestamp }
  ],

  // APIs em Quarentena
  'gemini_quarantined_keys': [
    { apiId, blockedUntil: timestamp, reason: string }
  ],

  // Limite de Concorrência
  'script_concurrent_limit': "1"
}
```

---

## COMO TUDO SE CONECTA

```
┌──────────────────────────────────────┐
│        USER INTERFACE (React)        │
│  ScriptGenerator.tsx                 │
│  AgentManager.tsx                    │
│  GeminiApiManager.tsx                │
│  ScriptHistoryTab.tsx                │
└──────────────┬───────────────────────┘
               │
               ⬇
┌──────────────────────────────────────┐
│      HOOKS (Estado + Lógica)         │
│  useScriptGenerator()    ← PRINCIPAL │
│  useAgents()                         │
│  useGeminiKeys()                     │
│  useScriptHistory()                  │
│  useParallelScriptGenerator()        │
└──────────────┬───────────────────────┘
               │
               ⬇
┌──────────────────────────────────────┐
│   SERVIÇOS (Chamadas de API)         │
│  EnhancedGeminiService       ← CORE  │
│  GeminiApiService                    │
└──────────────┬───────────────────────┘
               │
               ⬇
┌──────────────────────────────────────┐
│   UTILITÁRIOS (Helper Functions)     │
│  promptInjector      ← Contexto      │
│  chunkValidation     ← Validação     │
│  srtGenerator        ← Legendas      │
│  languageDetection   ← Idiomas       │
│  ... outros                          │
└──────────────┬───────────────────────┘
               │
               ⬇
┌──────────────────────────────────────┐
│     ARMAZENAMENTO (localStorage)     │
│  Agentes                             │
│  API Keys                            │
│  Histórico                           │
│  Estados temporários                 │
└──────────────────────────────────────┘
               │
               ⬇
┌──────────────────────────────────────┐
│    APIs EXTERNAS                     │
│  Google Gemini API                   │
│  ElevenLabs TTS (opcional)           │
└──────────────────────────────────────┘
```

---

## PRÓXIMOS PASSOS PARA DESENVOLVIMENTO

Se você quer expandir o sistema:

### 🔧 Melhorias Técnicas
1. Migrar para Zustand/Redux para estado global (em vez localStorage)
2. Adicionar banco de dados (Supabase) para persistência real
3. Implementar caching de gerações (evitar regenerar mesmo título)
4. Adicionar sistema de templates de prompts

### 📊 Funcionalidades
1. Dashboard de analytics (quantas gerações, palavras totais, etc)
2. Editor visual de agentes com preview
3. Integração com plataformas (YouTube, TikTok)
4. Sistema de anotações/comentários em roteiros
5. Comparação de versões de roteiros

### 🚀 Performance
1. Web Workers para geração de chunks em paralelo
2. Service Worker para cache offline
3. Streaming de resposta (não esperar resposta inteira)
4. Otimização de bundle (code splitting)

---

## PARA LER TUDO COM DETALHES

Arquivo completo: **`ANALISE_COMPLETA_GERADOR_ROTEIROS.md`** (72KB)

Contém:
- Estrutura de cada componente
- Código das interfaces TypeScript
- Fluxos de dados com diagramas
- Algoritmos detalhados
- Validações passo-a-passo
- Arquitetura de estado
- Persistência de dados
- E muito mais!

---

## CONCLUSÃO

Este é um **sistema robusto e bem arquitetado** de geração de roteiros com IA.

**Pontos Fortes:**
- ✅ Contexto completo em cada chunk (excelente continuidade)
- ✅ Rate limiting inteligente (múltiplas chaves + rotação)
- ✅ Validações completas (duplicação, idioma, formato)
- ✅ UI/UX clara e responsiva
- ✅ Persistência local + sincronização
- ✅ Código bem tipado (TypeScript)
- ✅ Componentes reutilizáveis

**Pronto para produção com:**
- Backend adicional (Supabase/Firebase)
- Banco de dados para histórico
- Autenticação de usuários
- Analytics e monitoring

---

**Análise realizada em**: 2024  
**Total de arquivos analisados**: 126  
**Linhas de código revisadas**: 15,000+
