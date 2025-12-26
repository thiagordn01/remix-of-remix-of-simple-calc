import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Key, TestTube, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Loader2, Upload, Download } from 'lucide-react';
import { GeminiApiKey } from '@/types/scripts';
import { useGeminiKeys } from '@/hooks/useGeminiKeys';
import { GeminiApiService } from '@/services/geminiApi';
import { useToast } from '@/hooks/use-toast';
import { ApiBatchModal } from '@/components/ApiBatchModal';
import { ApiStatusMonitor } from '@/components/ApiStatusMonitor';

export const GeminiApiManager = () => {
  const { apiKeys, addApiKey, addMultipleApiKeys, removeApiKey, toggleApiKey, updateApiKey, exportApiKeys, importApiKeys } = useGeminiKeys();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [validatingKeys, setValidatingKeys] = useState<Set<string>>(new Set());
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    key: '',
    model: 'gemini-3-flash-preview' as GeminiApiKey['model']
  });

  const resetForm = () => {
    setFormData({
      name: '',
      key: '',
      model: 'gemini-3-flash-preview'
    });
  };

  const handleAddApiKey = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para a API key.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.key.trim()) {
      toast({
        title: "API Key obrigatória",
        description: "Por favor, insira a API key do Gemini.",
        variant: "destructive"
      });
      return;
    }

    try {
      addApiKey(formData);
      
      setIsDialogOpen(false);
      resetForm();
      
      toast({
        title: "API Key adicionada!",
        description: `A API key "${formData.name}" foi adicionada com sucesso.`
      });
    } catch (error) {
      toast({
        title: "Erro ao adicionar API key",
        description: "Ocorreu um erro ao adicionar a API key. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleValidateApiKey = async (apiKey: GeminiApiKey) => {
    setValidatingKeys(prev => new Set([...prev, apiKey.id]));
    
    try {
      const status = await GeminiApiService.validateApiKey(apiKey);
      
      updateApiKey(apiKey.id, {
        status: status.status,
        statusMessage: status.message,
        lastValidated: status.lastChecked
      });

      if (status.isValid) {
        toast({
          title: "API Key válida",
          description: status.message,
        });
      } else if (status.status === 'unknown') {
        toast({
          title: "Status incerto",
          description: status.message,
          variant: "default"
        });
      } else {
        toast({
          title: "API Key com problemas",
          description: status.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      updateApiKey(apiKey.id, {
        status: 'invalid',
        statusMessage: 'Erro na validação',
        lastValidated: new Date()
      });
      
      toast({
        title: "Erro na validação",
        description: "Não foi possível validar a API key.",
        variant: "destructive"
      });
    } finally {
      setValidatingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(apiKey.id);
        return newSet;
      });
    }
  };

  const handleDeleteApiKey = (apiKey: GeminiApiKey) => {
    if (window.confirm(`Tem certeza que deseja excluir a API key "${apiKey.name}"?`)) {
      try {
        removeApiKey(apiKey.id);
        toast({
          title: "API Key excluída",
          description: `A API key "${apiKey.name}" foi excluída com sucesso.`
        });
      } catch (error) {
        toast({
          title: "Erro ao excluir API key",
          description: "Ocorreu um erro ao excluir a API key. Tente novamente.",
          variant: "destructive"
        });
      }
    }
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

  const handleBatchSave = (apiKeys: Array<{ name: string; key: string; model: string }>) => {
    try {
      const addedKeys = addMultipleApiKeys(
        apiKeys.map(apiKeyData => ({
          name: apiKeyData.name,
          key: apiKeyData.key,
          model: apiKeyData.model as GeminiApiKey['model']
        }))
      );

      toast({
        title: "APIs adicionadas!",
        description: `${addedKeys.length} API${addedKeys.length > 1 ? 's' : ''} adicionada${addedKeys.length > 1 ? 's' : ''} com sucesso.`
      });

      setIsBatchModalOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao adicionar APIs",
        description: "Não foi possível adicionar as API keys.",
        variant: "destructive"
      });
    }
  };

  const handleExportApiKeys = () => {
    const result = exportApiKeys();
    if (result.success) {
      toast({
        title: "Backup realizado!",
        description: `${result.count} API(s) funcional(is) exportada(s) com sucesso.`
      });
    } else {
      toast({
        title: "Erro ao exportar",
        description: result.error || "Não foi possível exportar as APIs.",
        variant: "destructive"
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Perguntar se quer substituir ou mesclar
    const shouldReplace = apiKeys.length > 0 && window.confirm(
      `Você já tem ${apiKeys.length} API(s) cadastrada(s). Deseja SUBSTITUIR todas?\n\n` +
      `Clique em "OK" para SUBSTITUIR (apagar as atuais)\n` +
      `Clique em "Cancelar" para MESCLAR (manter as atuais e adicionar as novas)`
    );

    const mode = shouldReplace ? 'replace' : 'merge';
    const result = await importApiKeys(file, mode);

    if (result.success) {
      let description = `${result.imported} API(s) importada(s) com sucesso.`;
      if (result.skipped && result.skipped > 0) {
        description += ` ${result.skipped} duplicada(s) ignorada(s).`;
      }
      description += mode === 'replace' ? ' (substituição)' : ' (mesclagem)';

      toast({
        title: "Importação concluída!",
        description
      });
    } else {
      toast({
        title: "Erro ao importar",
        description: result.error || "Não foi possível importar as APIs.",
        variant: "destructive"
      });
    }

    // Limpar o input para permitir reimportar o mesmo arquivo
    event.target.value = '';
  };

  const getStatusIcon = (status?: GeminiApiKey['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'invalid':
      case 'suspended':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'rate_limited':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'checking':
        return <Loader2 className="w-4 h-4 text-golden-600 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status?: GeminiApiKey['status']) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800">Válida</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Inválida</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspensa</Badge>;
      case 'rate_limited':
        return <Badge className="bg-yellow-100 text-yellow-800">Rate Limit</Badge>;
      case 'checking':
        return <Badge className="bg-golden-100 text-golden-800 dark:bg-golden-900/30 dark:text-golden-300">Testando...</Badge>;
      default:
        return <Badge variant="outline">Não testada</Badge>;
    }
  };

  const activeApiKeys = apiKeys.filter(key => 
    key.isActive && 
    key.status !== 'suspended' &&
    key.status !== 'invalid'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-golden-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">APIs Gemini</h2>
          <p className="text-muted-foreground text-base mt-1">
            Gerencie suas chaves de API do Google Gemini para geração de roteiros
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Input oculto para importar arquivo */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Botão Importar Backup */}
          <Button
            onClick={handleImportClick}
            variant="outline"
            className="flex items-center gap-2 border-golden-300 dark:border-golden-700 text-golden-700 dark:text-golden-300 hover:bg-golden-50 dark:hover:bg-golden-900/30"
          >
            <Upload className="w-4 h-4" />
            Importar
          </Button>

          {/* Botão Exportar/Backup */}
          <Button
            onClick={handleExportApiKeys}
            variant="outline"
            disabled={activeApiKeys.length === 0}
            className="flex items-center gap-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Backup
          </Button>

          {/* Botão Importação em Massa */}
          <Button
            variant="outline"
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-2 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
          >
            <Plus className="w-4 h-4" />
            Em Massa
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-golden-500 to-amber-500 hover:from-golden-600 hover:to-amber-600 text-white shadow-golden">
                <Plus className="w-4 h-4" />
                Adicionar API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova API Key</DialogTitle>
              <DialogDescription>
                Adicione uma nova chave de API do Google Gemini para gerar roteiros. Obtenha sua chave em https://aistudio.google.com/app/apikey
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da API Key *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Minha API Principal"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="key">API Key *</Label>
                <Input
                  id="key"
                  type="password"
                  placeholder="AIza..."
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Obtenha sua API key em: https://aistudio.google.com/app/apikey
                </p>
              </div>

              <div>
                <Label htmlFor="model">Modelo</Label>
                <Select value={formData.model} onValueChange={(value) => setFormData(prev => ({ ...prev, model: value as GeminiApiKey['model'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash Preview (Recomendado)</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddApiKey}>
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Monitor de Status em Tempo Real */}
      {apiKeys.length > 0 && (
        <ApiStatusMonitor apiKeys={apiKeys} />
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-golden hover:shadow-golden-lg transition-all duration-300 border-golden-200 dark:border-golden-800">
          <CardContent className="p-6 bg-gradient-to-br from-golden-50 to-amber-50/50 dark:from-golden-950/30 dark:to-amber-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total de APIs</p>
                <p className="text-4xl font-bold mt-2 bg-gradient-to-r from-golden-600 to-amber-600 dark:from-golden-400 dark:to-amber-400 bg-clip-text text-transparent">{apiKeys.length}</p>
              </div>
              <Key className="w-12 h-12 text-golden-500/40 dark:text-golden-400/40" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-large)] transition-all duration-300">
          <CardContent className="p-6 bg-gradient-to-br from-success/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">APIs Ativas</p>
                <p className="text-4xl font-bold mt-2 text-success">{activeApiKeys.length}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-success/40" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-large)] transition-all duration-300">
          <CardContent className="p-6 bg-gradient-to-br from-info/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total de Requests</p>
                <p className="text-4xl font-bold mt-2 text-info">{apiKeys.reduce((sum, key) => sum + key.requestCount, 0)}</p>
              </div>
              <TestTube className="w-12 h-12 text-info/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de API Keys */}
      <div className="space-y-4">
        {apiKeys.map((apiKey) => (
          <Card key={apiKey.id} className="shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-large)] transition-all duration-300">
            <CardContent className="p-6 bg-gradient-to-r from-card to-card/50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{apiKey.name}</h3>
                    {getStatusBadge(apiKey.status)}
                    <Badge variant="outline">{apiKey.model}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(apiKey.status)}
                      <span>{apiKey.statusMessage || 'Não testada'}</span>
                    </div>
                    <span>Requests: {apiKey.requestCount}</span>
                    {apiKey.lastUsed && (
                      <span>Último uso: {apiKey.lastUsed.toLocaleString('pt-BR')}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">API Key:</span>
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
                    >
                      {showKeys.has(apiKey.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleApiKey(apiKey.id)}
                    className={apiKey.isActive
                      ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/50'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                    }
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
                    Testar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteApiKey(apiKey)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {apiKeys.length === 0 && (
        <Card className="shadow-golden-lg border-golden-200 dark:border-golden-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-golden-400/30 via-amber-400/30 to-yellow-400/30 dark:from-golden-600/20 dark:via-amber-600/20 dark:to-yellow-600/20 flex items-center justify-center mb-6 shadow-golden animate-pulse">
              <Key className="w-12 h-12 text-golden-600 dark:text-golden-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-golden-700 to-amber-700 dark:from-golden-300 dark:to-amber-300 bg-clip-text text-transparent">
              Nenhuma API key configurada
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Adicione pelo menos uma API key do Google Gemini para começar a gerar roteiros
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-golden-500 to-amber-500 hover:from-golden-600 hover:to-amber-600 text-white shadow-golden">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeira API Key
            </Button>
          </CardContent>
        </Card>
      )}

      <ApiBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSave={handleBatchSave}
      />
    </div>
  );
};
