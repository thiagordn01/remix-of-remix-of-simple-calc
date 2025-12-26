import { useEffect, useState } from "react";
import { Sparkles, Wand2, FileText, Shield, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ScriptGeneratorWithModals from "@/components/ScriptGeneratorWithModals";
import charlesLogo from "@/assets/charles-logo.png";
const Index = () => {
  const { isMaster } = useAuth();
  const [showVersionBanner, setShowVersionBanner] = useState(false);

  useEffect(() => {
    document.title = "Gerador de Roteiros AI - Crie roteiros incríveis";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Gerador inteligente de roteiros usando IA. Crie roteiros profissionais para vídeos, podcasts e mais.");
    } else {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      m.setAttribute("content", "Gerador inteligente de roteiros usando IA. Crie roteiros profissionais para vídeos, podcasts e mais.");
      document.head.appendChild(m);
    }
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      const l = document.createElement("link");
      l.rel = "canonical";
      l.href = window.location.href;
      document.head.appendChild(l);
    }

    // Aviso único da Versão 2
    try {
      const VERSION_NOTICE_KEY = "scriptgen_v2_notice_shown";
      const alreadyShown = window.localStorage.getItem(VERSION_NOTICE_KEY);

      if (!alreadyShown) {
        setShowVersionBanner(true);
        window.localStorage.setItem(VERSION_NOTICE_KEY, "true");
      }
    } catch (err) {
      console.warn("Não foi possível registrar aviso de versão:", err);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-golden-50 via-amber-50/50 to-yellow-50 dark:from-background dark:via-background dark:to-muted">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-golden-300/20 dark:bg-golden-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-300/20 dark:bg-amber-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-300/10 dark:bg-yellow-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative container py-16 animate-fade-in">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          {/* Icon with animation */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-golden-400 to-amber-500 rounded-3xl blur-2xl opacity-60 animate-pulse" />
              <div className="relative p-4 rounded-2xl overflow-hidden">
                <img 
                  src={charlesLogo} 
                  alt="Charles Networking Logo" 
                  className="w-40 h-40 object-cover rounded-xl animate-bounce-soft"
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            {/* Branding Charles backlog */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-golden-600/80 dark:text-golden-400/80 uppercase tracking-[0.3em] mb-2">
                Exclusivo
              </p>
              <h2 className="text-3xl md:text-4xl font-bold">
                <span className="bg-gradient-to-r from-golden-500 via-amber-500 to-yellow-500 dark:from-golden-400 dark:via-amber-400 dark:to-yellow-400 bg-clip-text text-transparent">
                  Charles Networking
                </span>
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-golden-400 to-transparent"></div>
                <span className="text-xs text-golden-500 dark:text-golden-400 font-medium">✨ Criador de Conteúdo ✨</span>
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-golden-400 to-transparent"></div>
              </div>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-golden-600 via-amber-600 to-yellow-600 dark:from-golden-400 dark:via-amber-400 dark:to-yellow-400 bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]" style={{ backgroundImage: 'linear-gradient(90deg, hsl(45 93% 55%), hsl(43 96% 63%), hsl(48 100% 60%), hsl(45 93% 55%))' }}>
                Gerador de Roteiros
              </span>
            </h1>
            <div className="flex flex-col items-center justify-center gap-2 text-golden-600 dark:text-golden-400">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <p className="text-xl font-medium">Powered by AI</p>
                <Sparkles className="w-5 h-5 animate-pulse" style={{ animationDelay: '0.5s' }} />
              </div>
              <div className="px-3 py-1 rounded-full border border-golden-400/80 bg-golden-900/70 text-xs font-semibold uppercase tracking-wide text-golden-100 shadow-sm">
                Versão 2 • Atualizado
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Crie roteiros profissionais e envolventes para seus vídeos, podcasts e conteúdos digitais usando o poder da inteligência artificial.
          </p>

          {/* Feature badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-golden-100 to-amber-100 dark:from-golden-950 dark:to-amber-950 border border-golden-300 dark:border-golden-700 shadow-sm">
              <FileText className="w-4 h-4 text-golden-700 dark:text-golden-300" />
              <span className="text-sm font-medium text-golden-800 dark:text-golden-200">Múltiplos Formatos</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-950 dark:to-yellow-950 border border-amber-300 dark:border-amber-700 shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-300" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">IA Avançada</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-100 to-golden-100 dark:from-yellow-950 dark:to-golden-950 border border-yellow-300 dark:border-yellow-700 shadow-sm">
              <Wand2 className="w-4 h-4 text-yellow-700 dark:text-yellow-300" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Fácil e Rápido</span>
            </div>
          </div>
        </div>
      </header>

      {/* Versão 2 Banner - aparece apenas uma vez */}
      {showVersionBanner && (
        <section className="relative container -mt-6 mb-6 z-40 animate-fade-in">
          <div className="max-w-3xl mx-auto rounded-2xl border border-golden-400/70 bg-gradient-to-r from-golden-900 via-amber-900 to-yellow-900 text-golden-50 px-6 py-4 shadow-golden-lg">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  Bem-vindo à Versão 2 do Gerador!
                </h3>
                <p className="text-sm mt-1 text-golden-100/90">
                  Atualizamos o gerador com melhorias de qualidade, estabilidade e gestão de APIs.
                </p>
                <p className="text-xs mt-2 text-golden-100/80">
                  Em caso de bugs ou sugestões, fale comigo no Discord:&nbsp;
                  <a
                    href="https://discord.com/users/332952258486468619"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-medium text-golden-50 hover:text-yellow-200"
                  >
                    discord.com/users/332952258486468619
                  </a>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVersionBanner(false)}
                className="ml-4 text-xs text-golden-200 hover:text-golden-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className="relative container pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl border-2 border-golden-200 dark:border-golden-800 bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-xl shadow-golden-lg p-8 animate-fade-in">
            <ScriptGeneratorWithModals />
          </div>
        </div>
      </main>

      {/* Settings Button */}
      <Link
        to="/settings"
        className="fixed top-6 right-6 z-50 group"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110">
            <Settings className="w-5 h-5 text-white" />
          </div>
        </div>
        <span className="absolute top-full right-0 mt-2 px-3 py-1 bg-gray-900 text-blue-300 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-lg">
          Configurações
        </span>
      </Link>

      {/* Admin Button - Only for admins */}
      {isMaster && (
        <Link
          to="/admin"
          className="fixed bottom-6 right-6 z-50 group"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-golden-500 to-amber-500 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
            <div className="relative bg-gradient-to-br from-golden-500 to-amber-500 p-4 rounded-full shadow-golden-lg hover:shadow-golden transition-all duration-300 hover:scale-110">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-golden-300 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-lg">
            Área Administrativa
          </span>
        </Link>
      )}

      {/* Footer */}
      <footer className="relative container pb-12 pt-8 border-t border-golden-200 dark:border-golden-800 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="w-4 h-4 text-golden-500" />
            <span>Desenvolvido com IA para criadores de conteúdo</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
            <a
              href="https://discord.com/users/332952258486468619"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-golden-700 dark:text-golden-300 hover:text-golden-800 dark:hover:text-golden-200 transition-colors duration-300 flex items-center gap-2 group"
            >
              <span>Sistema desenvolvido por Thiago</span>
              <svg
                className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity"
                viewBox="0 0 127.14 96.36"
                fill="currentColor"
              >
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
              </svg>
            </a>
            <span className="text-xs text-golden-600/70 dark:text-golden-400/70">
              Clique para contato no Discord
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Index;