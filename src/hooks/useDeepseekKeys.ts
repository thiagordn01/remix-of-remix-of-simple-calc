import { useState, useCallback, useEffect } from 'react';
import { DeepseekApiKey } from '@/types/scripts';

const STORAGE_KEY = 'deepseek-api-keys';

export const useDeepseekKeys = () => {
  const [apiKeys, setApiKeys] = useState<DeepseekApiKey[]>(() => {
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
      console.error('Erro ao carregar chaves API DeepSeek do localStorage:', error);
    }
    return [];
  });

  // Salvar no localStorage sempre que apiKeys mudar
  const saveToStorage = useCallback((newKeys: DeepseekApiKey[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
      // Disparar evento para notificar outros componentes
      window.dispatchEvent(new Event('deepseek-keys-storage-updated'));
    } catch (error) {
      console.error('Erro ao salvar chaves API DeepSeek no localStorage:', error);
    }
  }, []);

  // Listener para sincronizar entre diferentes instancias do hook
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
        console.error('Erro ao recarregar chaves API DeepSeek:', error);
      }
    };

    window.addEventListener('deepseek-keys-storage-updated', handleApiKeysUpdate);

    return () => {
      window.removeEventListener('deepseek-keys-storage-updated', handleApiKeysUpdate);
    };
  }, []);

  const addApiKey = useCallback((newApiKey: Omit<DeepseekApiKey, 'id' | 'requestCount' | 'isActive'>) => {
    const apiKey: DeepseekApiKey = {
      ...newApiKey,
      id: crypto.randomUUID(),
      requestCount: 0,
      isActive: true,
      status: 'unknown',
      statusMessage: 'Clique em "Testar" para validar ou use diretamente na geracao'
    };

    setApiKeys(prevKeys => {
      const updatedKeys = [...prevKeys, apiKey];
      saveToStorage(updatedKeys);
      return updatedKeys;
    });

    return apiKey;
  }, [saveToStorage]);

  const addMultipleApiKeys = useCallback((newApiKeys: Array<Omit<DeepseekApiKey, 'id' | 'requestCount' | 'isActive'>>) => {
    const apiKeysToAdd: DeepseekApiKey[] = newApiKeys.map(newApiKey => ({
      ...newApiKey,
      id: crypto.randomUUID(),
      requestCount: 0,
      isActive: true,
      status: 'unknown',
      statusMessage: 'Clique em "Testar" para validar ou use diretamente na geracao'
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

  const updateApiKey = useCallback((id: string, updates: Partial<DeepseekApiKey>) => {
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
    activeApiKeys,
    addApiKey,
    addMultipleApiKeys,
    removeApiKey,
    deleteApiKey: removeApiKey,
    toggleApiKey,
    updateApiKey,
    getActiveApiKeys
  };
};
