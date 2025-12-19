import React, { useState, useEffect } from 'react';
import { useScriptHistory } from '../hooks/useScriptHistory';
import { ScriptPreviewModal } from './ScriptPreviewModal';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { generateSrtContent, calculateSrtStats, DEFAULT_SRT_CONFIG } from '@/utils/srtGenerator';
import { sanitizeFilename, createSequentialFilename } from '@/utils/fileNaming';
import JSZip from 'jszip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Star,
  StarOff,
  Eye,
  Copy,
  Download,
  Trash2,
  Search,
  Filter,
  Calendar,
  FileText,
  MoreVertical,
  Play,
  PackageOpen,
  CheckSquare,
  Square
} from 'lucide-react';

export const ScriptHistoryTab: React.FC<{
  onScriptGenerated?: (script: string, title: string) => void;
}> = ({ onScriptGenerated }) => {
  const { toast } = useToast();
  const { 
    history, 
    toggleFavorite, 
    removeFromHistory, 
    clearHistory, 
    getFavorites,
    reloadFromStorage
  } = useScriptHistory();

  // Recarregar histórico quando o componente monta
  useEffect(() => {
    console.log('🔄 [HISTORY TAB] Componente montado, recarregando dados...');
    reloadFromStorage();
  }, [reloadFromStorage]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'favorites'>('all');
  const [selectedScript, setSelectedScript] = useState<{
    title: string;
    premise?: string;
    script: string;
    wordCount?: number;
    isFavorite?: boolean;
    id: string;
  } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedScripts, setSelectedScripts] = useState<Set<string>>(new Set());

  // Filtrar histórico
  const filteredHistory = history.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.script?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.agentName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'favorites' && item.isFavorite);
    
    return matchesSearch && matchesFilter;
  });

  const handleOpenPreview = (item: any) => {
    setSelectedScript({
      title: item.title,
      premise: item.premise,
      script: item.script || '',
      wordCount: item.wordCount,
      isFavorite: item.isFavorite,
      id: item.id
    });
    setPreviewModalOpen(true);
  };

  const handleToggleFavoriteInModal = () => {
    if (selectedScript) {
      toggleFavorite(selectedScript.id);
      setSelectedScript(prev => prev ? {
        ...prev,
        isFavorite: !prev.isFavorite
      } : null);
    }
  };

  const handleCopyPremise = async (item: any) => {
    if (!item.premise) return;
    try {
      await navigator.clipboard.writeText(item.premise);
      toast({
        title: "Premissa copiada!",
        description: "A premissa foi copiada para a área de transferência."
      });
    } catch (error) {
      console.error('Erro ao copiar premissa:', error);
    }
  };

  const handleDownloadPremise = (item: any) => {
    if (!item.premise) return;
    const blob = new Blob([item.premise], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFilename(item.title)} - Premissa.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Premissa baixada!",
      description: "A premissa foi salva com sucesso."
    });
  };

  const handleCopyScript = async (item: any) => {
    if (!item.script) return;
    try {
      await navigator.clipboard.writeText(item.script);
      toast({
        title: "Roteiro copiado!",
        description: "O roteiro foi copiado para a área de transferência."
      });
    } catch (error) {
      console.error('Erro ao copiar roteiro:', error);
    }
  };

  const handleDownloadScript = (item: any) => {
    if (!item.script) return;
    const blob = new Blob([item.script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFilename(item.title)} - Roteiro.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Roteiro baixado!",
      description: "O roteiro foi salvo com sucesso."
    });
  };

  const handleDownloadSRT = (item: any) => {
    if (!item.script) return;

    try {
      const srtContent = generateSrtContent(item.script, DEFAULT_SRT_CONFIG);
      const stats = calculateSrtStats(item.script, DEFAULT_SRT_CONFIG);

      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sanitizeFilename(item.title)} - Legendas.srt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Legendas SRT baixadas!",
        description: `${stats.totalBlocks} blocos gerados (30s cada, ~${Math.ceil(stats.totalDurationSeconds / 60)} min total)`
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

  const handleDownloadAudio = (item: any) => {
    if (!item.audioUrl) return;

    const link = document.createElement('a');
    link.href = item.audioUrl;
    link.download = `${sanitizeFilename(item.title)} - Audio.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "✅ Áudio baixado!",
      description: "O arquivo de áudio foi salvo com sucesso."
    });
  };

  const handleSendToAudio = (script: string, title: string) => {
    if (onScriptGenerated) {
      onScriptGenerated(script, title);
    }
    setPreviewModalOpen(false);
  };

  const handleToggleScript = (scriptId: string) => {
    setSelectedScripts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scriptId)) {
        newSet.delete(scriptId);
      } else {
        newSet.add(scriptId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const scriptsWithContent = filteredHistory.filter(item => item.script);
    setSelectedScripts(new Set(scriptsWithContent.map(item => item.id)));
  };

  const handleDeselectAll = () => {
    setSelectedScripts(new Set());
  };

  const handleDownloadAllScripts = async () => {
    // Filtra apenas os roteiros selecionados que têm script
    let scriptsToDownload = filteredHistory.filter(item =>
      item.script && selectedScripts.has(item.id)
    );

    if (scriptsToDownload.length === 0) {
      toast({
        title: "Nenhum roteiro selecionado",
        description: "Selecione pelo menos um roteiro para baixar.",
        variant: "destructive"
      });
      return;
    }

    // IMPORTANTE: Ordena por data de geração (do mais antigo para o mais novo)
    // Assim o roteiro mais antigo será o "Roteiro 01"
    scriptsToDownload = scriptsToDownload.sort((a, b) => {
      const dateA = new Date(a.generatedAt).getTime();
      const dateB = new Date(b.generatedAt).getTime();
      return dateA - dateB; // Ordem crescente (mais antigo primeiro)
    });

    try {
      const zip = new JSZip();
      const totalCount = scriptsToDownload.length;

      // Adiciona cada roteiro ao ZIP com numeração sequencial
      scriptsToDownload.forEach((item, index) => {
        const sequentialIndex = index + 1;
        const filename = createSequentialFilename(
          item.title,
          sequentialIndex,
          totalCount,
          'txt'
        );

        // Adiciona o arquivo TXT diretamente na raiz do ZIP (sem pastas)
        zip.file(filename, item.script);
      });

      // Gera o arquivo ZIP
      const content = await zip.generateAsync({ type: 'blob' });

      // Faz o download
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Roteiros (${totalCount}).zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Download concluído!",
        description: `${totalCount} roteiro${totalCount > 1 ? 's' : ''} baixado${totalCount > 1 ? 's' : ''} em formato ZIP.`
      });
    } catch (error) {
      console.error('Erro ao gerar ZIP:', error);
      toast({
        title: "Erro ao gerar ZIP",
        description: "Não foi possível criar o arquivo de download.",
        variant: "destructive"
      });
    }
  };

  const favorites = getFavorites();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📚</span>
          <h2 className="text-2xl font-bold text-white">Histórico de Roteiros</h2>
        </div>
        <div className="flex gap-2">
          {/* Botão de Recarregar */}
          <button
            onClick={reloadFromStorage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
            title="Recarregar histórico do armazenamento"
          >
            🔄 Atualizar
          </button>

          {/* Botões de Seleção */}
          {filteredHistory.filter(item => item.script).length > 0 && (
            <>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
                title="Selecionar todos os roteiros visíveis"
              >
                <CheckSquare size={16} />
                Selecionar Todos
              </button>

              {selectedScripts.size > 0 && (
                <button
                  onClick={handleDeselectAll}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
                  title="Desmarcar todos os roteiros"
                >
                  <Square size={16} />
                  Desmarcar Todos
                </button>
              )}
            </>
          )}

          {/* Botão de Download em Massa */}
          {selectedScripts.size > 0 && (
            <button
              onClick={handleDownloadAllScripts}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
              title="Baixar roteiros selecionados em formato ZIP"
            >
              <PackageOpen size={16} />
              Baixar Selecionados ({selectedScripts.size})
            </button>
          )}

          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              Limpar Histórico
            </button>
          )}
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2">
            <FileText className="text-blue-400" size={20} />
            <div>
              <p className="text-sm text-gray-400">Total de Roteiros</p>
              <p className="text-xl font-bold text-white">{history.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2">
            <Star className="text-yellow-400" size={20} />
            <div>
              <p className="text-sm text-gray-400">Favoritos</p>
              <p className="text-xl font-bold text-white">{favorites.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2">
            <Calendar className="text-green-400" size={20} />
            <div>
              <p className="text-sm text-gray-400">Esta Semana</p>
              <p className="text-xl font-bold text-white">
                {history.filter(item => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(item.generatedAt) >= weekAgo;
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por título, conteúdo ou agente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="text-gray-400" size={16} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'favorites')}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="favorites">Favoritos</option>
          </select>
        </div>
      </div>

      {/* Lista de roteiros */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {history.length === 0 ? 'Nenhum roteiro no histórico' : 'Nenhum resultado encontrado'}
          </h3>
          <p className="text-gray-400">
            {history.length === 0 
              ? 'Gere seu primeiro roteiro para vê-lo aqui'
              : 'Tente ajustar os filtros ou termo de busca'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4 h-96 overflow-y-auto pr-2">
          {filteredHistory.map((item) => (
            <div key={item.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Checkbox de Seleção */}
                  {item.script && (
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedScripts.has(item.id)}
                        onCheckedChange={() => handleToggleScript(item.id)}
                        className="border-gray-400"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      {item.isFavorite && (
                        <Star className="text-yellow-400" size={16} fill="currentColor" />
                      )}
                    </div>
                  
                  <div className="text-sm text-gray-400 space-y-1">
                    <p><strong>Agente:</strong> {item.agentName}</p>
                    <p><strong>Gerado em:</strong> {new Date(item.generatedAt).toLocaleString('pt-BR')}</p>
                    <p>
                      <strong>Estatísticas:</strong> {item.wordCount} palavras • 
                      ~{Math.ceil((item.wordCount || 0) / 150)} min de duração
                    </p>
                  </div>

                  {item.script && (
                    <div className="mt-3 p-3 bg-gray-900 rounded text-sm text-gray-300 max-h-20 overflow-hidden relative">
                      <p className="whitespace-pre-wrap">{item.script}</p>
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent"></div>
                    </div>
                  )}

                  {/* Seção de Áudio (se disponível) */}
                  {item.audioJobId && (
                    <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white flex items-center gap-2">
                          🎵 Áudio Automático
                        </span>
                        
                        {item.audioStatus === 'queued' && (
                          <span className="text-xs text-yellow-400">⏳ Na fila</span>
                        )}
                        
                        {item.audioStatus === 'processing' && (
                          <span className="text-xs text-blue-400">
                            🔄 Gerando {item.audioProgress}%
                          </span>
                        )}
                        
                        {item.audioStatus === 'done' && (
                          <span className="text-xs text-green-400">✅ Pronto</span>
                        )}
                        
                        {item.audioStatus === 'error' && (
                          <span className="text-xs text-red-400">❌ Erro</span>
                        )}
                      </div>
                      
                      {/* Progress bar para status processing */}
                      {item.audioStatus === 'processing' && (
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${item.audioProgress || 0}%` }}
                          />
                        </div>
                      )}
                      
                      {/* Player e download quando pronto */}
                      {item.audioStatus === 'done' && item.audioUrl && (
                        <div className="space-y-2">
                          <audio 
                            controls 
                            className="w-full h-8"
                            style={{ maxHeight: '32px' }}
                          >
                            <source src={item.audioUrl} type="audio/mpeg" />
                          </audio>
                          
                          <div className="flex gap-2">
                            <a
                              href={item.audioUrl}
                              download={`${sanitizeFilename(item.title)} - Audio.mp3`}
                              className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium text-center transition-colors"
                            >
                              📥 Baixar MP3
                            </a>
                          </div>
                          
                          {item.audioGeneratedAt && (
                            <p className="text-xs text-gray-400">
                              Gerado em: {new Date(item.audioGeneratedAt).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Mensagem de erro */}
                      {item.audioStatus === 'error' && item.audioError && (
                        <p className="text-xs text-red-400 mt-2">
                          ⚠️ {item.audioError}
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    className={`p-2 rounded transition-colors ${
                      item.isFavorite 
                        ? 'text-yellow-400 hover:text-yellow-300' 
                        : 'text-gray-400 hover:text-yellow-400'
                    }`}
                    title={item.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    {item.isFavorite ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                  </button>
                  
                  {item.script && (
                    <button
                      onClick={() => handleCopyScript(item)}
                      className="p-2 rounded transition-colors text-gray-400 hover:text-blue-400 hover:bg-gray-700"
                      title="Copiar Roteiro"
                    >
                      <Copy size={16} />
                    </button>
                  )}
                  
                  {item.script && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => handleCopyPremise(item)}>
                          <Copy size={14} className="mr-2" />
                          Copiar Premissa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadPremise(item)}>
                          <Download size={14} className="mr-2" />
                          Baixar Premissa
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => handleDownloadScript(item)}>
                          <Download size={14} className="mr-2" />
                          Baixar Roteiro (.txt)
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleDownloadSRT(item)}>
                          <Download size={14} className="mr-2" />
                          Baixar Legendas (.srt)
                        </DropdownMenuItem>

                        {/* Baixar Áudio - só aparece se o áudio estiver pronto */}
                        {item.audioStatus === 'done' && item.audioUrl && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleDownloadAudio(item)}
                              className="text-green-600"
                            >
                              <Download size={14} className="mr-2" />
                              Baixar Áudio (.mp3)
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => handleOpenPreview(item)}>
                          <Eye size={14} className="mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        
                        {onScriptGenerated && (
                          <DropdownMenuItem 
                            onClick={() => handleSendToAudio(item.script!, item.title)}
                            className="text-green-600"
                          >
                            <Play size={14} className="mr-2" />
                            Enviar para Áudio
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => removeFromHistory(item.id)}
                          className="text-red-600"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de visualização */}
      <ScriptPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={selectedScript?.title || ''}
        premise={selectedScript?.premise || ''}
        script={selectedScript?.script || ''}
        wordCount={selectedScript?.wordCount}
        isFavorite={selectedScript?.isFavorite}
        onToggleFavorite={handleToggleFavoriteInModal}
        onSendToAudio={onScriptGenerated ? () => handleSendToAudio(selectedScript?.script || '', selectedScript?.title || '') : undefined}
        audioUrl={(history.find(h => h.id === selectedScript?.id))?.audioUrl}
        audioGeneratedAt={(history.find(h => h.id === selectedScript?.id))?.audioGeneratedAt}
      />
    </div>
  );
};

