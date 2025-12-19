import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Loader2, Key, TestTube, Search, Users, User } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useElevenLabsQueue } from "@/hooks/useElevenLabsQueue";
import { 
  ELEVENLABS_VOICES, 
  ELEVENLABS_MODELS, 
  getElevenLabsApiKey, 
  setElevenLabsApiKey,
  ELEVENLABS_API_URL 
} from "@/utils/elevenLabsConfig";
import { splitTextForElevenLabs } from "@/utils/elevenLabsChunks";

export const ElevenLabsTab = () => {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [modelId, setModelId] = useState(ELEVENLABS_MODELS[0].id);
  const [voiceId, setVoiceId] = useState(ELEVENLABS_MODELS[0].compatibleVoices?.[0] || ELEVENLABS_VOICES[0].id);
  const [stability, setStability] = useState([0.75]);
  const [similarityBoost, setSimilarityBoost] = useState([0.75]);
  const [apiKey, setApiKey] = useState(getElevenLabsApiKey() || "");
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { jobs, addJob } = useElevenLabsQueue(3);
  
  const chunks = useMemo(() => splitTextForElevenLabs(text), [text]);
  
  // Filtrar vozes por modelo, categoria e busca
  const compatibleVoices = useMemo(() => {
    const model = ELEVENLABS_MODELS.find(m => m.id === modelId);
    const compatibleVoiceIds = model?.compatibleVoices || [];
    
    return ELEVENLABS_VOICES.filter(voice => 
      compatibleVoiceIds.includes(voice.id) &&
      (voice.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       voice.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [modelId, searchTerm]);

  const femaleVoices = useMemo(() => 
    compatibleVoices.filter(voice => voice.category === "female"), 
    [compatibleVoices]
  );
  
  const maleVoices = useMemo(() => 
    compatibleVoices.filter(voice => voice.category === "male"), 
    [compatibleVoices]
  );

  const selectedModel = useMemo(() => 
    ELEVENLABS_MODELS.find(model => model.id === modelId) || ELEVENLABS_MODELS[0], 
    [modelId]
  );

  const selectedVoice = useMemo(() => 
    ELEVENLABS_VOICES.find(voice => voice.id === voiceId) || ELEVENLABS_VOICES[0], 
    [voiceId]
  );

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key inválida",
        description: "Digite uma API key válida do ElevenLabs.",
        variant: "destructive"
      });
      return;
    }
    
    setElevenLabsApiKey(apiKey);
    toast({
      title: "API Key salva",
      description: "API key do ElevenLabs foi salva com sucesso.",
    });
  };

  const testApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key obrigatória",
        description: "Digite sua API key do ElevenLabs primeiro.",
        variant: "destructive"
      });
      return;
    }

    setTestingApiKey(true);
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      toast({
        title: "API Key válida!",
        description: `Conectado com sucesso. ${data.voices?.length || 0} vozes disponíveis.`,
      });
      
      // Salvar automaticamente se o teste passou
      setElevenLabsApiKey(apiKey);
      
    } catch (error: any) {
      toast({
        title: "Falha no teste",
        description: error.message || "Verifique sua API key.",
        variant: "destructive"
      });
    } finally {
      setTestingApiKey(false);
    }
  };

  const playDemo = async (selectedVoiceId: string) => {
    const currentApiKey = getElevenLabsApiKey();
    if (!currentApiKey) {
      toast({
        title: "API Key necessária",
        description: "Configure sua API key primeiro.",
        variant: "destructive"
      });
      return;
    }

    setDemoLoading(selectedVoiceId);
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/${selectedVoiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': currentApiKey,
        },
        body: JSON.stringify({
          text: "Esta é uma demonstração da voz ElevenLabs.",
          model_id: modelId,
          voice_settings: {
            stability: stability[0],
            similarity_boost: similarityBoost[0],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const blobUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: "audio/mpeg" }));
      const audio = new Audio(blobUrl);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(blobUrl);
      
    } catch (error: any) {
      toast({
        title: "Erro na demonstração",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setDemoLoading(null);
    }
  };

  const generate = () => {
    if (!text.trim()) {
      toast({
        title: "Texto vazio",
        description: "Digite um texto para gerar o áudio.",
        variant: "destructive"
      });
      return;
    }

    if (!getElevenLabsApiKey()) {
      toast({
        title: "API Key necessária",
        description: "Configure sua API key do ElevenLabs primeiro.",
        variant: "destructive"
      });
      return;
    }

    addJob({
      text,
      voiceId,
      modelId,
      stability: stability[0],
      similarityBoost: similarityBoost[0],
      filename: fileName || undefined,
    });

    toast({
      title: "Tarefa adicionada à fila",
      description: `${chunks.length} chunks serão processados.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* API Key Configuration */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Configuração ElevenLabs</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">API Key ElevenLabs</label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Button onClick={saveApiKey} variant="secondary">
                Salvar
              </Button>
              <Button 
                onClick={testApiKey} 
                variant="outline"
                disabled={testingApiKey}
              >
                {testingApiKey ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Testar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Panel */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Texto</label>
              <Textarea 
                className="min-h-[200px]" 
                placeholder="Cole aqui seu texto..." 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nome do arquivo</label>
              <Input 
                placeholder="ex: meu_audio_elevenlabs" 
                value={fileName} 
                onChange={(e) => setFileName(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Modelo</label>
              <Select 
                value={modelId} 
                onValueChange={(newModelId) => {
                  setModelId(newModelId);
                  // Verificar se a voz atual é compatível com o novo modelo
                  const newModel = ELEVENLABS_MODELS.find(m => m.id === newModelId);
                  if (newModel && !newModel.compatibleVoices?.includes(voiceId)) {
                    // Selecionar a primeira voz compatível
                    const firstCompatibleVoice = newModel.compatibleVoices?.[0];
                    if (firstCompatibleVoice) {
                      setVoiceId(firstCompatibleVoice);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[300px] max-w-[400px] max-h-[400px]">
                  {ELEVENLABS_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="p-2">
                      {model.name} - {model.latency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Informações do modelo selecionado */}
              <div className="mt-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold">{selectedModel.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{selectedModel.description}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {selectedModel.latency}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Especificações:</div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {selectedModel.languages} idiomas
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {selectedModel.characterLimit / 1000}k chars
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {selectedModel.compatibleVoices?.length || 0} vozes
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Recursos:</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedModel.features?.join(' • ')}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Casos de uso:</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedModel.useCases?.join(' • ')}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium">
                  Vozes ({compatibleVoices.length}) - {selectedModel.name}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar voz..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-40"
                  />
                </div>
              </div>

              <Tabs defaultValue="female" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="female" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Femininas ({femaleVoices.length})
                  </TabsTrigger>
                  <TabsTrigger value="male" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Masculinas ({maleVoices.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="female" className="mt-4">
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                    {femaleVoices.map((voice) => (
                      <div
                        key={`female-${voice.id}`}
                        role="button"
                        onClick={() => setVoiceId(voice.id)}
                        className={`rounded-lg border bg-background p-3 shadow-sm transition hover:shadow-md cursor-pointer ${
                          voiceId === voice.id ? "ring-2 ring-primary" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{voice.name}</span>
                              <Badge 
                                variant={voice.language === "multilingual" ? "default" : "secondary"} 
                                className="text-xs"
                              >
                                {voice.description}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${
                              voiceId === voice.id ? "bg-primary" : "bg-muted-foreground/40"
                            }`} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playDemo(voice.id);
                              }}
                              disabled={!!demoLoading && demoLoading !== voice.id}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              {demoLoading === voice.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <PlayCircle className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="male" className="mt-4">
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                    {maleVoices.map((voice) => (
                      <div
                        key={`male-${voice.id}`}
                        role="button"
                        onClick={() => setVoiceId(voice.id)}
                        className={`rounded-lg border bg-background p-3 shadow-sm transition hover:shadow-md cursor-pointer ${
                          voiceId === voice.id ? "ring-2 ring-primary" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{voice.name}</span>
                              <Badge 
                                variant={voice.language === "multilingual" ? "default" : "secondary"} 
                                className="text-xs"
                              >
                                {voice.description}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${
                              voiceId === voice.id ? "bg-primary" : "bg-muted-foreground/40"
                            }`} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playDemo(voice.id);
                              }}
                              disabled={!!demoLoading && demoLoading !== voice.id}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              {demoLoading === voice.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <PlayCircle className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Voz selecionada */}
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium mb-1">Voz Selecionada: {selectedVoice.name}</div>
                <div className="text-xs text-muted-foreground">{selectedVoice.description}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Estabilidade: {stability[0].toFixed(2)}
                </label>
                <Slider
                  value={stability}
                  onValueChange={setStability}
                  max={1}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Similaridade: {similarityBoost[0].toFixed(2)}
                </label>
                <Slider
                  value={similarityBoost}
                  onValueChange={setSimilarityBoost}
                  max={1}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Chunks estimados: {chunks.length || 0}
              </p>
              <Button onClick={generate} className="bg-brand hover:bg-brand/90">
                Gerar Áudio
              </Button>
            </div>
          </div>
        </div>

        {/* Jobs Panel */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Tarefas ElevenLabs</h3>
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa na fila.</p>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="rounded-md border bg-background p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{job.filename || "Áudio ElevenLabs"}</span>
                    <span className="text-muted-foreground">{Math.round(job.progress)}%</span>
                  </div>
                  <Progress value={job.progress} />
                  <div className="mt-2 flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground">Status: {job.status}</span>
                    {job.status === "done" && job.finalUrl && (
                      <div className="flex flex-col gap-2">
                        <audio controls src={job.finalUrl} className="w-full" />
                        <a
                          href={job.finalUrl}
                          download={`${job.filename || `elevenlabs_${job.id}`}.mp3`}
                          className="inline-flex text-sm text-brand underline-offset-4 hover:underline"
                        >
                          Baixar arquivo MP3
                        </a>
                      </div>
                    )}
                    {job.status === "error" && job.error && (
                      <span className="text-xs text-destructive">{job.error}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};