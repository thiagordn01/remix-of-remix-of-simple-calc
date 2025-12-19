# 🚀 GUIA RÁPIDO - Ativação da Integração Kiwify

Este guia contém **TODOS OS PASSOS** necessários para ativar a integração Kiwify no seu sistema.

⏱️ **Tempo estimado:** 15 minutos

---

## ✅ CHECKLIST DE ATIVAÇÃO

- [ ] **Passo 1:** Criar tabela no banco de dados (2 min)
- [ ] **Passo 2:** Deploy da Edge Function (3 min)
- [ ] **Passo 3:** Configurar email (5 min) - OPCIONAL
- [ ] **Passo 4:** Configurar webhook na Kiwify (5 min)
- [ ] **Passo 5:** Testar integração (5 min)

---

## 📝 PASSO 1: CRIAR TABELA NO BANCO DE DADOS

### 1.1 Acesse o SQL Editor do Supabase

```
👉 Abra: https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/sql/new
```

### 1.2 Execute o SQL

1. **Abra o arquivo:** `supabase/SETUP_DATABASE.sql`
2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
3. **Cole no SQL Editor** do Supabase
4. **Clique em RUN** (botão verde no canto inferior direito)

### 1.3 Verificar Sucesso

Você deve ver no resultado:

```
✅ mensagem: "Tabela kiwify_purchases criada com sucesso!"
✅ total_registros: 0
✅ 5 políticas RLS criadas
```

Se der erro, execute novamente. O SQL está preparado para rodar múltiplas vezes sem problemas.

---

## 🚀 PASSO 2: DEPLOY DA EDGE FUNCTION

### 2.1 Acesse Edge Functions

```
👉 Abra: https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/functions
```

### 2.2 Criar Nova Function

1. **Clique em:** `New Function` (botão verde)
2. **Nome da função:** `kiwify-webhook`
3. **Região:** Deixe o padrão (South America se disponível)

### 2.3 Colar o Código

1. **Abra o arquivo:** `supabase/functions/kiwify-webhook/index.ts`
2. **Copie TODO o conteúdo**
3. **Cole no editor da função**
4. **Clique em:** `Deploy Function`

### 2.4 Aguardar Deploy

- O deploy leva ~30 segundos
- Aguarde aparecer: ✅ "Function deployed successfully"

### 2.5 Copiar URL da Function

Após deploy, copie a URL que aparece:

```
https://wzldbdmcozbmivztbmik.supabase.co/functions/v1/kiwify-webhook
```

⚠️ **IMPORTANTE:** Salve essa URL, você precisará dela no Passo 4!

---

## 📧 PASSO 3: CONFIGURAR EMAIL (OPCIONAL)

> ⚠️ **Este passo é OPCIONAL.** Sem ele, a integração funciona mas não envia emails com credenciais.
> Os usuários terão acesso liberado, mas você precisará enviar as credenciais manualmente.

### Por que configurar?

- ✅ Clientes recebem email automático com credenciais
- ✅ Experiência 100% automatizada
- ✅ Zero trabalho manual

### Opção A: Usar Resend (Recomendado)

#### 3.A.1 Criar conta no Resend

```
👉 Acesse: https://resend.com/signup
```

- É GRÁTIS até 3.000 emails/mês
- Não precisa cartão de crédito

#### 3.A.2 Obter API Key

1. Após criar conta, vá em: **API Keys**
2. Clique em: **Create API Key**
3. Nome: `Kiwify Integration`
4. Permissões: **Send emails** (padrão)
5. **Copie a chave** (começa com `re_`)
   - ⚠️ Ela aparece só uma vez! Salve agora!

#### 3.A.3 Configurar domínio (OPCIONAL)

Para emails não caírem em spam:

1. No Resend, vá em: **Domains**
2. **Add Domain**
3. Digite seu domínio: `seudominio.com`
4. Copie os registros DNS mostrados
5. Adicione no seu provedor de domínio (GoDaddy, Hostinger, etc.)
6. Aguarde verificação (~15 minutos)

**Se não tiver domínio:** Emails funcionarão mas podem cair em spam.

#### 3.A.4 Adicionar variáveis no Supabase

```
👉 Abra: https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/settings/functions
```

1. Role até: **Environment Variables**
2. Clique em: **Add Variable**

**Adicione estas 3 variáveis:**

| Nome | Valor | Exemplo |
|------|-------|---------|
| `RESEND_API_KEY` | Sua API key | `re_ABC123...` |
| `SYSTEM_EMAIL_FROM` | Email remetente | `noreply@seudominio.com` |
| `SYSTEM_URL` | URL do sistema | `https://seudominio.com` |

**Notas:**
- Se não configurou domínio no Resend, use: `onboarding@resend.dev` como remetente
- `SYSTEM_URL`: URL onde seu sistema está hospedado

3. **Clique em:** `Save` em cada variável

### Opção B: Pular configuração de email

Se pular, você precisará:
- Enviar credenciais manualmente para cada cliente
- Ou habilitar "Recuperar senha" na tela de login

---

## 🥝 PASSO 4: CONFIGURAR WEBHOOK NA KIWIFY

### 4.1 Habilitar dados do comprador

⚠️ **CRÍTICO:** Sem isso, o webhook não funcionará!

1. Acesse: **Painel Kiwify** → **Produtos**
2. Selecione seu curso/produto
3. Vá em: **Configurações** → **Avançado**
4. Procure: **"Compartilhar dados do comprador com afiliados"**
5. ✅ **MARQUE esta opção**
6. **Salve**

> Isso garante que o webhook enviará `email` e `nome` do comprador.

### 4.2 Criar webhook

1. No painel Kiwify, vá em: **Apps** → **Webhooks**
2. Clique em: **Criar Webhook**
3. Preencha:

```
┌─────────────────────────────────────────────────────┐
│ Nome:     Liberação Automática Sistema             │
│ URL:      https://wzldbdmcozbmivztbmik.supabase.co/│
│           functions/v1/kiwify-webhook               │
│ Produto:  [Selecione seu curso]                    │
│ Eventos:  ✅ compra_aprovada                        │
│ Status:   ✅ Ativo                                  │
└─────────────────────────────────────────────────────┘
```

4. **Clique em:** `Salvar`

### 4.3 Verificar webhook criado

Você deve ver o webhook na lista com:
- ✅ Status: Ativo
- ✅ Evento: compra_aprovada

---

## 🧪 PASSO 5: TESTAR INTEGRAÇÃO

### 5.1 Ativar modo de teste na Kiwify

1. No produto, ative: **Modo de Teste**
2. Isso permite fazer compras sem pagamento real

### 5.2 Fazer compra de teste

1. Acesse a página de vendas do seu produto
2. **Use um email REAL** que você tenha acesso (para receber o email com credenciais)
3. Complete o pagamento de teste
4. Aguarde ~5-10 segundos

### 5.3 Verificar nos logs do Supabase

```
👉 Abra: https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/logs/edge-functions
```

1. Selecione: **kiwify-webhook**
2. Você deve ver:
   - ✅ `=== Webhook Kiwify Recebido ===`
   - ✅ `Novo usuário criado: [uuid]`
   - ✅ `✅ Webhook processado com sucesso`

### 5.4 Verificar usuário criado

```
👉 Abra: https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/auth/users
```

Deve aparecer um novo usuário com o email usado no teste.

### 5.5 Verificar no painel Admin do sistema

1. Acesse seu sistema
2. Faça login com sua conta master
3. Vá em: **Admin** → **Kiwify** (nova aba)
4. Deve aparecer a compra registrada com:
   - ✅ Nome do cliente
   - ✅ Email
   - ✅ Valor
   - ✅ Status: Pago

### 5.6 Verificar email recebido

- Cheque a caixa de entrada do email usado no teste
- Deve chegar um email com:
  - ✅ Título: "🎉 Seu acesso foi liberado!"
  - ✅ Email de login
  - ✅ Senha temporária

### 5.7 Testar login

1. Abra seu sistema em aba anônima
2. Use o email e senha do email recebido
3. Deve conseguir fazer login e acessar normalmente

---

## ✅ VERIFICAÇÃO FINAL - TUDO FUNCIONANDO?

Marque cada item:

- [ ] Webhook aparece nos logs do Supabase
- [ ] Usuário foi criado no Auth
- [ ] Perfil está aprovado (`is_approved = true`)
- [ ] Compra aparece na aba Kiwify do Admin
- [ ] Email foi recebido (se configurou Resend)
- [ ] Login funciona com as credenciais

### ✅ Tudo OK?

**PARABÉNS! 🎉** Sua integração está 100% funcional!

A partir de agora:
- ✅ Toda venda na Kiwify = acesso liberado automaticamente
- ✅ Zero trabalho manual
- ✅ Cliente recebe email em segundos
- ✅ Experiência profissional

---

## 🔧 TROUBLESHOOTING

### ❌ Webhook não aparece nos logs

**Possíveis causas:**
1. URL do webhook incorreta na Kiwify
2. Webhook não está ativo
3. Dados do comprador não habilitados

**Soluções:**
- Copie a URL exata da Edge Function
- Verifique se webhook está "Ativo"
- Confirme que "Compartilhar dados do comprador" está marcado
- Teste com https://webhook.site primeiro

### ❌ Email não chega

**Possíveis causas:**
1. Variáveis de ambiente não configuradas
2. Email caiu em spam
3. API Key do Resend inválida

**Soluções:**
- Verificar variáveis em Settings → Functions → Environment Variables
- Pedir cliente checar pasta de spam
- Testar API Key do Resend no painel deles
- Configurar SPF/DKIM do domínio

### ❌ Usuário criado mas sem acesso

**Possíveis causas:**
1. Profile não foi criado/aprovado
2. Cache do navegador

**Soluções:**
- Verificar tabela `profiles` se `is_approved = true`
- Fazer logout e login novamente
- Limpar cache do navegador

### ❌ Erro "Invalid invite" ou similar

Ignore. Esse erro não afeta a integração Kiwify. É da funcionalidade de convites.

---

## 📞 SUPORTE

Se ainda tiver problemas:

1. ✅ Revise este guia do início
2. ✅ Verifique logs: Dashboard → Logs → Edge Functions
3. ✅ Use webhook.site para capturar payload da Kiwify
4. ✅ Confira se todos os passos foram seguidos exatamente

---

## 📊 MONITORAMENTO CONTÍNUO

### Ver estatísticas

```
👉 Seu Sistema → Admin → Kiwify
```

Você verá:
- 📈 Total de vendas
- 💰 Faturamento total
- 👥 Clientes únicos
- 📅 Vendas do mês

### Ver logs de webhook

```
👉 Supabase → Logs → Edge Functions → kiwify-webhook
```

### Ver compras no banco

```
👉 Supabase → Table Editor → kiwify_purchases
```

---

## 🎯 PRÓXIMOS PASSOS (OPCIONAL)

### Webhooks adicionais

Você pode criar mais webhooks para:

**Renovação de assinatura:**
- Evento: `subscription_renewed`
- Usa a mesma URL
- (Requer código adicional na Edge Function)

**Reembolso:**
- Evento: `compra_reembolsada`
- Usa a mesma URL
- (Requer código adicional na Edge Function)

### Customizar emails

Edite o arquivo:
```
supabase/functions/kiwify-webhook/index.ts
```

Procure pela função `sendCredentialsEmail` e altere o HTML.

### Criar dashboard de vendas

Use a tabela `kiwify_purchases` para criar:
- Gráficos de vendas por dia
- Relatório de métodos de pagamento
- Análise de produtos mais vendidos

---

## 📝 RESUMO

**O que você configurou:**

1. ✅ Tabela `kiwify_purchases` no banco
2. ✅ Edge Function `kiwify-webhook`
3. ✅ Integração com Resend para emails
4. ✅ Webhook ativo na Kiwify
5. ✅ Dashboard de compras no Admin

**Resultado:**

```
Cliente compra na Kiwify
         ↓
Pagamento aprovado
         ↓
Webhook enviado
         ↓
Sistema cria usuário e aprova
         ↓
Email enviado com credenciais
         ↓
Cliente acessa o sistema
```

**Tempo total: ~0 segundos após pagamento**

---

## 🎉 PARABÉNS!

Você agora tem uma integração profissional, automática e escalável entre Kiwify e seu sistema!

**Economize 83 horas/mês** com 1000 vendas e ofereça a melhor experiência para seus clientes! 🚀

---

**Documentação completa:** `KIWIFY_INTEGRATION_GUIDE.md`
**Código da Edge Function:** `supabase/functions/kiwify-webhook/index.ts`
**SQL do banco:** `supabase/SETUP_DATABASE.sql`
