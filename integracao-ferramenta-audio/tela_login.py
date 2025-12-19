"""
Tela de Login para Executáveis Python
Interface gráfica usando Tkinter
"""

import tkinter as tk
from tkinter import ttk, messagebox
from auth_manager import AuthManager


class TelaLogin:
    """
    Interface gráfica de login usando Tkinter
    """

    def __init__(self, on_login_success):
        """
        Inicializa tela de login

        Args:
            on_login_success: Função callback chamada quando login for bem-sucedido
                             Recebe o AuthManager como parâmetro
        """
        self.auth = AuthManager()
        self.on_login_success = on_login_success

        # Criar janela principal
        self.root = tk.Tk()
        self.root.title("Login - Sistema")
        self.root.geometry("450x350")
        self.root.resizable(False, False)

        # Estilo
        self._configurar_estilo()

        # Centralizar janela na tela
        self._centralizar_janela()

        # Criar interface
        self._criar_interface()

        # Verificar se já tem sessão salva
        self._verificar_sessao_salva()

    def _configurar_estilo(self):
        """Configura estilo visual da interface"""
        style = ttk.Style()
        style.theme_use('clam')  # Tema mais moderno

        # Cor dourada do sistema
        self.cor_dourada = "#D4AF37"
        self.cor_fundo = "#f9f9f9"

    def _centralizar_janela(self):
        """Centraliza janela na tela do usuário"""
        self.root.update_idletasks()
        width = 450
        height = 350
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')

    def _criar_interface(self):
        """Cria todos os elementos visuais da interface"""
        # Frame principal com padding
        main_frame = ttk.Frame(self.root, padding="30")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # ===== TÍTULO =====
        titulo_frame = tk.Frame(main_frame, bg=self.cor_dourada)
        titulo_frame.grid(row=0, column=0, columnspan=2, pady=(0, 30), sticky=(tk.W, tk.E))

        titulo = tk.Label(
            titulo_frame,
            text="🔐 Acesso ao Sistema",
            font=("Arial", 18, "bold"),
            bg=self.cor_dourada,
            fg="white",
            pady=15
        )
        titulo.pack(fill=tk.X)

        # ===== CAMPO EMAIL =====
        tk.Label(
            main_frame,
            text="Email:",
            font=("Arial", 10, "bold")
        ).grid(row=1, column=0, sticky=tk.W, pady=5)

        self.email_entry = ttk.Entry(main_frame, width=35, font=("Arial", 10))
        self.email_entry.grid(row=1, column=1, pady=5, padx=(10, 0))

        # ===== CAMPO SENHA =====
        tk.Label(
            main_frame,
            text="Senha:",
            font=("Arial", 10, "bold")
        ).grid(row=2, column=0, sticky=tk.W, pady=5)

        self.senha_entry = ttk.Entry(main_frame, width=35, show="●", font=("Arial", 10))
        self.senha_entry.grid(row=2, column=1, pady=5, padx=(10, 0))

        # ===== CHECKBOX "LEMBRAR" =====
        self.lembrar_var = tk.BooleanVar(value=True)
        lembrar_check = ttk.Checkbutton(
            main_frame,
            text="Lembrar meu login",
            variable=self.lembrar_var
        )
        lembrar_check.grid(row=3, column=0, columnspan=2, pady=10)

        # ===== BOTÃO ENTRAR =====
        btn_frame = tk.Frame(main_frame)
        btn_frame.grid(row=4, column=0, columnspan=2, pady=20)

        self.btn_login = tk.Button(
            btn_frame,
            text="ENTRAR",
            command=self._processar_login,
            bg=self.cor_dourada,
            fg="white",
            font=("Arial", 12, "bold"),
            width=20,
            height=2,
            cursor="hand2",
            relief=tk.FLAT
        )
        self.btn_login.pack()

        # Efeito hover no botão
        self.btn_login.bind("<Enter>", lambda e: self.btn_login.config(bg="#F59E0B"))
        self.btn_login.bind("<Leave>", lambda e: self.btn_login.config(bg=self.cor_dourada))

        # ===== LABEL DE STATUS =====
        self.status_label = tk.Label(
            main_frame,
            text="",
            foreground="red",
            wraplength=400,
            font=("Arial", 9)
        )
        self.status_label.grid(row=5, column=0, columnspan=2)

        # ===== ATALHOS DE TECLADO =====
        # Enter para fazer login
        self.root.bind('<Return>', lambda e: self._processar_login())

        # Escape para fechar
        self.root.bind('<Escape>', lambda e: self.root.quit())

        # Focar no campo de email
        self.email_entry.focus()

    def _verificar_sessao_salva(self):
        """Verifica se existe sessão salva e faz login automático"""
        if self.auth.verificar_acesso_ativo():
            # Já tem sessão salva
            nome = self.auth.obter_nome_usuario()
            dias = self.auth.obter_dias_restantes()

            if dias is not None and dias <= 0:
                # Acesso expirado
                messagebox.showwarning(
                    "Acesso Expirado",
                    "Sua sessão anterior expirou. Por favor, faça login novamente."
                )
                self.auth.fazer_logout()
                return

            # Perguntar se quer continuar com sessão salva
            if dias:
                mensagem = f"Bem-vindo de volta, {nome}!\n\nAcesso expira em {dias} dia(s).\n\nDeseja continuar?"
            else:
                mensagem = f"Bem-vindo de volta, {nome}!\n\nVocê tem acesso permanente.\n\nDeseja continuar?"

            if messagebox.askyesno("Sessão Anterior Encontrada", mensagem):
                # Continuar com sessão salva
                self.root.destroy()
                self.on_login_success(self.auth)
            else:
                # Fazer logout e pedir novo login
                self.auth.fazer_logout()

    def _processar_login(self):
        """Processa tentativa de login"""
        email = self.email_entry.get().strip()
        senha = self.senha_entry.get()

        # Validar campos vazios
        if not email:
            self.status_label.config(text="⚠️ Por favor, digite seu email")
            self.email_entry.focus()
            return

        if not senha:
            self.status_label.config(text="⚠️ Por favor, digite sua senha")
            self.senha_entry.focus()
            return

        # Desabilitar interface durante processamento
        self.btn_login.config(
            state="disabled",
            text="VERIFICANDO...",
            bg="gray"
        )
        self.email_entry.config(state="disabled")
        self.senha_entry.config(state="disabled")
        self.status_label.config(text="🔄 Conectando ao servidor...", foreground="blue")
        self.root.update()

        # Tentar fazer login
        sucesso, mensagem = self.auth.fazer_login(email, senha)

        if sucesso:
            # ✅ Login bem-sucedido
            self.status_label.config(text="✅ Login bem-sucedido!", foreground="green")
            self.root.update()

            # Aguardar 1 segundo para usuário ver mensagem
            self.root.after(1000)

            # Se marcou "não lembrar", limpar sessão
            if not self.lembrar_var.get():
                self.auth.fazer_logout()

            # Fechar tela de login e chamar callback
            self.root.destroy()
            self.on_login_success(self.auth)

        else:
            # ❌ Login falhou
            self.status_label.config(text=f"❌ {mensagem}", foreground="red")

            # Re-habilitar interface
            self.btn_login.config(
                state="normal",
                text="ENTRAR",
                bg=self.cor_dourada
            )
            self.email_entry.config(state="normal")
            self.senha_entry.config(state="normal")

            # Limpar senha e focar nela
            self.senha_entry.delete(0, tk.END)
            self.senha_entry.focus()

    def mostrar(self):
        """Mostra a janela de login e inicia loop de eventos"""
        self.root.mainloop()


# ===== EXEMPLO DE USO =====

if __name__ == "__main__":
    """
    Teste da tela de login
    """

    def ao_fazer_login(auth_manager):
        """Callback chamado quando login for bem-sucedido"""
        print("\n" + "="*50)
        print("✅ LOGIN BEM-SUCEDIDO!")
        print("="*50)
        print(f"Nome: {auth_manager.obter_nome_usuario()}")
        print(f"Email: {auth_manager.obter_email_usuario()}")

        dias = auth_manager.obter_dias_restantes()
        if dias:
            print(f"Dias restantes: {dias}")
        else:
            print("Acesso: Permanente")

        print("="*50)

        # Aqui você iniciaria seu programa principal
        # programa = SeuPrograma(auth_manager)
        # programa.iniciar()

    # Mostrar tela de login
    tela = TelaLogin(on_login_success=ao_fazer_login)
    tela.mostrar()
