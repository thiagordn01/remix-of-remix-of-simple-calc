"""
Exemplo de Integração Completa
Como usar autenticação no seu programa Python
"""

import tkinter as tk
from tkinter import messagebox
from tela_login import TelaLogin


class SeuPrograma:
    """
    EXEMPLO: Substitua esta classe pelo seu programa real
    (Gerador de Áudio ou Editor de Vídeo)
    """

    def __init__(self, auth_manager):
        """
        Inicializa o programa principal

        Args:
            auth_manager: Instância do AuthManager com usuário logado
        """
        self.auth = auth_manager

        # Criar janela principal
        self.root = tk.Tk()
        self.root.title(f"Seu Programa - {auth_manager.obter_nome_usuario()}")
        self.root.geometry("900x600")

        # Configurar fechamento da janela
        self.root.protocol("WM_DELETE_WINDOW", self._ao_fechar)

        # Criar interface do programa
        self._criar_interface()

        # Verificar se acesso está próximo de expirar
        self._verificar_expiracao_acesso()

    def _criar_interface(self):
        """
        Cria interface do seu programa

        SUBSTITUA ISSO PELA SUA INTERFACE REAL
        """
        # Frame superior com informações do usuário
        top_frame = tk.Frame(self.root, bg="#D4AF37", pady=10)
        top_frame.pack(fill=tk.X)

        # Informações do usuário
        usuario_label = tk.Label(
            top_frame,
            text=f"👤 {self.auth.obter_nome_usuario()}",
            bg="#D4AF37",
            fg="white",
            font=("Arial", 12, "bold")
        )
        usuario_label.pack(side=tk.LEFT, padx=20)

        # Informações de acesso
        dias = self.auth.obter_dias_restantes()
        if dias:
            acesso_texto = f"⏰ Acesso expira em {dias} dia(s)"
            cor = "yellow" if dias <= 7 else "white"
        else:
            acesso_texto = "✨ Acesso Permanente"
            cor = "white"

        acesso_label = tk.Label(
            top_frame,
            text=acesso_texto,
            bg="#D4AF37",
            fg=cor,
            font=("Arial", 10)
        )
        acesso_label.pack(side=tk.LEFT)

        # Botão de logout
        btn_logout = tk.Button(
            top_frame,
            text="Sair",
            command=self._fazer_logout,
            bg="white",
            fg="#D4AF37",
            font=("Arial", 10, "bold"),
            padx=20
        )
        btn_logout.pack(side=tk.RIGHT, padx=20)

        # ===== ÁREA PRINCIPAL DO PROGRAMA =====

        main_frame = tk.Frame(self.root, bg="white")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        # AQUI VAI A INTERFACE DO SEU PROGRAMA REAL
        # Exemplo básico:

        welcome_label = tk.Label(
            main_frame,
            text=f"Olá, {self.auth.obter_nome_usuario()}!",
            font=("Arial", 24, "bold"),
            bg="white"
        )
        welcome_label.pack(pady=50)

        info_label = tk.Label(
            main_frame,
            text="Este é um exemplo de integração.\n\nSubstitua este conteúdo pelo seu programa real\n(gerador de áudio ou editor de vídeo).",
            font=("Arial", 12),
            bg="white",
            fg="gray"
        )
        info_label.pack(pady=20)

        # Botão de exemplo
        btn_exemplo = tk.Button(
            main_frame,
            text="🎵 Iniciar Geração de Áudio",
            command=self._funcao_exemplo,
            bg="#D4AF37",
            fg="white",
            font=("Arial", 14, "bold"),
            padx=30,
            pady=15
        )
        btn_exemplo.pack(pady=30)

    def _verificar_expiracao_acesso(self):
        """Verifica se acesso está próximo de expirar e alerta usuário"""
        if self.auth.acesso_proximo_de_expirar(dias_alerta=7):
            dias = self.auth.obter_dias_restantes()

            messagebox.showwarning(
                "Atenção - Acesso Próximo de Expirar",
                f"⚠️ Seu acesso expira em {dias} dia(s)!\n\n"
                "Por favor, renove sua assinatura para continuar usando o sistema."
            )

    def _funcao_exemplo(self):
        """Exemplo de função do seu programa"""
        messagebox.showinfo(
            "Exemplo",
            "Aqui você colocaria a funcionalidade real do seu programa!\n\n"
            f"Usuário logado: {self.auth.obter_nome_usuario()}\n"
            f"Email: {self.auth.obter_email_usuario()}"
        )

    def _fazer_logout(self):
        """Faz logout do usuário"""
        if messagebox.askyesno("Confirmar Logout", "Tem certeza que deseja sair?"):
            self.auth.fazer_logout()
            self.root.destroy()

            # Mostrar tela de login novamente
            reiniciar_programa()

    def _ao_fechar(self):
        """Chamado quando usuário fecha a janela"""
        if messagebox.askyesno("Sair", "Tem certeza que deseja fechar o programa?"):
            self.root.destroy()

    def iniciar(self):
        """Inicia o programa (loop de eventos)"""
        self.root.mainloop()


# ===== FUNÇÃO PRINCIPAL =====

def iniciar_programa(auth_manager):
    """
    Callback chamado quando login for bem-sucedido

    Args:
        auth_manager: AuthManager com usuário logado
    """
    # Criar e iniciar o programa principal
    programa = SeuPrograma(auth_manager)
    programa.iniciar()


def reiniciar_programa():
    """Reinicia o programa (mostra tela de login novamente)"""
    tela = TelaLogin(on_login_success=iniciar_programa)
    tela.mostrar()


def main():
    """
    Ponto de entrada do programa

    IMPORTANTE: Este é o único código que você precisa no seu programa!
    """
    # Mostrar tela de login primeiro
    tela = TelaLogin(on_login_success=iniciar_programa)
    tela.mostrar()


# ===== EXECUTAR =====

if __name__ == "__main__":
    """
    Quando executável for rodado, esta é a primeira função chamada
    """
    main()
