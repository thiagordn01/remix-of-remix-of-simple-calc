import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { GeminiApiKey } from '@/types/scripts';
import { enhancedGeminiService } from '@/services/enhancedGeminiApi';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface ApiStatusMonitorProps {
  apiKeys: GeminiApiKey[];
  onRefresh?: () => void;
}

interface ApiStatus {
  id: string;
  name: string;
  model: string;
  isAvailable: boolean;
  isInCooldown: boolean;
  isExhausted: boolean;
  blockReason?: string;
  cooldownSecondsRemaining?: number;
  exhaustedUntil?: Date;
  rpm?: number;
  rpd?: number;
}

export const ApiStatusMonitor = ({ apiKeys, onRefresh }: ApiStatusMonitorProps) => {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const updateStatuses = () => {
    const statuses: ApiStatus[] = apiKeys.map(key => {
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
        rpd: usageStats.rpd
      };
    });

    setApiStatuses(statuses);
  };

  useEffect(() => {
    updateStatuses();

    // Atualizar a cada 1 segundo
    const interval = setInterval(updateStatuses, 1000);

    return () => clearInterval(interval);
  }, [apiKeys]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    updateStatuses();
    onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleResetAll = () => {
    if (window.confirm('⚠️ Resetar TODAS as APIs?\n\nIsso irá:\n• Zerar todos os contadores RPM e RPD\n• Remover todas as APIs da quarentena\n• Limpar todos os bloqueios e cooldowns\n• Liberar todas as APIs para uso imediato\n\nDeseja continuar?')) {
      const resetCount = enhancedGeminiService.resetAllApis();
      updateStatuses();
      onRefresh?.();

      toast({
        title: "✅ Reset Global Concluído!",
        description: `${resetCount} API${resetCount !== 1 ? 's' : ''} resetada${resetCount !== 1 ? 's' : ''} com sucesso. Todas as APIs estão agora disponíveis.`
      });
    }
  };

  const getStatusBadge = (status: ApiStatus) => {
    if (!status.isAvailable) {
      if (status.blockReason) {
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Bloqueada
        </Badge>;
      }
      if (status.isExhausted) {
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Exaurida (RPD)
        </Badge>;
      }
    }

    if (status.isInCooldown) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Cooldown (RPM)
      </Badge>;
    }

    return <Badge variant="default" className="flex items-center gap-1 bg-success">
      <CheckCircle className="w-3 h-3" />
      Disponível
    </Badge>;
  };

  const getStatusDetails = (status: ApiStatus) => {
    const limits = enhancedGeminiService.getModelLimitsPublic(status.model);
    const rpmMax = limits.rpm;
    const rpdMax = limits.rpd;

    const rpmDisplay = `${status.rpm ?? 0}/${rpmMax}`;
    const rpdDisplay = `${status.rpd ?? 0}/${rpdMax}`;

    if (status.blockReason) {
      return (
        <div className="mt-1">
          <p className="text-xs text-destructive">{status.blockReason}</p>
          <p className="text-xs text-muted-foreground">RPM: {rpmDisplay} | RPD: {rpdDisplay}</p>
        </div>
      );
    }

    if (status.isExhausted) {
      return (
        <div className="mt-1">
          <p className="text-xs text-destructive">
            Limite diário atingido ({rpdMax} req/dia). Reset: 00:00 UTC
          </p>
          <p className="text-xs text-muted-foreground">RPM: {rpmDisplay} | RPD: {rpdDisplay}</p>
        </div>
      );
    }

    if (status.isInCooldown) {
      return (
        <div className="mt-1">
          <p className="text-xs text-muted-foreground">
            Limite de {rpmMax} req/min atingido. Aguarde ~30s
          </p>
          <p className="text-xs text-muted-foreground">RPM: {rpmDisplay} | RPD: {rpdDisplay}</p>
        </div>
      );
    }

    return (
      <div className="mt-1">
        <p className="text-xs text-muted-foreground">Pronta para uso</p>
        <p className="text-xs text-muted-foreground">RPM: {rpmDisplay} | RPD: {rpdDisplay}</p>
      </div>
    );
  };

  const resetApi = (apiId: string) => {
    enhancedGeminiService.resetApiStats(apiId);
    updateStatuses();
  };

  const availableCount = apiStatuses.filter(s => s.isAvailable).length;
  const totalCount = apiStatuses.length;
  const availabilityPercent = totalCount > 0 ? (availableCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>Status das APIs</span>
              <Badge variant="outline">{availableCount}/{totalCount} disponíveis</Badge>
            </CardTitle>
            <CardDescription>
              Monitoramento em tempo real de todas as chaves Gemini
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetAll}
                    className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-950/30"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">Resetar TODAS as APIs</p>
                  <p className="text-xs text-muted-foreground">Zera contadores, remove da quarentena</p>
                  <p className="text-xs text-muted-foreground">e libera todas as APIs para uso</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Disponibilidade Geral</span>
            <span className="font-medium">{Math.round(availabilityPercent)}%</span>
          </div>
          <Progress value={availabilityPercent} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {apiStatuses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma API configurada
          </p>
        ) : (
          apiStatuses.map(status => (
            <div
              key={status.id}
              className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{status.name}</p>
                  {getStatusBadge(status)}
                </div>
                <p className="text-xs text-muted-foreground">{status.model}</p>
                {getStatusDetails(status)}
              </div>

              {(status.blockReason || status.isExhausted || status.isInCooldown) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetApi(status.id)}
                        className="ml-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Resetar contadores desta API</p>
                      <p className="text-xs text-muted-foreground">
                        (Não remove bloqueios permanentes)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
