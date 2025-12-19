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

  return {
    agents,
    addAgent: createAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgent,
    duplicateAgent
  };
};
