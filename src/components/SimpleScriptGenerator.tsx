import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Sparkles } from 'lucide-react';

interface SimpleScriptGeneratorProps {
  onScriptGenerated?: (script: string, title: string) => void;
}

export const SimpleScriptGenerator = ({ onScriptGenerated }: SimpleScriptGeneratorProps) => {
  const [title, setTitle] = useState('');
  const [channelName, setChannelName] = useState('');
  const [premisePrompt, setPremisePrompt] = useState('');
  const [scriptPrompt, setScriptPrompt] = useState('');

  const handleGenerate = () => {
    if (!title.trim()) {
      alert('Por favor, insira um título para o vídeo.');
      return;
    }

    if (!channelName.trim()) {
      alert('Por favor, insira o nome do canal.');
      return;
    }

    // Simular geração de roteiro
    const mockScript = `Este é um roteiro de exemplo para o vídeo "${title}" do canal "${channelName}".

Introdução:
Olá pessoal, bem-vindos ao ${channelName}! Hoje vamos falar sobre ${title}.

Desenvolvimento:
[Conteúdo principal do vídeo seria desenvolvido aqui baseado na premissa e nos prompts fornecidos]

Conclusão:
Espero que tenham gostado do conteúdo de hoje! Deixem um like, se inscrevam no canal e ativem o sininho para não perder nenhum vídeo novo!`;

    if (onScriptGenerated) {
      onScriptGenerated(mockScript, title);
    }

    alert(`Roteiro gerado com sucesso para "${title}"!`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerador de Roteiros (Versão Simplificada)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Título do Vídeo *</Label>
            <Input
              id="title"
              placeholder="Ex: Como criar um canal de sucesso no YouTube"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="channelName">Nome do Canal *</Label>
            <Input
              id="channelName"
              placeholder="Ex: Meu Canal Incrível"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="premisePrompt">Prompt para Premissa</Label>
            <Textarea
              id="premisePrompt"
              rows={4}
              placeholder="Prompt para gerar a premissa do vídeo..."
              value={premisePrompt}
              onChange={(e) => setPremisePrompt(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="scriptPrompt">Prompt para Roteiro</Label>
            <Textarea
              id="scriptPrompt"
              rows={4}
              placeholder="Prompt para gerar o roteiro do vídeo..."
              value={scriptPrompt}
              onChange={(e) => setScriptPrompt(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleGenerate}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Gerar Roteiro (Mock)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
