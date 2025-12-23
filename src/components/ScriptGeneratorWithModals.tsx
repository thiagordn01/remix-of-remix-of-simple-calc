import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAgents } from '@/hooks/useAgents';
import { useGeminiKeys } from '@/hooks/useGeminiKeys';
import { useParallelScriptGenerator } from '@/hooks/useParallelScriptGenerator';
import { useScriptHistory } from '@/hooks/useScriptHistory';
import { useAuth } from '@/hooks/useAuth';
import { puterDeepseekService } from '@/services/puterDeepseekService';
import { AIProvider } from '@/types/scripts';
import { ScriptHistoryTab } from './ScriptHistoryTab';
import { AgentManager } from './AgentManager';
import { GeminiApiManager } from './GeminiApiManager';
import { DeepseekApiManager } from './DeepseekApiManager';
import { sanitizeFilename, createSequentialFilename } from '@/utils/fileNaming';
import JSZip from 'jszip';
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Eye,
  Copy,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  MoreVertical,
  PackageOpen
} from 'lucide-react';

interface ScriptGeneratorWithModalsProps {
  onScriptGenerated?: (script: string, title: string) => void;
}

const ScriptGeneratorWithModals: React.FC<ScriptGeneratorWithModalsProps> = ({ onScriptGenerated }) => {
  const { toast } = useToast();
  const { agents } = useAgents();
  const { activeApiKeys } = useGeminiKeys();
  const { isMaster } = useAuth();
  const {
    jobs,
    generateMultipleScripts,
    totalProgress,
    isGenerating,
    activeJobs,
    queuedJobs,
    clearCompletedJobs,
    retryJob
  } = useParallelScriptGenerator(agents);
  const { history, addToHistory, toggleFavorite } = useScriptHistory();
  
  const [titles, setTitles] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('generator');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [isPuterReady, setIsPuterReady] = useState(false);

  // Forçar Gemini para não-admins
  useEffect(() => {
    if (!isMaster && selectedProvider === 'deepseek') {
      setSelectedProvider('gemini');
    }
  }, [isMaster, selectedProvider]);

  // Verificar disponibilidade do Puter.js (apenas para admins)
  useEffect(() => {
    if (!isMaster) {
      setIsPuterReady(false);
      return;
    }
    
    const checkPuter = async () => {
      const available = await puterDeepseekService.waitForPuter(5000);
      if (available) {
        const authenticated = await puterDeepseekService.checkAuth();
        setIsPuterReady(authenticated);
      }
    };
    checkPuter();
  }, [isMaster]);

  // Adicionar jobs completos ao histórico
  useEffect(() => {
    console.log('🔍 [SAVE CHECK] useEffect executado - jobs:', jobs.length, 'history:', history.length);

    const completedJobs = jobs.filter(j =>
      j.status === 'completed' &&
      j.script &&
      !history.some(h => h.id === j.id)
    );

    console.log('🔍 [SAVE CHECK] Jobs completos não salvos:', completedJobs.length);

    if (completedJobs.length > 0) {
      completedJobs.forEach(job => {
        const agent = agents.find(a => a.id === job.agentId);
        console.log('💾 [SAVE CHECK] Tentando salvar job:', job.id, job.title);
        console.log('💾 [SAVE CHECK] - Status:', job.status);
        console.log('💾 [SAVE CHECK] - Tem script:', !!job.script);
        console.log('💾 [SAVE CHECK] - Agente:', agent?.name || 'Desconhecido');
        addToHistory(job, agent?.name || 'Agente Desconhecido', job.premise);
      });
    }
  }, [jobs, history, agents, addToHistory]);

  const handleGenerate = async () => {
    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent || !titles.trim()) return;

    // Verificar disponibilidade do provider
    if (selectedProvider === 'deepseek') {
      if (!puterDeepseekService.isAvailable()) {
        toast({
          title: "Puter.js nao disponivel",
          description: "Aguarde o carregamento ou recarregue a pagina.",
          variant: "destructive"
        });
        return;
      }
      const authenticated = await puterDeepseekService.ensureAuthenticated();
      if (!authenticated) {
        toast({
          title: "Login necessario",
          description: "Faca login no Puter na aba 'APIs' > 'DeepSeek'.",
          variant: "destructive"
        });
        return;
      }
      setIsPuterReady(true);
    } else if (selectedProvider === 'gemini' && activeApiKeys.length === 0) {
      toast({
        title: "Nenhuma API Gemini ativa",
        description: "Configure APIs Gemini na aba 'APIs'.",
        variant: "destructive"
      });
      return;
    }

    const requests = titles.split('\n')
      .filter(t => t.trim())
      .map(title => ({
        title: title.trim(),
        agentId: agent.id,
      }));

    generateMultipleScripts(requests, selectedProvider);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="text-yellow-500" size={16} />;
      case 'generating_premise':
      case 'generating_script':
        return <Loader2 className="text-blue-500 animate-spin" size={16} />;
      case 'completed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'error':
        return <XCircle className="text-red-500" size={16} />;
      default:
        return <AlertCircle className="text-gray-500" size={16} />;
    }
  };

  const getStatusText = (job: any) => {
    switch (job.status) {
      case 'pending':
        return 'Aguardando';
      case 'generating_premise':
        return 'Gerando premissa...';
      case 'generating_script':
        return job.currentChunk && job.totalChunks 
          ? `Gerando roteiro (${job.currentChunk}/${job.totalChunks})`
          : 'Gerando roteiro...';
      case 'completed':
        return 'Concluído';
      case 'error':
        return 'Erro';
      default:
        return 'Desconhecido';
    }
  };

  const handleCopyPremise = async (job: any) => {
    if (!job.premise) return;
    try {
      await navigator.clipboard.writeText(job.premise);
      toast({
        title: "Premissa copiada!",
        description: "A premissa foi copiada para a área de transferência."
      });
    } catch (error) {
      console.error('Erro ao copiar premissa:', error);
    }
  };

  const handleDownloadPremise = (job: any) => {
    if (!job.premise) return;
    const blob = new Blob([job.premise], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFilename(job.title)} - Premissa.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Premissa baixada!",
      description: "A premissa foi salva com sucesso."
    });
  };

  const handleCopyScript = async (job: any) => {
    if (!job.script) return;
    try {
      await navigator.clipboard.writeText(job.script);
      toast({
        title: "Roteiro copiado!",
        description: "O roteiro foi copiado para a área de transferência."
      });
    } catch (error) {
      console.error('Erro ao copiar roteiro:', error);
    }
  };

  const handleDownloadScript = (job: any) => {
    if (!job.script) return;
    const blob = new Blob([job.script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFilename(job.title)} - Roteiro.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Roteiro baixado!",
      description: "O roteiro foi salvo com sucesso."
    });
  };

  const handleDownloadAllScripts = async () => {
    // Filtra apenas os jobs completos que têm script
    let completedJobs = jobs.filter(job => job.status === 'completed' && job.script);

    if (completedJobs.length === 0) {
      toast({
        title: "Nenhum roteiro disponível",
        description: "Não há roteiros prontos para baixar.",
        variant: "destructive"
      });
      return;
    }

    // IMPORTANTE: Ordena por hora de início (do mais antigo para o mais novo)
    // Assim o roteiro mais antigo será o "Roteiro 01"
    completedJobs = completedJobs.sort((a, b) => {
      const timeA = a.startTime.getTime();
      const timeB = b.startTime.getTime();
      return timeA - timeB; // Ordem crescente (mais antigo primeiro)
    });

    try {
      const zip = new JSZip();
      const totalCount = completedJobs.length;

      // Adiciona cada roteiro ao ZIP com numeração sequencial
      completedJobs.forEach((job, index) => {
        const sequentialIndex = index + 1;
        const filename = createSequentialFilename(
          job.title,
          sequentialIndex,
          totalCount,
          'txt'
        );

        // Adiciona o arquivo TXT diretamente na raiz do ZIP (sem pastas)
        zip.file(filename, job.script);
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


  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 h-14 bg-card/50 backdrop-blur-sm p-1">
        <TabsTrigger value="generator" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand data-[state=active]:to-brand-glow data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
          ⚡ Gerar
        </TabsTrigger>
        <TabsTrigger value="agents" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand data-[state=active]:to-brand-glow data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
          🤖 Agentes
        </TabsTrigger>
        <TabsTrigger value="apis" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand data-[state=active]:to-brand-glow data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
          🔑 APIs
        </TabsTrigger>
        <TabsTrigger value="history" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand data-[state=active]:to-brand-glow data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
          📚 Histórico
        </TabsTrigger>
      </TabsList>

      <TabsContent value="generator" className="space-y-6">
        {/* Formulário de Geração */}
        <Card className="shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-large)] transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-brand/10 to-brand-glow/10 border-b">
            <CardTitle className="flex items-center space-x-3">
              <span className="text-3xl">🎬</span>
              <span className="text-2xl">Gerador de Roteiros</span>
            </CardTitle>
            <CardDescription className="text-base">
              Gere múltiplos roteiros simultaneamente com diferentes agentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Agente
              </label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um agente" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Títulos (um por linha)
              </label>
              <Textarea
                value={titles}
                onChange={(e) => setTitles(e.target.value)}
                placeholder="Digite os títulos dos roteiros, um por linha..."
                rows={6}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Seletor de Provider */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">IA:</span>
                  <Button
                    variant={selectedProvider === 'gemini' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedProvider('gemini')}
                    className={selectedProvider === 'gemini' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                  >
                    Gemini
                  </Button>
                  {/* DeepSeek apenas para admins */}
                  {isMaster && (
                    <Button
                      variant={selectedProvider === 'deepseek' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedProvider('deepseek')}
                      className={selectedProvider === 'deepseek' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                    >
                      DeepSeek
                    </Button>
                  )}
                </div>

                {selectedProvider === 'gemini' && activeApiKeys.length > 0 && (
                  <Badge variant="outline">
                    {activeApiKeys.length} API{activeApiKeys.length !== 1 ? 's' : ''} Gemini
                  </Badge>
                )}

                {/* Badge Puter apenas para admins */}
                {isMaster && selectedProvider === 'deepseek' && (
                  <Badge variant={isPuterReady ? 'default' : 'secondary'} className={isPuterReady ? 'bg-green-500' : ''}>
                    {isPuterReady ? '✓ Puter Conectado' : 'Faca login na aba APIs'}
                  </Badge>
                )}
              </div>

              <div className="flex space-x-2">
                {jobs.filter(job => job.status === 'completed' && job.script).length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAllScripts}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-700"
                  >
                    <PackageOpen size={16} className="mr-1" />
                    Baixar Todos ({jobs.filter(job => job.status === 'completed' && job.script).length})
                  </Button>
                )}

                {jobs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCompletedJobs}
                  >
                    <Trash2 size={16} />
                    Limpar
                  </Button>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={!selectedAgentId || !titles.trim() || isGenerating}
                  variant="hero"
                  className="min-w-32"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2" size={16} />
                      Gerar Roteiros
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Geral */}
        {jobs.length > 0 && (
          <Card className="shadow-[var(--shadow-medium)] border-brand/20">
            <CardHeader className="bg-gradient-to-r from-brand/5 to-transparent">
              <CardTitle className="flex items-center justify-between text-xl">
                <span className="flex items-center gap-2">
                  📊 <span>Status da Geração</span>
                </span>
                <div className="flex items-center space-x-4 text-sm">
                  <span>Ativos: {activeJobs}</span>
                  <span>Fila: {queuedJobs}</span>
                  <span>Total: {jobs.length}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso Geral</span>
                  <span>{totalProgress}%</span>
                </div>
                <Progress value={totalProgress} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Jobs */}
        {jobs.length > 0 && (
          <Card className="shadow-[var(--shadow-medium)]">
            <CardHeader className="bg-gradient-to-r from-brand/5 to-transparent">
              <CardTitle className="text-xl">📋 Jobs de Geração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {jobs.map((job) => (
                  <div key={job.id} className="border border-brand/20 rounded-lg p-4 space-y-3 bg-gradient-to-br from-card to-card/50 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(job.status)}
                        <h4 className="font-medium">{job.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getStatusText(job)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {job.status === 'completed' && job.script && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyScript(job)}
                            title="Copiar Roteiro"
                          >
                            <Copy size={16} />
                          </Button>
                        )}
                        
                        {job.status === 'completed' && job.script && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => handleCopyPremise(job)}>
                                <Copy size={14} className="mr-2" />
                                Copiar Premissa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadPremise(job)}>
                                <Download size={14} className="mr-2" />
                                Baixar Premissa
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem onClick={() => handleDownloadScript(job)}>
                                <Download size={14} className="mr-2" />
                                Baixar Roteiro
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        
                        {job.status === 'error' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryJob(job.id)}
                            title="Tentar novamente"
                          >
                            <RotateCcw size={14} />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                          title="Ver logs"
                        >
                          <Eye size={14} />
                        </Button>
                      </div>
                    </div>

                    {/* Barra de Progresso Individual */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>
                          {job.currentStage === 'premise' ? 'Gerando premissa' : 
                           job.currentStage === 'script' ? 'Gerando roteiro' : 'Aguardando'}
                        </span>
                        <span>{job.progress}%</span>
                      </div>
                      <Progress value={job.progress} className="h-2" />
                    </div>

                    {/* Informações Adicionais */}
                    {(job.status === 'completed' || job.status === 'error') && (
                      <div className="text-xs text-gray-500 space-y-1">
                        {job.wordCount && (
                          <p>📊 {job.wordCount} palavras • ~{Math.ceil(job.wordCount / 150)} min</p>
                        )}
                        {job.error && (
                          <p className="text-red-500">❌ {job.error}</p>
                        )}
                        {job.status === 'error' && job.usedApiIds && job.usedApiIds.length > 0 && (
                          (() => {
                            const lastApiId = job.usedApiIds[job.usedApiIds.length - 1];
                            const apiInfo = activeApiKeys.find((api) => api.id === lastApiId);
                            if (!apiInfo) return null;
                            return (
                              <p>
                                🔑 Última API usada: <span className="font-semibold">{apiInfo.name}</span>{' '}
                                <span className="text-muted-foreground">({apiInfo.model})</span>
                              </p>
                            );
                          })()
                        )}
                        {job.endTime && (
                          <p>
                            ⏱️ Concluído em {Math.round((job.endTime.getTime() - job.startTime.getTime()) / 1000)}s
                          </p>
                        )}
                      </div>
                    )}


                    {/* Logs Expandidos */}
                    {selectedJobId === job.id && job.logs && job.logs.length > 0 && (
                      <div className="mt-3 border-t pt-3">
                        <h5 className="text-sm font-medium mb-2">Logs de Geração:</h5>
                        <ScrollArea className="h-32 w-full border rounded p-2">
                          <div className="space-y-1">
                            {job.logs.map((log, index) => (
                              <p key={index} className="text-xs font-mono text-gray-600">
                                {log}
                              </p>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="agents">
        <AgentManager 
          onSelectAgent={(agent) => setSelectedAgentId(agent.id)}
          selectedAgentId={selectedAgentId}
        />
      </TabsContent>

      <TabsContent value="apis">
        <Tabs defaultValue="gemini" className="w-full">
          <TabsList className={`grid w-full ${isMaster ? 'grid-cols-2' : 'grid-cols-1'} mb-4`}>
            <TabsTrigger value="gemini" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white">
              Gemini
            </TabsTrigger>
            {/* Aba DeepSeek apenas para admins */}
            {isMaster && (
              <TabsTrigger value="deepseek" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
                DeepSeek
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="gemini">
            <GeminiApiManager />
          </TabsContent>
          {/* Conteúdo DeepSeek apenas para admins */}
          {isMaster && (
            <TabsContent value="deepseek">
              <DeepseekApiManager />
            </TabsContent>
          )}
        </Tabs>
      </TabsContent>

      <TabsContent value="history">
        <ScriptHistoryTab />
      </TabsContent>
    </Tabs>
  );
};

export default ScriptGeneratorWithModals;
