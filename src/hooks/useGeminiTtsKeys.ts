import { useState, useCallback } from 'react';
import { GeminiTtsApiKey } from '@/types/geminiTts';

const STORAGE_KEY = 'gemini-tts-api-keys';

// Sistema de reserva de API keys por job (global para todos os hooks)
const RESERVED_KEYS = new Map<string, string>(); // keyId -> jobId que está usando

export const useGeminiTtsKeys = () => {
  const [apiKeys, setApiKeys] = useState<GeminiTtsApiKey[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((key: any) => ({
          ...key,
          lastUsed: key.lastUsed ? new Date(key.lastUsed) : undefined,
          lastValidated: key.lastValidated ? new Date(key.lastValidated) : undefined
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar chaves TTS do localStorage:', error);
    }
    return [];
  });

  const saveToStorage = useCallback((newKeys: GeminiTtsApiKey[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
    } catch (error) {
      console.error('Erro ao salvar chaves TTS no localStorage:', error);
    }
  }, []);

  const addApiKey = useCallback((newApiKey: Omit<GeminiTtsApiKey, 'id' | 'requestCount' | 'isActive'>) => {
    const apiKey: GeminiTtsApiKey = {
      ...newApiKey,
      id: crypto.randomUUID(),
      requestCount: 0,
      isActive: true,
      status: 'unknown',
      statusMessage: 'Clique em "Testar" para validar'
    };
    
    setApiKeys(prevKeys => {
      const updatedKeys = [...prevKeys, apiKey];
      saveToStorage(updatedKeys);
      return updatedKeys;
    });
    
    return apiKey;
  }, [saveToStorage]);

  const addMultipleApiKeys = useCallback((newApiKeys: Array<Omit<GeminiTtsApiKey, 'id' | 'requestCount' | 'isActive'>>) => {
    const apiKeysToAdd: GeminiTtsApiKey[] = newApiKeys.map(newApiKey => ({
      ...newApiKey,
      id: crypto.randomUUID(),
      requestCount: 0,
      isActive: true,
      status: 'unknown',
      statusMessage: 'Clique em "Testar Todas" para validar'
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

  const updateApiKey = useCallback((id: string, updates: Partial<GeminiTtsApiKey>) => {
    setApiKeys(prevKeys => {
      const updatedKeys = prevKeys.map(key => 
        key.id === id ? { ...key, ...updates } : key
      );
      saveToStorage(updatedKeys);
      return updatedKeys;
    });
  }, [saveToStorage]);

  const reserveKeyForJob = useCallback((keyId: string, jobId: string) => {
    RESERVED_KEYS.set(keyId, jobId);
    const keyLabel = apiKeys.find(k => k.id === keyId)?.label || 'Unknown';
    console.log(`🔒 [JOB ${jobId.slice(0,8)}] Key "${keyLabel}" reservada`);
  }, [apiKeys]);

  const releaseKeyFromJob = useCallback((keyId: string, jobId: string) => {
    RESERVED_KEYS.delete(keyId);
    console.log(`🔓 [JOB ${jobId.slice(0,8)}] Key liberada`);
  }, []);

  const isKeyReservedByOtherJob = useCallback((keyId: string, currentJobId?: string) => {
    const reservedBy = RESERVED_KEYS.get(keyId);
    return reservedBy && reservedBy !== currentJobId;
  }, []);

  const getNextValidKey = useCallback((excludeIds: string[] = [], currentJobId?: string) => {
    console.log(`🔍 [JOB ${currentJobId?.slice(0,8)}] Buscando key. Excluídas: ${excludeIds.length}, Reservadas: ${RESERVED_KEYS.size}`);
    
    // 1º: Tentar keys validadas e ativas (excluindo problemáticas e reservadas)
    const validKeys = apiKeys.filter(key => 
      key.isActive && 
      key.status === 'valid' &&
      !excludeIds.includes(key.id) &&
      !isKeyReservedByOtherJob(key.id, currentJobId)
    );
    
    if (validKeys.length > 0) {
      const selectedKey = validKeys.reduce((prev, current) => 
        prev.requestCount < current.requestCount ? prev : current
      );
      console.log(`✅ [JOB ${currentJobId?.slice(0,8)}] Key encontrada: "${selectedKey.label}" (${selectedKey.requestCount} usos)`);
      return selectedKey;
    }
    
    // 2º: Fallback para keys desconhecidas (não testadas)
    const unknownKeys = apiKeys.filter(key =>
      key.isActive &&
      key.status === 'unknown' &&
      !excludeIds.includes(key.id) &&
      !isKeyReservedByOtherJob(key.id, currentJobId)
    );
    
    if (unknownKeys.length > 0) {
      console.log(`⚠️ [JOB ${currentJobId?.slice(0,8)}] Usando key não testada: "${unknownKeys[0].label}"`);
      return unknownKeys[0];
    }
    
    // 3º: Tentar keys marcadas como 'invalid' (podem ter sido erro temporário)
    const invalidKeys = apiKeys.filter(key =>
      key.isActive &&
      key.status === 'invalid' &&
      !excludeIds.includes(key.id) &&
      !isKeyReservedByOtherJob(key.id, currentJobId)
    );
    
    if (invalidKeys.length > 0) {
      console.log(`⚠️ [JOB ${currentJobId?.slice(0,8)}] Usando key marcada como invalid: "${invalidKeys[0].label}"`);
      return invalidKeys[0];
    }
    
    // ERRO DETALHADO
    const activeKeys = apiKeys.filter(k => k.isActive).length;
    const availableKeys = apiKeys.filter(k => 
      k.isActive && 
      !excludeIds.includes(k.id) &&
      !isKeyReservedByOtherJob(k.id, currentJobId)
    ).length;
    
    console.error(`❌ [JOB ${currentJobId?.slice(0,8)}] NENHUMA KEY DISPONÍVEL!`);
    console.error(`   - Keys ativas no sistema: ${activeKeys}`);
    console.error(`   - Keys excluídas (falharam): ${excludeIds.length}`);
    console.error(`   - Keys reservadas por outros jobs: ${RESERVED_KEYS.size}`);
    console.error(`   - Keys disponíveis para este job: ${availableKeys}`);
    
    return null;
  }, [apiKeys, isKeyReservedByOtherJob]);

  const markKeyUsed = useCallback((id: string) => {
    const currentKey = apiKeys.find(k => k.id === id);
    updateApiKey(id, {
      requestCount: (currentKey?.requestCount ?? 0) + 1,
      lastUsed: new Date()
    });
  }, [apiKeys, updateApiKey]);

  const markKeyNoCredits = useCallback((id: string) => {
    updateApiKey(id, {
      status: 'no_credits',
      statusMessage: 'Sem créditos disponíveis',
      isActive: false
    });
  }, [updateApiKey]);

  const getActiveApiKeys = useCallback(() => {
    return apiKeys.filter(key => 
      key.isActive && 
      key.status !== 'suspended' &&
      key.status !== 'invalid' &&
      key.status !== 'no_credits'
    );
  }, [apiKeys]);

  return {
    apiKeys,
    activeApiKeys: getActiveApiKeys(),
    addApiKey,
    addMultipleApiKeys,
    removeApiKey,
    deleteApiKey: removeApiKey,
    toggleApiKey,
    updateApiKey,
    getActiveApiKeys,
    getNextValidKey,
    markKeyUsed,
    markKeyNoCredits,
    reserveKeyForJob,
    releaseKeyFromJob,
    isKeyReservedByOtherJob
  };
};
