"""
EXEMPLO: Como modificar o run_gui.py original para adicionar autenticação

Este arquivo mostra como integrar o sistema de login no programa existente.
"""

from tela_login import TelaLogin
import sys

def iniciar_programa_com_autenticacao(auth_manager):
    """
    Função chamada quando login for bem-sucedido

    Args:
        auth_manager: Instância do AuthManager com usuário logado
    """

    # ===== AQUI VAI O CÓDIGO ORIGINAL DO run_gui.py =====

    # Exemplo do que provavelmente está no run_gui.py original:
    # import gui_text_to_speech
    # gui_text_to_speech.main()

    # OU pode ser algo como:
    # from gui_text_to_speech import Application
    # app = Application()
    # app.run()

    # =====================================================

    # Para integrar, você precisa:
    # 1. Importar os módulos necessários
    # 2. Passar o auth_manager se precisar (opcional)
    # 3. Iniciar a aplicação normalmente

    print(f"Programa iniciado para: {auth_manager.obter_nome_usuario()}")

    # SUBSTITUA ESTE CÓDIGO PELO CÓDIGO REAL DO run_gui.py:
    try:
        # Importar a interface principal
        import gui_text_to_speech

        # Iniciar programa principal
        # Você pode passar auth_manager se quiser mostrar info do usuário na GUI
        gui_text_to_speech.main()

    except Exception as e:
        print(f"Erro ao iniciar programa: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    """
    Ponto de entrada principal do programa
    Esta função agora mostra login ANTES de abrir o programa
    """

    # Criar e mostrar tela de login
    # Quando login for bem-sucedido, chama iniciar_programa_com_autenticacao
    tela = TelaLogin(on_login_success=iniciar_programa_com_autenticacao)
    tela.mostrar()


if __name__ == "__main__":
    """
    Este é o código que executa quando você roda: python run_gui.py
    """
    main()


# ===== INSTRUÇÕES DE INTEGRAÇÃO =====
"""
COMO APLICAR NO SEU run_gui.py EXISTENTE:

1. Faça backup do run_gui.py original:
   cp run_gui.py run_gui_BACKUP.py

2. Abra run_gui.py

3. No TOPO do arquivo, adicione:
   from tela_login import TelaLogin

4. Encontre o código principal (geralmente no final):
   if __name__ == "__main__":
       # código principal aqui

5. Envolva esse código em uma função:

   ANTES:
   if __name__ == "__main__":
       import gui_text_to_speech
       gui_text_to_speech.main()

   DEPOIS:
   def iniciar_com_auth(auth_manager):
       import gui_text_to_speech
       gui_text_to_speech.main()

   if __name__ == "__main__":
       tela = TelaLogin(on_login_success=iniciar_com_auth)
       tela.mostrar()

6. Salve e teste!

EXEMPLO COMPLETO:
================

# run_gui.py (VERSÃO COM AUTENTICAÇÃO)

from tela_login import TelaLogin

def iniciar_gui(auth_manager):
    '''Inicia GUI após login bem-sucedido'''

    # Seu código original aqui
    import gui_text_to_speech
    gui_text_to_speech.main()

if __name__ == "__main__":
    # Mostra login primeiro
    tela = TelaLogin(on_login_success=iniciar_gui)
    tela.mostrar()

================

Pronto! Agora quando alguém rodar o programa, vai aparecer
a tela de login ANTES da GUI principal.
"""
