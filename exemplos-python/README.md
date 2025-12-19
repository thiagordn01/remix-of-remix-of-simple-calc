# 🐍 Exemplos Python - Integração de Autenticação

Código pronto para integrar seus executáveis Python com o sistema de autenticação Kiwify/Supabase.

## 📁 Arquivos

- **`auth_manager.py`** - Gerenciador de autenticação (comunicação com API)
- **`tela_login.py`** - Interface gráfica de login (Tkinter)
- **`main.py`** - Exemplo completo de integração
- **`requirements.txt`** - Dependências necessárias

## 🚀 Início Rápido

### 1. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 2. Configurar API

Edite o arquivo `auth_manager.py` e cole as informações que você receber:

```python
API_URL = "https://SEU-PROJETO.supabase.co/functions/v1/auth-login"
ANON_KEY = "SUA-CHAVE-ANON-AQUI"
```

### 3. Testar Login

```bash
# Testar apenas o gerenciador de autenticação
python auth_manager.py

# Testar a tela de login
python tela_login.py

# Testar integração completa
python main.py
```

## 🔧 Como Integrar no Seu Programa

### Opção 1: Integração Simples

Se você já tem um programa Python, adicione isto no início:

```python
from tela_login import TelaLogin

def main():
    def ao_fazer_login(auth_manager):
        # Aqui inicia seu programa real
        seu_programa_principal(auth_manager)

    # Mostrar tela de login
    tela = TelaLogin(on_login_success=ao_fazer_login)
    tela.mostrar()

if __name__ == "__main__":
    main()
```

### Opção 2: Ver Exemplo Completo

Abra `main.py` para ver um exemplo completo com interface gráfica.

## 📦 Gerar Executável

Quando estiver tudo funcionando, gere o `.exe`:

```bash
# Instalar PyInstaller
pip install pyinstaller

# Gerar executável
pyinstaller --onefile --windowed --name="SeuPrograma" main.py

# O .exe estará em: dist/SeuPrograma.exe
```

## 🧪 Testar com Credenciais Reais

Para testar, você precisa de um usuário criado pelo sistema Kiwify.

**Opção 1:** Fazer uma compra de teste no Kiwify (mínimo R$5)
**Opção 2:** Pedir para criar um usuário manual no sistema web

As credenciais são as mesmas que vêm no email após compra no Kiwify.

## ❓ Perguntas Frequentes

### Como funciona o fluxo?

```
1. Usuário abre executável
2. Tela de login aparece
3. Digite email/senha (mesmo do Kiwify)
4. Sistema valida na API
5. Se aprovado → Abre programa
6. Se rejeitado → Mostra erro
```

### O que é validado?

- ✅ Email e senha corretos
- ✅ Conta aprovada (`is_approved = true`)
- ✅ Acesso não expirado (`access_expires_at`)

### Funciona offline?

- ❌ Primeiro login precisa de internet
- ✅ Depois pode funcionar offline (token salvo)
- ⚠️ Recomendado verificar online periodicamente

### E se o acesso expirar?

- O sistema bloqueia automaticamente
- Mostra mensagem: "Acesso expirado"
- Usuário precisa renovar assinatura

### Posso customizar a tela de login?

Sim! Edite `tela_login.py`:
- Cores
- Tamanhos
- Textos
- Ícones

## 🎨 Personalização

### Alterar Cores

Edite em `tela_login.py`:

```python
self.cor_dourada = "#D4AF37"  # Sua cor aqui
```

### Alterar Título da Janela

Edite em `main.py`:

```python
self.root.title("Seu Programa - Seu Nome")
```

### Alterar Mensagens

Todas as mensagens estão nos arquivos `.py` e podem ser alteradas.

## 🆘 Problemas Comuns

### "Timeout: Servidor não respondeu"
- Verifique internet do usuário
- Verifique se API_URL está correta

### "Email ou senha incorretos"
- Verifique credenciais
- Teste as mesmas credenciais no sistema web

### "Usuário não aprovado"
- Conta precisa ser aprovada por admin
- Ou compra ainda não foi processada pelo Kiwify

### "Erro ao importar auth_manager"
- Certifique-se que todos os arquivos estão na mesma pasta
- Verifique se instalou dependências (`pip install -r requirements.txt`)

## 📞 Suporte

Dúvidas? Entre em contato!

## ✅ Checklist de Implementação

- [ ] Copiar os 3 arquivos (auth_manager.py, tela_login.py, main.py)
- [ ] Instalar dependências (`pip install -r requirements.txt`)
- [ ] Receber API_URL e ANON_KEY
- [ ] Colar API_URL e ANON_KEY em `auth_manager.py`
- [ ] Testar login com credenciais reais
- [ ] Integrar com seu programa
- [ ] Testar fluxo completo
- [ ] Gerar executável com PyInstaller
- [ ] Distribuir para usuários

Pronto! 🚀
