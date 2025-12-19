"""
Gerenciador de Autenticação para Executáveis Python
Integra com sistema Kiwify/Supabase
"""

import requests
import json
import os
from typing import Optional, Dict, Tuple


class AuthManager:
    """
    Gerenciador de autenticação para executáveis Python
    Integra com sistema Kiwify/Supabase
    """

    # ⚠️ IMPORTANTE: VOCÊ RECEBERÁ ESSES VALORES APÓS DEPLOY DA API
    # Cole aqui as informações que você receber:
    API_URL = "https://SEU-PROJETO.supabase.co/functions/v1/auth-login"
    ANON_KEY = "SUA-CHAVE-ANON-AQUI"

    # Arquivo para salvar token localmente (persistência entre sessões)
    TOKEN_FILE = "user_session.dat"

    def __init__(self):
        """Inicializa o gerenciador de autenticação"""
        self.token = None
        self.user_data = None
        self.access_info = None
        self._carregar_token_salvo()

    def fazer_login(self, email: str, senha: str) -> Tuple[bool, str]:
        """
        Faz login na API do Supabase

        Args:
            email: Email do usuário (recebido no email do Kiwify)
            senha: Senha do usuário (recebido no email do Kiwify)

        Returns:
            (sucesso: bool, mensagem: str)
            - sucesso: True se login bem-sucedido, False caso contrário
            - mensagem: Mensagem de sucesso ou erro para mostrar ao usuário
        """
        try:
            print(f"[AUTH] Tentando fazer login: {email}")

            # Preparar requisição HTTP
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.ANON_KEY}"
            }

            payload = {
                "email": email,
                "password": senha
            }

            # Fazer requisição POST para API
            response = requests.post(
                self.API_URL,
                json=payload,
                headers=headers,
                timeout=10  # Timeout de 10 segundos
            )

            data = response.json()

            if data.get("success"):
                # ✅ Login bem-sucedido
                print("[AUTH] Login bem-sucedido!")

                self.token = data["token"]
                self.user_data = data["user"]
                self.access_info = data["access"]

                # Salvar token localmente para próximas sessões
                self._salvar_token()

                # Montar mensagem de boas-vindas
                nome = self.user_data.get("name", "Usuário")

                if self.access_info.get("is_permanent"):
                    mensagem = f"Bem-vindo, {nome}! Você tem acesso permanente."
                else:
                    dias = self.access_info.get("days_remaining", 0)
                    mensagem = f"Bem-vindo, {nome}! Seu acesso expira em {dias} dia(s)."

                return True, mensagem

            else:
                # ❌ Login falhou
                erro = data.get("error", "Erro desconhecido")
                print(f"[AUTH] Erro de login: {erro}")
                return False, erro

        except requests.Timeout:
            erro = "Timeout: O servidor não respondeu. Verifique sua conexão com a internet."
            print(f"[AUTH] {erro}")
            return False, erro

        except requests.ConnectionError:
            erro = "Erro de conexão: Verifique sua internet."
            print(f"[AUTH] {erro}")
            return False, erro

        except Exception as e:
            erro = f"Erro inesperado: {str(e)}"
            print(f"[AUTH] {erro}")
            return False, erro

    def verificar_acesso_ativo(self) -> bool:
        """
        Verifica se usuário tem acesso ativo (token válido salvo)

        Returns:
            True se tem acesso, False caso contrário
        """
        return self.token is not None

    def obter_nome_usuario(self) -> str:
        """
        Retorna nome do usuário logado

        Returns:
            Nome do usuário ou "Usuário" se não estiver logado
        """
        if self.user_data:
            return self.user_data.get("name", "Usuário")
        return "Usuário"

    def obter_email_usuario(self) -> Optional[str]:
        """
        Retorna email do usuário logado

        Returns:
            Email do usuário ou None se não estiver logado
        """
        if self.user_data:
            return self.user_data.get("email")
        return None

    def obter_dias_restantes(self) -> Optional[int]:
        """
        Retorna quantos dias restam de acesso

        Returns:
            Número de dias restantes ou None se acesso permanente
        """
        if self.access_info and not self.access_info.get("is_permanent"):
            return self.access_info.get("days_remaining")
        return None

    def acesso_proximo_de_expirar(self, dias_alerta: int = 7) -> bool:
        """
        Verifica se acesso está próximo de expirar

        Args:
            dias_alerta: Quantos dias antes de expirar para alertar (padrão: 7)

        Returns:
            True se estiver próximo de expirar
        """
        dias = self.obter_dias_restantes()
        if dias is not None:
            return dias <= dias_alerta
        return False

    def fazer_logout(self):
        """
        Faz logout e limpa todos os dados salvos
        """
        print("[AUTH] Fazendo logout...")

        self.token = None
        self.user_data = None
        self.access_info = None

        # Remover arquivo de token salvo
        if os.path.exists(self.TOKEN_FILE):
            try:
                os.remove(self.TOKEN_FILE)
                print("[AUTH] Token removido do disco")
            except Exception as e:
                print(f"[AUTH] Erro ao remover token: {e}")

    def _salvar_token(self):
        """
        Salva token localmente para persistência entre sessões

        IMPORTANTE: Em produção, considere criptografar esses dados!
        """
        try:
            data = {
                "token": self.token,
                "user": self.user_data,
                "access": self.access_info
            }

            with open(self.TOKEN_FILE, "w") as f:
                json.dump(data, f)

            print("[AUTH] Token salvo localmente")

        except Exception as e:
            print(f"[AUTH] Erro ao salvar token: {e}")

    def _carregar_token_salvo(self):
        """
        Carrega token salvo anteriormente (se existir)

        Isso permite que usuário não precise fazer login toda vez
        """
        try:
            if os.path.exists(self.TOKEN_FILE):
                with open(self.TOKEN_FILE, "r") as f:
                    data = json.load(f)

                self.token = data.get("token")
                self.user_data = data.get("user")
                self.access_info = data.get("access")

                if self.token:
                    print(f"[AUTH] Sessão anterior encontrada: {self.obter_nome_usuario()}")

        except Exception as e:
            print(f"[AUTH] Erro ao carregar token: {e}")


# ===== EXEMPLO DE USO =====

if __name__ == "__main__":
    """
    Teste básico do AuthManager
    """
    auth = AuthManager()

    # Tentar fazer login
    email = input("Email: ")
    senha = input("Senha: ")

    sucesso, mensagem = auth.fazer_login(email, senha)

    if sucesso:
        print(f"\n✅ {mensagem}")
        print(f"Nome: {auth.obter_nome_usuario()}")
        print(f"Email: {auth.obter_email_usuario()}")

        dias = auth.obter_dias_restantes()
        if dias:
            print(f"Dias restantes: {dias}")
        else:
            print("Acesso: Permanente")

    else:
        print(f"\n❌ {mensagem}")
