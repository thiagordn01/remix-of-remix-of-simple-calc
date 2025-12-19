# 🚀 Implementação: Sistema de Cancelamentos e Revogação de Acesso Kiwify

## 📋 RESUMO

Implementação de sistema completo para:
1. ✅ Revogar acesso de usuários automaticamente quando houver cancelamento/reembolso
2. ✅ Rastrear cancelamentos, reembolsos e chargebacks no banco de dados
3. ✅ Botão de revogação manual no admin
4. ✅ Botão de restauração de acesso no admin
5. ✅ UI melhorada no Kiwify Purchases

---

## 🎯 O QUE JÁ FOI IMPLEMENTADO

### 1. **Migration para Campos de Cancelamento** ✅

**Arquivo:** `supabase/migrations/20251124000001_add_cancellation_fields.sql`

**Campos Adicionados à Tabela `kiwify_purchases`:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `canceled_at` | TIMESTAMPTZ | Data/hora do cancelamento |
| `cancellation_reason` | TEXT | Motivo do cancelamento |
| `cancellation_type` | TEXT | Tipo: customer_request, non_payment, other |
| `refunded_at` | TIMESTAMPTZ | Data/hora do reembolso |
| `refund_amount` | DECIMAL(10,2) | Valor reembolsado (pode ser parcial) |
| `refund_reason` | TEXT | Motivo do reembolso |
| `chargeback_date` | TIMESTAMPTZ | Data da contestação/chargeback |
| `chargeback_reason` | TEXT | Motivo da contestação |
| `status_history` | JSONB | Histórico de mudanças de status |

**Índices Criados:**
- `idx_kiwify_purchases_canceled_at`
- `idx_kiwify_purchases_refunded_at`
- `idx_kiwify_purchases_chargeback_date`

**Função Helper:**
```sql
add_status_history_entry(purchase_id, status, reason)
```
Adiciona entrada ao histórico de status.

---

### 2. **Webhook Atualizado para Processar Cancelamentos** ✅

**Arquivo:** `supabase/functions/kiwify-webhook/index.ts`

**Funcionalidades Adicionadas:**

#### **A. Roteamento por Status**
```typescript
const REVOKE_STATUSES = ["cancelled", "refunded", "chargeback", "canceled"];

if (REVOKE_STATUSES.includes(orderStatus)) {
  return await handleAccessRevocation(payload, admin);
}

if (orderStatus === "paid") {
  return await handlePaidOrder(payload, admin);
}
```

#### **B. Função `handleAccessRevocation()`**

Processa automaticamente:
1. **Busca usuário** pelo email do payload
2. **Revoga acesso:** Define `is_approved = false` no profile
3. **Atualiza/cria registro** em `kiwify_purchases` com dados de cancelamento:
   - `canceled_at` se `cancelled/canceled`
   - `refunded_at` + `refund_amount` se `refunded`
   - `chargeback_date` se `chargeback`
4. **Retorna sucesso** confirmando revogação

**Status Suportados:**
- ✅ `paid` → Concede acesso
- ✅ `cancelled` → Revoga acesso
- ✅ `canceled` → Revoga acesso (variante)
- ✅ `refunded` → Revoga acesso
- ✅ `chargeback` → Revoga acesso
- ℹ️  `pending`, `failed`, etc → Apenas registra, não processa

**Logs Detalhados:**
```
🚫 Revogando acesso para: cliente@example.com (motivo: cancelled)
✅ Acesso revogado para user_id: uuid
✅ Cancelamento processado para pedido KW12345
```

---

## 🔄 FLUXO COMPLETO DE CANCELAMENTO

### **Cenário: Cliente Cancela Assinatura na Kiwify**

```
1. Cliente solicita cancelamento no dashboard Kiwify
   ↓
2. Kiwify envia webhook para o sistema:
   POST /kiwify-webhook?token=XXX
   {
     "order_id": "KW12345",
     "order_status": "cancelled",
     "Customer": { "email": "cliente@example.com" }
   }
   ↓
3. Sistema processa webhook:
   - Valida token de segurança
   - Detecta status "cancelled"
   - Chama handleAccessRevocation()
   ↓
4. handleAccessRevocation():
   - Encontra usuário pelo email
   - UPDATE profiles SET is_approved = false
   - UPDATE/INSERT kiwify_purchases com canceled_at
   ↓
5. Usuário PERDE ACESSO imediatamente
   ↓
6. Admin vê no painel:
   - Status: "Cancelado"
   - Data do cancelamento
   - Motivo (se fornecido)
```

---

## ⚙️ CONFIGURAÇÃO NECESSÁRIA

### **1. Aplicar Migration**

```bash
# Via Supabase CLI
supabase db push

# OU via Dashboard
# Supabase Dashboard → SQL Editor → Colar conteúdo da migration → Run
```

### **2. Deploy do Webhook Atualizado**

```bash
# Via Supabase CLI
supabase functions deploy kiwify-webhook

# OU via Dashboard
# Supabase Dashboard → Edge Functions → kiwify-webhook → Deploy new version
```

### **3. Configurar Webhook na Kiwify**

Na Kiwify Dashboard:
1. Vá em: **Configurações** → **Webhooks**
2. URL: `https://SEU_PROJETO.supabase.co/functions/v1/kiwify-webhook?token=SEU_TOKEN`
3. Eventos para configurar:
   - ✅ **Pedido Pago** (`paid`)
   - ✅ **Pedido Cancelado** (`cancelled`)
   - ✅ **Pedido Reembolsado** (`refunded`)
   - ✅ **Contestação** (`chargeback`) - se disponível

---

## 🧪 TESTANDO CANCELAMENTOS

### **Teste Manual via curl**

```bash
# Simular cancelamento
curl -X POST \
  "https://SEU_PROJETO.supabase.co/functions/v1/kiwify-webhook?token=SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "TEST_CANCEL_001",
    "order_status": "cancelled",
    "Customer": {
      "email": "teste@example.com",
      "full_name": "Usuário Teste"
    },
    "order_amount": 97.00,
    "Product": {
      "product_name": "Produto Teste"
    }
  }'
```

**Verificar Resultado:**
```sql
-- Ver se acesso foi revogado
SELECT id, name, is_approved
FROM profiles
WHERE id = (
  SELECT user_id FROM kiwify_purchases
  WHERE order_id = 'TEST_CANCEL_001'
);

-- Ver dados de cancelamento
SELECT order_id, order_status, canceled_at, cancellation_reason
FROM kiwify_purchases
WHERE order_id = 'TEST_CANCEL_001';
```

---

## 📊 QUERIES ÚTEIS

### **1. Listar Todos os Cancelamentos**

```sql
SELECT
  kp.order_id,
  kp.customer_name,
  kp.customer_email,
  kp.canceled_at,
  kp.cancellation_reason,
  kp.amount,
  p.is_approved
FROM kiwify_purchases kp
LEFT JOIN profiles p ON kp.user_id = p.id
WHERE kp.canceled_at IS NOT NULL
ORDER BY kp.canceled_at DESC;
```

### **2. Listar Reembolsos**

```sql
SELECT
  kp.order_id,
  kp.customer_name,
  kp.customer_email,
  kp.refunded_at,
  kp.refund_amount,
  kp.refund_reason,
  p.is_approved
FROM kiwify_purchases kp
LEFT JOIN profiles p ON kp.user_id = p.id
WHERE kp.refunded_at IS NOT NULL
ORDER BY kp.refunded_at DESC;
```

### **3. Usuários que ainda têm acesso mas cancelaram**

```sql
SELECT
  p.id,
  p.name,
  p.is_approved,
  kp.canceled_at,
  kp.order_id
FROM profiles p
INNER JOIN kiwify_purchases kp ON p.id = kp.user_id
WHERE kp.canceled_at IS NOT NULL
  AND p.is_approved = true;
```

Esta query identifica casos onde o acesso não foi revogado automaticamente.

---

## ✅ UI DO KIWIFYPURCHASES (COMPLETO)

**Arquivo:** `src/components/admin/KiwifyPurchases.tsx`

**Funcionalidades Implementadas:**
- ✅ Coluna "Status do Pedido" adicionada
- ✅ Badge colorido por status:
  - 🟢 Verde: `paid` (Pago)
  - 🔴 Vermelho: `cancelled` (Cancelado)
  - 🟠 Laranja: `refunded` (Reembolsado)
  - ⚫ Cinza: `chargeback` (Contestado)
- ✅ Botão "Revogar Acesso" no dropdown menu (para usuários com acesso ativo)
- ✅ Botão "Aprovar Acesso" no dropdown menu (para usuários com acesso revogado)
- ✅ Dialog de confirmação para revogar acesso
- ✅ Dialog de confirmação para restaurar acesso
- ✅ Toast notifications para feedback visual
- ✅ Atualização automática da lista após ações

**Como Usar:**

1. **Revogar Acesso Manualmente:**
   - No painel Admin → Kiwify Purchases
   - Clique no menu (três pontinhos) do usuário com acesso ativo
   - Clique em "Revogar Acesso"
   - Confirme a ação no dialog
   - O usuário perderá acesso imediatamente

2. **Restaurar Acesso Manualmente:**
   - No painel Admin → Kiwify Purchases
   - Clique no menu (três pontinhos) do usuário sem acesso
   - Clique em "Aprovar Acesso"
   - Confirme a ação no dialog
   - O usuário recuperará acesso imediatamente

---

## 🚧 MELHORIAS FUTURAS (Opcional)

- [ ] Email de notificação ao usuário quando acesso for revogado
- [ ] Mostrar motivo do cancelamento no hover/tooltip
- [ ] Filtro por status do pedido (Todos/Pagos/Cancelados/Reembolsados)
- [ ] Dashboard de analytics de cancelamentos
- [ ] Relatório mensal de churn (cancelamentos vs novos)
- [ ] Webhook reverso: notificar Kiwify quando admin revogar manualmente

---

## 📝 NOTAS TÉCNICAS

### **Idempotência**

O sistema é idempotente:
- Se webhook de cancelamento chegar 2x, apenas atualiza o registro existente
- Não cria duplicatas
- Usa `order_id` como chave única

### **RLS (Row Level Security)**

Webhook usa `SERVICE_ROLE_KEY` para bypass RLS:
- Pode UPDATE em qualquer profile
- Pode INSERT em kiwify_purchases

### **Rollback**

Para desfazer um cancelamento manualmente:
```sql
UPDATE profiles
SET is_approved = true
WHERE id = (
  SELECT user_id FROM kiwify_purchases
  WHERE order_id = 'KW12345'
);

UPDATE kiwify_purchases
SET order_status = 'paid',
    canceled_at = NULL,
    cancellation_reason = NULL
WHERE order_id = 'KW12345';
```

---

## ⚠️ IMPORTANTE

### **Segurança**

1. **KIWIFY_WEBHOOK_TOKEN** deve ser configurado em:
   - Supabase Dashboard → Settings → Edge Functions → Environment Variables
   - Adicione: `KIWIFY_WEBHOOK_TOKEN=seu_token_secreto_aqui`

2. **Validar origem** dos webhooks:
   - Token de segurança valida requisições
   - Apenas webhooks com token correto são processados

### **Monitoramento**

Monitore os logs do webhook:
```bash
# Via CLI
supabase functions logs kiwify-webhook

# Via Dashboard
Supabase Dashboard → Edge Functions → kiwify-webhook → Logs
```

Procure por:
- ✅ `✅ Cancelamento processado para pedido`
- 🚫 `🚫 Revogando acesso para`
- ⚠️  Erros 401, 500, etc

---

## 📞 SUPORTE

**Problemas Comuns:**

| Problema | Causa | Solução |
|----------|-------|---------|
| Webhook retorna 401 | Token inválido | Verificar KIWIFY_WEBHOOK_TOKEN |
| Acesso não foi revogado | Status não reconhecido | Verificar logs, adicionar status |
| Migration falha | Tabela já tem coluna | DROP COLUMN e re-rodar migration |
| Email não envia | RESEND_API_KEY ausente | Configurar em env vars |

---

## ✅ CHECKLIST DE DEPLOY

Antes de colocar em produção:

- [ ] Migration aplicada e testada
- [ ] Webhook atualizado e deployado
- [ ] KIWIFY_WEBHOOK_TOKEN configurado
- [ ] Webhook configurado na Kiwify
- [ ] Teste de cancelamento executado
- [ ] Logs verificados (sem erros)
- [ ] Queries de validação rodadas
- [ ] Documentação compartilhada com equipe

---

**Status:** ✅ **COMPLETO E PRONTO PARA PRODUÇÃO**

**Última Atualização:** 2025-11-24

**Próximo Passo:** Aplicar migration e fazer deploy (ver GUIA_DEPLOY_PRODUCAO.md)
