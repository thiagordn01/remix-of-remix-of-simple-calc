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

  // Exportar APIs funcionais como arquivo JSON (backup)
  // Exporta apenas APIs que estão ativas e não são inválidas/suspensas
  const exportApiKeys = useCallback(() => {
    const workingKeys = apiKeys.filter(key =>
      key.isActive &&
      key.status !== 'suspended' &&
      key.status !== 'invalid'
    );

    if (workingKeys.length === 0) {
      return { success: false, error: 'Nenhuma API funcional para exportar' };
    }

    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        apiKeysCount: workingKeys.length,
        apiKeys: workingKeys.map(key => ({
          name: key.name,
          key: key.key,
          model: key.model,
          // Não exporta dados de status/uso pois podem estar desatualizados
        }))
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `apis-gemini-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, count: workingKeys.length };
    } catch (error) {
      console.error('Erro ao exportar APIs:', error);
      return { success: false, error: 'Erro ao exportar APIs' };
    }
  }, [apiKeys]);

  // Importar APIs de arquivo JSON
  const importApiKeys = useCallback((file: File, mode: 'replace' | 'merge' = 'merge'): Promise<{ success: boolean; imported?: number; skipped?: number; error?: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);

          // Validar estrutura do arquivo
          if (!data.apiKeys || !Array.isArray(data.apiKeys)) {
            resolve({ success: false, error: 'Arquivo inválido: formato não reconhecido' });
            return;
          }

          // Filtrar APIs válidas (que tem key)
          const validKeys = data.apiKeys.filter((api: any) => api.key && api.key.trim());

          if (validKeys.length === 0) {
            resolve({ success: false, error: 'Nenhuma API válida encontrada no arquivo' });
            return;
          }

          // Verificar duplicados por chave
          const existingKeyValues = new Set(apiKeys.map(k => k.key));
          let skipped = 0;

          setApiKeys(prevKeys => {
            let newKeys: GeminiApiKey[];

            if (mode === 'replace') {
              // Substituir todas as APIs
              newKeys = validKeys.map((api: any) => ({
                id: crypto.randomUUID(),
                name: api.name || 'API Importada',
                key: api.key,
                model: api.model || 'gemini-3-flash-preview',
                requestCount: 0,
                isActive: true,
                status: 'unknown' as const,
                statusMessage: 'Importada - clique em Testar para validar'
              }));
            } else {
              // Merge: adicionar apenas APIs que não existem
              const newImported: GeminiApiKey[] = [];

              for (const api of validKeys) {
                if (existingKeyValues.has(api.key)) {
                  skipped++;
                  continue;
                }

                newImported.push({
                  id: crypto.randomUUID(),
                  name: api.name || 'API Importada',
                  key: api.key,
                  model: api.model || 'gemini-3-flash-preview',
                  requestCount: 0,
                  isActive: true,
                  status: 'unknown' as const,
                  statusMessage: 'Importada - clique em Testar para validar'
                });
              }

              newKeys = [...prevKeys, ...newImported];
            }

            saveToStorage(newKeys);
            return newKeys;
          });

          const imported = mode === 'replace' ? validKeys.length : validKeys.length - skipped;
          resolve({ success: true, imported, skipped });
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
  }, [apiKeys, saveToStorage]);

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
    getActiveApiKeys,
    exportApiKeys,
    importApiKeys
  };
};
