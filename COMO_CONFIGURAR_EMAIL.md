# 📧 GUIA DETALHADO - Como Configurar Email (Resend)

## ⚠️ IMPORTANTE: Este passo é OPCIONAL

**Sem configurar email:**
- ✅ A integração **VAI FUNCIONAR**
- ✅ Usuários **SERÃO CRIADOS** automaticamente
- ✅ Acesso **SERÁ LIBERADO** automaticamente
- ❌ Email com credenciais **NÃO SERÁ ENVIADO**

**Com email configurado:**
- ✅ Cliente recebe email automático com login e senha
- ✅ Experiência 100% automatizada
- ✅ Zero trabalho manual

---

## 🎯 PASSO A PASSO COMPLETO

### PARTE 1: CRIAR CONTA NO RESEND (5 min)

#### 1.1 Acessar Resend

```
👉 Abra no navegador: https://resend.com/signup
```

#### 1.2 Criar conta gratuita

1. Clique em **"Get Started"** ou **"Sign Up"**
2. Preencha:
   - Email: seu email
   - Senha: crie uma senha
3. Clique em **"Create Account"**
4. Confirme seu email (vai chegar um email de verificação)

**💰 Custo:** GRÁTIS para 3.000 emails/mês (você vai usar ~1.000)

---

### PARTE 2: OBTER API KEY DO RESEND (2 min)

#### 2.1 Fazer login no Resend

Após criar a conta e confirmar o email, você verá o dashboard do Resend.

#### 2.2 Ir em API Keys

No menu lateral esquerdo, clique em:
```
🔑 API Keys
```

#### 2.3 Criar nova API Key

1. Clique no botão: **"Create API Key"**
2. Preencha:
   - **Name:** `Kiwify Integration` (ou qualquer nome)
   - **Permission:** Deixe **"Full Access"** (padrão)
3. Clique em: **"Add"**

#### 2.4 COPIAR A CHAVE

⚠️ **ATENÇÃO:** A chave aparece APENAS UMA VEZ!

Você verá algo assim:
```
re_abc123def456ghi789jkl012mno345pqr678stu
```

**COPIE ESTA CHAVE AGORA!** (Ctrl+C)

Ela começa com `re_` e tem cerca de 40 caracteres.

**Salve em algum lugar seguro** (bloco de notas, por exemplo).

---

### PARTE 3: ADICIONAR NO SUPABASE (3 min)

#### 3.1 Abrir Dashboard do Supabase

```
👉 Abra: https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik
```

#### 3.2 Ir em Settings (Configurações)

No menu lateral **ESQUERDO**, role até o final e clique em:
```
⚙️ Project Settings
```

#### 3.3 Ir em Edge Functions

Dentro de Project Settings, no menu lateral **ESQUERDO**, clique em:
```
⚡ Edge Functions
```

Ou use o link direto:
```
👉 https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/settings/functions
```

#### 3.4 Encontrar "Function Secrets"

Na página de Edge Functions, **role a página para baixo** até ver:

```
🔐 Function Secrets
```

Deve ter um texto explicativo e um botão **"Add new secret"** ou **"Reveal secrets"**.

#### 3.5 Adicionar as 3 variáveis

Clique em **"Add new secret"** ou **"Reveal secrets"** (se já houver alguma).

**Adicione estas 3 variáveis:**

---

**VARIÁVEL 1:**
```
Name:  RESEND_API_KEY
Value: re_sua_chave_aqui (cole a chave que você copiou do Resend)
```

Clique em **"Save"** ou **"Add"**

---

**VARIÁVEL 2:**
```
Name:  SYSTEM_EMAIL_FROM
Value: noreply@resend.dev
```

⚠️ **Importante:**
- Se você tiver domínio próprio: `noreply@seudominio.com`
- Se NÃO tiver: use `noreply@resend.dev` (domínio de teste do Resend)

Clique em **"Save"** ou **"Add"**

---

**VARIÁVEL 3:**
```
Name:  SYSTEM_URL
Value: https://seu-sistema.com
```

⚠️ **Importante:**
- Coloque a URL onde seu sistema está rodando
- Se ainda não tiver domínio, pode deixar: `http://localhost:5173`

Clique em **"Save"** ou **"Add"**

---

#### 3.6 Verificar se foi salvo

Após adicionar as 3 variáveis, você deve ver:

```
✅ RESEND_API_KEY = re_**************************
✅ SYSTEM_EMAIL_FROM = noreply@resend.dev
✅ SYSTEM_URL = https://seu-sistema.com
```

---

## ✅ PRONTO! Email configurado!

Agora quando alguém comprar na Kiwify, vai receber um email automático com:
- 📧 Email de login
- 🔑 Senha temporária
- 🔗 Link para acessar o sistema

---

## 🔍 ONDE ESTÁ CADA COISA - RESUMO VISUAL

### No Supabase:

```
Dashboard do Supabase
  └─ Menu Lateral ESQUERDO
      └─ ⚙️ Project Settings (no final do menu)
          └─ Menu Lateral ESQUERDO
              └─ ⚡ Edge Functions
                  └─ Role a página para baixo
                      └─ 🔐 Function Secrets
                          └─ Add new secret
```

**Caminho curto:**
```
Supabase → Settings → Edge Functions → Function Secrets
```

**Link direto:**
```
https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/settings/functions
```

---

## 🆘 NÃO ESTÁ ENCONTRANDO?

### Opção 1: Use o link direto

Cole isso no navegador:
```
https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/settings/functions
```

### Opção 2: Buscar no Supabase

1. No dashboard do Supabase
2. Aperte `Ctrl + K` (ou `Cmd + K` no Mac)
3. Digite: `edge functions`
4. Clique no resultado

### Opção 3: Pular por enquanto

Você pode pular este passo e fazer depois!

A integração vai funcionar perfeitamente, mas você precisará enviar as credenciais manualmente para os clientes.

---

## 📧 QUERO DOMÍNIO PRÓPRIO (Opcional Avançado)

Se quiser que os emails saiam do seu domínio (ex: `contato@meucurso.com`):

### Passo 1: Adicionar domínio no Resend

1. No Resend, vá em: **Domains**
2. Clique em: **Add Domain**
3. Digite seu domínio: `meucurso.com`
4. Copie os registros DNS que aparecer

### Passo 2: Configurar DNS

No seu provedor de domínio (GoDaddy, Hostinger, Registro.br, etc):

1. Entre no painel
2. Vá em: **DNS** ou **Gerenciar DNS**
3. Adicione os registros que o Resend mostrou:
   - **TXT** para SPF
   - **TXT** para DKIM
   - **CNAME** para DMARC

### Passo 3: Aguardar verificação

- Leva de 15 minutos a 24 horas
- O Resend avisa quando verificar

### Passo 4: Atualizar variável no Supabase

Troque:
```
SYSTEM_EMAIL_FROM = noreply@meucurso.com
```

---

## 🧪 TESTAR SE ESTÁ FUNCIONANDO

Após configurar:

1. Fazer uma compra de teste na Kiwify
2. Usar um **email real** que você tenha acesso
3. Aguardar 30 segundos
4. Verificar a caixa de entrada
5. **Não chegou?** Verificar SPAM

---

## ❓ DÚVIDAS COMUNS

### "Não encontro Function Secrets"

- Certifique-se que está em: **Settings → Edge Functions**
- Role a página **TODO para baixo**
- Pode estar escrito: "Secrets" ou "Environment Variables"

### "Não sei minha URL"

- Se o sistema está no Vercel/Netlify: copie a URL deles
- Se está local: use `http://localhost:5173`
- Se não sabe: coloque qualquer coisa por enquanto

### "Quero pular este passo"

- **Pode pular!** A integração funciona sem email
- Você poderá adicionar depois quando quiser

---

## 🎯 RESUMO ULTRA RÁPIDO

1. Criar conta: https://resend.com/signup
2. Pegar API Key: Resend → API Keys → Create
3. Adicionar no Supabase:
   ```
   https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/settings/functions
   ```
   Role para baixo → Function Secrets → Add:
   - `RESEND_API_KEY` = sua chave
   - `SYSTEM_EMAIL_FROM` = noreply@resend.dev
   - `SYSTEM_URL` = sua URL

Pronto! 🎉

---

## 🆘 AINDA COM DÚVIDA?

Me chame de novo e diga:
- "Não encontro Function Secrets" → Te mando print
- "Não sei minha URL" → Te ajudo a descobrir
- "Não consigo criar conta no Resend" → Te ajudo com alternativas
- "Quero pular" → OK! Pula e faz depois

O importante é que **o sistema vai funcionar mesmo sem email!** 😊
