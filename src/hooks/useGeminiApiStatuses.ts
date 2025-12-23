import { useCallback, useEffect, useState } from 'react';
import { GeminiApiKey } from '@/types/scripts';
import { enhancedGeminiService } from '@/services/enhancedGeminiApi';

export interface ApiStatus {
  id: string;
  name: string;
  model: string;
  isAvailable: boolean;
  isInCooldown: boolean;
  isExhausted: boolean;
  blockReason?: string;
  rpm?: number;
  rpd?: number;
}

export const useGeminiApiStatuses = (apiKeys: GeminiApiKey[]) => {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([]);

  const updateStatuses = useCallback(() => {
    if (!apiKeys || apiKeys.length === 0) {
      setApiStatuses([]);
      return;
    }

    const statuses: ApiStatus[] = apiKeys.map((key) => {
      const isAvailable = enhancedGeminiService.isKeyAvailable(key.id);
      const isInCooldown = enhancedGeminiService.isKeyInCooldown(key.id);
      const isExhausted = enhancedGeminiService.isKeyExhausted(key.id);
      const blockReason = enhancedGeminiService.getKeyBlockReason(key.id);
      const usageStats = enhancedGeminiService.getApiUsageStats(key.id);

      return {
        id: key.id,
        name: key.name,
        model: key.model,
        isAvailable,
        isInCooldown,
        isExhausted,
        blockReason,
        rpm: usageStats.rpm,
        rpd: usageStats.rpd,
      };
    });

    setApiStatuses(statuses);
  }, [apiKeys]);

  useEffect(() => {
    updateStatuses();

    const interval = setInterval(updateStatuses, 1000);

    return () => clearInterval(interval);
  }, [updateStatuses]);

  return { apiStatuses, refreshStatuses: updateStatuses };
};
