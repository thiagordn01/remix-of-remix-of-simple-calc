# 🔧 CORREÇÃO: Erro 503 "Model Overloaded" Bloqueando APIs

## ⚠️ PROBLEMA

### Sintoma
APIs exibindo erro: `❌ Erro na API: 503 - The model is overloaded. Please try again later.`

### Comportamento Incorreto
- Sistema bloqueava a API por **1 minuto** quando recebia erro 503
- Todas as APIs bloqueadas mesmo que estivessem funcionando perfeitamente
- RPM/RPD das APIs estavam zerados (nenhum uso recente)

### Causa Raiz
O erro **503 "model overloaded"** é um erro **do lado do servidor do Google**, não da API key:
- Significa que o **modelo Gemini** está temporariamente sobrecarregado
- **NÃO** tem relação com limites de RPM/RPD do usuário
- A API key está **100% funcional**

**Problema no código:**
```typescript
// ANTES (ERRADO) - linha 649-656
if (error.status && error.status >= 500) {
  return {
    shouldBlock: true,          // ❌ BLOQUEAVA
    blockDurationMs: 60000,     // Por 1 minuto
    reason: 'Erro de servidor da API Gemini'
  };
}
```

Isso bloqueava **todas** as APIs que recebessem qualquer erro 5xx, incluindo:
- **503** (Service Unavailable - servidor sobrecarregado)
- **502** (Bad Gateway - problema de rede intermediária)

---

## ✅ SOLUÇÃO IMPLEMENTADA

### Tratamento Diferenciado de Erros 5xx

```typescript
// AGORA (CORRETO)

// Caso 3A: Erros 502/503 - NÃO bloquear (tentar próxima API)
if (error.status === 502 || error.status === 503) {
  return {
    shouldBlock: false,         // ✅ NÃO bloqueia
    blockDurationMs: 0,
    reason: 'Servidor do Google temporariamente sobrecarregado - tentar próxima API'
  };
}

// Caso 3B: Erro 500 - Bloquear por 1 minuto
if (error.status === 500) {
  return {
    shouldBlock: true,
    blockDurationMs: 60000,
    reason: 'Erro interno do servidor Gemini'
  };
}

// Caso 3C: Outros erros 5xx - NÃO bloquear
if (error.status && error.status >= 500) {
  return {
    shouldBlock: false,
    blockDurationMs: 0,
    reason: 'Erro de servidor - tentar próxima API'
  };
}
```

### Logging Melhorado

Agora o sistema mostra mensagens claras quando encontra erro 503:

```typescript
// Log específico para 503
if (apiError.status === 503) {
  onProgress?.(`⚠️ API ${api.name}: Servidor do Google sobrecarregado (503) - rotacionando para próxima API`);
} else if (apiError.status === 502) {
  onProgress?.(`⚠️ API ${api.name}: Bad Gateway (502) - rotacionando para próxima API`);
}

// Log mostrando que API continua disponível
if (!blockInfo.shouldBlock) {
  onProgress?.(`♻️ API ${api.name} - ${blockInfo.reason} - disponível para retry`);
}
```

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### Cenário: Servidor do Google sobrecarregado, 3 APIs configuradas

#### ANTES (INCORRETO):
```
[11:46:46] ❌ Erro na API 1: 503 - The model is overloaded
[11:46:46] 🔒 API 1 bloqueada - não será tentada novamente

[11:46:48] ❌ Erro na API 2: 503 - The model is overloaded
[11:46:48] 🔒 API 2 bloqueada - não será tentada novamente

[11:46:50] ❌ Erro na API 3: 503 - The model is overloaded
[11:46:50] 🔒 API 3 bloqueada - não será tentada novamente

[11:46:50] 💥 ERRO: Falha em todas as APIs disponíveis
```

**Resultado:** ❌ Geração falha mesmo com APIs funcionais

---

#### AGORA (CORRETO):
```
[11:46:46] ⚠️ API 1: Servidor do Google sobrecarregado (503) - rotacionando para próxima API
[11:46:46] ♻️ API 1 - Servidor temporariamente sobrecarregado - disponível para retry

[11:46:48] ⚠️ API 2: Servidor do Google sobrecarregado (503) - rotacionando para próxima API
[11:46:48] ♻️ API 2 - Servidor temporariamente sobrecarregado - disponível para retry

[11:46:50] ⚠️ API 3: Servidor do Google sobrecarregado (503) - rotacionando para próxima API
[11:46:50] ♻️ API 3 - Servidor temporariamente sobrecarregado - disponível para retry

[11:46:52] 🔄 Tentando novamente... (Tentativa 2)
[11:46:52] ⚠️ API 1: Servidor do Google sobrecarregado (503) - rotacionando para próxima API
...
[11:46:58] ✅ Geração concluída com sucesso usando API 2
```

**Resultado:** ✅ Sistema continua tentando até conseguir

---

## 🎯 COMPORTAMENTO AGORA

### Quando recebe erro 503:

1. ✅ **NÃO bloqueia a API** - API continua disponível para próximas tentativas
2. ✅ **Rotaciona para próxima API** - Tenta outra API imediatamente
3. ✅ **Retry infinito** - Continua tentando todas as APIs até conseguir
4. ✅ **Log claro** - Mostra que é problema do servidor do Google, não da API key

### Erros que NÃO bloqueiam (rotacionam para próxima API):
- ✅ **503** Service Unavailable (servidor sobrecarregado)
- ✅ **502** Bad Gateway (problema de rede)
- ✅ **504** Gateway Timeout
- ✅ Timeout/Network Error
- ✅ MAX_TOKENS
- ✅ Filtro de segurança
- ✅ Sem conteúdo gerado

### Erros que BLOQUEIAM temporariamente:
- 🔒 **500** Internal Server Error (1 minuto)
- 🔒 **400** Bad Request (3 minutos)
- 🔒 5 falhas consecutivas (3 minutos)

### Erros que BLOQUEIAM permanentemente:
- 🛑 **401/403** Unauthorized (key inválida)
- 🛑 Billing/pagamento necessário
- 🛑 API Key not found

---

## 🧪 VALIDAÇÃO

### Teste 1: Erro 503 não bloqueia

**Setup:**
1. 3 APIs configuradas
2. Servidor do Google retorna 503 para todas
3. Tentar gerar roteiro

**Resultado Esperado:**
- Sistema tenta API 1 → 503 → rotaciona ✅
- Sistema tenta API 2 → 503 → rotaciona ✅
- Sistema tenta API 3 → 503 → rotaciona ✅
- Sistema volta para API 1 → 503 → rotaciona ✅
- Continua até o servidor do Google voltar a funcionar ✅
- Quando funcionar, gera com sucesso ✅

**Logs Esperados:**
```
⚠️ API 1: Servidor do Google sobrecarregado (503)
♻️ API 1 - Servidor temporariamente sobrecarregado - disponível para retry
⚠️ API 2: Servidor do Google sobrecarregado (503)
♻️ API 2 - Servidor temporariamente sobrecarregado - disponível para retry
...
```

---

## 💡 QUANDO ISSO ACONTECE

O erro 503 "model overloaded" acontece quando:
- Muitos usuários estão usando o Gemini simultaneamente
- O modelo específico (ex: gemini-2.0-flash) está sobrecarregado
- Horários de pico (geralmente horário comercial nos EUA)
- Após lançamentos de novos modelos (muita gente testando)

**É temporário e resolve sozinho** - sistema agora lida perfeitamente com isso.

---

## ✅ BENEFÍCIOS

1. ✅ **APIs não bloqueadas injustamente** - Erro 503 não é culpa da API key
2. ✅ **Resiliência a sobrecarga** - Sistema continua tentando até conseguir
3. ✅ **Logs claros** - Usuário entende que é problema do Google, não dele
4. ✅ **Retry automático** - Não precisa intervir manualmente

---

## 📝 ARQUIVO MODIFICADO

**src/services/enhancedGeminiApi.ts**
- ✅ Linha 649-674: Tratamento diferenciado de erros 502/503/500
- ✅ Linha 1016-1035: Logging melhorado para erros de servidor

---

## ✅ CONCLUSÃO

Erro **503 "model overloaded"** agora é tratado corretamente:
- ✅ **NÃO bloqueia APIs**
- ✅ **Rotaciona automaticamente**
- ✅ **Retry até conseguir**
- ✅ **Logs informativos**

**Status:** ✅ **PRONTO PARA PRODUÇÃO**

**Data:** 2025-01-22
**Versão:** 2.4 (503 Overload Fix)
**Autor:** Claude (Anthropic)

---

## 🔗 COMMITS RELACIONADOS

1. Sistema de quarentena e retry (ROTACAO_API_MELHORADA.md)
2. Sistema de LOCK para prevenir violação de RPM (CORRECAO_RPM_LOCK.md)
3. Correção de loop infinito no último chunk (CORRECAO_LOOP_INFINITO.md)
4. Correção de RPD incorreto e botão de reset (CORRECAO_RPD_RESET.md)
5. **Correção de erro 503 bloqueando APIs (este documento)**
