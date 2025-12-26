import { useState, useCallback, useEffect } from 'react';
import { Agent, CreateAgentRequest, UpdateAgentRequest } from '@/types/agents';

const STORAGE_KEY = 'script-agents';

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Converter strings de data de volta para objetos Date
        return parsed.map((agent: any) => ({
          ...agent,
          createdAt: new Date(agent.createdAt),
          updatedAt: new Date(agent.updatedAt)
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar agentes do localStorage:', error);
    }
    return [];
  });

  // Salvar no localStorage sempre que agents mudar
  const saveToStorage = useCallback((newAgents: Agent[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAgents));
      // Disparar evento para notificar outros componentes
      window.dispatchEvent(new Event('agents-storage-updated'));
    } catch (error) {
      console.error('Erro ao salvar agentes no localStorage:', error);
    }
  }, []);

  // Listener para sincronizar entre diferentes instâncias do hook
  useEffect(() => {
    const handleAgentsUpdate = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const agentsWithDates = parsed.map((agent: any) => ({
            ...agent,
            createdAt: new Date(agent.createdAt),
            updatedAt: new Date(agent.updatedAt)
          }));
          setAgents(agentsWithDates);
        }
      } catch (error) {
        console.error('Erro ao recarregar agentes:', error);
      }
    };
    
    window.addEventListener('agents-storage-updated', handleAgentsUpdate);
    
    return () => {
      window.removeEventListener('agents-storage-updated', handleAgentsUpdate);
    };
  }, []);

  const createAgent = useCallback((request: CreateAgentRequest): Agent => {
    const newAgent: Agent = {
      id: crypto.randomUUID(),
      ...request,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setAgents(prevAgents => {
      const updatedAgents = [...prevAgents, newAgent];
      saveToStorage(updatedAgents);
      return updatedAgents;
    });
    
    return newAgent;
  }, [saveToStorage]);

  const updateAgent = useCallback((request: UpdateAgentRequest): Agent | null => {
    let updatedAgentResult: Agent | null = null;
    
    setAgents(prevAgents => {
      const agentIndex = prevAgents.findIndex(agent => agent.id === request.id);
      if (agentIndex === -1) return prevAgents;

      updatedAgentResult = {
        ...prevAgents[agentIndex],
        ...request,
        updatedAt: new Date()
      };

      const updatedAgents = [...prevAgents];
      updatedAgents[agentIndex] = updatedAgentResult;
      
      saveToStorage(updatedAgents);
      return updatedAgents;
    });
    
    return updatedAgentResult;
  }, [saveToStorage]);

  const deleteAgent = useCallback((id: string): boolean => {
    let success = false;
    
    setAgents(prevAgents => {
      const agentExists = prevAgents.some(agent => agent.id === id);
      if (!agentExists) return prevAgents;

      success = true;
      const updatedAgents = prevAgents.filter(agent => agent.id !== id);
      saveToStorage(updatedAgents);
      return updatedAgents;
    });
    
    return success;
  }, [saveToStorage]);

  const getAgent = useCallback((id: string): Agent | null => {
    return agents.find(agent => agent.id === id) || null;
  }, [agents]);

  const duplicateAgent = useCallback((id: string, newName?: string): Agent | null => {
    let duplicatedAgentResult: Agent | null = null;

    setAgents(prevAgents => {
      const originalAgent = prevAgents.find(agent => agent.id === id);
      if (!originalAgent) return prevAgents;

      duplicatedAgentResult = {
        ...originalAgent,
        id: crypto.randomUUID(),
        name: newName || `${originalAgent.name} (Cópia)`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedAgents = [...prevAgents, duplicatedAgentResult];
      saveToStorage(updatedAgents);
      return updatedAgents;
    });

    return duplicatedAgentResult;
  }, [saveToStorage]);

  // Exportar agentes como arquivo JSON (backup)
  const exportAgents = useCallback(() => {
    if (agents.length === 0) {
      return { success: false, error: 'Nenhum agente para exportar' };
    }

    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        agentsCount: agents.length,
        agents: agents.map(agent => ({
          ...agent,
          createdAt: agent.createdAt.toISOString(),
          updatedAt: agent.updatedAt.toISOString()
        }))
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `agentes-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, count: agents.length };
    } catch (error) {
      console.error('Erro ao exportar agentes:', error);
      return { success: false, error: 'Erro ao exportar agentes' };
    }
  }, [agents]);

  // Importar agentes de arquivo JSON
  const importAgents = useCallback((file: File, mode: 'replace' | 'merge' = 'merge'): Promise<{ success: boolean; imported?: number; error?: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);

          // Validar estrutura do arquivo
          if (!data.agents || !Array.isArray(data.agents)) {
            resolve({ success: false, error: 'Arquivo inválido: formato não reconhecido' });
            return;
          }

          // Converter e validar agentes
          const importedAgents: Agent[] = data.agents.map((agent: any) => ({
            id: mode === 'replace' ? agent.id : crypto.randomUUID(), // Gera novo ID no merge para evitar conflitos
            name: agent.name || 'Agente Importado',
            description: agent.description || '',
            channelName: agent.channelName || '',
            duration: agent.duration || 10,
            language: agent.language || 'pt-BR',
            location: agent.location || 'Brasil',
            premisePrompt: agent.premisePrompt || '',
            scriptPrompt: agent.scriptPrompt || '',
            createdAt: new Date(agent.createdAt || new Date()),
            updatedAt: new Date()
          }));

          if (importedAgents.length === 0) {
            resolve({ success: false, error: 'Nenhum agente válido encontrado no arquivo' });
            return;
          }

          setAgents(prevAgents => {
            let newAgents: Agent[];

            if (mode === 'replace') {
              // Substituir todos os agentes
              newAgents = importedAgents;
            } else {
              // Merge: adicionar novos agentes (evitar duplicados por nome)
              const existingNames = new Set(prevAgents.map(a => a.name.toLowerCase()));
              const uniqueImported = importedAgents.map(agent => {
                if (existingNames.has(agent.name.toLowerCase())) {
                  return { ...agent, name: `${agent.name} (Importado)` };
                }
                return agent;
              });
              newAgents = [...prevAgents, ...uniqueImported];
            }

            saveToStorage(newAgents);
            return newAgents;
          });

          resolve({ success: true, imported: importedAgents.length });
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          resolve({ success: false, error: 'Erro ao processar arquivo JSON' });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, error: 'Erro ao ler arquivo' });
      };

      reader.readAsText(file);
    });
  }, [saveToStorage]);

  return {
    agents,
    addAgent: createAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgent,
    duplicateAgent,
    exportAgents,
    importAgents
  };
};
