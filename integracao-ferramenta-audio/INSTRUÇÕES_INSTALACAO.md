# 📋 Instruções de Instalação - Integração de Autenticação

Este guia mostra **passo a passo** como adicionar autenticação ao projeto ferramenta-audio-charles.

---

## 🎯 Objetivo

Adicionar sistema de login que valida usuários na API do Kiwify/Supabase ANTES de abrir o programa.

---

## 📦 Arquivos a Adicionar

Você recebeu 5 arquivos novos:

1. ✅ `auth_manager.py` - Gerenciador de autenticação
2. ✅ `tela_login.py` - Interface gráfica de login
3. ✅ `requirements.txt` - Dependências atualizadas
4. ✅ `README.md` - Documentação profissional
5. ✅ `.gitignore` - Arquivos a ignorar no Git

---

## 🚀 Passo a Passo

### **Passo 1: Fazer Backup**

Antes de tudo, faça backup do projeto:

```bash
# Entre na pasta do projeto
cd ferramenta-audio-charles

# Faça backup do run_gui.py
cp run_gui.py run_gui_BACKUP.py

# Ou copie toda a pasta
cd ..
cp -r ferramenta-audio-charles ferramenta-audio-charles-BACKUP
```

---

### **Passo 2: Adicionar Novos Arquivos**

Copie os 5 arquivos recebidos para dentro da pasta do projeto:

```bash
ferramenta-audio-charles/
├── auth_manager.py          ← NOVO
├── tela_login.py            ← NOVO
├── requirements.txt         ← SUBSTITUIR
├── README.md               ← SUBSTITUIR
├── .gitignore              ← NOVO
├── run_gui.py              ← MODIFICAR (próximo passo)
├── gui_text_to_speech.py   (mantém como está)
├── audio_processor.py      (mantém como está)
└── ... (outros arquivos existentes)
```

**No Windows Explorer:**
1. Abra a pasta `ferramenta-audio-charles`
2. Arraste os arquivos novos para dentro
3. Substitua quando perguntar

---

### **Passo 3: Configurar Credenciais da API**

Abra `auth_manager.py` em um editor de texto e procure estas linhas:

```python
# CONFIGURAÇÕES - VOCÊ RECEBERÁ ESSES VALORES
API_URL = "https://SEU-PROJETO.supabase.co/functions/v1/auth-login"
ANON_KEY = "SUA-CHAVE-ANON-AQUI"
```

**Cole os valores que você vai receber:**

```python
API_URL = "https://xxxxxxxxx.supabase.co/functions/v1/auth-login"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx"
```

💡 **Importante:** Salve o arquivo após colar!

---

### **Passo 4: Modificar run_gui.py**

Abra `run_gui.py` no editor de código.

**4.1 - Adicionar import no TOPO do arquivo:**

```python
# ===== ADICIONE ESTA LINHA NO TOPO =====
from tela_login import TelaLogin

# ... (resto dos imports existentes)
```

**4.2 - Encontrar o código principal (final do arquivo):**

Procure por algo como:

```python
if __name__ == "__main__":
    # Código que inicia o programa
    import gui_text_to_speech
    gui_text_to_speech.main()
```

**4.3 - Modificar para adicionar autenticação:**

**ANTES:**
```python
if __name__ == "__main__":
    import gui_text_to_speech
    gui_text_to_speech.main()
```

**DEPOIS:**
```python
def iniciar_com_autenticacao(auth_manager):
    """Inicia programa após login bem-sucedido"""
    import gui_text_to_speech
    gui_text_to_speech.main()

if __name__ == "__main__":
    # Mostrar tela de login primeiro
    tela = TelaLogin(on_login_success=iniciar_com_autenticacao)
    tela.mostrar()
```

💡 **Salve o arquivo!**

---

### **Passo 5: Instalar Dependências**

Abra o terminal/prompt de comando na pasta do projeto:

```bash
# Instalar requests (necessário para autenticação)
pip install requests

# OU instalar tudo do requirements.txt:
pip install -r requirements.txt
```

---

### **Passo 6: Testar**

```bash
# Rodar programa
python run_gui.py
```

**O que deve acontecer:**
1. ✅ Abre tela de login
2. ✅ Digite email e senha (do Kiwify)
3. ✅ Se correto → Abre o programa normalmente
4. ✅ Se errado → Mostra mensagem de erro

---

### **Passo 7: Gerar Executável Atualizado**

Quando estiver tudo funcionando:

```bash
# Gerar novo .exe com autenticação
pyinstaller --onefile --windowed --icon=icon.ico --name="GeradorAudio" run_gui.py

# O novo .exe estará em: dist/GeradorAudio.exe
```

---

## 🧪 Como Testar

### Teste 1: Login com credenciais corretas

```
Email: joao@example.com (email recebido do Kiwify)
Senha: abc123 (senha recebida do Kiwify)

Resultado esperado: ✅ Programa abre normalmente
```

### Teste 2: Login com senha errada

```
Email: joao@example.com
Senha: senhaerrada

Resultado esperado: ❌ "Email ou senha incorretos"
```

### Teste 3: Usuário sem acesso

```
Email: teste@teste.com (não comprou)
Senha: 123456

Resultado esperado: ❌ "Usuário não aprovado" ou "Email ou senha incorretos"
```

### Teste 4: Acesso expirado

```
Email: usuario-expirado@example.com
Senha: senha123

Resultado esperado: ❌ "Seu acesso expirou há X dias"
```

---

## ✅ Checklist de Verificação

Antes de distribuir, verifique:

- [ ] `auth_manager.py` tem API_URL e ANON_KEY corretos
- [ ] `run_gui.py` importa TelaLogin
- [ ] `run_gui.py` chama tela de login antes do programa
- [ ] Testou com credenciais válidas → funciona
- [ ] Testou com credenciais inválidas → mostra erro
- [ ] Gerou novo .exe com PyInstaller
- [ ] Testou o .exe em outro computador

---

## 🐛 Solução de Problemas

### Erro: "No module named 'tela_login'"

**Solução:** Certifique-se que `tela_login.py` está na mesma pasta que `run_gui.py`

### Erro: "No module named 'requests'"

**Solução:**
```bash
pip install requests
```

### Erro: "Timeout: Servidor não respondeu"

**Solução:** Verifique conexão com internet e se API_URL está correto

### Tela de login não aparece

**Solução:** Verifique se modificou corretamente o `run_gui.py`. Veja o arquivo `run_gui_EXEMPLO_COM_AUTH.py` para referência.

### Login funciona mas programa não abre

**Solução:** Verifique se a função `iniciar_com_autenticacao()` está chamando o código original corretamente.

---

## 📞 Suporte

Se tiver dúvidas durante implementação, entre em contato!

---

## 🎉 Pronto!

Após seguir todos os passos, seu programa terá:

- ✅ Tela de login profissional
- ✅ Validação de usuários via API
- ✅ Controle de acesso por assinatura
- ✅ Mensagens de erro claras
- ✅ Sessão salva (não precisa fazer login sempre)

**Bom trabalho!** 🚀
