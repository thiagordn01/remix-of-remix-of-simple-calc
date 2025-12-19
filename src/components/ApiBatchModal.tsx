import React, { useState, useEffect } from 'react';
import { X, Download, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ApiBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKeys: Array<{ name: string; key: string; model: string }>) => void;
}

interface ParsedApiKey {
  name: string;
  key: string;
  model: string;
}

export const ApiBatchModal: React.FC<ApiBatchModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [keysText, setKeysText] = useState('');
  const [detectedKeys, setDetectedKeys] = useState<ParsedApiKey[]>([]);

  const exampleKeys = `# Formato 1: Apenas a chave
AIzaSyTest_Key_1_Example

# Formato 2: Nome | Chave
Minha API Principal | AIzaSyTest_Key_2_Example

# Formato 3: Nome | Chave | Modelo
API Produção | AIzaSyTest_Key_3_Example | gemini-3-flash-preview`;

  useEffect(() => {
    if (isOpen) {
      setKeysText(exampleKeys);
    }
  }, [isOpen]);

  useEffect(() => {
    const lines = keysText.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('#');
    });
    
    const parsed: ParsedApiKey[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Formato 3: Nome | Chave | Modelo
      if (trimmed.includes('|')) {
        const parts = trimmed.split('|').map(p => p.trim());
        
        if (parts.length === 3 && parts[1].startsWith('AIza')) {
          parsed.push({
            name: parts[0] || `API ${index + 1}`,
            key: parts[1],
            model: parts[2] === 'gemini-2.5-pro'
              ? 'gemini-2.5-pro'
              : parts[2] === 'gemini-2.5-flash'
              ? 'gemini-2.5-flash'
              : 'gemini-3-flash-preview'
          });
          return;
        }
        
        // Formato 2: Nome | Chave
        if (parts.length === 2 && parts[1].startsWith('AIza')) {
          parsed.push({
            name: parts[0] || `API ${index + 1}`,
            key: parts[1],
            model: 'gemini-3-flash-preview'
          });
          return;
        }
      }
      
      // Formato 1: Apenas chave
      if (trimmed.startsWith('AIza')) {
        parsed.push({
          name: `API ${parsed.length + 1}`,
          key: trimmed,
          model: 'gemini-3-flash-preview'
        });
      }
    });
    
    setDetectedKeys(parsed);
  }, [keysText]);

  const downloadTemplate = () => {
    const template = `# Formato 1: Apenas a chave (nome será gerado automaticamente)
AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Formato 2: Nome | Chave
Minha API Principal | AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Formato 3: Nome | Chave | Modelo (gemini-3-flash-preview, gemini-2.5-flash ou gemini-2.5-pro)
API Produção | AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX | gemini-3-flash-preview
API Desenvolvimento | AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX | gemini-2.5-flash`;

    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-apis-gemini.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (detectedKeys.length === 0) {
      alert('Por favor, insira pelo menos uma chave de API válida');
      return;
    }

    onSave(detectedKeys);
    setKeysText('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Importação em Massa de APIs</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Baixar Template
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Formatos aceitos */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Formatos aceitos:</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="font-mono bg-muted p-2 rounded">
                      <div className="text-xs text-muted-foreground mb-1">Formato 1: Apenas a chave</div>
                      AIzaSyXXXXXXXXXXXXXXXXXXXX
                    </div>
                    <div className="font-mono bg-muted p-2 rounded">
                      <div className="text-xs text-muted-foreground mb-1">Formato 2: Nome | Chave</div>
                      Minha API Principal | AIzaSyXXXXXXXXXXXXXXXXXXXX
                    </div>
                    <div className="font-mono bg-muted p-2 rounded">
                      <div className="text-xs text-muted-foreground mb-1">Formato 3: Nome | Chave | Modelo</div>
                      API Produção | AIzaSyXXXXXXXXXXXXXXXXXXXX | gemini-3-flash-preview
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Textarea para entrada */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Cole suas chaves de API (uma por linha)
            </label>
            <Textarea
              value={keysText}
              onChange={(e) => setKeysText(e.target.value)}
              className="h-48 font-mono text-sm resize-none"
              placeholder="Cole suas chaves de API aqui, uma por linha..."
            />
          </div>

          {/* Preview das chaves detectadas */}
          {detectedKeys.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">
                    {detectedKeys.length} chave{detectedKeys.length > 1 ? 's' : ''} detectada{detectedKeys.length > 1 ? 's' : ''}:
                  </h3>
                  <Badge variant="secondary">{detectedKeys.length}</Badge>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detectedKeys.map((apiKey, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm bg-muted p-2 rounded">
                      <span className="text-muted-foreground w-6">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{apiKey.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {apiKey.key.substring(0, 20)}...
                        </div>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0">
                        {apiKey.model === 'gemini-2.5-pro'
                          ? 'Pro'
                          : apiKey.model === 'gemini-3-flash-preview'
                          ? '3 Flash'
                          : 'Flash'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dicas */}
          <div className="text-sm text-muted-foreground space-y-1 bg-muted p-3 rounded">
            <p>💡 <strong>Dica:</strong> Cole suas chaves do Google AI Studio, uma por linha.</p>
            <p>🔒 <strong>Segurança:</strong> As chaves são armazenadas localmente no seu navegador.</p>
            <p>📝 <strong>Linhas iniciadas com #</strong> serão ignoradas (comentários).</p>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={detectedKeys.length === 0}
            >
              Adicionar {detectedKeys.length} API{detectedKeys.length > 1 ? 's' : ''}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
