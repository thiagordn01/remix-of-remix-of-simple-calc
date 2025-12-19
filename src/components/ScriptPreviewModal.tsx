
import React, { useState } from 'react';
import { X, Copy, Download, Star, StarOff, FileText } from 'lucide-react';
import { generateSrtContent, calculateSrtStats, DEFAULT_SRT_CONFIG } from '@/utils/srtGenerator';
import { useToast } from '@/hooks/use-toast';

interface ScriptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  premise?: string;
  script: string;
  wordCount?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onSendToAudio?: () => void;
  audioUrl?: string;
  audioGeneratedAt?: string;
}

export const ScriptPreviewModal: React.FC<ScriptPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  premise,
  script,
  wordCount,
  isFavorite,
  onToggleFavorite,
  onSendToAudio,
  audioUrl,
  audioGeneratedAt
}) => {
  const { toast } = useToast();
  const [showSrtStats, setShowSrtStats] = useState(false);

  if (!isOpen) return null;

  const handleCopyPremise = async () => {
    if (!premise) return;
    try {
      await navigator.clipboard.writeText(premise);
    } catch (error) {
      console.error('Erro ao copiar premissa:', error);
    }
  };

  const handleDownloadPremise = () => {
    if (!premise) return;
    const blob = new Blob([premise], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_premissa.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(script);
    } catch (error) {
      console.error('Erro ao copiar roteiro:', error);
    }
  };

  const handleDownloadScript = () => {
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_roteiro.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSrt = () => {
    try {
      const srtContent = generateSrtContent(script, DEFAULT_SRT_CONFIG);
      const stats = calculateSrtStats(script, DEFAULT_SRT_CONFIG);
      
      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_legendas.srt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "SRT gerado com sucesso!",
        description: `${stats.totalBlocks} blocos, duração total: ${Math.floor(stats.totalDurationSeconds / 60)}min ${stats.totalDurationSeconds % 60}s`
      });
    } catch (error) {
      console.error('Erro ao gerar SRT:', error);
      toast({
        title: "Erro ao gerar SRT",
        description: "Não foi possível gerar o arquivo de legendas",
        variant: "destructive"
      });
    }
  };

  const srtStats = script ? calculateSrtStats(script, DEFAULT_SRT_CONFIG) : null;

  const estimatedDuration = wordCount ? Math.ceil(wordCount / 150) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              {wordCount && (
                <>
                  <span>{wordCount} palavras</span>
                  <span>•</span>
                  <span>~{estimatedDuration} min</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onToggleFavorite && (
              <button
                onClick={onToggleFavorite}
                className={`p-2 rounded-md transition-colors ${
                  isFavorite 
                    ? 'text-yellow-400 hover:text-yellow-300' 
                    : 'text-gray-400 hover:text-yellow-400'
                }`}
                title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                {isFavorite ? <Star size={20} fill="currentColor" /> : <StarOff size={20} />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-md"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-900 rounded-md p-4">
            {premise && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
                  <h3 className="text-xl font-semibold text-white">Premissa</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyPremise}
                      className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-md"
                      title="Copiar premissa"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={handleDownloadPremise}
                      className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-md"
                      title="Baixar premissa"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {premise}
                </div>
              </div>
            )}

            {/* Seção de Áudio Gerado */}
            {audioUrl && (
              <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-white">🎵 Áudio Gerado</h3>
                <audio controls className="w-full mb-3">
                  <source src={audioUrl} type="audio/mpeg" />
                </audio>
                <a
                  href={audioUrl}
                  download={`${title.replace(/[^a-zA-Z0-9]/g, '_')}_audio.mp3`}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors inline-block text-center"
                >
                  📥 Baixar Áudio
                </a>
                {audioGeneratedAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    Gerado em: {new Date(audioGeneratedAt).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
                <h3 className="text-xl font-semibold text-white">Roteiro</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyScript}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-md"
                    title="Copiar roteiro"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-md"
                    title="Baixar roteiro (.txt)"
                  >
                    📄 TXT
                  </button>
                  <button
                    onClick={handleDownloadSrt}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-colors"
                    title="Baixar legendas em formato SRT"
                  >
                    📝 SRT
                  </button>
                  <button
                    onClick={handleDownloadSrt}
                    className="p-1.5 text-green-400 hover:text-green-300 transition-colors rounded-md"
                    title="Baixar legendas (.srt)"
                  >
                    <FileText size={16} />
                  </button>
                </div>
              </div>

              {/* Estatísticas SRT */}
              {srtStats && (
                <div className="mb-3 p-3 bg-gray-800 rounded border border-gray-700">
                  <button
                    onClick={() => setShowSrtStats(!showSrtStats)}
                    className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={14} />
                      Informações do SRT
                    </span>
                    <span>{showSrtStats ? '▼' : '▶'}</span>
                  </button>
                  
                  {showSrtStats && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-300">
                      <div>
                        <span className="text-gray-500">Blocos:</span> {srtStats.totalBlocks}
                      </div>
                      <div>
                        <span className="text-gray-500">Duração total:</span> {Math.floor(srtStats.totalDurationSeconds / 60)}min {srtStats.totalDurationSeconds % 60}s
                      </div>
                      <div>
                        <span className="text-gray-500">Média palavras/bloco:</span> {srtStats.averageWordsPerBlock}
                      </div>
                      <div>
                        <span className="text-gray-500">Média chars/bloco:</span> {srtStats.averageCharsPerBlock}
                      </div>
                      <div className="col-span-2 mt-2 pt-2 border-t border-gray-700 text-gray-500">
                        Configuração: 30s/bloco, 20ms intervalo, 30-100 palavras, máx 500 chars
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                {script}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Use Ctrl+F para buscar no texto
          </div>
          <div className="flex space-x-3">
            {onSendToAudio && (
              <button
                onClick={onSendToAudio}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Enviar para Áudio
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

