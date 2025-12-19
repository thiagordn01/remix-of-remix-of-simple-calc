
import { useState, useCallback, useEffect } from 'react';
import { GenerationJob } from './useParallelScriptGenerator';

const HISTORY_STORAGE_KEY = 'script-generation-history-v2';

export interface ScriptHistoryItem extends GenerationJob {
  isFavorite?: boolean;
  generatedAt: string; 
  agentName: string;
  premise?: string;
  
  // Campos de áudio
  audioJobId?: string;
  audioUrl?: string;
  audioStatus?: 'queued' | 'processing' | 'done' | 'error';
  audioProgress?: number;
  audioError?: string;
  audioGeneratedAt?: string;
}

export const useScriptHistory = () => {
  const [history, setHistory] = useState<ScriptHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Função para recarregar do localStorage
  const reloadFromStorage = useCallback(() => {
    console.log('🔄 [HISTORY] Recarregando do localStorage...');
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ScriptHistoryItem[];
        setHistory(parsed);
        console.log(`✅ [HISTORY] ${parsed.length} itens recarregados`);
      }
    } catch (error) {
      console.error('❌ [HISTORY] Erro ao recarregar:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ScriptHistoryItem[];
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listener para mudanças no localStorage (entre abas e componentes)
  useEffect(() => {
    // Listener para mudanças de OUTRAS ABAS do navegador
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === HISTORY_STORAGE_KEY && e.newValue) {
        console.log('🔔 [HISTORY] Detectada mudança no localStorage de OUTRA ABA');
        reloadFromStorage();
      }
    };

    // Listener para mudanças na MESMA ABA (eventos customizados)
    const handleCustomEvent = () => {
      console.log('🔔 [HISTORY] Detectada mudança no localStorage da MESMA ABA');
      reloadFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('script-history-storage-updated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('script-history-storage-updated', handleCustomEvent);
    };
  }, [reloadFromStorage]);

  const saveHistory = useCallback((newHistory: ScriptHistoryItem[]) => {
    try {
      console.log('💾 [SAVE HISTORY] Salvando', newHistory.length, 'itens no localStorage');
      const json = JSON.stringify(newHistory);
      localStorage.setItem(HISTORY_STORAGE_KEY, json);
      setHistory(newHistory);
      console.log('✅ [SAVE HISTORY] Salvo com sucesso no localStorage');

      // Disparar evento customizado para sincronizar outras instâncias do hook
      window.dispatchEvent(new Event('script-history-storage-updated'));
      console.log('📢 [SAVE HISTORY] Evento de atualização disparado');

      // Verificar se realmente foi salvo
      const verification = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (verification) {
        const parsed = JSON.parse(verification);
        console.log('✅ [SAVE HISTORY] Verificação OK - localStorage tem', parsed.length, 'itens');
      }
    } catch (error) {
      console.error('❌ [SAVE HISTORY] Erro ao salvar:', error);
    }
  }, []);

  const addToHistory = useCallback((job: GenerationJob, agentName: string, premise?: string) => {
    console.log('📝 [ADD TO HISTORY] Função chamada para job:', job.id, job.title);
    console.log('📝 [ADD TO HISTORY] - Status:', job.status);
    console.log('📝 [ADD TO HISTORY] - Tem script:', !!job.script);
    console.log('📝 [ADD TO HISTORY] - Agente:', agentName);

    if (job.status !== 'completed' || !job.script) {
      console.log('❌ [ADD TO HISTORY] Job rejeitado: status não é completed ou não tem script');
      return;
    }

    setHistory(prev => {
      const isAlreadyInHistory = prev.some(item => item.id === job.id);
      console.log('📝 [ADD TO HISTORY] Job já está no histórico?', isAlreadyInHistory);

      if (isAlreadyInHistory) {
        console.log('⚠️ [ADD TO HISTORY] Job já existe no histórico, ignorando');
        return prev;
      }

      const newItem: ScriptHistoryItem = {
        ...job,
        isFavorite: false,
        generatedAt: new Date().toISOString(),
        agentName: agentName,
        premise: premise, // Adicionado
      };

      const newHistory = [newItem, ...prev].slice(0, 100);
      console.log('✅ [ADD TO HISTORY] Salvando novo item. Histórico agora tem:', newHistory.length, 'itens');
      saveHistory(newHistory);
      return newHistory;
    });
  }, [saveHistory]);

  const toggleFavorite = useCallback((jobId: string) => {
    const newHistory = history.map(item =>
      item.id === jobId ? { ...item, isFavorite: !item.isFavorite } : item
    );
    saveHistory(newHistory);
  }, [history, saveHistory]);

  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  const removeFromHistory = useCallback((jobId: string) => {
    const newHistory = history.filter(item => item.id !== jobId);
    saveHistory(newHistory);
  }, [history, saveHistory]);

  const getFavorites = useCallback(() => {
    return history.filter(item => item.isFavorite);
  }, [history]);

  const updateAudioInfo = useCallback((
    scriptId: string, 
    audioData: {
      audioJobId?: string;
      audioUrl?: string;
      audioStatus?: 'queued' | 'processing' | 'done' | 'error';
      audioProgress?: number;
      audioError?: string;
    }
  ) => {
    setHistory(prev => {
      const itemIndex = prev.findIndex(item => item.id === scriptId);
      
      if (itemIndex === -1) {
        console.warn(`⚠️ [HISTORY] Script ${scriptId} não encontrado no histórico`);
        return prev;
      }
      
      const newHistory = prev.map(item => {
        if (item.id === scriptId) {
          console.log(`📝 [HISTORY] Atualizando áudio para script ${scriptId}:`, audioData);
          const updated = {
            ...item,
            ...audioData,
            audioGeneratedAt: audioData.audioStatus === 'done' ? new Date().toISOString() : item.audioGeneratedAt
          };
          console.log(`✅ [HISTORY] Novo estado do item:`, updated);
          return updated;
        }
        return item;
      });
      
      // Salvar no localStorage com verificação
      try {
        const json = JSON.stringify(newHistory);
        localStorage.setItem(HISTORY_STORAGE_KEY, json);
        console.log(`💾 [HISTORY] Salvo no localStorage (${json.length} bytes)`);
        
        // Verificar se realmente foi salvo
        const verification = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (verification === json) {
          console.log(`✅ [HISTORY] Verificação OK - dados persistidos corretamente`);
        } else {
          console.error(`❌ [HISTORY] ERRO: Dados não foram salvos corretamente!`);
        }
      } catch (error) {
        console.error('❌ [HISTORY] Error saving history:', error);
      }
      
      return newHistory;
    });
  }, []);

  const getStatistics = useCallback(() => {
    const stats = {
      totalScripts: history.length,
      totalWords: 0,
      avgWords: 0,
      favorites: history.filter(h => h.isFavorite).length,
      audiosGenerated: history.filter(h => h.audioStatus === 'done').length,
      byAgent: {} as Record<string, { count: number; totalWords: number }>,
      byLanguage: {} as Record<string, number>,
      byMonth: {} as Record<string, number>,
    };

    history.forEach(item => {
      const words = item.wordCount || 0;
      stats.totalWords += words;

      // Por agente
      if (!stats.byAgent[item.agentName]) {
        stats.byAgent[item.agentName] = { count: 0, totalWords: 0 };
      }
      stats.byAgent[item.agentName].count++;
      stats.byAgent[item.agentName].totalWords += words;

      // Por idioma (se disponível)
      const lang = (item as any).language || 'pt-BR';
      stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;

      // Por mês
      const month = new Date(item.generatedAt).toISOString().slice(0, 7);
      stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
    });

    stats.avgWords = stats.totalScripts > 0 ? Math.round(stats.totalWords / stats.totalScripts) : 0;

    return stats;
  }, [history]);

  return {
    history,
    isLoading,
    addToHistory,
    updateAudioInfo,
    toggleFavorite,
    clearHistory,
    removeFromHistory,
    getFavorites,
    getStatistics,
    reloadFromStorage,
  };
};

