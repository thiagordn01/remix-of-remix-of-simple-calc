import { useState, useCallback, useEffect } from 'react';
import { GeminiApiKey } from '@/types/scripts';

const STORAGE_KEY = 'gemini-api-keys';

export const useGeminiKeys = () => {
  const [apiKeys, setApiKeys] = useState<GeminiApiKey[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Converter strings de data de volta para objetos Date
        return parsed.map((key: any) => ({
          ...key,
          lastUsed: key.lastUsed ? new Date(key.lastUsed) : undefined,
          lastValidated: key.lastValidated ? new Date(key.lastValidated) : undefined
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar chaves API do localStorage:', error);
    }
    return [];
  });

  // Salvar no localStorage sempre que apiKeys mudar
  const saveToStorage = useCallback((newKeys: GeminiApiKey[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
      // Disparar evento para notificar outros componentes
      window.dispatchEvent(new Event('gemini-keys-storage-updated'));
    } catch (error) {
      console.error('Erro ao salvar chaves API no localStorage:', error);
    }
  }, []);

  // Listener para sincronizar entre diferentes instâncias do hook
  useEffect(() => {
    const handleApiKeysUpdate = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const keysWithDates = parsed.map((key: any) => ({
            ...key,
            lastUsed: key.lastUsed ? new Date(key.lastUsed) : undefined,
            lastValidated: key.lastValidated ? new Date(key.lastValidated) : undefined
          }));
          setApiKeys(keysWithDates);
        }
      } catch (error) {
        console.error('Erro ao recarregar chaves API:', error);
      }
    };
    
    window.addEventListener('gemini-keys-storage-updated', handleApiKeysUpdate);
    
    return () => {
      window.removeEventListener('gemini-keys-storage-updated', handleApiKeysUpdate);
    };
  }, []);

  const addApiKey = useCallback((newApiKey: Omit<GeminiApiKey, 'id' | 'requestCount' | 'isActive'>) => {
    const apiKey: GeminiApiKey = {
      ...newApiKey,
      id: crypto.randomUUID(),
      requestCount: 0,
      isActive: true,
      status: 'unknown',
      statusMessage: 'Clique em "Testar" para validar ou use diretamente na geração'
    };
    
    setApiKeys(prevKeys => {
      const updatedKeys = [...prevKeys, apiKey];
      saveToStorage(updatedKeys);
      return updatedKeys;
    });
    
    return apiKey;
  }, [saveToStorage]);

  const addMultipleApiKeys = useCallback((newApiKeys: Array<Omit<GeminiApiKey, 'id' | 'requestCount' | 'isActive'>>) => {
    const apiKeysToAdd: GeminiApiKey[] = newApiKeys.map(newApiKey => ({
      ...newApiKey,
      id: crypto.randomUUID(),
      requestCount: 0,
      isActive: true,
      status: 'unknown',
      statusMessage: 'Clique em "Testar" para validar ou use diretamente na geração'
    }));
    
    setApiKeys(prevKeys => {
      const updatedKeys = [...prevKeys, ...apiKeysToAdd];
      saveToStorage(updatedKeys);
      return updatedKeys;
    });
    
    return apiKeysToAdd;
  }, [saveToStorage]);

  const removeApiKey = useCallback((id: string) => {
    setApiKeys(prevKeys => {
      const updatedKeys = prevKeys.filter(key => key.id !== id);
      saveToStorage(updatedKeys);
      return updatedKeys;
    });
  }, [saveToStorage]);

  const toggleApiKey = useCallback((id: string) => {
    setApiKeys(prevKeys => {
      const updatedKeys = prevKeys.map(key => 
        key.id === id ? { ...key, isActive: !key.isActive } : key
      );
      saveToStorage(updatedKeys);
      return updatedKeys;
    });
  }, [saveToStorage]);

  const updateApiKey = useCallback((id: string, updates: Partial<GeminiApiKey>) => {
    setApiKeys(prevKeys => {
      const updatedKeys = prevKeys.map(key => 
        key.id === id ? { ...key, ...updates } : key
      );
      saveToStorage(updatedKeys);
      return updatedKeys;
    });
  }, [saveToStorage]);

  const getActiveApiKeys = useCallback(() => {
    return apiKeys.filter(key => 
      key.isActive && 
      key.status !== 'suspended' &&
      key.status !== 'invalid'
    );
  }, [apiKeys]);

  // Propriedade computada para compatibilidade
  const activeApiKeys = getActiveApiKeys();

  return {
    apiKeys,
    activeApiKeys, // Adicionado para compatibilidade
    addApiKey,
    addMultipleApiKeys,
    removeApiKey,
    deleteApiKey: removeApiKey,
    toggleApiKey,
    updateApiKey,
    getActiveApiKeys
  };
};
