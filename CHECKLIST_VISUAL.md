# ✅ CHECKLIST VISUAL - CONFIGURAÇÃO COMPLETA

Use este checklist para acompanhar seu progresso. Marque cada item quando concluir!

---

## 📦 FASE 1: PREPARAÇÃO

```
[ ] Tenho acesso ao Supabase Dashboard
[ ] Tenho Node.js/npm instalado
[ ] Tenho Git instalado
[ ] Tenho Python 3.8+ instalado
[ ] Baixei os arquivos de integracao-ferramenta-audio/
```

---

## 🔧 FASE 2: INSTALAÇÃO DE FERRAMENTAS

```
[ ] Instalei Supabase CLI (npm install -g supabase)
[ ] Testei comando: supabase --version
[ ] Fiz login: supabase login
[ ] Linkei projeto: supabase link --project-ref ...
```

---

## 🚀 FASE 3: DEPLOY DA EDGE FUNCTION

```
[ ] Naveguei até pasta do projeto (cd fun-compute-mate)
[ ] Rodei: supabase functions deploy auth-login
[ ] Deploy concluiu sem erros
[ ] Anotei a Function URL retornada
[ ] Verifiquei no Dashboard que função aparece
```

**Function URL:**
```
https://________________________.supabase.co/functions/v1/auth-login
```

---

## 🔐 FASE 4: CONFIGURAÇÃO DE VARIÁVEIS

```
[ ] Acessei Dashboard → Edge Functions → auth-login
[ ] Adicionei variável SUPABASE_ANON_KEY
[ ] Salvei as configurações
[ ] Função tem todas variáveis necessárias
```

---

## 📝 FASE 5: COLETA DE CREDENCIAIS

```
[ ] Copiei API_URL (da Function URL)
[ ] Copiei ANON_KEY (Dashboard → Settings → API → anon public)
[ ] Salvei em arquivo texto seguro
[ ] Testei API com curl (retornou resposta)
```

**Minhas Credenciais:**

```
API_URL:
https://________________________.supabase.co/functions/v1/auth-login

ANON_KEY:
eyJ_________________________________________________
```

---

## 📦 FASE 6: ATUALIZAÇÃO DO REPOSITÓRIO AUDIO

```
[ ] Clonei: git clone github.com/thiagordn01/ferramenta-audio-charles.git
[ ] Copiei arquivos de integracao-ferramenta-audio/
[ ] Arquivos copiados:
    [ ] auth_manager.py
    [ ] tela_login.py
    [ ] requirements.txt
    [ ] README.md
    [ ] .gitignore
    [ ] INSTRUÇÕES_INSTALACAO.md
[ ] Abri auth_manager.py
[ ] Colei API_URL (linha 18)
[ ] Colei ANON_KEY (linha 19)
[ ] Salvei arquivo
[ ] Rodei: git add .
[ ] Rodei: git commit -m "feat: Add authentication"
[ ] Rodei: git push origin main
[ ] Push concluído sem erros
[ ] Verifiquei no GitHub que arquivos aparecem
```

---

## 🧪 FASE 7: TESTES

```
[ ] Testei API com curl (usuário válido)
[ ] Testei API com curl (senha errada)
[ ] Criei/encontrei usuário de teste no Supabase
[ ] Verifiquei que usuário tem is_approved = true
[ ] Testei login retorna success: true
```

**Credenciais de Teste:**
```
Email: ________________________
Senha: ________________________
```

---

## 🔄 FASE 8: WEBHOOK KIWIFY (Verificação)

```
[ ] Acessei Dashboard → Edge Functions → kiwify-webhook
[ ] Verifiquei variável: SYSTEM_EMAIL_FROM
[ ] Verifiquei variável: SYSTEM_URL
[ ] Verifiquei variável: RESEND_API_KEY
[ ] Removi/esvaziei: TEST_EMAIL_OVERRIDE
[ ] Cliquei em Redeploy (se mudou algo)
[ ] Webhook está funcionando
```

---

## 🎯 FASE 9: COMUNICAÇÃO COM SEU AMIGO

```
[ ] Enviei API_URL para ele
[ ] Enviei ANON_KEY para ele
[ ] Enviei link do repositório atualizado
[ ] Enviei arquivo INSTRUÇÕES_INSTALACAO.md
[ ] Expliquei que ele deve colar credenciais no auth_manager.py
```

---

## ✅ FASE 10: VALIDAÇÃO FINAL

```
[ ] Seu amigo recebeu as credenciais
[ ] Ele colou no auth_manager.py
[ ] Ele seguiu INSTRUÇÕES_INSTALACAO.md
[ ] Ele modificou run_gui.py
[ ] Ele testou localmente (python run_gui.py)
[ ] Login aparece e funciona
[ ] Ele gerou novo .exe
[ ] Testou .exe em outro computador
[ ] Publicou .exe nos Releases do GitHub
```

---

## 🎉 CONCLUSÃO

```
[ ] Sistema de autenticação 100% funcional
[ ] Executáveis validam usuários na API
[ ] Credenciais do Kiwify funcionam nos 3 sistemas:
    [ ] Sistema Web
    [ ] Gerador de Áudio
    [ ] Editor de Vídeo (quando implementar)
```

---

## 📊 PROGRESSO GERAL

**Fases Concluídas:** _____ / 10

**Status:**
- [ ] 🔴 Não iniciado (0-3 fases)
- [ ] 🟡 Em progresso (4-7 fases)
- [ ] 🟢 Quase pronto (8-9 fases)
- [ ] ✅ Completo (10 fases)

---

## 🆘 SE TRAVOU EM ALGUMA FASE

**Fase 2 (Instalação):** Problema com npm/Node.js
→ Baixe Node.js: https://nodejs.org/

**Fase 3 (Deploy):** Erro ao fazer deploy
→ Veja logs: `supabase functions logs auth-login`
→ Veja COMANDOS_RAPIDOS.md seção "Troubleshooting"

**Fase 6 (Git):** Erro ao fazer push
→ Configure git: `git config --global user.name "Seu Nome"`
→ Configure email: `git config --global user.email "seu@email.com"`

**Fase 7 (Testes):** API não responde
→ Verifique se deployed: `supabase functions list`
→ Verifique se ANON_KEY está correta
→ Teste no Postman primeiro

---

**IMPORTANTE:** Não pule fases! Cada uma depende da anterior. ⚠️

**DICA:** Tire screenshots de cada etapa concluída para documentar! 📸
