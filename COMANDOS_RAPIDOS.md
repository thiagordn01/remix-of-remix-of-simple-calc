# ⚡ COMANDOS RÁPIDOS - COPIAR E COLAR

Use este arquivo para copiar e colar comandos rapidamente.

---

## 🔧 INSTALAÇÃO DO SUPABASE CLI

```bash
# Instalar Supabase CLI globalmente
npm install -g supabase

# Verificar instalação
supabase --version
```

---

## 🔐 LOGIN E CONFIGURAÇÃO

```bash
# 1. Fazer login no Supabase
supabase login

# 2. Navegar até a pasta do projeto
cd /caminho/para/fun-compute-mate

# 3. Linkar com projeto Supabase
# IMPORTANTE: Substitua SEU-PROJECT-REF pelo seu Reference ID
supabase link --project-ref SEU-PROJECT-REF
```

**Como encontrar SEU-PROJECT-REF:**
- Dashboard do Supabase → Settings → General → Reference ID

---

## 🚀 DEPLOY DA EDGE FUNCTION AUTH-LOGIN

```bash
# Deploy da função de autenticação
supabase functions deploy auth-login

# Ver logs em tempo real (opcional)
supabase functions logs auth-login --follow
```

---

## 🔄 DEPLOY DA EDGE FUNCTION KIWIFY-WEBHOOK (se necessário)

```bash
# Redeploy do webhook
supabase functions deploy kiwify-webhook

# Ver logs
supabase functions logs kiwify-webhook --follow
```

---

## 📥 CLONAR E ATUALIZAR REPOSITÓRIO DO ÁUDIO

```bash
# 1. Clonar repositório do seu amigo
git clone https://github.com/thiagordn01/ferramenta-audio-charles.git

# 2. Entrar na pasta
cd ferramenta-audio-charles

# 3. Copiar arquivos de integração (ajuste o caminho)
# Opção A: Se você tem a pasta local
cp /caminho/para/fun-compute-mate/integracao-ferramenta-audio/* .

# Opção B: Se baixou o ZIP
unzip integracao-ferramenta-audio.zip
cp integracao-ferramenta-audio/* .

# 4. Ver o que foi adicionado
git status

# 5. Adicionar tudo
git add .

# 6. Fazer commit
git commit -m "feat: Add Kiwify authentication system integration"

# 7. Push para GitHub
git push origin main
```

---

## 🧪 TESTAR API COM CURL

```bash
# IMPORTANTE: Substitua os valores antes de executar!

# Teste 1: Com credenciais válidas
curl -X POST https://SEU-PROJECT.supabase.co/functions/v1/auth-login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA-ANON-KEY" \
  -d '{
    "email": "usuario@teste.com",
    "password": "senha123"
  }'

# Teste 2: Com senha errada (deve retornar erro)
curl -X POST https://SEU-PROJECT.supabase.co/functions/v1/auth-login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA-ANON-KEY" \
  -d '{
    "email": "usuario@teste.com",
    "password": "senhaerrada"
  }'
```

---

## 📋 OBTER INFORMAÇÕES DO SUPABASE

```bash
# Listar projetos linkados
supabase projects list

# Ver informações do projeto atual
supabase status

# Listar Edge Functions deployed
supabase functions list
```

---

## 🔍 VERIFICAR LOGS

```bash
# Ver logs da auth-login
supabase functions logs auth-login

# Ver logs do kiwify-webhook
supabase functions logs kiwify-webhook

# Ver logs em tempo real (útil durante testes)
supabase functions logs auth-login --follow
```

---

## 🛠️ COMANDOS DE TROUBLESHOOTING

```bash
# Se der erro de "not linked"
supabase link --project-ref SEU-PROJECT-REF

# Se der erro no deploy
supabase functions deploy auth-login --no-verify-jwt

# Limpar cache e tentar novamente
rm -rf .supabase
supabase link --project-ref SEU-PROJECT-REF
supabase functions deploy auth-login

# Ver versão do CLI
supabase --version

# Atualizar CLI
npm update -g supabase
```

---

## 📝 CRIAR USUÁRIO DE TESTE NO SUPABASE

Use o SQL Editor no Dashboard:

```sql
-- 1. Criar usuário (substitua email e senha)
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
)
VALUES (
  'teste@exemplo.com',
  crypt('senha123', gen_salt('bf')),
  NOW(),
  '{"name": "Usuario Teste"}'::jsonb
)
RETURNING id;

-- 2. Copie o ID retornado e use abaixo
-- Criar perfil (substitua USER_ID_AQUI pelo ID copiado)
INSERT INTO public.profiles (
  id,
  name,
  is_approved,
  access_expires_at
)
VALUES (
  'USER_ID_AQUI',
  'Usuario Teste',
  true,
  NOW() + INTERVAL '30 days'
);
```

---

## 🎯 COMANDOS PYTHON - TESTAR LOCALMENTE

```bash
# Instalar dependências
pip install requests

# Testar auth_manager.py
cd /caminho/para/ferramenta-audio-charles
python -c "from auth_manager import AuthManager; auth = AuthManager(); print('OK' if auth else 'ERRO')"

# Testar tela de login
python tela_login.py

# Rodar programa completo (após modificar run_gui.py)
python run_gui.py
```

---

## 📦 GERAR EXECUTÁVEL

```bash
# Instalar PyInstaller
pip install pyinstaller

# Gerar executável
cd /caminho/para/ferramenta-audio-charles
pyinstaller --onefile --windowed --icon=icon.ico --name="GeradorAudio" run_gui.py

# Executável estará em:
# dist/GeradorAudio.exe
```

---

## 🎁 COMANDOS ÚTEIS DO GIT

```bash
# Ver status
git status

# Ver diferenças
git diff

# Ver histórico
git log --oneline -10

# Desfazer mudanças não commitadas
git checkout -- arquivo.py

# Criar branch nova
git checkout -b nome-branch

# Voltar para main
git checkout main

# Ver branches
git branch -a
```

---

## ✅ VERIFICAÇÃO RÁPIDA

Execute estes comandos para verificar se está tudo ok:

```bash
# 1. Verificar CLI instalada
supabase --version

# 2. Verificar projeto linkado
supabase status

# 3. Listar funções
supabase functions list

# 4. Ver se auth-login está deployed
supabase functions list | grep auth-login

# Se aparecer "auth-login" na lista = ✅ Está deployed!
```

---

## 🚨 SE TUDO DER ERRADO

```bash
# Reset completo (cuidado!)
rm -rf .supabase
supabase logout
supabase login
supabase link --project-ref SEU-PROJECT-REF
supabase functions deploy auth-login
```

---

**DICA:** Salve este arquivo e tenha sempre à mão! 📌
