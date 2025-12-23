import { useState, useCallback } from "react";
import {
  ScriptGenerationRequest,
  ScriptGenerationResult,
  ScriptGenerationProgress,
  GeminiApiKey,
  ScriptChunk,
  AIProvider,
} from "@/types/scripts";
import { Agent } from "@/types/agents";
import { enhancedGeminiService } from "@/services/enhancedGeminiApi";
import { puterDeepseekService } from "@/services/puterDeepseekService";
import { injectPremiseContext } from "@/utils/promptInjector";
import { useToast } from "@/hooks/use-toast";
import {
  buildSimpleChunkPrompt,
  cleanGeneratedText,
  SimpleChunkContext,
} from "@/utils/simplePromptBuilder";

/**
 * Hook simplificado para geração de roteiros
 * Baseado no sistema de referência (thiguinhasrote21) que é mais eficaz.
 *
 * Princípios:
 * 1. Premissa passada em TODOS os chunks
 * 2. Script anterior passado como contexto (~500 palavras)
 * 3. Prompts simples e diretos
 * 4. Confia na IA para manter consistência
 */
export const useScriptGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ScriptGenerationProgress | null>(null);
  const [result, setResult] = useState<ScriptGenerationResult | null>(null);
  const { toast } = useToast();

  const generateScript = useCallback(
    async (
      request: ScriptGenerationRequest,
      agent: Agent | null,
      apiKeys: GeminiApiKey[],
      provider: AIProvider = "gemini",
    ): Promise<ScriptGenerationResult> => {
      setIsGenerating(true);
      setProgress(null);
      setResult(null);

      try {
        // Configuração
        const language = request.language || agent?.language || "pt-BR";
        const location = request.location || agent?.location || "Brasil";
        const duration = request.duration || agent?.duration || 10;
        const premisePrompt = request.premisePrompt || agent?.premisePrompt || "";
        const scriptPrompt = request.scriptPrompt || agent?.scriptPrompt || "";

        if (!premisePrompt || !scriptPrompt) {
          throw new Error("Prompts de premissa e roteiro são obrigatórios");
        }

        // Validar APIs
        const activeApiKeys = apiKeys.filter(
          (key) => key.isActive && key.status !== "suspended" && key.status !== "invalid",
        );
        if (provider === "gemini" && activeApiKeys.length === 0) {
          throw new Error("Nenhuma chave Gemini ativa disponível");
        }

        // ========================================
        // PASSO 1: GERAR PREMISSA
        // ========================================
        setProgress({
          stage: "premise",
          currentChunk: 1,
          totalChunks: 1,
          completedWords: 0,
          targetWords: 0,
          isComplete: false,
          percentage: 10,
          message: "Criando premissa...",
        });

        const processedPremisePrompt = injectPremiseContext(premisePrompt, {
          title: request.title,
          channelName: agent?.channelName || "",
          duration: duration,
          language: language,
          location: location,
        });

        const premiseResult =
          provider === "deepseek"
            ? await puterDeepseekService.generatePremise(processedPremisePrompt, undefined, console.log)
            : await enhancedGeminiService.generatePremise(
                processedPremisePrompt,
                activeApiKeys,
                undefined,
                console.log,
              );

        const premise = premiseResult.content;
        console.log("✅ Premissa gerada");

        // ========================================
        // PASSO 2: CALCULAR ESTRUTURA
        // ========================================
        // Baseado no sistema de referência: 170 WPM, chunks de 10 min
        const wpm = 170;
        const totalWordsTarget = duration * wpm;
        const minutesPerChunk = 10;
        const totalChunks = Math.max(1, Math.ceil(duration / minutesPerChunk));
        const wordsPerChunk = Math.round(totalWordsTarget / totalChunks);

        console.log(`📊 Estrutura: ${totalChunks} partes, ~${wordsPerChunk} palavras cada`);

        // ========================================
        // PASSO 3: GERAR ROTEIRO EM PARTES
        // ========================================
        let fullScript = "";
        const scriptChunks: ScriptChunk[] = [];

        for (let i = 0; i < totalChunks; i++) {
          setProgress({
            stage: "script",
            currentChunk: i + 1,
            totalChunks: totalChunks,
            completedWords: fullScript.split(/\s+/).filter(w => w).length,
            targetWords: totalWordsTarget,
            isComplete: false,
            percentage: 20 + ((i + 1) / totalChunks) * 80,
            message: `Escrevendo parte ${i + 1} de ${totalChunks}...`,
          });

          // Construir contexto para o chunk
          const chunkContext: SimpleChunkContext = {
            title: request.title,
            language: language,
            location: location,
            targetWords: wordsPerChunk,
            premise: premise,
            previousScript: fullScript,
            chunkIndex: i,
            totalChunks: totalChunks,
            durationMinutes: duration,
          };

          // Construir prompt simples
          const chunkPrompt = buildSimpleChunkPrompt(scriptPrompt, chunkContext);

          // Gerar chunk
          const chunkResult =
            provider === "deepseek"
              ? await puterDeepseekService.generateScriptChunk(
                  chunkPrompt,
                  { premise, previousContent: fullScript, chunkIndex: i, totalChunks, targetWords: wordsPerChunk, language, location },
                  console.log,
                )
              : await enhancedGeminiService.generateScriptChunk(
                  chunkPrompt,
                  activeApiKeys,
                  { premise, previousContent: fullScript, chunkIndex: i, totalChunks, targetWords: wordsPerChunk, language, location },
                  console.log,
                );

          // Limpar texto gerado
          let chunkText = cleanGeneratedText(chunkResult.content);

          // Detectar tag [FIM]
          const hasFimTag = /\[FIM\]|\[THE END\]|\[FIN\]/i.test(chunkText);
          if (hasFimTag) {
            chunkText = chunkText.replace(/\[FIM\]|\[THE END\]|\[FIN\]/gi, "").trim();
            console.log("🏁 Tag [FIM] detectada. Encerrando.");
          }

          // Acumular
          fullScript += (fullScript ? "\n\n" : "") + chunkText;

          scriptChunks.push({
            id: crypto.randomUUID(),
            content: chunkText,
            wordCount: chunkText.split(/\s+/).filter(w => w).length,
            chunkIndex: i,
            isComplete: true,
          });

          console.log(`✅ Parte ${i + 1}/${totalChunks} concluída`);

          // Se encontrou tag [FIM], parar
          if (hasFimTag) break;
        }

        // ========================================
        // PASSO 4: FINALIZAR
        // ========================================
        const totalWords = fullScript.split(/\s+/).filter(w => w).length;
        const estimatedDuration = totalWords / 150;

        const finalResult: ScriptGenerationResult = {
          premise,
          script: scriptChunks.map((c) => c.content),
          chunks: scriptChunks,
          totalWords,
          estimatedDuration,
          agentUsed: agent?.name,
        };

        setResult(finalResult);
        setProgress({
          stage: "script",
          currentChunk: totalChunks,
          totalChunks: totalChunks,
          completedWords: totalWords,
          targetWords: totalWords,
          isComplete: true,
          percentage: 100,
          message: "Concluído!",
        });

        toast({
          title: "Roteiro gerado com sucesso!",
          description: `${totalWords} palavras (~${Math.round(estimatedDuration)} min)`,
        });

        return finalResult;
      } catch (error) {
        console.error("Erro na geração:", error);
        toast({
          title: "Erro na geração",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [toast],
  );

  const clearResult = useCallback(() => {
    setResult(null);
    setProgress(null);
  }, []);

  return { generateScript, clearResult, isGenerating, progress, result };
};
