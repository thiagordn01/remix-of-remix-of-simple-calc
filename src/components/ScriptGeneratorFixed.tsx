import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Copy, Download, Bot, Settings, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { ScriptGenerationRequest } from '@/types/scripts';
import { Agent } from '@/types/agents';
import { useAgents } from '@/hooks/useAgents';
import { useGeminiKeys } from '@/hooks/useGeminiKeys';
import { useScriptGenerator } from '@/hooks/useScriptGenerator';
import { useToast } from '@/hooks/use-toast';
import { AgentManager } from './AgentManager';
import { GeminiApiManager } from './GeminiApiManager';

interface ScriptGeneratorFixedProps {
  onScriptGenerated?: (script: string, title: string) => void;
}

export const ScriptGeneratorFixed = ({ onScriptGenerated }: ScriptGeneratorFixedProps) => {
  const { agents, getAgent } = useAgents();
  const { apiKeys, getActiveApiKeys } = useGeminiKeys();
  const { generateScript, isGenerating, progress, result, clearResult } = useScriptGenerator();
  const { toast } = useToast();

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [request, setRequest] = useState<ScriptGenerationRequest>({
    title: '',
    agentId: undefined
  });

  const selectedAgent = selectedAgentId ? getAgent(selectedAgentId) : null;
  const activeApiKeys = getActiveApiKeys();

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgentId(agent.id);
    setRequest(prev => ({
      ...prev,
      agentId: agent.id,
      // Limpar overrides quando selecionar um agente
      channelName: undefined,
      premisePrompt: undefined,
      scriptPrompt: undefined,
      duration: undefined,
      language: undefined,
      location: undefined,
      premiseWordTarget: undefined
    }));
  };

  const handleGenerate = async () => {
    if (!request.title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, insira um título para o vídeo.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedAgent && !request.channelName) {
      toast({
        title: "Agente ou canal obrigatório",
        description: "Selecione um agente ou preencha o nome do canal.",
        variant: "destructive"
      });
      return;
    }

    if (activeApiKeys.length === 0) {
      toast({
        title: "Nenhuma API ativa",
        description: "Configure pelo menos uma API key do Gemini na aba 'APIs'.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await generateScript(request, selectedAgent, apiKeys);
      
      toast({
        title: "Roteiro gerado com sucesso!",
        description: `${result.totalWords} palavras, duração estimada: ${Math.round(result.estimatedDuration)} minutos`
      });
    } catch (error) {
      console.error('Erro na geração:', error);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${type} copiado para a área de transferência.`
    });
  };

  const downloadAsText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToAudio = () => {
    if (result && onScriptGenerated) {
      const fullScript = result.script.join('\n\n');
      onScriptGenerated(fullScript, request.title);
      
      toast({
        title: "Roteiro enviado!",
        description: "O roteiro foi enviado para a aba de geração de áudio."
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">
            <FileText className="w-4 h-4 mr-2" />
            Gerar Roteiro
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Bot className="w-4 h-4 mr-2" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="apis">
            <Settings className="w-4 h-4 mr-2" />
            APIs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Gerador de Roteiros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seleção de Agente */}
              <div>
                <Label htmlFor="agent">Agente (opcional)</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um agente ou configure manualmente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum agente (configuração manual)</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} - {agent.channelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAgent && (
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="font-medium">{selectedAgent.name}</span>
                      <Badge variant="outline">{selectedAgent.language}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Canal: {selectedAgent.channelName}</p>
                      <p>Duração: {selectedAgent.duration} min | Localização: {selectedAgent.location}</p>
                      {selectedAgent.description && <p>Descrição: {selectedAgent.description}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Título do Vídeo */}
              <div>
                <Label htmlFor="title">Título do Vídeo *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Como criar um canal de sucesso no YouTube"
                  value={request.title}
                  onChange={(e) => setRequest(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Configurações Manuais (quando não há agente selecionado) */}
              {!selectedAgent && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-medium">Configuração Manual</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="channelName">Nome do Canal *</Label>
                      <Input
                        id="channelName"
                        placeholder="Ex: Meu Canal Incrível"
                        value={request.channelName || ''}
                        onChange={(e) => setRequest(prev => ({ ...prev, channelName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duração (minutos)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        max="60"
                        placeholder="10"
                        value={request.duration || ''}
                        onChange={(e) => setRequest(prev => ({ ...prev, duration: parseInt(e.target.value) || undefined }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="language">Idioma</Label>
                      <Select value={request.language || ''} onValueChange={(value) => setRequest(prev => ({ ...prev, language: value || undefined }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="pt-BR" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pt-BR">Português (BR)</SelectItem>
                          <SelectItem value="en-US">English (US)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="location">Localização</Label>
                      <Input
                        id="location"
                        placeholder="Brasil"
                        value={request.location || ''}
                        onChange={(e) => setRequest(prev => ({ ...prev, location: e.target.value || undefined }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="premiseWordTarget">Palavras Premissa</Label>
                      <Input
                        id="premiseWordTarget"
                        type="number"
                        min="200"
                        max="2000"
                        placeholder="700"
                        value={request.premiseWordTarget || ''}
                        onChange={(e) => setRequest(prev => ({ ...prev, premiseWordTarget: parseInt(e.target.value) || undefined }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="premisePrompt">Prompt para Premissa</Label>
                    <Textarea
                      id="premisePrompt"
                      rows={4}
                      placeholder="Prompt para gerar a premissa do vídeo..."
                      value={request.premisePrompt || ''}
                      onChange={(e) => setRequest(prev => ({ ...prev, premisePrompt: e.target.value || undefined }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="scriptPrompt">Prompt para Roteiro</Label>
                    <Textarea
                      id="scriptPrompt"
                      rows={4}
                      placeholder="Prompt para gerar o roteiro do vídeo..."
                      value={request.scriptPrompt || ''}
                      onChange={(e) => setRequest(prev => ({ ...prev, scriptPrompt: e.target.value || undefined }))}
                    />
                  </div>
                </div>
              )}

              {/* Status das APIs */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">APIs Gemini:</span>
                  <Badge variant={activeApiKeys.length > 0 ? "default" : "destructive"}>
                    {activeApiKeys.length} ativa{activeApiKeys.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || activeApiKeys.length === 0}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Gerando...' : 'Gerar Roteiro'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {progress && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {progress.stage === 'premise' ? 'Gerando Premissa...' : `Gerando Roteiro (Chunk ${progress.currentChunk}/${progress.totalChunks})`}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(progress.percentage)}%
                    </span>
                  </div>
                  <Progress value={progress.percentage} />
                  <div className="text-xs text-muted-foreground">
                    {progress.completedWords} / {progress.targetWords} palavras geradas
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultado */}
          {result && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Premissa Gerada</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(result.premise, 'Premissa')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                    {result.premise}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Roteiro Completo</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{result.totalWords} palavras</span>
                        <span>~{Math.round(result.estimatedDuration)} minutos</span>
                        {result.agentUsed && <span>Agente: {result.agentUsed}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(result.script.join('\n\n'), 'Roteiro')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsText(
                          `PREMISSA:\n${result.premise}\n\nROTEIRO:\n${result.script.join('\n\n')}`,
                          `roteiro-${request.title.replace(/[^a-zA-Z0-9]/g, '-')}.txt`
                        )}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {onScriptGenerated && (
                        <Button
                          onClick={handleSendToAudio}
                          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Enviar para Áudio
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.script.map((chunk, index) => (
                      <div key={index} className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                        {chunk}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="agents">
          <AgentManager 
            onSelectAgent={handleAgentSelect}
            selectedAgentId={selectedAgentId}
          />
        </TabsContent>

        <TabsContent value="apis">
          <GeminiApiManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
