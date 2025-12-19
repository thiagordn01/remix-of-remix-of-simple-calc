# 🔐 Integração de Autenticação - Executáveis Python

Este documento explica como integrar os executáveis Python (gerador de áudio e editor de vídeo) com o sistema de autenticação do Kiwify/Supabase.

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Configuração Inicial](#configuração-inicial)
3. [Código Python Completo](#código-python-completo)
4. [Tela de Login (Tkinter)](#tela-de-login-tkinter)
5. [Validação Contínua](#validação-contínua)
6. [Distribuição Final](#distribuição-final)

---

## 🎯 Visão Geral

### Como Funciona

```
Cliente compra no Kiwify
         ↓
Sistema cria conta automaticamente
         ↓
Cliente recebe email com login/senha
         ↓
Usa mesmas credenciais em TODOS os sistemas:
  - Sistema Web ✅
  - Gerador de Áudio ✅
  - Editor de Vídeo ✅
```

### Fluxo de Autenticação

```python
# 1. Usuário abre executável
# 2. Tela de login aparece
# 3. Digita email e senha (mesmos do Kiwify)
# 4. Sistema valida na API do Supabase
# 5. Se aprovado → Abre programa principal
# 6. Se rejeitado → Mostra erro
```

---

## ⚙️ Configuração Inicial

### 1. Informações Necessárias

Você vai precisar de **2 informações** que vou te fornecer:

```python
API_URL = "https://[SEU-PROJETO].supabase.co/functions/v1/auth-login"
ANON_KEY = "[SUA-CHAVE-ANON]"
```

### 2. Dependências Python

Instale as bibliotecas necessárias:

```bash
pip install requests
pip install tkinter  # Já vem instalado no Python Windows
```

---

## 💻 Código Python Completo

### Arquivo: `auth_manager.py`

Este arquivo faz toda a comunicação com a API:

```python
import requests
import json
import os
from typing import Optional, Dict

class AuthManager:
    """
    Gerenciador de autenticação para executáveis Python
    Integra com sistema Kiwify/Supabase
    """

    # CONFIGURAÇÕES - VOCÊ RECEBERÁ ESSES VALORES
    API_URL = "https://[SEU-PROJETO].supabase.co/functions/v1/auth-login"
    ANON_KEY = "[SUA-CHAVE-ANON]"

    # Arquivo para salvar token localmente
    TOKEN_FILE = "user_session.dat"

    def __init__(self):
        self.token = None
        self.user_data = None
        self._carregar_token_salvo()

    def fazer_login(self, email: str, senha: str) -> tuple[bool, str]:
        """
        Faz login na API do Supabase

        Args:
            email: Email do usuário
            senha: Senha do usuário

        Returns:
            (sucesso, mensagem)
        """
        try:
            # Preparar requisição
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.ANON_KEY}"
            }

            payload = {
                "email": email,
                "password": senha
            }

            # Fazer requisição
            response = requests.post(
                self.API_URL,
                json=payload,
                headers=headers,
                timeout=10
            )

            data = response.json()

            if data.get("success"):
                # Login bem-sucedido
                self.token = data["token"]
                self.user_data = data["user"]
                self.access_info = data["access"]

                # Salvar token localmente
                self._salvar_token()

                # Mensagem de boas-vindas
                nome = self.user_data.get("name", "Usuário")

                if self.access_info.get("is_permanent"):
                    mensagem = f"Bem-vindo, {nome}! Acesso permanente."
                else:
                    dias = self.access_info.get("days_remaining", 0)
                    mensagem = f"Bem-vindo, {nome}! Seu acesso expira em {dias} dias."

                return True, mensagem
            else:
                # Login falhou
                erro = data.get("error", "Erro desconhecido")
                return False, erro

        except requests.Timeout:
            return False, "Timeout: Servidor não respondeu. Verifique sua internet."
        except requests.ConnectionError:
            return False, "Erro de conexão. Verifique sua internet."
        except Exception as e:
            return False, f"Erro inesperado: {str(e)}"

    def verificar_acesso_ativo(self) -> bool:
        """
        Verifica se ainda tem acesso válido (token salvo)
        """
        if not self.token:
            return False

        # Aqui você pode adicionar lógica para verificar se token ainda é válido
        # Por enquanto, apenas verifica se existe
        return True

    def obter_nome_usuario(self) -> str:
        """Retorna nome do usuário logado"""
        if self.user_data:
            return self.user_data.get("name", "Usuário")
        return "Usuário"

    def obter_dias_restantes(self) -> Optional[int]:
        """Retorna quantos dias restam de acesso"""
        if self.access_info and not self.access_info.get("is_permanent"):
            return self.access_info.get("days_remaining")
        return None

    def fazer_logout(self):
        """Faz logout e limpa dados salvos"""
        self.token = None
        self.user_data = None
        self.access_info = None

        # Remover arquivo de token
        if os.path.exists(self.TOKEN_FILE):
            os.remove(self.TOKEN_FILE)

    def _salvar_token(self):
        """Salva token localmente (persistência)"""
        try:
            data = {
                "token": self.token,
                "user": self.user_data,
                "access": self.access_info
            }

            with open(self.TOKEN_FILE, "w") as f:
                json.dump(data, f)
        except Exception as e:
            print(f"Erro ao salvar token: {e}")

    def _carregar_token_salvo(self):
        """Carrega token salvo anteriormente"""
        try:
            if os.path.exists(self.TOKEN_FILE):
                with open(self.TOKEN_FILE, "r") as f:
                    data = json.load(f)

                self.token = data.get("token")
                self.user_data = data.get("user")
                self.access_info = data.get("access")
        except Exception as e:
            print(f"Erro ao carregar token: {e}")
```

---

## 🖥️ Tela de Login (Tkinter)

### Arquivo: `tela_login.py`

Interface gráfica simples e funcional:

```python
import tkinter as tk
from tkinter import ttk, messagebox
from auth_manager import AuthManager

class TelaLogin:
    """
    Tela de login para executáveis Python
    """

    def __init__(self, on_login_success):
        self.auth = AuthManager()
        self.on_login_success = on_login_success

        # Criar janela
        self.root = tk.Tk()
        self.root.title("Login - Sistema")
        self.root.geometry("400x300")
        self.root.resizable(False, False)

        # Centralizar janela
        self._centralizar_janela()

        # Criar interface
        self._criar_interface()

    def _centralizar_janela(self):
        """Centraliza janela na tela"""
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')

    def _criar_interface(self):
        """Cria elementos visuais"""
        # Frame principal
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Título
        titulo = ttk.Label(
            main_frame,
            text="🔐 Login",
            font=("Arial", 16, "bold")
        )
        titulo.grid(row=0, column=0, columnspan=2, pady=(0, 20))

        # Email
        ttk.Label(main_frame, text="Email:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.email_entry = ttk.Entry(main_frame, width=30)
        self.email_entry.grid(row=1, column=1, pady=5)

        # Senha
        ttk.Label(main_frame, text="Senha:").grid(row=2, column=0, sticky=tk.W, pady=5)
        self.senha_entry = ttk.Entry(main_frame, width=30, show="*")
        self.senha_entry.grid(row=2, column=1, pady=5)

        # Botão Entrar
        self.btn_login = ttk.Button(
            main_frame,
            text="Entrar",
            command=self._processar_login
        )
        self.btn_login.grid(row=3, column=0, columnspan=2, pady=20)

        # Label de status
        self.status_label = ttk.Label(
            main_frame,
            text="",
            foreground="red",
            wraplength=350
        )
        self.status_label.grid(row=4, column=0, columnspan=2)

        # Permitir Enter para fazer login
        self.root.bind('<Return>', lambda e: self._processar_login())

        # Focar no campo de email
        self.email_entry.focus()

    def _processar_login(self):
        """Processa tentativa de login"""
        email = self.email_entry.get().strip()
        senha = self.senha_entry.get()

        # Validar campos
        if not email or not senha:
            self.status_label.config(text="Preencha todos os campos!")
            return

        # Desabilitar botão durante processamento
        self.btn_login.config(state="disabled", text="Verificando...")
        self.status_label.config(text="Conectando ao servidor...")
        self.root.update()

        # Tentar fazer login
        sucesso, mensagem = self.auth.fazer_login(email, senha)

        if sucesso:
            # Login bem-sucedido
            messagebox.showinfo("Sucesso", mensagem)
            self.root.destroy()
            self.on_login_success(self.auth)
        else:
            # Login falhou
            self.status_label.config(text=f"Erro: {mensagem}")
            self.btn_login.config(state="normal", text="Entrar")
            self.senha_entry.delete(0, tk.END)
            self.senha_entry.focus()

    def mostrar(self):
        """Mostra a janela de login"""
        self.root.mainloop()
```

---

## 🔄 Integração no Executável Principal

### Arquivo: `main.py` (Seu programa principal)

Como integrar no seu código existente:

```python
from tela_login import TelaLogin
import tkinter as tk
from tkinter import messagebox

class SeuPrograma:
    """
    Exemplo de como integrar autenticação no seu programa
    """

    def __init__(self, auth_manager):
        self.auth = auth_manager

        # Criar janela principal do seu programa
        self.root = tk.Tk()
        self.root.title(f"Seu Programa - {auth_manager.obter_nome_usuario()}")
        self.root.geometry("800x600")

        # Mostrar informações de acesso
        self._mostrar_info_acesso()

        # Aqui vai o resto do seu programa...
        # self._criar_interface()
        # self._carregar_funcionalidades()

    def _mostrar_info_acesso(self):
        """Mostra informações sobre acesso do usuário"""
        dias_restantes = self.auth.obter_dias_restantes()

        if dias_restantes:
            if dias_restantes <= 7:
                messagebox.showwarning(
                    "Atenção",
                    f"Seu acesso expira em {dias_restantes} dias!"
                )

    def iniciar(self):
        """Inicia o programa"""
        self.root.mainloop()


# ===== PONTO DE ENTRADA DO PROGRAMA =====

def main():
    """
    Função principal - Primeiro mostra login, depois o programa
    """

    def ao_fazer_login(auth_manager):
        """Callback chamado quando login for bem-sucedido"""
        # Agora sim inicia o programa principal
        programa = SeuPrograma(auth_manager)
        programa.iniciar()

    # Mostrar tela de login
    tela = TelaLogin(on_login_success=ao_fazer_login)
    tela.mostrar()


if __name__ == "__main__":
    main()
```

---

## 🎨 Validação Contínua (Opcional)

### Verificar Acesso Periodicamente

Se quiser verificar se acesso ainda é válido durante uso do programa:

```python
import threading
import time

class VerificadorAcesso:
    """
    Verifica periodicamente se usuário ainda tem acesso válido
    """

    def __init__(self, auth_manager, intervalo_minutos=30):
        self.auth = auth_manager
        self.intervalo = intervalo_minutos * 60
        self.ativo = True

        # Iniciar thread de verificação
        self.thread = threading.Thread(target=self._verificar_loop, daemon=True)
        self.thread.start()

    def _verificar_loop(self):
        """Loop de verificação em background"""
        while self.ativo:
            time.sleep(self.intervalo)

            # Aqui você pode fazer nova requisição para verificar
            # se acesso ainda é válido
            if not self.auth.verificar_acesso_ativo():
                # Acesso expirou - notificar usuário
                self._notificar_expiracao()

    def _notificar_expiracao(self):
        """Notifica que acesso expirou"""
        messagebox.showerror(
            "Acesso Expirado",
            "Seu acesso ao sistema expirou. O programa será encerrado."
        )
        # Aqui você pode fechar o programa

    def parar(self):
        """Para verificação"""
        self.ativo = False
```

---

## 📦 Distribuição Final

### Gerar Executável com PyInstaller

```bash
# Instalar PyInstaller
pip install pyinstaller

# Gerar executável
pyinstaller --onefile --windowed --name="SeuPrograma" main.py

# O .exe estará em dist/SeuPrograma.exe
```

### Estrutura de Arquivos

```
seu-programa/
├── main.py              # Programa principal
├── auth_manager.py      # Gerenciador de autenticação
├── tela_login.py        # Interface de login
└── requirements.txt     # Dependências

# Após build:
dist/
└── SeuPrograma.exe     # Executável final
```

---

## 🔑 Informações que Você Receberá

Após eu fazer deploy da API, você receberá:

```python
# Cole essas informações no auth_manager.py:
API_URL = "https://xxxxxxxxxx.supabase.co/functions/v1/auth-login"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx..."
```

---

## ✅ Checklist de Implementação

- [ ] Copiar código `auth_manager.py`
- [ ] Copiar código `tela_login.py`
- [ ] Atualizar `API_URL` e `ANON_KEY` (você receberá)
- [ ] Integrar no programa principal (`main.py`)
- [ ] Testar login com credenciais reais
- [ ] Gerar executável com PyInstaller
- [ ] Distribuir para usuários

---

## 🆘 Suporte

Se tiver dúvidas durante implementação:
1. Verifique se `API_URL` e `ANON_KEY` estão corretos
2. Teste internet do usuário
3. Verifique logs de erro
4. Entre em contato para ajuda

---

## 🎯 Resultado Final

Após implementação:
- ✅ Cliente compra no Kiwify
- ✅ Recebe email com login/senha
- ✅ Usa mesmas credenciais em todos os 3 sistemas
- ✅ Acesso sincronizado automaticamente
- ✅ Quando acesso expira, bloqueia em todos

**Vocês terão um ecossistema integrado!** 🚀
