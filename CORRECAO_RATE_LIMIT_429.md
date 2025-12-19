# Correção Crítica: Loop Infinito no Rate Limit 429

## 📋 Problema Identificado

O sistema de geração de áudio via Gemini TTS estava entrando em **loop infinito** quando todas as API keys atingiam o rate limit (erro 429).

### Sintomas:
- ✅ Todas as keys retornavam erro 429 (Too Many Requests)
- ✅ Sistema tentava todas as keys sequencialmente
- ✅ Delay de apenas 1 segundo entre tentativas
- ✅ **Loop infinito**: Ao esgotar todas as keys, voltava para a primeira
- ✅ UI travada com carregamento infinito
- ✅ Usuário sem informação sobre o que estava acontecendo

### Logs do Problema:
```
🔄 Tentativa 1/5 para chunk 4
⏳ Chunk 4/6: Requisitando 450 palavras para Gemini TTS...
POST .../gemini-2.5-flash-preview-tts... 429 (Too Many Requests)
⚠️ Key "API 1" falhou - Status 429
🔄 Chunk 4/6 | Tentativa 2
⏳ Chunk 4/6: Requisitando 450 palavras para Gemini TTS...
POST .../gemini-2.5-flash-preview-tts... 429 (Too Many Requests)
⚠️ Key "API 2" falhou - Status 429
[... continua indefinidamente ...]
```

## 🔧 Correções Implementadas

### 1. Parse do RetryInfo do Google (Linhas 273-300)
**Antes:** Ignorava completamente as informações de retry fornecidas pelo Google
**Depois:** Extrai o `retryDelay` da resposta 429 e usa o tempo exato recomendado

```typescript
// ✅ NOVO: Para erro 429, parsear RetryInfo do Google
if (response.status === 429) {
  try {
    const errorData = await response.json();
    const retryInfo = errorData.error?.details?.find((d: any) =>
      d['@type']?.includes('RetryInfo')
    );

    let retryDelaySeconds = 60; // Padrão: 60 segundos
    if (retryInfo?.retryDelay) {
      const match = retryInfo.retryDelay.match(/(\d+)/);
      if (match) {
        retryDelaySeconds = parseInt(match[1], 10);
      }
    }

    const availableAt = Date.now() + (retryDelaySeconds * 1000);
    rateLimitedKeys.set(selectedKeyId!, availableAt);
  } catch (e) {
    rateLimitedKeys.set(selectedKeyId!, Date.now() + 60000);
  }
}
```

### 2. Rastreamento de Keys em Cooldown (Linha 192)
**Antes:** Não rastreava quais keys estavam em cooldown e quando voltariam
**Depois:** Map com timestamp de quando cada key fica disponível novamente

```typescript
rateLimitedKeys: Map<string, number> = new Map()
// keyId -> timestamp quando fica disponível
```

### 3. Detecção de "Todas as Keys em Cooldown" (Linhas 320-360)
**Antes:** Tentava indefinidamente mesmo quando todas estavam em rate limit
**Depois:** Detecta quando TODAS as keys disponíveis estão em cooldown

```typescript
// ✅ VERIFICAR SE TODAS AS KEYS DISPONÍVEIS ESTÃO EM RATE LIMIT
const allAvailableKeys = apiKeys.filter(k =>
  k.isActive &&
  k.status !== 'suspended' &&
  k.status !== 'no_credits' &&
  !failedKeyIds.includes(k.id)
);

const allKeysInRateLimit = allAvailableKeys.every(k =>
  rateLimitedKeys.has(k.id) && rateLimitedKeys.get(k.id)! > Date.now()
);
```

### 4. Espera Inteligente (Linhas 332-360)
**Antes:** Aguardava apenas 1 segundo antes de tentar próxima key
**Depois:** Calcula qual key ficará disponível primeiro e aguarda esse tempo

```typescript
if (allKeysInRateLimit) {
  // Encontrar a key que ficará disponível primeiro
  const nextAvailable = Math.min(
    ...allAvailableKeys
      .map(k => rateLimitedKeys.get(k.id) || 0)
      .filter(t => t > Date.now())
  );

  const waitTimeMs = nextAvailable - Date.now();
  const waitTimeSec = Math.ceil(waitTimeMs / 1000);

  console.warn(`⏸️ TODAS as ${allAvailableKeys.length} API keys em rate limit!`);
  console.warn(`Aguardando ${waitTimeSec}s até próxima ficar disponível...`);

  // ✅ AGUARDAR antes de tentar novamente
  await new Promise(resolve => setTimeout(resolve, waitTimeMs + 1000));

  // ✅ LIMPAR keys que já passaram do cooldown
  const now = Date.now();
  for (const [keyId, availableAt] of rateLimitedKeys.entries()) {
    if (availableAt <= now) {
      rateLimitedKeys.delete(keyId);
    }
  }
}
```

### 5. Timeout Global por Chunk (Linhas 199-208)
**Antes:** Sem limite de tempo, poderia tentar eternamente
**Depois:** Máximo de 10 minutos por chunk

```typescript
// ✅ TIMEOUT GLOBAL: Máximo 10 minutos por chunk
const MAX_CHUNK_TIME_MS = 10 * 60 * 1000;
const elapsedTime = Date.now() - chunkStartTime;
if (elapsedTime > MAX_CHUNK_TIME_MS) {
  throw new Error(
    `⏱️ TIMEOUT: Chunk ${chunkIndex + 1} ultrapassou limite de 10 minutos. ` +
    `Todas as APIs podem estar com rate limit prolongado.`
  );
}
```

### 6. Filtro Automático de Keys em Cooldown (Linhas 224-234)
**Antes:** Tentava usar keys que sabidamente estavam em cooldown
**Depois:** Filtra automaticamente keys em cooldown antes de tentar lock

```typescript
const availableKeys = apiKeys.filter(k =>
  k.isActive &&
  k.status !== 'suspended' &&
  k.status !== 'no_credits' &&
  k.status !== 'invalid' &&
  !failedKeyIds.includes(k.id) &&
  // ✅ NOVO: Excluir keys que ainda estão em cooldown
  (!rateLimitedKeys.has(k.id) || rateLimitedKeys.get(k.id)! <= now)
);
```

### 7. Mensagens Detalhadas para o Usuário (Linhas 245-270)
**Antes:** Mensagens genéricas de erro
**Depois:** Informações precisas sobre quantas keys estão em cooldown e quando voltam

```typescript
if (!apiKeyObj || !selectedKeyId) {
  const totalKeys = apiKeys.filter(k => k.isActive).length;
  const keysInCooldown = apiKeys.filter(k =>
    k.isActive && rateLimitedKeys.has(k.id) && rateLimitedKeys.get(k.id)! > now
  ).length;
  const keysFailed = failedKeyIds.length;

  let errorMsg = `Nenhuma API key disponível - `;
  errorMsg += `Total ativas: ${totalKeys}, Em cooldown: ${keysInCooldown}, Falhadas: ${keysFailed}`;

  if (keysInCooldown > 0) {
    const nextAvailable = Math.min(...Array.from(rateLimitedKeys.values()));
    const waitSec = Math.ceil((nextAvailable - Date.now()) / 1000);
    errorMsg += `. Próxima disponível em ${waitSec}s`;

    addJobLog(setJobs, jobToProcess.id, 'warning',
      `⏸️ Aguardando keys saírem do cooldown... (${waitSec}s)`,
      chunkIndex
    );
  }
}
```

### 8. Logs em Tempo Real na UI (Linhas 293-296, 344-347)
**Antes:** Logs apenas no console
**Depois:** Logs visíveis na UI para o usuário acompanhar

```typescript
addJobLog(setJobs, jobToProcess.id, 'warning',
  `API "${apiKeyObj.label}" atingiu rate limit - aguardando ${retryDelaySeconds}s`,
  chunkIndex
);

addJobLog(setJobs, jobToProcess.id, 'warning',
  `⏸️ Todas as APIs em cooldown - aguardando ${waitTimeSec}s...`,
  chunkIndex
);
```

## 📊 Impacto das Correções

### Antes:
- ❌ Loop infinito quando todas as keys em rate limit
- ❌ Delay fixo de 1s (ineficiente)
- ❌ UI travada sem feedback
- ❌ Impossível gerar áudio com muitas keys em rate limit
- ❌ Usuário sem informação sobre o problema

### Depois:
- ✅ Espera inteligente baseada no retryDelay do Google
- ✅ Detecção automática de "todas em cooldown"
- ✅ Aguarda tempo necessário antes de retry
- ✅ Timeout de 10 minutos para evitar espera eterna
- ✅ Logs em tempo real na UI
- ✅ Mensagens claras sobre quantas keys estão disponíveis
- ✅ Sistema resiliente a rate limits

## 🎯 Cenários de Teste

### Cenário 1: Todas as Keys em Rate Limit
**Comportamento Esperado:**
1. Tenta primeira key → 429
2. Parseia retryDelay (ex: 60s)
3. Tenta segunda key → 429
4. Parseia retryDelay (ex: 58s)
5. Detecta que todas estão em cooldown
6. Aguarda 58s (menor tempo)
7. Tenta novamente após cooldown
8. Log na UI: "⏸️ Todas as APIs em cooldown - aguardando 58s..."

### Cenário 2: Algumas Keys Disponíveis
**Comportamento Esperado:**
1. Filtra keys em cooldown automaticamente
2. Usa apenas keys disponíveis
3. Se todas disponíveis derem 429, aguarda cooldown
4. Continua processamento normalmente

### Cenário 3: Timeout de 10 Minutos
**Comportamento Esperado:**
1. Se chunk tentar por mais de 10 minutos
2. Lança erro com mensagem clara
3. Para processamento do chunk
4. Log: "⏱️ TIMEOUT: Chunk X ultrapassou limite de 10 minutos"

## 📝 Notas Técnicas

### Rate Limits do Google Gemini 2.5 Flash (Plano Gratuito):
- **RPM**: 10 requests/minute
- **RPD**: 250 requests/day
- **TPM**: 250,000 tokens/minute

### Tratamento de Erro 429:
- Parse do `RetryInfo.retryDelay` do Google
- Fallback para 60s se não conseguir parsear
- Rastreamento individual por key
- Limpeza automática de cooldowns expirados

### Propagação do Estado:
O `rateLimitedKeys` e `chunkStartTime` são propagados em TODAS as chamadas recursivas:
- `processChunkWithRetry(chunkIndex, currentRetry + 1, failedKeyIds, rateLimitedKeys, chunkStartTime)`

## 🚀 Como Testar

1. Configure 3-5 API keys válidas
2. Inicie geração de áudio com 6+ chunks (450 palavras cada)
3. Observe os logs na UI e no console
4. Verifique que quando todas derem 429:
   - Sistema mostra "⏸️ Todas as APIs em cooldown"
   - Aguarda tempo correto
   - Retoma automaticamente após cooldown
   - Não entra em loop infinito

## 📌 Arquivos Modificados

- `src/hooks/useGeminiTtsQueue.ts` (linhas 188-434)

## ✅ Checklist de Validação

- [x] Parse do RetryInfo do Google
- [x] Rastreamento de keys em cooldown
- [x] Detecção de "todas em cooldown"
- [x] Espera inteligente até próxima disponível
- [x] Timeout global de 10 minutos
- [x] Filtro automático de keys em cooldown
- [x] Mensagens detalhadas de erro
- [x] Logs em tempo real na UI
- [x] Propagação correta do estado em recursões
- [x] Limpeza de cooldowns expirados

---

**Data:** 2025-11-03
**Autor:** Claude (Anthropic)
**Tipo:** Correção Crítica
**Prioridade:** ALTA
**Status:** ✅ Implementado
