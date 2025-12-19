import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScriptGeneratorWithModals from "@/components/ScriptGeneratorWithModals";
import { ElevenLabsTab } from "@/components/ElevenLabsTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Volume2, Sparkles } from "lucide-react";

const TestComplete = () => {
  const [activeTab, setActiveTab] = useState("scripts");
  const [scriptText, setScriptText] = useState("");
  const [fileName, setFileName] = useState("");

  const handleScriptGenerated = (script: string, title: string) => {
    setScriptText(script);
    setFileName(title);
    setActiveTab("openai");
    
    // Simular preenchimento automático
    setTimeout(() => {
      const textArea = document.querySelector('textarea[placeholder*="roteiro"]') as HTMLTextAreaElement;
      const fileInput = document.querySelector('input[placeholder*="nome"]') as HTMLInputElement;
      
      if (textArea) {
        textArea.value = script;
        textArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      if (fileInput) {
        fileInput.value = title;
        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/15 via-background to-background">
      <header className="container py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Sistema Completo - Teste</h1>
            <p className="text-muted-foreground mt-2">
              Teste completo do sistema de roteiros + áudio (sem autenticação)
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Versão de Teste
          </Badge>
        </div>
      </header>
      
      <main className="container pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scripts" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Roteiros
            </TabsTrigger>
            <TabsTrigger value="openai" className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              OpenAI
            </TabsTrigger>
            <TabsTrigger value="elevenlabs" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              ElevenLabs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="scripts">
            <ScriptGeneratorWithModals onScriptGenerated={handleScriptGenerated} />
          </TabsContent>
          
          <TabsContent value="openai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Geração de Áudio OpenAI (Simulado)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Esta é uma simulação da aba OpenAI. O roteiro seria automaticamente preenchido aqui.
                  </p>
                  {scriptText && (
                    <div className="space-y-2">
                      <p className="font-medium">Roteiro recebido:</p>
                      <p className="text-sm">Título: {fileName}</p>
                      <p className="text-sm">Caracteres: {scriptText.length}</p>
                      <div className="max-h-32 overflow-y-auto bg-background p-2 rounded text-xs">
                        {scriptText.substring(0, 200)}...
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="elevenlabs">
            <ElevenLabsTab />
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="container pb-12 text-sm text-muted-foreground">
        <span>Sistema desenvolvido por Thiago - Versão de teste completa</span>
      </footer>
    </div>
  );
};

export default TestComplete;
