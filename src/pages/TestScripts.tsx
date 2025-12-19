import { SimpleScriptGenerator } from "@/components/SimpleScriptGenerator";

const TestScripts = () => {
  const handleScriptGenerated = (script: string, title: string) => {
    console.log('Script gerado:', { script, title });
    alert(`Roteiro "${title}" gerado com sucesso!\n\nPrimeiros 200 caracteres:\n${script.substring(0, 200)}...`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/15 via-background to-background">
      <header className="container py-10">
        <h1 className="text-4xl font-bold tracking-tight">Teste - Sistema de Roteiros</h1>
        <p className="text-muted-foreground mt-2">
          Página de teste para o sistema de geração de roteiros (sem autenticação)
        </p>
      </header>
      
      <main className="container pb-24">
        <SimpleScriptGenerator onScriptGenerated={handleScriptGenerated} />
      </main>
      
      <footer className="container pb-12 text-sm text-muted-foreground">
        <span>Página de teste - Sistema desenvolvido por Thiago</span>
      </footer>
    </div>
  );
};

export default TestScripts;
