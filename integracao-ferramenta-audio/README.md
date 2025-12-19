# 🎵 Ferramenta de Áudio - Charles

Gerador de áudio profissional com conversão texto para fala integrado com sistema de autenticação Kiwify.

## 🌟 Funcionalidades

- ✅ **Conversão Texto para Fala** - Transforme texto em áudio de alta qualidade
- ✅ **Processamento de Áudio Avançado** - Ferramentas profissionais de edição
- ✅ **Presets de Voz** - Múltiplas vozes e estilos personalizados
- ✅ **Interface Gráfica Intuitiva** - Fácil de usar, mesmo para iniciantes
- ✅ **Autenticação Integrada** - Sistema de login unificado com Kiwify

## 🚀 Como Usar

### Para Usuários

1. **Baixe o executável** da aba [Releases](https://github.com/thiagordn01/ferramenta-audio-charles/releases)
2. **Execute** o arquivo `run_gui.exe`
3. **Faça login** com as credenciais recebidas no email após compra no Kiwify
4. **Comece a criar** seus áudios profissionais!

### Credenciais de Acesso

Após comprar no Kiwify, você receberá um email com:
- 📧 **Email de acesso**
- 🔑 **Senha temporária**

Use essas mesmas credenciais para acessar:
- Sistema Web
- Ferramenta de Áudio (este programa)
- Editor de Vídeo

## 💻 Para Desenvolvedores

### Pré-requisitos

- Python 3.8 ou superior
- Windows (executável otimizado para Windows)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/thiagordn01/ferramenta-audio-charles.git
cd ferramenta-audio-charles

# Instale as dependências
pip install -r requirements.txt

# Execute
python run_gui.py
```

### Estrutura do Projeto

```
ferramenta-audio-charles/
├── auth_manager.py          # Gerenciador de autenticação
├── tela_login.py            # Interface de login
├── run_gui.py               # Executável principal
├── gui_text_to_speech.py    # Interface principal do programa
├── audio_processor.py       # Processamento de áudio
├── text_to_speech_processor.py  # Conversão texto-fala
├── voice_presets.json       # Configurações de vozes
├── requirements.txt         # Dependências
└── README.md               # Este arquivo
```

### Gerar Executável

```bash
# Instalar PyInstaller
pip install pyinstaller

# Gerar executável
pyinstaller --onefile --windowed --icon=icon.ico --name="GeradorAudio" run_gui.py

# O .exe estará em: dist/GeradorAudio.exe
```

## 🔐 Sistema de Autenticação

Este programa usa autenticação integrada com o sistema Kiwify/Supabase.

**Fluxo de autenticação:**
1. Usuário abre o programa
2. Tela de login é exibida
3. Credenciais são validadas na API
4. Se aprovado e com acesso válido → Programa abre
5. Se acesso expirado → Mensagem de renovação

**Validações:**
- ✅ Email e senha corretos
- ✅ Conta aprovada pelo administrador
- ✅ Acesso não expirado (para assinaturas)

## 📦 Dependências Principais

- `requests` - Comunicação com API
- `tkinter` - Interface gráfica (já incluso no Python)
- Outras dependências específicas do processamento de áudio

Veja o arquivo `requirements.txt` completo.

## 🆘 Suporte

### Problemas Comuns

**"Email ou senha incorretos"**
- Verifique se está usando as credenciais do email do Kiwify
- Certifique-se que copiou corretamente

**"Usuário não aprovado"**
- Aguarde aprovação do administrador
- Ou aguarde processamento da compra no Kiwify

**"Acesso expirado"**
- Sua assinatura expirou
- Renove no Kiwify para continuar usando

**"Erro de conexão"**
- Verifique sua conexão com a internet
- Firewall pode estar bloqueando

### Contato

Para suporte técnico ou dúvidas, entre em contato através do sistema web.

## 📝 Changelog

### v1.0.0 (Atual)
- ✅ Sistema de autenticação integrado
- ✅ Interface de login profissional
- ✅ Validação de acesso em tempo real
- ✅ Suporte a múltiplas vozes
- ✅ Processamento de áudio otimizado

## 📄 Licença

Este software é de uso exclusivo para clientes autorizados.
O acesso é controlado via autenticação Kiwify.

---

**Desenvolvido com 💛 para gerar áudios incríveis!**

🎵 Transforme suas ideias em áudio profissional 🎵
