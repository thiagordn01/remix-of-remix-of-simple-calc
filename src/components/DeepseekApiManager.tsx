import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TestTube, CheckCircle, XCircle, Loader2, Sparkles, Brain, LogIn, User, LogOut, RefreshCw, List } from 'lucide-react';
import { puterDeepseekService, PuterAIModel, PuterDeepseekService, PuterModelInfo } from '@/services/puterDeepseekService';
import { useToast } from '@/hooks/use-toast';

export const DeepseekApiManager = () => {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<PuterAIModel>(puterDeepseekService.getModel());
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [apiModels, setApiModels] = useState<PuterModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const available = await puterDeepseekService.waitForPuter(5000);
      setIsAvailable(available);

      if (available) {
        const authenticated = await puterDeepseekService.checkAuth();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          const user = puterDeepseekService.getCurrentUser();
          setCurrentUsername(user?.username || null);
        }

        // Sincronizar o modelo selecionado com o service (aplica migracao)
        const currentModel = puterDeepseekService.getModel();
        setSelectedModel(currentModel);
      }
    };
    checkStatus();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const success = await puterDeepseekService.signIn();
      setIsAuthenticated(success);

      if (success) {
        const user = puterDeepseekService.getCurrentUser();
        setCurrentUsername(user?.username || null);
        toast({
          title: "Login realizado!",
          description: `Bem-vindo, ${user?.username || 'usuario'}! Voce ja pode usar a IA gratuitamente.`,
        });
      } else {
        toast({
          title: "Falha no login",
          description: "Tente novamente ou verifique sua conexao.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const success = await puterDeepseekService.signOut();
      if (success) {
        setIsAuthenticated(false);
        setCurrentUsername(null);
        setTestResult(null);
        setTestMessage('');
        toast({
          title: "Logout realizado",
          description: "Voce foi desconectado do Puter.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro no logout",
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSwitchUser = async () => {
    setIsLoggingIn(true);
    try {
      const success = await puterDeepseekService.switchUser();
      setIsAuthenticated(success);

      if (success) {
        const user = puterDeepseekService.getCurrentUser();
        setCurrentUsername(user?.username || null);
        setTestResult(null);
        setTestMessage('');
        toast({
          title: "Usuario trocado!",
          description: `Agora conectado como: ${user?.username || 'usuario'}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao trocar usuario",
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoadApiModels = async () => {
    setIsLoadingModels(true);
    try {
      const models = await puterDeepseekService.fetchAvailableModels();
      setApiModels(models);
      setShowAllModels(true);
      toast({
        title: "Modelos carregados!",
        description: `${models.length} modelos disponiveis na API`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar modelos",
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleModelChange = (model: PuterAIModel) => {
    setSelectedModel(model);
    puterDeepseekService.setModel(model);
    setTestResult(null);
    setTestMessage('');

    const modelInfo = availableModels.find(m => m.id === model);
    toast({
      title: "Modelo alterado",
      description: `Modelo alterado para ${modelInfo?.name || model}`,
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestMessage('');
    
    let lastProgressMessage = '';

    try {
      const success = await puterDeepseekService.testConnection((msg) => {
        lastProgressMessage = msg;
        setTestMessage(msg);
      });

      if (success) {
        setTestResult('success');
        setTestMessage('Conexao funcionando!');
        setIsAuthenticated(true);
        const user = puterDeepseekService.getCurrentUser();
        setCurrentUsername(user?.username || null);
        toast({
          title: "Teste bem-sucedido!",
          description: `IA funcionando! Modelo: ${puterDeepseekService.getModelDisplayName(selectedModel)}`,
        });
      } else {
        setTestResult('error');
        // Usa a mensagem real do progresso, não genérica
        const errorMsg = lastProgressMessage || 'Falha no teste - verifique o modelo';
        setTestMessage(errorMsg);
        toast({
          title: "Falha no teste",
          description: errorMsg,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setTestResult('error');
      setTestMessage(error.message || 'Erro desconhecido');
      toast({
        title: "Erro no teste",
        description: error.message || 'Erro ao testar conexao',
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const staticModels = PuterDeepseekService.getAvailableModels();

  // Converter modelos da API para o formato esperado
  const apiModelsFormatted = apiModels.map(m => ({
    id: m.id,
    name: m.name || m.id,
    description: `${m.provider || 'Puter'} - ${m.context_window ? `${(m.context_window / 1000).toFixed(0)}k context` : 'API model'}`,
    vendor: m.provider || 'Outros'
  }));

  // Usar modelos da API se disponíveis, senão usar estáticos
  const availableModels = showAllModels && apiModelsFormatted.length > 0 ? apiModelsFormatted : staticModels;

  // Agrupar modelos por vendor
  const groupedModels = availableModels.reduce((acc, model) => {
    if (!acc[model.vendor]) {
      acc[model.vendor] = [];
    }
    acc[model.vendor].push(model);
    return acc;
  }, {} as Record<string, typeof staticModels>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">IA Gratuita (Puter)</h2>
          <p className="text-muted-foreground text-base mt-1">
            Use DeepSeek V3, GPT-4.1, Claude 4.5, Gemini 2.5 e mais - 100% gratuito via Puter.js
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card className="shadow-lg border-blue-200 dark:border-blue-800 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 p-4">
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="w-6 h-6" />
            <div>
              <h3 className="font-bold text-lg">API Gratuita e Ilimitada</h3>
              <p className="text-blue-100 text-sm">Powered by Puter.js - Sem limites de uso!</p>
            </div>
          </div>
        </div>
        <CardContent className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50/50 dark:from-blue-950/30 dark:to-cyan-950/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className={`p-2 rounded-full ${isAvailable ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                {isAvailable ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Puter.js</p>
                <p className="font-semibold">{isAvailable ? 'Carregado' : 'Carregando...'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className={`p-2 rounded-full ${isAuthenticated ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                {isAuthenticated ? (
                  <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <LogIn className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usuario</p>
                <p className={`font-semibold ${isAuthenticated ? 'text-green-600' : 'text-orange-600'}`}>
                  {isAuthenticated ? (currentUsername || 'Conectado') : 'Fazer login'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo</p>
                <p className="font-semibold text-green-600">100% Gratuito</p>
              </div>
            </div>
          </div>

          {/* Botoes de Login/Logout/Trocar Usuario */}
          {isAvailable && (
            <div className="mt-4">
              {!isAuthenticated ? (
                <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-orange-800 dark:text-orange-200">Login Necessario</h4>
                      <p className="text-sm text-orange-600 dark:text-orange-400">
                        Faca login no Puter para usar a IA gratuitamente
                      </p>
                    </div>
                    <Button
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                    >
                      {isLoggingIn ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4 mr-2" />
                      )}
                      Fazer Login
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <span className="font-semibold text-green-800 dark:text-green-200">
                          Logado como: {currentUsername || 'usuario'}
                        </span>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Pronto para usar! Selecione um modelo abaixo.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSwitchUser}
                        disabled={isLoggingIn || isLoggingOut}
                        variant="outline"
                        size="sm"
                        className="border-green-300 hover:bg-green-100"
                      >
                        {isLoggingIn ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Trocar Conta
                      </Button>
                      <Button
                        onClick={handleLogout}
                        disabled={isLoggingOut || isLoggingIn}
                        variant="outline"
                        size="sm"
                        className="border-red-300 hover:bg-red-100 text-red-600"
                      >
                        {isLoggingOut ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4 mr-2" />
                        )}
                        Sair
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selecao de Modelo */}
      <Card className="shadow-md hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label htmlFor="model" className="text-lg font-semibold">Selecione o Modelo de IA</Label>
                  <p className="text-sm text-muted-foreground">
                    {showAllModels ? `${apiModels.length} modelos da API` : 'Modelos recomendados'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {showAllModels && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllModels(false)}
                    >
                      Mostrar Recomendados
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadApiModels}
                    disabled={isLoadingModels || !isAvailable}
                  >
                    {isLoadingModels ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <List className="w-4 h-4 mr-2" />
                    )}
                    {showAllModels ? 'Atualizar' : 'Carregar Todos'}
                  </Button>
                </div>
              </div>
              <Select value={selectedModel} onValueChange={(value) => handleModelChange(value as PuterAIModel)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {Object.entries(groupedModels).map(([vendor, models]) => (
                    <div key={vendor}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted sticky top-0">
                        {vendor} ({models.length})
                      </div>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.name}</span>
                              {'isNew' in model && model.isNew && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-[10px] px-1 py-0">
                                  NOVO
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modelo atual */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Modelo Ativo
              </Badge>
              <span className="font-mono text-sm">{selectedModel}</span>
              <span className="text-xs text-muted-foreground">
                ({puterDeepseekService.getModelDisplayName(selectedModel)})
              </span>
            </div>

            {/* Botao de teste */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || !isAvailable}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4 mr-2" />
                )}
                Testar Conexao
              </Button>

              {testResult && (
                <div className={`flex items-center gap-2 ${testResult === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span className="text-sm">{testMessage}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info sobre modelos */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Modelos Disponiveis (Gratuitos)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <h4 className="font-medium text-blue-600 dark:text-blue-400">DeepSeek V3</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Modelo principal para uso geral. Excelente para roteiros.
              </p>
            </div>
            <div className="p-4 border rounded-lg border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
              <h4 className="font-medium text-purple-600 dark:text-purple-400">DeepSeek R1</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Modo thinking - raciocinio profundo para tarefas complexas.
              </p>
            </div>
            <div className="p-4 border rounded-lg border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <h4 className="font-medium text-green-600 dark:text-green-400">GPT-4.1 / GPT-4.1 Mini</h4>
              <p className="text-sm text-muted-foreground mt-1">
                OpenAI - modelos mais recentes e poderosos.
              </p>
            </div>
            <div className="p-4 border rounded-lg border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
              <h4 className="font-medium text-orange-600 dark:text-orange-400">Claude Opus/Sonnet 4.5</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Anthropic - criativo e equilibrado.
              </p>
            </div>
            <div className="p-4 border rounded-lg border-cyan-200 bg-cyan-50/50 dark:bg-cyan-950/20">
              <h4 className="font-medium text-cyan-600 dark:text-cyan-400">Gemini 2.0 Flash</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Google - rapido para respostas curtas.
              </p>
            </div>
            <div className="p-4 border rounded-lg border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <h4 className="font-medium text-red-600 dark:text-red-400">Grok 2</h4>
              <p className="text-sm text-muted-foreground mt-1">
                xAI - modelo alternativo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isAvailable && (
        <Card className="shadow-lg border-yellow-200 dark:border-yellow-800">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-12 h-12 text-yellow-600 animate-spin mb-4" />
            <h3 className="text-lg font-semibold mb-2">Carregando Puter.js...</h3>
            <p className="text-muted-foreground text-center">
              Aguarde enquanto o servico e inicializado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
