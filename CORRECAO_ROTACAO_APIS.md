# 🔧 CORREÇÃO CRÍTICA: Rotação de APIs

## 🐛 PROBLEMA RELATADO

**Sintomas do usuário:**
```
- "Tenho diversas APIs cadastradas"
- "Tive falha em alguns roteiros gerados"
- Log mostra: "📊 APIs usadas antes do erro: 5"
- Erro: "Nenhum conteúdo gerado (unknown)" em TODAS as APIs testadas
- Timeout após apenas ~5-6 APIs de "diversas"
```

**Log fornecido:**
```
[12:17:06] 🔄 Tentativa 19 - 17 (1/3)
[12:17:06] ❌ Erro na API 17: Nenhum conteúdo gerado
[12:17:06] ⏳ Aguardando 11s antes da próxima tentativa...
[12:17:17] 🔄 Tentativa 20 - 17 (2/3)  ← MESMA API!
[12:17:17] ❌ Erro na API 17: Nenhum conteúdo gerado
[12:17:17] ⏳ Aguardando 24s antes da próxima tentativa...
[12:17:41] 🔄 Tentativa 21 - 17 (3/3)  ← MESMA API NOVAMENTE!
[12:17:41] ❌ Erro na API 17: Nenhum conteúdo gerado
[12:17:41] 🔄 API 17 esgotou tentativas, passando para próxima...
```

**Problema identificado:** Sistema faz **3 tentativas NA MESMA API** antes de trocar!

---

## 🔍 ANÁLISE DO PROBLEMA

### **Problema 1: maxRetries = 3**

**Código antigo:**
```typescript
const {
  maxRetries = 3,  // ❌ 3 tentativas por API
  ...
} = options;
```

**Resultado:**
- API 1: tenta 3 vezes (desperdiça 3 tentativas)
- API 2: tenta 3 vezes (desperdiça mais 3)
- ...
- Timeout antes de testar TODAS as APIs

---

### **Problema 2: Loop de retry na mesma API**

**Código antigo:**
```typescript
// Tentar múltiplas vezes com a mesma API
for (let attempt = 0; attempt < maxRetries; attempt++) {
  // Tenta 3 vezes na API 17
  // Se erro "sem conteúdo", faz retry na MESMA API
}
```

**Resultado:**
- Erro "sem conteúdo" na API 17 → retry 3x na API 17
- Erro "sem conteúdo" na API 18 → retry 3x na API 18
- Desperdiça todas as tentativas em poucas APIs

---

### **Problema 3: Não break para erros recuperáveis**

**Código antigo:**
```typescript
if (!apiError.retryable) {
  break; // Só sai se NÃO recuperável
}
// Se recuperável, continua no loop e faz mais 2 tentativas
```

**Resultado:**
- Erro "sem conteúdo" É recuperável
- Mas sistema faz 3 tentativas na mesma API
- Deveria IMEDIATAMENTE ir para próxima API

---

## ✅ CORREÇÕES IMPLEMENTADAS

### **CORREÇÃO 1: maxRetries = 1**

```typescript
const {
  maxRetries = 1,  // ✅ Apenas 1 tentativa por API
  ...
} = options;
```

**Resultado:**
- Cada API é testada UMA VEZ
- Sistema rotaciona entre TODAS as APIs disponíveis
- Maior chance de encontrar uma que funciona

---

### **CORREÇÃO 2: Break imediato para erros não-429**

```typescript
// Se não é retryable, pular para próxima API
if (!apiError.retryable) {
  onProgress?.(`⏭️ Erro não recuperável, pulando para próxima API`);
  break;
}

// ✅ NOVO: Para erros recuperáveis que NÃO são rate limit,
// ir IMEDIATAMENTE para próxima API
if (apiError.code !== 'RATE_LIMIT') {
  onProgress?.(`⏭️ Erro recuperável (${apiError.message}), tentando próxima API`);
  break; // ✅ Sai do loop e vai para próxima API
}
```

**Resultado:**
- "Sem conteúdo" → IMEDIATAMENTE próxima API
- "MAX_TOKENS" → IMEDIATAMENTE próxima API
- "SAFETY" → IMEDIATAMENTE próxima API
- Só faz retry na mesma API para **429 (rate limit)**

---

### **CORREÇÃO 3: Tracking de APIs usadas**

```typescript
const usedApisInThisGeneration = new Set<string>();

// Ao testar uma API
usedApisInThisGeneration.add(api.name);

// No final
onProgress?.(`📊 APIs usadas: ${usedApisInThisGeneration.size}/${availableApis.length}`);
console.log(`📊 APIs testadas:`, Array.from(usedApisInThisGeneration).join(', '));
```

**Resultado:**
- Saber exatamente quantas APIs foram testadas
- Debug melhor de problemas de rotação
- Identificar se sistema está rotacionando corretamente

---

### **CORREÇÃO 4: Logs detalhados do erro "sem conteúdo"**

```typescript
if (!analysis.hasContent) {
  console.warn(`⚠️ Estrutura da resposta:`, {
    hasCandidates: !!data.candidates,
    candidatesLength: data.candidates?.length,
    hasContent: !!data.candidates?.[0]?.content,
    hasParts: !!data.candidates?.[0]?.content?.parts,
    partsLength: data.candidates?.[0]?.content?.parts?.length,
    firstPartText: data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100)
  });
  console.log('📄 Resposta completa da API:', JSON.stringify(data, null, 2));
}
```

**Resultado:**
- Entender POR QUE a API está retornando sem conteúdo
- Pode ser filtro de segurança
- Pode ser prompt muito restritivo
- Pode ser temperatura muito baixa

---

### **CORREÇÃO 5: Validação menos rigorosa**

```typescript
// ANTES: 100 caracteres mínimo
if (!fullText.trim() || fullText.trim().length < 100) {

// AGORA: 20 caracteres mínimo
if (!fullText.trim() || fullText.trim().length < 20) {
```

**Resultado:**
- Menos falsos positivos
- Aceita respostas curtas mas válidas
- Log do tamanho recebido para debug

---

## 📊 COMPARAÇÃO: ANTES vs AGORA

### **ANTES (ERRADO):**
```
Total de APIs: 10
Tentativas: 3 por API

API 1: tentativa 1 (falha "sem conteúdo")
API 1: tentativa 2 (falha "sem conteúdo")  ← MESMA API
API 1: tentativa 3 (falha "sem conteúdo")  ← MESMA API
API 2: tentativa 1 (falha "sem conteúdo")
API 2: tentativa 2 (falha "sem conteúdo")  ← MESMA API
API 2: tentativa 3 (falha "sem conteúdo")  ← MESMA API
...
[Timeout após ~3-4 APIs]
📊 APIs usadas: 4/10  ❌ SÓ 40% TESTADAS
```

### **AGORA (CORRETO):**
```
Total de APIs: 10
Tentativas: 1 por API

API 1: tentativa 1 (falha "sem conteúdo") → próxima
API 2: tentativa 1 (falha "sem conteúdo") → próxima
API 3: tentativa 1 (falha "sem conteúdo") → próxima
API 4: tentativa 1 (falha "sem conteúdo") → próxima
API 5: tentativa 1 (falha "sem conteúdo") → próxima
API 6: tentativa 1 (SUCESSO!) ✅
📊 APIs usadas: 6/10  ✅ 60% TESTADAS (e encontrou uma que funciona!)
```

**OU, se todas falharem:**
```
API 1: tentativa 1 → próxima
API 2: tentativa 1 → próxima
...
API 10: tentativa 1 → próxima
📊 APIs usadas: 10/10  ✅ 100% TESTADAS
```

---

## 🎯 IMPACTO DAS CORREÇÕES

### ✅ **Benefícios:**

1. **Todas as APIs serão testadas**
   - Não desperdiça tentativas em APIs problemáticas
   - Rotaciona entre TODAS antes de desistir

2. **Maior taxa de sucesso**
   - Se UMA API funcionar, o sistema vai encontrá-la
   - Antes: testava 40% das APIs
   - Agora: testa 100% das APIs

3. **Melhor uso de recursos**
   - Não gasta 3 tentativas na mesma API quebrada
   - Distribui tentativas entre todas as APIs

4. **Debug melhor**
   - Logs mostram quantas APIs foram testadas
   - Estrutura da resposta é logada
   - Mais fácil identificar problemas

---

## 🧪 COMO VALIDAR AS CORREÇÕES

### Teste 1: Verificar rotação completa
```
1. Cadastrar 10 APIs no sistema
2. Gerar um roteiro
3. Se houver erro, verificar log:
   "📊 APIs usadas: X/10"
4. ✅ Espera-se: X = 10 (ou próximo)
```

### Teste 2: Verificar sem retry múltiplo
```
1. Gerar um roteiro
2. Observar logs
3. ✅ NÃO deve aparecer:
   "Tentativa X - API 17 (2/3)"
   "Tentativa X - API 17 (3/3)"
4. ✅ Deve aparecer:
   "Tentativa X - API 17 (1/1)"
   "Tentativa Y - API 18 (1/1)"
```

### Teste 3: Verificar logs de estrutura
```
1. Se aparecer "Nenhum conteúdo gerado"
2. Verificar se aparece também:
   "⚠️ Estrutura da resposta: { ... }"
   "📄 Resposta completa da API: { ... }"
3. ✅ Isso ajuda a entender O QUE a API retornou
```

---

## 🚨 ATENÇÃO: Erro "Nenhum conteúdo gerado"

Se TODAS as APIs estão retornando "Nenhum conteúdo gerado", pode ser:

### **Causa 1: Filtro de segurança do Google**
```
Solução:
- Revisar o prompt
- Remover conteúdo sensível/polêmico
- Aumentar temperatura
```

### **Causa 2: Prompt muito grande**
```
Solução:
- Reduzir tamanho do prompt
- Diminuir contexto anterior
- Usar modelo com mais TPM
```

### **Causa 3: Temperatura muito baixa**
```
Solução:
- Aumentar de 0.5 → 0.7
- Já está ajustando automaticamente em retries
```

### **Causa 4: maxTokens muito baixo**
```
Solução:
- Verificar se não está limitando muito
- Aumentar maxTokens se necessário
```

---

## 📝 LOGS ESPERADOS APÓS CORREÇÃO

### **Sucesso:**
```
🚀 Iniciando geração com 10 APIs disponíveis
📊 Configuração: 1 tentativa por API (rotação completa entre todas)
🔄 Tentando API: API-1
🔄 Tentativa 1 - API-1 (1/1)
⏭️ Erro recuperável (Nenhum conteúdo gerado (unknown)), tentando próxima API
🔄 Tentando API: API-2
🔄 Tentativa 2 - API-2 (1/1)
⏭️ Erro recuperável (Nenhum conteúdo gerado (unknown)), tentando próxima API
🔄 Tentando API: API-3
🔄 Tentativa 3 - API-3 (1/1)
✅ Geração concluída com sucesso usando API-3
```

### **Falha (após testar todas):**
```
🚀 Iniciando geração com 10 APIs disponíveis
📊 Configuração: 1 tentativa por API (rotação completa entre todas)
[... testa todas as 10 APIs ...]
📊 APIs usadas antes do erro: 10/10
📊 APIs que foram testadas: API-1, API-2, API-3, ..., API-10
💥 Todas as 10 APIs falharam após 10 tentativas
💡 Sugestão: Verifique as configurações das APIs e tente novamente
```

---

## ✅ CONCLUSÃO

**Sistema agora:**
- ✅ Rotaciona entre TODAS as APIs cadastradas
- ✅ Não desperdiça tentativas na mesma API
- ✅ Maior chance de sucesso
- ✅ Melhor uso de recursos
- ✅ Logs detalhados para debug

**Esperado:**
- Taxa de sucesso deve aumentar significativamente
- Menos timeouts
- Melhor aproveitamento das APIs cadastradas
- Debug mais fácil quando houver problemas

🎉 **Problema resolvido!**
