# 🚀 GUIA COMPLETO DE CONFIGURAÇÃO - PASSO A PASSO

Este guia vai te levar pela configuração completa do sistema de autenticação.
**Siga cada passo na ordem!**

---

## 📋 CHECKLIST GERAL

- [ ] **Passo 1:** Deploy da Edge Function auth-login
- [ ] **Passo 2:** Configurar variáveis de ambiente
- [ ] **Passo 3:** Obter credenciais da API
- [ ] **Passo 4:** Atualizar repositório ferramenta-audio-charles
- [ ] **Passo 5:** Testar integração completa
- [ ] **Passo 6:** Deploy da Edge Function kiwify-webhook (se ainda não fez)

---

# PASSO 1: Deploy da Edge Function auth-login

## 🎯 O que vamos fazer:
Publicar a API de autenticação no Supabase para que os executáveis possam validar login.

## 📝 Instruções:

### 1.1 - Acessar Supabase Dashboard

1. Vá em: **https://supabase.com/dashboard**
2. Faça login
3. Selecione seu projeto (o mesmo que já está usando)

### 1.2 - Ir para Edge Functions

1. No menu lateral esquerdo, clique em **"Edge Functions"**
2. Você verá a lista de funções (provavelmente já tem `kiwify-webhook`)

### 1.3 - Fazer Deploy da Nova Função

**Opção A - Via CLI do Supabase (RECOMENDADO):**

Abra o terminal na pasta do projeto e execute:

```bash
# 1. Se ainda não tem Supabase CLI instalado:
npm install -g supabase

# 2. Fazer login
supabase login

# 3. Linkar com seu projeto (primeira vez)
supabase link --project-ref SEU-PROJECT-REF

# 4. Deploy da função auth-login
supabase functions deploy auth-login

# Aguarde... (pode demorar 30-60 segundos)
```

**Como encontrar SEU-PROJECT-REF:**
- No dashboard do Supabase
- Canto superior direito → Settings → General
- Copie "Reference ID"

**Opção B - Via Dashboard (Se CLI não funcionar):**

Infelizmente o Supabase não tem upload manual de funções pelo dashboard.
Você PRECISA usar a CLI. Se tiver problema, me avise!

### 1.4 - Verificar Deploy

Após deploy, você deve ver:

```
Deployed Function auth-login version: xxxxxxxx
Function URL: https://xxxxxxxx.supabase.co/functions/v1/auth-login
```

✅ **Anote essa URL!** Vamos precisar dela.

---

# PASSO 2: Configurar Variáveis de Ambiente

## 🎯 O que vamos fazer:
Adicionar `SUPABASE_ANON_KEY` nas variáveis de ambiente da função.

## 📝 Instruções:

### 2.1 - Acessar Configurações da Função

1. No Supabase Dashboard → **Edge Functions**
2. Clique na função **`auth-login`**
3. Vá na aba **"Settings"** ou **"Secrets"**

### 2.2 - Adicionar Variável SUPABASE_ANON_KEY

A função precisa desta variável para funcionar. Ela JÁ deve existir no projeto, só precisa estar disponível para a função.

1. Clique em **"Add Secret"** ou **"New Variable"**
2. **Name:** `SUPABASE_ANON_KEY`
3. **Value:** (copie do seu projeto)

**Como encontrar SUPABASE_ANON_KEY:**
- Dashboard → Settings → API
- Copie "anon public" key
- Cola como valor da variável

### 2.3 - Salvar

Clique em **"Save"** ou **"Update"**

✅ **Pronto!** A função agora tem acesso à chave necessária.

---

# PASSO 3: Obter Credenciais da API

## 🎯 O que vamos fazer:
Coletar as informações que seu amigo vai precisar nos executáveis.

## 📝 Instruções:

### 3.1 - Obter API_URL

Você já anotou no Passo 1.4. Se não anotou:

1. Dashboard → Edge Functions → auth-login
2. Procure por **"Function URL"** ou **"Endpoint"**
3. Copie a URL completa

**Formato:**
```
https://xxxxxxxxxxxxxxx.supabase.co/functions/v1/auth-login
```

### 3.2 - Obter ANON_KEY

1. Dashboard → Settings → API
2. Procure **"anon public"** key
3. Copie (é uma string longa começando com "eyJ...")

**Formato:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
```

### 3.3 - Documentar

Cole essas informações em um arquivo texto seguro. Formato:

```
=== CREDENCIAIS DA API ===

API_URL:
https://xxxxxxxxxxxxxxx.supabase.co/functions/v1/auth-login

ANON_KEY:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...

=== IMPORTANTE ===
Passe essas informações para seu amigo colar no auth_manager.py
```

✅ **Guarde bem essas credenciais!**

---

# PASSO 4: Atualizar Repositório ferramenta-audio-charles

## 🎯 O que vamos fazer:
Adicionar os arquivos de autenticação ao repositório do seu amigo.

## 📝 Instruções:

### 4.1 - Baixar Arquivos de Integração

Você tem 2 opções:

**Opção A - Via Git (se tiver acesso local):**
```bash
# Na pasta do seu projeto atual
cd /caminho/para/fun-compute-mate

# Copiar pasta de integração
cp -r integracao-ferramenta-audio /tmp/

# OU baixar o ZIP:
cp integracao-ferramenta-audio.zip ~/Downloads/
```

**Opção B - Via GitHub:**
1. Vá no repositório: https://github.com/thiagordn01/fun-compute-mate
2. Navegue até a pasta `integracao-ferramenta-audio/`
3. Baixe cada arquivo OU baixe o ZIP

### 4.2 - Clonar Repositório do Áudio

```bash
# Clone o repositório do seu amigo
git clone https://github.com/thiagordn01/ferramenta-audio-charles.git
cd ferramenta-audio-charles
```

### 4.3 - Adicionar Arquivos

Copie estes arquivos da pasta `integracao-ferramenta-audio/` para dentro de `ferramenta-audio-charles/`:

```bash
# Copiar arquivos necessários
cp /caminho/para/integracao-ferramenta-audio/auth_manager.py .
cp /caminho/para/integracao-ferramenta-audio/tela_login.py .
cp /caminho/para/integracao-ferramenta-audio/requirements.txt .
cp /caminho/para/integracao-ferramenta-audio/README.md .
cp /caminho/para/integracao-ferramenta-audio/.gitignore .
cp /caminho/para/integracao-ferramenta-audio/INSTRUÇÕES_INSTALACAO.md .
```

### 4.4 - Atualizar API_URL e ANON_KEY

Abra `auth_manager.py` e cole as credenciais do Passo 3:

```python
# Linha 18-19
API_URL = "https://xxxxxxxxxxxxxxx.supabase.co/functions/v1/auth-login"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx..."
```

Salve o arquivo!

### 4.5 - Fazer Commit e Push

```bash
git add .
git commit -m "feat: Add Kiwify authentication system integration"
git push origin main
```

✅ **Repositório atualizado!**

---

# PASSO 5: Testar Integração Completa

## 🎯 O que vamos fazer:
Testar se tudo está funcionando corretamente.

## 📝 Instruções:

### 5.1 - Testar API Diretamente

Use o terminal ou Postman para testar:

```bash
curl -X POST https://SEU-PROJECT.supabase.co/functions/v1/auth-login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA-ANON-KEY" \
  -d '{"email":"usuario@teste.com","password":"senha123"}'
```

**Resultado esperado se usuário existe:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1...",
  "user": {...},
  "access": {...}
}
```

**Resultado esperado se senha errada:**
```json
{
  "success": false,
  "error": "Email ou senha incorretos"
}
```

### 5.2 - Testar com Credenciais Reais

Para testar corretamente, você precisa de um usuário criado pelo Kiwify.

**Como criar um usuário de teste:**

**Opção A - Via Sistema Web:**
1. Acesse seu sistema web admin
2. Vá em "Usuários" ou "Admin"
3. Crie um usuário manual se tiver essa funcionalidade

**Opção B - Fazer Compra Teste no Kiwify:**
1. Configure produto mínimo (R$ 5,00)
2. Faça compra teste
3. Webhook vai criar usuário automaticamente
4. Use as credenciais do email

**Opção C - Criar Direto no Supabase:**
1. Dashboard → Authentication → Users
2. Add user → Email/Password
3. Depois vá em Database → profiles
4. Defina `is_approved = true` para esse usuário

### 5.3 - Verificar Logs

Se algo der errado:

1. Dashboard → Edge Functions → auth-login
2. Clique em **"Logs"** ou **"Invocations"**
3. Veja os erros que aparecem

---

# PASSO 6: Deploy da Edge Function kiwify-webhook (se necessário)

## 🎯 O que vamos fazer:
Garantir que o webhook do Kiwify está atualizado.

## 📝 Instruções:

### 6.1 - Verificar Status

1. Dashboard → Edge Functions
2. Veja se `kiwify-webhook` existe
3. Clique nela

### 6.2 - Verificar Variáveis de Ambiente

A função precisa destas variáveis:

```
SYSTEM_EMAIL_FROM = contato@syntaxytb.com
SYSTEM_URL = https://seu-sistema.lovable.app
RESEND_API_KEY = re_xxxxxxxxx (sua chave do Resend)
KIWIFY_WEBHOOK_TOKEN = yg4vvmwall8 (ou seu token)
```

**REMOVA ou deixe vazia:**
```
TEST_EMAIL_OVERRIDE = (apagar)
```

### 6.3 - Redeploy (se mudou algo)

Se você mudou alguma variável:

```bash
supabase functions deploy kiwify-webhook
```

OU no dashboard: Clique em **"Redeploy"**

---

# ✅ VERIFICAÇÃO FINAL

Depois de tudo configurado, verifique:

## Checklist de Verificação:

- [ ] Edge Function `auth-login` está deployed
- [ ] Variáveis de ambiente configuradas
- [ ] API_URL e ANON_KEY obtidos e documentados
- [ ] Arquivos adicionados ao repositório ferramenta-audio-charles
- [ ] `auth_manager.py` tem credenciais corretas
- [ ] Testou API com curl (retorna resposta)
- [ ] Testou com credenciais reais (login funciona)
- [ ] Edge Function `kiwify-webhook` está atualizada
- [ ] Variável `SYSTEM_EMAIL_FROM` configurada
- [ ] Variável `TEST_EMAIL_OVERRIDE` removida

---

# 🆘 SE ALGO DER ERRADO

## Erro: "supabase: command not found"

**Solução:**
```bash
# Instalar Supabase CLI
npm install -g supabase

# Se não tiver npm, instale Node.js primeiro:
# https://nodejs.org/
```

## Erro: "Project ref not found"

**Solução:**
```bash
# Obter project ref:
# Dashboard → Settings → General → Reference ID

# Linkar novamente:
supabase link --project-ref SEU-REF
```

## Erro: "Failed to deploy function"

**Causas comuns:**
1. Erro de sintaxe no código → Verifique logs
2. Falta import_map.json → Função precisa ter config.json
3. Timeout → Tente novamente

**Solução:**
```bash
# Ver logs:
supabase functions logs auth-login

# Tentar novamente:
supabase functions deploy auth-login --no-verify-jwt
```

## Erro: "Invalid API key"

**Solução:**
- Verifique se copiou ANON_KEY completa
- Não deve ter espaços ou quebras de linha
- Teste no Postman primeiro

---

# 📞 PRÓXIMOS PASSOS

Depois de concluir TODOS os passos:

1. **Passar credenciais para seu amigo:**
   - Envie API_URL e ANON_KEY
   - Peça para ele colar no `auth_manager.py`

2. **Testar executável:**
   - Seu amigo deve gerar novo .exe
   - Testar login com usuário real

3. **Distribuir:**
   - Publicar executável nos Releases do GitHub
   - Usuários podem baixar e usar

---

**BOA SORTE!** 🚀

Se tiver qualquer dúvida durante o processo, me avise que eu te ajudo!
