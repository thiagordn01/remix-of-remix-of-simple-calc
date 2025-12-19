# 🔍 ANÁLISE DE PROBLEMAS - Rate Limiting

## 📊 PROBLEMA RELATADO

**Sintoma**: APIs sendo marcadas como exauridas (timeout 24h) MESMO SEM atingir 50 RPD
**Consequência**: Roteiros ficam carregando infinitamente porque todas as APIs são marcadas incorretamente como esgotadas
**Impacto**: Sistema inutilizável após algumas requisições

---

## 🐛 PROBLEMAS IDENTIFICADOS

### **PROBLEMA 1: Contagem Incorreta de RPM/RPD** ⚠️⚠️⚠️ CRÍTICO

**Arquivo**: `enhancedGeminiApi.ts`
**Linha**: 753-760, 881-882

```typescript
// LINHA 753-760: Só registra requisições BEM-SUCEDIDAS
private recordApiSuccess(apiKey: GeminiApiKey) {
  const rpm = this.apiRequestsPerMinute.get(apiKey.id) || [];
  rpm.push(now);
  this.apiRequestsPerMinute.set(apiKey.id, rpm);

  const rpd = this.apiRequestsPerDay.get(apiKey.id) || [];
  rpd.push(now);
  this.apiRequestsPerDay.set(apiKey.id, rpd);
}

// LINHA 881-882: Comentário explica que só conta sucessos
// ⚠️ NÃO registrar RPM/RPD aqui - será registrado apenas no sucesso
// Isso evita contar requisições que falharam como uso de quota
```

**POR QUE É PROBLEMA**:
- ❌ O código APENAS registra requisições bem-sucedidas
- ✅ O Google conta TODAS as requisições (sucesso ou falha) para RPM/RPD
- 📉 Resultado: Sistema SUBCONTANDO o uso real

**EXEMPLO DO ERRO**:
```
Usuário faz 50 requisições totais:
- 30 bem-sucedidas
- 20 com erro (timeout, 429, 500, etc)

Sistema conta: 30 RPD (só sucessos)
Google conta: 50 RPD (todas as tentativas)

→ Google bloqueia por RPD
→ Sistema acha que ainda tem quota
→ Continua tentando e tomando 429
```

---

### **PROBLEMA 2: markKeyAsExhausted() Muito Genérica** ⚠️⚠️ CRÍTICO

**Arquivo**: `enhancedGeminiApi.ts`
**Linha**: 165-186

```typescript
private markKeyAsExhausted(apiKey: GeminiApiKey, errorMessage: string) {
  const isRpdExhausted = errorMessage.toLowerCase().includes('exhausted') ||
                         errorMessage.toLowerCase().includes('quota') ||
                         errorMessage.toLowerCase().includes('resource has been exhausted');

  if (isRpdExhausted) {
    // Marca como exaurida até MEIA-NOITE UTC (24h)
    this.keyExhaustedUntil.set(apiKey.id, tomorrow.getTime());
    this.saveExhaustedKeysToStorage();
  }
}
```

**POR QUE É PROBLEMA**:
- ❌ "resource has been exhausted" é a mensagem GENÉRICA do Google para QUALQUER rate limit
- ❌ Essa mensagem aparece em: RPM, TPM E RPD
- ❌ Sistema marca QUALQUER 429 como "exaurida por 24h"

**MENSAGENS DO GOOGLE**:
```
429 (RPM limit):   "Resource has been exhausted (e.g., check quota)"
429 (TPM limit):   "Resource has been exhausted (e.g., check quota)"
429 (RPD limit):   "Resource has been exhausted (e.g., check quota)"
429 (Billing):     "You exceeded your current quota, please check your plan and billing details"
```

**RESULTADO**: Sistema não consegue diferenciar!

---

### **PROBLEMA 3: Lógica de Diferenciação Errada** ⚠️ CRÍTICO

**Arquivo**: `enhancedGeminiApi.ts`
**Linha**: 1138-1145

```typescript
// CASO 3: RPD esgotada (quota diária) - se mensagem indica quota e não é TPM
if ((errorMessage.includes('exhausted') || errorMessage.includes('quota')) &&
    currentRpm >= 2) {
  // Se RPM também está no limite, provavelmente é RPD
  this.markKeyAsExhausted(api, apiError.message);
  onProgress?.(`🛑 API ${api.name} exauriu RPD (50/dia) ou limite diário. Bloqueada até 00:00 UTC`);
  break;
}
```

**POR QUE É PROBLEMA**:
- ❌ Assume que `currentRpm >= 2` + "exhausted" = RPD
- ❌ Mas currentRpm >= 2 pode acontecer temporariamente sem ser RPD
- ❌ TPM também retorna "exhausted" e pode ocorrer com RPM alto
- ❌ NÃO verifica a contagem REAL de RPD (rpdTimestamps.length)

**EXEMPLO DO ERRO**:
```
Cenário:
- Usuário tem 10 RPD usadas (de 50 permitidas)
- Faz 2 requisições rápidas (currentRpm = 2)
- A 2ª requisição excede TPM (tokens muito grandes)
- Google retorna: 429 "Resource has been exhausted"

Sistema interpreta:
- currentRpm >= 2 ✓
- errorMessage tem "exhausted" ✓
- CONCLUSÃO ERRADA: Marca como RPD exaurida por 24h!

Correto seria:
- Verificar rpdTimestamps.length = 10 (< 50)
- Verificar que foi TPM (não RPD)
- Cooldown de 60s (não 24h)
```

---

### **PROBLEMA 4: Limites Não Definidos Corretamente** ⚠️

**Arquivo**: `enhancedGeminiApi.ts`
**Linha**: 848, 867

```typescript
if (rpmTimestamps.length >= this.REQUESTS_PER_MINUTE_LIMIT) { ... }
if (rpdTimestamps.length >= this.REQUESTS_PER_DAY_LIMIT) { ... }
```

**POR QUE É PROBLEMA**:
- ❌ `this.REQUESTS_PER_MINUTE_LIMIT` e `this.REQUESTS_PER_DAY_LIMIT` NÃO estão definidos como campos da classe
- ❌ Isso retorna `undefined`
- ❌ Comparação `rpmTimestamps.length >= undefined` sempre retorna `false`
- ✅ Sistema TEM a função `getModelLimits()` mas NÃO está sendo usada

**EVIDÊNCIA**:
- Função `getModelLimits()` existe (linha 58-73) e retorna limites corretos
- Mas não há campos `REQUESTS_PER_MINUTE_LIMIT` ou `REQUESTS_PER_DAY_LIMIT`
- Código não usa os limites dinâmicos por modelo

---

### **PROBLEMA 5: Lógica do CASO 2 (TPM) Também Errada** ⚠️

**Arquivo**: `enhancedGeminiApi.ts`
**Linha**: 1120-1136

```typescript
// CASO 2: TPM (Tokens Per Minute)
const currentRpm = (this.apiRequestsPerMinute.get(api.id) || [])
  .filter(t => Date.now() - t < 60000).length;

if (currentRpm < 2 && (errorMessage.includes('resource has been exhausted') ||
                        errorMessage.includes('quota'))) {
  // Se RPM está OK (<2) mas Google reclama = provavelmente TPM
  onProgress?.(`⚠️ API ${api.name}: Possível limite TPM (tokens/min). Aguardando 60s...`);
  this.keyCooldownUntil.set(api.id, Date.now() + 60000);
  consecutiveRateLimits++;
  break;
}
```

**POR QUE É PROBLEMA**:
- ❌ Assume que se `currentRpm < 2` = TPM
- ❌ Mas devido ao PROBLEMA 1, currentRpm está SUBCONTADO
- ❌ Pode ter feito 5 requisições reais, mas só 2 tiveram sucesso → currentRpm = 2
- ❌ Então essa condição nunca entra (sempre vai para CASO 3 ou 4)

---

## 💡 SOLUÇÕES NECESSÁRIAS

### **SOLUÇÃO 1: Contar TODAS as Requisições**

Registrar RPM/RPD no `lockApi()` (ANTES da requisição), não no `recordApiSuccess()`:

```typescript
private lockApi(apiKey: GeminiApiKey) {
  const now = Date.now();
  this.apiInUse.set(apiKey.id, true);
  this.apiLastRequestTime.set(apiKey.id, now);

  // ✅ REGISTRAR RPM/RPD AQUI (antes da requisição)
  const rpm = this.apiRequestsPerMinute.get(apiKey.id) || [];
  rpm.push(now);
  this.apiRequestsPerMinute.set(apiKey.id, rpm);

  const rpd = this.apiRequestsPerDay.get(apiKey.id) || [];
  rpd.push(now);
  this.apiRequestsPerDay.set(apiKey.id, rpd);
}
```

---

### **SOLUÇÃO 2: Verificar RPD REAL Antes de Marcar Como Exaurida**

```typescript
// Só marcar como exaurida se REALMENTE atingiu o limite
const rpdTimestamps = (this.apiRequestsPerDay.get(api.id) || [])
  .filter(t => Date.now() - t < 86400000);

const limits = this.getModelLimits(api.model);

if (rpdTimestamps.length >= limits.rpd) {
  // Agora sim, REALMENTE atingiu o limite
  this.markKeyAsExhausted(api, apiError.message);
} else {
  // Não atingiu RPD, deve ser TPM ou RPM
  // Cooldown temporário (60s)
  this.keyCooldownUntil.set(api.id, Date.now() + 60000);
}
```

---

### **SOLUÇÃO 3: Usar getModelLimits() Corretamente**

```typescript
// Adicionar campo para armazenar modelo por API
private apiModels = new Map<string, string>();

// Ao fazer lockApi, salvar o modelo
private lockApi(apiKey: GeminiApiKey) {
  this.apiModels.set(apiKey.id, apiKey.model);
  // ...
}

// Usar limites dinâmicos em canUseApi()
private canUseApi(apiKey: GeminiApiKey): boolean {
  const limits = this.getModelLimits(apiKey.model);

  if (rpmTimestamps.length >= limits.rpm) { ... }
  if (rpdTimestamps.length >= limits.rpd) { ... }
}
```

---

### **SOLUÇÃO 4: Melhorar Logs para Debug**

Adicionar logs detalhados:

```typescript
console.log(`📊 [${api.name}] RPD atual: ${rpdTimestamps.length}/${limits.rpd}`);
console.log(`📊 [${api.name}] RPM atual: ${rpmTimestamps.length}/${limits.rpm}`);
console.log(`❌ [${api.name}] Erro 429: "${errorMessage}"`);
```

---

## 🎯 PRIORIDADE DE CORREÇÃO

1. ⚠️⚠️⚠️ **URGENTE**: Problema 1 (contagem incorreta) - causa raiz
2. ⚠️⚠️⚠️ **URGENTE**: Problema 2 (markKeyAsExhausted genérica)
3. ⚠️⚠️ **ALTA**: Problema 3 (lógica de diferenciação)
4. ⚠️ **MÉDIA**: Problema 4 (limites não definidos)
5. ⚠️ **MÉDIA**: Problema 5 (lógica do TPM)

---

## 📝 NOTAS ADICIONAIS

- O sistema está SUBCONTANDO requisições, então nunca atinge o limite "internamente"
- Quando o Google retorna 429, o sistema não sabe diferenciar o tipo
- Marca TODAS como "exaurida por 24h" por precaução
- Resultado: Todas as APIs ficam bloqueadas após poucas requisições
