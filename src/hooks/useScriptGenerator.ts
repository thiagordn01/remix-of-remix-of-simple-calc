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
import { injectPremiseContext, buildMinimalChunkPrompt, extractLastParagraph } from "@/utils/promptInjector";
import { cleanFinalScript, cleanScriptRepetitions, truncateAfterEnding } from "@/utils/scriptCleanup";
import { useToast } from "@/hooks/use-toast";
import { sanitizeScript as sanitizeScriptUtils } from "@/utils/minimalPromptBuilder";

// ✅ CORREÇÃO: O Kill Switch agora é estrito.
// Só dispara com tags técnicas, permitindo CTAs (Like/Subscreva) no texto.
function hasEndingPhrases(text: string): boolean {
  const upper = text.toUpperCase();
  // Apenas tags que a IA usa para sinalizar "Acabei tecnicamente"
  const endTriggers = ["[FIM]", "[THE END]", "[FIN]"];

  return endTriggers.some((trigger) => upper.includes(trigger));
}

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
        const detectedLanguage = request.language || agent?.language || "pt-BR";
        const config = {
          channelName: request.channelName || agent?.channelName || "",
          premisePrompt: request.premisePrompt || agent?.premisePrompt || "",
          scriptPrompt: request.scriptPrompt || agent?.scriptPrompt || "",
          duration: request.duration || agent?.duration || 10,
          language: detectedLanguage,
          location: request.location || agent?.location || "Brasil",
        };

        if (!config.premisePrompt || !config.scriptPrompt) throw new Error("Prompts obrigatórios");

        const activeGeminiKeys = apiKeys.filter(
          (key) => key.isActive && key.status !== "suspended" && key.status !== "invalid",
        );
        if (provider === "gemini" && activeGeminiKeys.length === 0) throw new Error("Sem chaves Gemini ativas");

        // 1. GERAR PREMISSA
        setProgress({
          stage: "premise",
          currentChunk: 1,
          totalChunks: 1,
          completedWords: 0,
          targetWords: 0,
          isComplete: false,
          percentage: 10,
        });

        const processedPremisePrompt = injectPremiseContext(config.premisePrompt, {
          title: request.title,
          channelName: config.channelName,
          duration: config.duration,
          language: config.language,
          location: config.location,
        });

        const premiseResult =
          provider === "deepseek"
            ? await puterDeepseekService.generatePremise(processedPremisePrompt, undefined, console.log)
            : await enhancedGeminiService.generatePremise(
                processedPremisePrompt,
                activeGeminiKeys,
                undefined,
                console.log,
              );

        const premise = premiseResult.content;

        // 2. PARSE INTELIGENTE (ESTRUTURA)
        const chapterMatches = premise.match(/\[(?:CAPITULO|SEÇÃO|SECTION|PART)\s*\d+\]/gi);
        const detectedChapters = chapterMatches ? chapterMatches.length : 0;
        const fallbackChunks = Math.max(1, Math.ceil(config.duration / 8));

        // Usa o número de capítulos detetados na premissa
        const numberOfChunks = detectedChapters > 0 ? detectedChapters : fallbackChunks;
        const targetWordsTotal = config.duration * 140;
        const wordsPerChunk = Math.ceil(targetWordsTotal / numberOfChunks);

        console.log(
          `ESTRUTURA: ${numberOfChunks} Capítulos (baseado em ${detectedChapters > 0 ? "Premissa" : "Tempo"}).`,
        );

        setProgress({
          stage: "script",
          currentChunk: 1,
          totalChunks: numberOfChunks,
          completedWords: 0,
          targetWords: targetWordsTotal,
          isComplete: false,
          percentage: 20,
          message: `Gerando ${numberOfChunks} capítulos...`,
        });

        let scriptContent = "";
        const scriptChunks: ScriptChunk[] = [];
        let storyFinished = false;

        // 3. LOOP DE GERAÇÃO
        for (let i = 0; i < numberOfChunks; i++) {
          if (storyFinished) break;

          setProgress({
            stage: "script",
            currentChunk: i + 1,
            totalChunks: numberOfChunks,
            completedWords: scriptContent.split(/\s+/).length,
            targetWords: targetWordsTotal,
            isComplete: false,
            percentage: 20 + (i / numberOfChunks) * 80,
            message: `Escrevendo Capítulo ${i + 1}/${numberOfChunks}...`,
          });

          const lastParagraph = scriptContent ? extractLastParagraph(scriptContent) : "";

          const chunkPrompt = buildMinimalChunkPrompt(config.scriptPrompt, {
            title: request.title,
            language: detectedLanguage,
            targetWords: wordsPerChunk,
            premise: premise,
            chunkIndex: i,
            totalChunks: numberOfChunks,
            lastParagraph: i > 0 && lastParagraph ? lastParagraph : undefined,
          });

          const chunkContext = {
            premise,
            previousContent: "",
            chunkIndex: i,
            totalChunks: numberOfChunks,
            targetWords: wordsPerChunk,
            language: detectedLanguage,
            location: config.location,
            isLastChunk: i === numberOfChunks - 1,
          };

          const chunkResult =
            provider === "deepseek"
              ? await puterDeepseekService.generateScriptChunk(chunkPrompt, chunkContext, console.log)
              : await enhancedGeminiService.generateScriptChunk(
                  chunkPrompt,
                  activeGeminiKeys,
                  chunkContext,
                  console.log,
                );

          let rawChunk = sanitizeScriptUtils(chunkResult.content);
          let cleanedChunk = cleanScriptRepetitions(rawChunk);

          // VERIFICAÇÃO DE TAG DE FIM
          // Se a IA colocar [FIM], cortamos ali e paramos o loop.
          const truncation = truncateAfterEnding(cleanedChunk);

          if (truncation.found) {
            console.log("🏁 Tag [FIM] detectada. Encerrando história.");
            cleanedChunk = truncation.cleaned; // Mantém o texto ANTES da tag (incluindo CTAs)
            storyFinished = true;
          } else if (hasEndingPhrases(cleanedChunk) || i === numberOfChunks - 1) {
            // Se detectou tag [FIM] sem truncar ou é o último chunk
            if (hasEndingPhrases(cleanedChunk)) {
              cleanedChunk = cleanedChunk.replace(/\[FIM\]/gi, "").replace(/\[THE END\]/gi, "");
              storyFinished = true;
            }
          }

          scriptContent += (scriptContent ? "\n\n" : "") + cleanedChunk;

          scriptChunks.push({
            id: crypto.randomUUID(),
            content: cleanedChunk,
            wordCount: cleanedChunk.split(/\s+/).length,
            chunkIndex: i,
            isComplete: true,
          });
        }

        // 4. LIMPEZA FINAL
        const joinedScript = scriptChunks.map((chunk) => chunk.content).join("\n\n");
        const cleanedFullScript = cleanFinalScript(joinedScript);
        const cleanedParagraphs = cleanedFullScript.split(/\n\n+/);

        const normalizedChunks: ScriptChunk[] = cleanedParagraphs.map((content, index) => ({
          id: crypto.randomUUID(),
          content,
          wordCount: content.split(/\s+/).length,
          chunkIndex: index,
          isComplete: true,
        }));

        const totalWords = normalizedChunks.reduce((sum, chunk) => sum + chunk.wordCount, 0);
        const estimatedDuration = totalWords / 150;

        const finalResult: ScriptGenerationResult = {
          premise,
          script: normalizedChunks.map((c) => c.content),
          chunks: normalizedChunks,
          totalWords,
          estimatedDuration,
          agentUsed: agent?.name,
        };

        setResult(finalResult);
        setProgress({
          stage: "script",
          currentChunk: numberOfChunks,
          totalChunks: numberOfChunks,
          completedWords: totalWords,
          targetWords: totalWords,
          isComplete: true,
          percentage: 100,
        });

        toast({ title: "Guião gerado com sucesso!", description: `${totalWords} palavras.` });

        return finalResult;
      } catch (error) {
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
