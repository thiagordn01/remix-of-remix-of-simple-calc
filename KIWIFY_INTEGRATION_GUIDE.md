# 🔗 Guia de Integração com Kiwify

Este guia explica como configurar a integração automática entre a Kiwify e seu sistema para liberação automática de acesso após pagamento.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração do Supabase](#configuração-do-supabase)
4. [Configuração do Resend (Email)](#configuração-do-resend-email)
5. [Configuração da Kiwify](#configuração-da-kiwify)
6. [Testando a Integração](#testando-a-integração)
7. [Monitoramento](#monitoramento)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### O que a integração faz:

✅ **Recebe notificação** da Kiwify quando um pagamento é aprovado
✅ **Cria conta automaticamente** para o comprador (se não existir)
✅ **Aprova acesso** instantaneamente
✅ **Calcula expiração** baseada no tipo de compra (assinatura ou única)
✅ **Envia email** com credenciais de acesso
✅ **Registra compra** para auditoria

### Fluxo Completo:

```
Cliente compra na Kiwify
         ↓
Pagamento aprovado
         ↓
Kiwify envia webhook
         ↓
Sistema recebe e processa
         ↓
Usuário criado/atualizado
         ↓
Email enviado com credenciais
         ↓
Cliente acessa o sistema
```

---

## 🔧 Pré-requisitos

- ✅ Conta na Kiwify com produto configurado
- ✅ Projeto no Supabase (já configurado)
- ✅ Conta no Resend.com (gratuita) para envio de emails
- ✅ Domínio próprio (opcional, mas recomendado para emails)

---

## 🗄️ Configuração do Supabase

### Passo 1: Aplicar Migration

A migration já foi criada em `/supabase/migrations/20251112000001_create_kiwify_purchases.sql`

Para aplicar no seu projeto Supabase:

```bash
# Se você usa Supabase CLI localmente:
supabase db push

# OU via Dashboard do Supabase:
# 1. Acesse: https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/sql
# 2. Cole o conteúdo do arquivo SQL
# 3. Clique em "Run"
```

### Passo 2: Deploy da Edge Function

```bash
# Fazer deploy da função kiwify-webhook
supabase functions deploy kiwify-webhook

# OU via Dashboard:
# 1. Acesse: https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/functions
# 2. Clique em "Create function"
# 3. Nome: kiwify-webhook
# 4. Cole o código de /supabase/functions/kiwify-webhook/index.ts
# 5. Clique em "Deploy"
```

### Passo 3: Configurar Variáveis de Ambiente

No Dashboard do Supabase:
1. Vá em **Settings** → **Edge Functions** → **Environment Variables**
2. Adicione as seguintes variáveis:

```env
# Email (Resend) - OPCIONAL mas recomendado
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx

# Email do remetente
SYSTEM_EMAIL_FROM=noreply@seudominio.com

# URL do seu sistema
SYSTEM_URL=https://seudominio.com
```

**Nota:** Se não configurar o RESEND_API_KEY, a integração funcionará mas não enviará emails.

### Passo 4: Obter URL do Webhook

Após deploy, a URL será:

```
https://wzldbdmcozbmivztbmik.supabase.co/functions/v1/kiwify-webhook
```

Copie esta URL, você precisará dela para configurar na Kiwify.

---

## 📧 Configuração do Resend (Email)

### Passo 1: Criar Conta

1. Acesse: https://resend.com/signup
2. Crie uma conta gratuita (100 emails/dia grátis)

### Passo 2: Obter API Key

1. No dashboard do Resend, vá em **API Keys**
2. Clique em **Create API Key**
3. Nome: "Kiwify Integration"
4. Copie a chave (começa com `re_`)

### Passo 3: Configurar Domínio (Opcional)

Para evitar emails caírem em spam:

1. No Resend, vá em **Domains**
2. Clique em **Add Domain**
3. Digite seu domínio: `seudominio.com`
4. Configure os registros DNS (SPF, DKIM, DMARC)
5. Aguarde verificação

**Se não tiver domínio próprio:**
- Use o domínio de teste do Resend
- Emails funcionarão mas podem cair em spam

### Passo 4: Adicionar API Key no Supabase

Volte ao Supabase e adicione a variável:

```env
RESEND_API_KEY=re_sua_chave_aqui
SYSTEM_EMAIL_FROM=noreply@seudominio.com
```

---

## 🥝 Configuração da Kiwify

### Passo 1: Habilitar Dados do Comprador

**IMPORTANTE:** Por padrão, a Kiwify não envia email do comprador no webhook.

1. Acesse seu painel da Kiwify
2. Vá em **Produtos**
3. Selecione seu produto/curso
4. Vá em **Configurações** → **Avançado**
5. Encontre: **"Compartilhar dados do comprador com afiliados"**
6. ✅ **Marque esta opção**

Isso garante que o webhook incluirá `Customer.email` e `Customer.full_name`.

### Passo 2: Criar Webhook

1. No painel da Kiwify, vá em **Apps** → **Webhooks**
2. Clique em **Criar Webhook**
3. Configure:

```
Nome: Liberação Automática Sistema
URL: https://wzldbdmcozbmivztbmik.supabase.co/functions/v1/kiwify-webhook
Produto: [Selecione seu curso]
Eventos: ✅ compra_aprovada
Status: ✅ Ativo
```

4. Clique em **Salvar**

### Passo 3: Webhooks Adicionais (Opcional)

Para gerenciar assinaturas, você pode criar webhooks adicionais:

**Renovação de Assinatura:**
```
Eventos: ✅ subscription_renewed
```

**Cancelamento de Assinatura:**
```
Eventos: ✅ subscription_canceled
```

**Reembolso:**
```
Eventos: ✅ compra_reembolsada
```

**Nota:** A Edge Function atual processa apenas `compra_aprovada`. Para outros eventos, você precisará adicionar lógica adicional no código.

---

## 🧪 Testando a Integração

### Método 1: Compra de Teste na Kiwify

1. Na Kiwify, ative o **Modo de Teste**
2. Faça uma compra de teste do seu produto
3. Use um email real que você tenha acesso
4. Complete o pagamento de teste
5. Aguarde alguns segundos

**Verificações:**
- ✅ Webhook foi recebido pelo Supabase (ver logs)
- ✅ Usuário foi criado no Supabase Auth
- ✅ Profile está com `is_approved = true`
- ✅ Registro aparece na tabela `kiwify_purchases`
- ✅ Email foi recebido com credenciais
- ✅ Consegue fazer login no sistema

### Método 2: Webhook Manual (webhook.site)

Para capturar o payload real da Kiwify:

1. Acesse: https://webhook.site
2. Copie a URL única gerada
3. Na Kiwify, crie um webhook temporário com essa URL
4. Faça uma compra de teste
5. Veja o payload completo no webhook.site
6. Use esse payload para testar localmente se necessário

### Método 3: Ver Logs no Supabase

1. Acesse: https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/logs
2. Selecione: **Edge Functions**
3. Filtre por: `kiwify-webhook`
4. Veja os logs em tempo real

---

## 📊 Monitoramento

### Dashboard de Compras

Você pode criar uma página no admin para visualizar todas as compras:

```typescript
// Consultar compras recentes
const { data: purchases } = await supabase
  .from('kiwify_purchases')
  .select('*')
  .order('purchased_at', { ascending: false })
  .limit(100);
```

### Verificar Status de Usuários

```typescript
// Ver usuários criados via Kiwify
const { data: users } = await supabase
  .from('profiles')
  .select('*, kiwify_purchases(*)')
  .eq('kiwify_purchases.user_id', 'profiles.id');
```

### Logs de Webhook

Todos os webhooks processados são registrados nos logs do Supabase:

1. Dashboard → Logs → Edge Functions
2. Filtre por `kiwify-webhook`
3. Veja payload completo, erros, sucessos

---

## 🔍 Troubleshooting

### ❌ Email não está chegando

**Possíveis causas:**
1. RESEND_API_KEY não configurado
2. Email caindo em spam
3. Domínio não verificado no Resend

**Soluções:**
- Verificar variáveis de ambiente no Supabase
- Configurar SPF/DKIM do domínio
- Pedir ao cliente para verificar pasta de spam
- Ver logs do Resend: https://resend.com/logs

### ❌ Webhook não está sendo recebido

**Possíveis causas:**
1. URL incorreta na Kiwify
2. Webhook não está ativo
3. Dados do comprador não habilitados

**Soluções:**
- Verificar URL do webhook na Kiwify
- Confirmar que webhook está "Ativo"
- Habilitar "Compartilhar dados do comprador"
- Testar com webhook.site primeiro

### ❌ Usuário não está sendo criado

**Possíveis causas:**
1. Email do cliente não vem no payload
2. Erro nas permissões do Supabase
3. Email já existe mas com erro

**Soluções:**
- Ver logs da Edge Function
- Verificar payload no webhook.site
- Confirmar que Customer.email existe
- Verificar RLS policies do Supabase

### ❌ Webhook processado mas acesso não liberado

**Possíveis causas:**
1. Profile não foi criado
2. is_approved não foi setado
3. Cache do frontend

**Soluções:**
- Verificar tabela `profiles` no Supabase
- Fazer logout e login novamente
- Ver logs da Edge Function

### 🔎 Como Ver Logs Detalhados

```bash
# Via Supabase CLI (se instalado):
supabase functions logs kiwify-webhook

# Via Dashboard:
# https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/logs
# → Edge Functions → kiwify-webhook
```

---

## 📈 Estatísticas e Métricas

### Consultas Úteis

**Total de compras no mês:**
```sql
SELECT COUNT(*) as total_vendas, SUM(amount) as total_faturado
FROM kiwify_purchases
WHERE purchased_at >= DATE_TRUNC('month', CURRENT_DATE);
```

**Compras por método de pagamento:**
```sql
SELECT payment_method, COUNT(*) as quantidade
FROM kiwify_purchases
GROUP BY payment_method
ORDER BY quantidade DESC;
```

**Novos usuários vs renovações:**
```sql
SELECT
  COUNT(DISTINCT user_id) as total_usuarios,
  COUNT(*) as total_compras,
  COUNT(*) - COUNT(DISTINCT user_id) as renovacoes
FROM kiwify_purchases;
```

---

## 🔐 Segurança

### Boas Práticas Implementadas

✅ **Service Role Key**: Usado apenas no backend (Edge Function)
✅ **RLS Policies**: Usuários veem apenas suas próprias compras
✅ **Idempotência**: Webhook não processa mesmo pedido 2x
✅ **Validação**: Verifica campos obrigatórios antes de processar
✅ **Logs**: Tudo é registrado para auditoria
✅ **CORS**: Configurado corretamente

### Recomendações Adicionais

1. **Webhook Secret**: Se a Kiwify suportar, adicionar validação HMAC
2. **Rate Limiting**: Configurar no Supabase se necessário
3. **Alertas**: Configurar notificações para erros no webhook
4. **Backup**: Fazer backup regular da tabela `kiwify_purchases`

---

## 🎯 Próximos Passos

Após configurar tudo:

1. ✅ Fazer pelo menos 3 compras de teste
2. ✅ Verificar que emails estão chegando
3. ✅ Confirmar que usuários conseguem logar
4. ✅ Monitorar primeiras 10 vendas reais
5. ✅ Ajustar templates de email conforme necessário
6. ✅ Criar página de FAQ para clientes

---

## 📞 Suporte

Se precisar de ajuda:

1. Verifique os logs no Supabase
2. Teste com webhook.site para ver o payload
3. Revise este guia completamente
4. Verifique as configurações da Kiwify

---

## 📝 Changelog

**v1.0.0 (2025-01-12)**
- ✅ Integração inicial implementada
- ✅ Criação automática de usuários
- ✅ Envio de email com credenciais
- ✅ Suporte a assinaturas e compras únicas
- ✅ Tabela de auditoria
- ✅ Documentação completa

---

**🎉 Pronto! Sua integração está configurada!**

Agora você tem liberação automática de acesso após pagamento na Kiwify! 🚀
