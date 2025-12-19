import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  GEMINI_VOICES,
  buildGeminiApiUrl,
  GEMINI_TTS_MODEL,
  GeminiVoice,
} from "@/utils/geminiTtsConfig";
import { useGeminiTtsQueue } from "@/hooks/useGeminiTtsQueue";
import { useGeminiTtsKeys } from "@/hooks/useGeminiTtsKeys";
import { PlayCircle, Loader2, Download, Trash2, Key, CheckCircle, XCircle, AlertCircle, Plus, Upload, TestTube, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { convertPcmToWav } from "@/utils/pcmToWav";
import { ApiBatchModal } from "@/components/ApiBatchModal";
import { GeminiTtsApiKey } from "@/types/geminiTts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { countWords } from "@/utils/geminiTtsChunks";

export function GeminiTtsTab() {
  const { toast } = useToast();
  const { apiKeys, addApiKey, addMultipleApiKeys, removeApiKey, toggleApiKey, updateApiKey, getNextValidKey } = useGeminiTtsKeys();
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("Kore");
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [validatingKeys, setValidatingKeys] = useState<Set<string>>(new Set());
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ label: '', key: '' });
  const [isApisOpen, setIsApisOpen] = useState(false);

  const { jobs, addJob, clearCompletedJobs, removeJob } = useGeminiTtsQueue(3);

  const handleAddApiKey = () => {
    if (!formData.label.trim() || !formData.key.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e a API key.",
        variant: "destructive",
      });
      return;
    }

    addApiKey({ ...formData, status: 'unknown' as const });
    toast({
      title: "API Key adicionada!",
      description: `A API key "${formData.label}" foi adicionada com sucesso.`
    });
    
    setIsAddModalOpen(false);
    setFormData({ label: '', key: '' });
  };

  const handleValidateApiKey = async (apiKey: GeminiTtsApiKey) => {
    setValidatingKeys(prev => new Set([...prev, apiKey.id]));
    
    try {
      const testUrl = buildGeminiApiUrl(apiKey.key);
      const requestBody = {
        model: GEMINI_TTS_MODEL,
        contents: [{ parts: [{ text: "teste" }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Zephyr" },
            },
          },
        },
      };

      const response = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 429 || response.status === 402) {
        updateApiKey(apiKey.id, {
          status: 'no_credits',
          statusMessage: 'Sem créditos disponíveis',
          lastValidated: new Date()
        });
        toast({
          title: "Sem créditos",
          description: "Esta API key não possui créditos disponíveis.",
          variant: "destructive"
        });
        return;
      }

      if (response.status === 403) {
        updateApiKey(apiKey.id, {
          status: 'suspended',
          statusMessage: 'API suspensa',
          lastValidated: new Date()
        });
        toast({
          title: "API suspensa",
          description: "Esta API key foi suspensa.",
          variant: "destructive"
        });
        return;
      }

      if (!response.ok) {
        // Erros específicos de key inválida
        if (response.status === 400 || response.status === 401) {
          updateApiKey(apiKey.id, {
            status: 'invalid',
            statusMessage: 'API key inválida ou expirada',
            lastValidated: new Date()
          });
          toast({
            title: "API Key inválida",
            description: "Verifique se a chave está correta.",
            variant: "destructive"
          });
          return;
        }
        
        // Erros temporários de servidor (NÃO marcar como invalid)
        if (response.status >= 500) {
          updateApiKey(apiKey.id, {
            status: 'unknown',
            statusMessage: 'Erro temporário do servidor',
            lastValidated: new Date()
          });
          toast({
            title: "Erro temporário",
            description: "Servidor indisponível. A API key não foi marcada como inválida.",
            variant: "destructive"
          });
          return;
        }
        
        throw new Error(`Status ${response.status}`);
      }

      // ✅ Se status 200, key é válida (independente do conteúdo da resposta)
      updateApiKey(apiKey.id, {
        status: 'valid',
        statusMessage: 'API key autenticada com sucesso',
        lastValidated: new Date(),
        isActive: true
      });
      toast({
        title: "API Key válida! ✅",
        description: "Chave autenticada e funcionando."
      });
    } catch (error: any) {
      // Distinguir erro de rede vs outros erros
      if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        // Erro de rede - NÃO marcar como invalid
        updateApiKey(apiKey.id, {
          status: 'unknown',
          statusMessage: 'Erro de conexão (timeout ou CORS)',
          lastValidated: new Date()
        });
        toast({
          title: "Erro de rede",
          description: "Não foi possível conectar. A API key não foi marcada como inválida.",
          variant: "destructive"
        });
      } else {
        // Outros erros - marcar como invalid
        updateApiKey(apiKey.id, {
          status: 'invalid',
          statusMessage: 'Erro na validação',
          lastValidated: new Date()
        });
        toast({
          title: "Falha no teste",
          description: "Não foi possível validar a API key.",
          variant: "destructive"
        });
      }
    } finally {
      setValidatingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(apiKey.id);
        return newSet;
      });
    }
  };

  const handleBatchSave = (apiKeys: Array<{ name: string; key: string; model: string }>) => {
    const addedKeys = addMultipleApiKeys(
      apiKeys.map(k => ({ label: k.name, key: k.key, status: 'unknown' as const }))
    );
    
    toast({
      title: "APIs adicionadas!",
      description: `${addedKeys.length} API${addedKeys.length > 1 ? 's' : ''} adicionada${addedKeys.length > 1 ? 's' : ''} com sucesso. Clique em "Testar Todas" para validar.`
    });
    
    setIsBatchModalOpen(false);
  };

  const handleTestAllKeys = async () => {
    for (const apiKey of apiKeys) {
      await handleValidateApiKey(apiKey);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    toast({
      title: "Validação concluída",
      description: `${apiKeys.filter(k => k.status === 'valid').length} de ${apiKeys.length} keys estão válidas.`
    });
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const handlePlayDemo = async (voiceName: string) => {
    const apiKeyObj = getNextValidKey();
    if (!apiKeyObj) {
      toast({
        title: "Configure uma API Key",
        description: "Adicione e valide pelo menos uma API key antes de testar vozes.",
        variant: "destructive",
      });
      return;
    }

    setDemoLoading(voiceName);
    try {
      const apiUrl = buildGeminiApiUrl(apiKeyObj.key);

      const requestBody = {
        model: GEMINI_TTS_MODEL,
        contents: [
          {
            parts: [{ text: "Esta é uma demonstração de voz do Google Gemini." }],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erro ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error("A API retornou uma resposta vazia.");
      }
      const result = JSON.parse(responseText);
      const candidate = result.candidates?.[0];

      if (!candidate || !candidate.content) {
        console.error("Resposta da API inválida ou bloqueada:", JSON.stringify(result, null, 2));
        const finishReason = candidate?.finishReason || "Desconhecido";
        throw new Error(`A API não retornou conteúdo. Motivo: ${finishReason}.`);
      }

      const audioPart = candidate.content.parts?.[0];
      if (!audioPart?.inlineData?.data) {
        throw new Error("Nenhum áudio recebido da API.");
      }

      const wavBytes = convertPcmToWav(audioPart.inlineData.data, audioPart.inlineData.mimeType);
      if (wavBytes.length === 0) {
        throw new Error("Falha ao converter o áudio da demonstração.");
      }

      const audioBlob = new Blob([wavBytes] as BlobPart[], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (error: any) {
      toast({
        title: "Erro na demonstração",
        description: error.message || "Não foi possível reproduzir o áudio.",
        variant: "destructive",
      });
    } finally {
      setDemoLoading(null);
    }
  };

  const handleGenerate = () => {
    if (!text.trim()) {
      toast({
        title: "Texto vazio",
        description: "Digite um texto para gerar o áudio.",
        variant: "destructive",
      });
      return;
    }

    const activeKeys = apiKeys.filter(k => 
      k.isActive && 
      k.status !== 'invalid' && 
      k.status !== 'no_credits' &&
      k.status !== 'suspended'
    );

    if (activeKeys.length === 0) {
      toast({
        title: "Nenhuma API key válida",
        description: "Adicione e valide pelo menos uma API key antes de gerar áudio.",
        variant: "destructive",
      });
      return;
    }

    addJob({
      text,
      voiceName: selectedVoice,
      filename: filename || undefined,
    });

    toast({
      title: "Tarefa adicionada",
      description: "Seu áudio está sendo processado.",
    });
  };

  // Organizar vozes por IDIOMA (ao invés de gênero) para melhor UX
  const portugueseVoices = GEMINI_VOICES.filter((v) => v.languages.includes("pt-BR"));
  const englishVoices = GEMINI_VOICES.filter((v) => v.languages.includes("en-US"));
  const spanishVoices = GEMINI_VOICES.filter((v) => v.languages.includes("es-US"));
  const frenchVoices = GEMINI_VOICES.filter((v) => v.languages.includes("fr-FR"));
  const germanVoices = GEMINI_VOICES.filter((v) => v.languages.includes("de-DE"));

  const getStatusIcon = (status?: GeminiTtsApiKey['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'invalid':
      case 'suspended':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'no_credits':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status?: GeminiTtsApiKey['status']) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800">Válida</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Inválida</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspensa</Badge>;
      case 'no_credits':
        return <Badge className="bg-yellow-100 text-yellow-800">Sem créditos</Badge>;
      default:
        return <Badge variant="outline">Não testada</Badge>;
    }
  };

  const activeApiKeys = apiKeys.filter(k => 
    k.isActive && 
    k.status !== 'suspended' &&
    k.status !== 'invalid' &&
    k.status !== 'no_credits'
  );

  return (
    <div className="space-y-6">
      {/* Gerenciamento de APIs */}
      <section className="rounded-xl border bg-card/80 backdrop-blur-sm p-6 shadow-[var(--shadow-medium)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Gerenciamento de APIs Gemini TTS</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione múltiplas API keys para geração paralela de áudio
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsBatchModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Importação em Massa
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)} variant="hero" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Adicionar API Key
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 bg-gradient-to-br from-brand/5 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total de APIs</p>
                  <p className="text-3xl font-bold mt-1 text-brand">{apiKeys.length}</p>
                </div>
                <Key className="w-10 h-10 text-brand/40" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 bg-gradient-to-br from-green-500/5 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">APIs Ativas</p>
                  <p className="text-3xl font-bold mt-1 text-green-600">{activeApiKeys.length}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-600/40" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 bg-gradient-to-br from-blue-500/5 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total de Requests</p>
                  <p className="text-3xl font-bold mt-1 text-blue-600">
                    {apiKeys.reduce((sum, key) => sum + key.requestCount, 0)}
                  </p>
                </div>
                <TestTube className="w-10 h-10 text-blue-600/40" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de APIs - Collapsible */}
        {apiKeys.length > 0 ? (
          <Collapsible open={isApisOpen} onOpenChange={setIsApisOpen}>
            <div className="flex items-center justify-between mb-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-0 hover:bg-transparent">
                  {isApisOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  <h3 className="text-sm font-semibold">
                    APIs Configuradas ({apiKeys.length})
                  </h3>
                </Button>
              </CollapsibleTrigger>
              {apiKeys.length > 0 && (
                <div className="flex gap-2">
                  <Button onClick={handleTestAllKeys} variant="outline" size="sm">
                    <TestTube className="w-4 h-4 mr-2" />
                    {apiKeys.some(k => k.status === 'unknown') ? 'Testar Todas' : 'Revalidar Todas'}
                  </Button>
                  {apiKeys.some(k => k.status === 'invalid') && (
                    <Button 
                      onClick={() => {
                        apiKeys
                          .filter(k => k.status === 'invalid')
                          .forEach(k => updateApiKey(k.id, { 
                            status: 'unknown', 
                            statusMessage: 'Status resetado para reteste' 
                          }));
                        toast({
                          title: "Status resetado",
                          description: "Keys inválidas foram marcadas como 'não testadas' para reteste."
                        });
                      }} 
                      variant="outline" 
                      size="sm"
                    >
                      Resetar Status Inválidos
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            <CollapsibleContent>
              <ScrollArea className="h-96 pr-4">
                <div className="space-y-3">
                  {apiKeys.map((apiKey) => (
                    <Card key={apiKey.id}>
                      <CardContent className="p-4 bg-gradient-to-r from-card to-card/50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{apiKey.label}</h4>
                              {getStatusBadge(apiKey.status)}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                              <div className="flex items-center gap-1">
                                {getStatusIcon(apiKey.status)}
                                <span>{apiKey.statusMessage || 'Não testada'}</span>
                              </div>
                              <span>Requests: {apiKey.requestCount}</span>
                              {apiKey.lastUsed && (
                                <span>Último uso: {apiKey.lastUsed.toLocaleString('pt-BR')}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {showKeys.has(apiKey.id) 
                                  ? apiKey.key 
                                  : `${apiKey.key.slice(0, 8)}...${apiKey.key.slice(-4)}`
                                }
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleKeyVisibility(apiKey.id)}
                                className="h-6 w-6 p-0"
                              >
                                {showKeys.has(apiKey.id) ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleApiKey(apiKey.id)}
                              className={apiKey.isActive ? 'bg-green-50 border-green-200' : ''}
                            >
                              {apiKey.isActive ? 'Ativa' : 'Inativa'}
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleValidateApiKey(apiKey)}
                              disabled={validatingKeys.has(apiKey.id)}
                            >
                              {validatingKeys.has(apiKey.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <TestTube className="w-4 h-4" />
                              )}
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Tem certeza que deseja excluir "${apiKey.label}"?`)) {
                                  removeApiKey(apiKey.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-brand/20 to-brand-glow/20 flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-brand" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma API key configurada</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md text-sm">
                Adicione pelo menos uma API key do Google Gemini para começar a gerar áudio
              </p>
              <Button onClick={() => setIsAddModalOpen(true)} variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeira API Key
              </Button>
            </CardContent>
          </Card>
        )}
        
        <p className="text-xs text-muted-foreground mt-4">
          💡 Obtenha suas API keys em:{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            https://aistudio.google.com/apikey
          </a>
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-card/80 backdrop-blur-sm p-6 shadow-[var(--shadow-medium)]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Texto</label>
              <Textarea
                className="min-h-[200px]"
                placeholder="Digite ou cole o texto que deseja converter em áudio..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nome do arquivo (opcional)</label>
              <Input
                placeholder="ex: meu_audio_gemini"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Voz selecionada</label>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="portuguese">🇧🇷 PT</TabsTrigger>
                  <TabsTrigger value="english">🇺🇸 EN</TabsTrigger>
                  <TabsTrigger value="spanish">🇪🇸 ES</TabsTrigger>
                  <TabsTrigger value="french">🇫🇷 FR</TabsTrigger>
                  <TabsTrigger value="german">🇩🇪 DE</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {GEMINI_VOICES.map((voice) => (
                      <VoiceCard
                        key={voice.id}
                        voice={voice}
                        selected={selectedVoice === voice.id}
                        onSelect={() => setSelectedVoice(voice.id)}
                        onPlayDemo={() => handlePlayDemo(voice.id)}
                        isLoading={demoLoading === voice.id}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="portuguese" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {portugueseVoices.map((voice) => (
                      <VoiceCard
                        key={voice.id}
                        voice={voice}
                        selected={selectedVoice === voice.id}
                        onSelect={() => setSelectedVoice(voice.id)}
                        onPlayDemo={() => handlePlayDemo(voice.id)}
                        isLoading={demoLoading === voice.id}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="english" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {englishVoices.map((voice) => (
                      <VoiceCard
                        key={voice.id}
                        voice={voice}
                        selected={selectedVoice === voice.id}
                        onSelect={() => setSelectedVoice(voice.id)}
                        onPlayDemo={() => handlePlayDemo(voice.id)}
                        isLoading={demoLoading === voice.id}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="spanish" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {spanishVoices.map((voice) => (
                      <VoiceCard
                        key={voice.id}
                        voice={voice}
                        selected={selectedVoice === voice.id}
                        onSelect={() => setSelectedVoice(voice.id)}
                        onPlayDemo={() => handlePlayDemo(voice.id)}
                        isLoading={demoLoading === voice.id}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="french" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {frenchVoices.map((voice) => (
                      <VoiceCard
                        key={voice.id}
                        voice={voice}
                        selected={selectedVoice === voice.id}
                        onSelect={() => setSelectedVoice(voice.id)}
                        onPlayDemo={() => handlePlayDemo(voice.id)}
                        isLoading={demoLoading === voice.id}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="german" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {germanVoices.map((voice) => (
                      <VoiceCard
                        key={voice.id}
                        voice={voice}
                        selected={selectedVoice === voice.id}
                        onSelect={() => setSelectedVoice(voice.id)}
                        onPlayDemo={() => handlePlayDemo(voice.id)}
                        isLoading={demoLoading === voice.id}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="rounded-lg border bg-background/50 p-3 text-xs text-muted-foreground">
              <p>
                <strong>Modelo:</strong> {GEMINI_TTS_MODEL}
              </p>
              <p className="mt-1">✅ Suporte multilíngue nativo</p>
              <p>✅ Qualidade TTS avançada</p>
            </div>

            <Button onClick={handleGenerate} className="w-full" variant="hero" size="lg">
              Gerar Áudio com Gemini
            </Button>
          </div>
        </section>

        <section className="rounded-xl border bg-card/80 backdrop-blur-sm p-6 shadow-[var(--shadow-medium)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Tarefas Gemini</h2>
            {jobs.length > 0 && (
              <Button onClick={clearCompletedJobs} variant="ghost" size="sm">
                Limpar concluídas
              </Button>
            )}
          </div>
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa na fila.</p>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-lg border bg-gradient-to-br from-card to-card/50 backdrop-blur-sm p-4 shadow-sm animate-fade-in"
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium truncate flex-1">{job.filename}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{Math.round(job.progress)}%</span>
                      <Button variant="ghost" size="sm" onClick={() => removeJob(job.id)} className="h-6 w-6 p-0">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={job.progress} className="mb-3" />

                  <div className="space-y-3">
                    {/* ✅ NOVO: Informações detalhadas de progresso */}
                    {job.progressDetails && job.status === 'processing' && (
                      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                        {/* Fase atual */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-xs font-medium">
                              {job.progressDetails.phase === 'generating' && '📝 Gerando chunks'}
                              {job.progressDetails.phase === 'validating' && '🔍 Validando'}
                              {job.progressDetails.phase === 'concatenating' && '🔗 Concatenando'}
                              {job.progressDetails.phase === 'encoding' && '🔄 Encoding WAV'}
                              {job.progressDetails.phase === 'converting' && '🎵 Convertendo MP3'}
                            </span>
                          </div>
                          {job.progressDetails.estimatedTimeRemaining && (
                            <span className="text-xs text-muted-foreground">
                              ~{job.progressDetails.estimatedTimeRemaining}s restantes
                            </span>
                          )}
                        </div>

                        {/* Progresso da chunk atual */}
                        {job.progressDetails.phase === 'generating' && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Chunk {(job.currentChunk || 0) + 1} de {job.chunks.length}
                                {job.progressDetails.currentChunkAttempt && job.progressDetails.currentChunkAttempt > 1 && (
                                  <span className="text-yellow-600 ml-1">
                                    (Tentativa {job.progressDetails.currentChunkAttempt}/5)
                                  </span>
                                )}
                              </span>
                              {job.progressDetails.currentApiKeyLabel && (
                                <span className="text-muted-foreground">
                                  API: {job.progressDetails.currentApiKeyLabel}
                                </span>
                              )}
                            </div>

                            {/* Barra visual de progresso por chunk */}
                            <div className="flex gap-0.5">
                              {job.chunks.map((chunk, idx) => {
                                const isProcessed = job.audioChunks[idx] !== undefined;
                                const isCurrent = idx === job.currentChunk;
                                const isFailed = job.failedChunks.includes(idx);

                                return (
                                  <div
                                    key={idx}
                                    className={`h-1.5 flex-1 rounded-sm transition-all ${
                                      isFailed
                                        ? 'bg-red-500'
                                        : isProcessed
                                        ? 'bg-green-500'
                                        : isCurrent
                                        ? 'bg-blue-500 animate-pulse'
                                        : 'bg-muted'
                                    }`}
                                    title={`Chunk ${idx + 1}: ${countWords(chunk)} palavras`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ✅ NOVO: Logs em tempo real - SEMPRE VISÍVEL durante processamento */}
                        {job.progressDetails.logs && job.progressDetails.logs.length > 0 && (
                          <div className="mt-2">
                            <Collapsible defaultOpen={job.status === 'processing'}>
                              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
                                <ChevronDown className="h-3 w-3" />
                                <span className="font-medium">Logs em tempo real ({job.progressDetails.logs.length})</span>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <ScrollArea className="h-40 mt-1 rounded-md border bg-black/5">
                                  <div className="space-y-0.5 p-2 text-xs font-mono">
                                    {[...job.progressDetails.logs].reverse().map((log, idx) => (
                                      <div
                                        key={`${log.timestamp}-${idx}`}
                                        className={`flex items-start gap-2 p-1.5 rounded-sm ${
                                          log.type === 'error' ? 'bg-red-500/10 text-red-700' :
                                          log.type === 'warning' ? 'bg-yellow-500/10 text-yellow-700' :
                                          log.type === 'success' ? 'bg-green-500/10 text-green-700' :
                                          'bg-blue-500/5 text-blue-700'
                                        }`}
                                      >
                                        <span className="text-muted-foreground text-[10px] mt-0.5 shrink-0">
                                          {new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                          })}
                                        </span>
                                        <span className="flex-1 break-words">{log.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Status: {job.status}</span>
                      <span>•</span>
                      <span>Voz: {job.voiceName}</span>
                      {job.chunks && (
                        <>
                          <span>•</span>
                          <span>{job.chunks.length} chunks</span>
                        </>
                      )}
                    </div>
                    
                    {job.status === "done" && job.audioUrl && (
                      <div className="space-y-2">
                        <audio controls src={job.audioUrl} className="w-full" />
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <a href={job.audioUrl} download={`${job.filename}.mp3`}>
                            <Download className="h-4 w-4 mr-2" />
                            Baixar áudio (.mp3)
                          </a>
                        </Button>
                      </div>
                    )}
                    {job.error && (
                      <p className={`text-xs ${job.status === "error" ? "text-destructive" : "text-amber-500"}`}>
                        {job.error}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal Adicionar API */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Adicionar API Key</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setFormData({ label: '', key: '' });
                  }}
                  className="h-6 w-6 p-0"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome da API Key *</label>
                  <Input
                    placeholder="Ex: Minha API Principal"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">API Key *</label>
                  <Input
                    type="password"
                    placeholder="AIza..."
                    value={formData.key}
                    onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setFormData({ label: '', key: '' });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleAddApiKey}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Importação em Massa */}
      <ApiBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSave={handleBatchSave}
      />
    </div>
  );
}

interface VoiceCardProps {
  voice: GeminiVoice;
  selected: boolean;
  onSelect: () => void;
  onPlayDemo: () => void;
  isLoading: boolean;
}

function VoiceCard({ voice, selected, onSelect, onPlayDemo, isLoading }: VoiceCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`rounded-lg border bg-background p-3 cursor-pointer transition-all duration-300 hover:scale-105 hover:border-brand/40 ${
        selected ? "ring-2 ring-brand shadow-[var(--shadow-elegant)] scale-105" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="font-medium text-sm">{voice.name}</p>
          <p className="text-xs text-muted-foreground">{voice.description}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayDemo();
          }}
          disabled={isLoading}
          className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus:outline-none"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${selected ? "bg-brand" : "bg-muted-foreground/40"}`} />
        <span className="text-xs text-muted-foreground capitalize">{voice.category}</span>
      </div>
    </div>
  );
}
