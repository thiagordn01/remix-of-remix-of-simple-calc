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
import {
  injectPremiseContext,
  buildMinimalChunkPrompt,
  extractLastParagraph,
  sanitizeScript,
} from "@/utils/promptInjector";
import { cleanFinalScript, cleanScriptRepetitions } from "@/utils/scriptCleanup";
import { useToast } from "@/hooks/use-toast";
import { sanitizeScript as sanitizeScriptUtils } from "@/utils/minimalPromptBuilder";

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

        // 1. Gerar Premissa
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

        // 2. Análise Inteligente de Chunks
        // Contamos quantas [SEÇÃO X] existem na premissa. Esse será o nosso limite real.
        const sectionMatches = premise.match(/\[SEÇÃO\s*\d+\]/gi);
        const detectedSections = sectionMatches ? sectionMatches.length : 0;

        // O número de chunks será o MENOR valor entre: O que a duração pede VS Quantas seções a premissa tem.
        // Isso impede que a gente force 5 chunks numa história de 3 partes.
        const durationBasedChunks = Math.max(1, Math.ceil(config.duration / 10)); // 1 chunk a cada 10 min aprox

        // Se detectamos seções, usamos elas como guia principal, mas respeitando um mínimo de chunks
        const numberOfChunks = detectedSections > 0 ? detectedSections : durationBasedChunks;

        const targetWords = config.duration * 150; // Ajustado para 150 words/min (mais realista)
        const wordsPerChunk = Math.ceil(targetWords / numberOfChunks);

        console.log(`Planejamento: ${numberOfChunks} partes baseadas na premissa.`);

        setProgress({
          stage: "script",
          currentChunk: 1,
          totalChunks: numberOfChunks,
          completedWords: 0,
          targetWords,
          isComplete: false,
          percentage: 20,
          message: `Iniciando roteiro (${numberOfChunks} partes)...`,
        });

        let scriptContent = "";
        const scriptChunks: ScriptChunk[] = [];
        let storyFinished = false; // Variável de controle de saída antecipada

        // 3. Loop de Geração
        for (let i = 0; i < numberOfChunks; i++) {
          // Se a história já acabou na parte anterior, paramos IMEDIATAMENTE.
          if (storyFinished) {
            console.log("História finalizada antecipadamente. Cancelando chunks restantes.");
            break;
          }

          setProgress({
            stage: "script",
            currentChunk: i + 1,
            totalChunks: numberOfChunks,
            completedWords: scriptContent.split(/\s+/).length,
            targetWords,
            isComplete: false,
            percentage: 20 + (i / numberOfChunks) * 80,
            message: `Gerando parte ${i + 1}/${numberOfChunks}...`,
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

          let cleanedChunk = sanitizeScriptUtils(chunkResult.content);
          cleanedChunk = cleanScriptRepetitions(cleanedChunk);

          // DETECÇÃO DE FIM DE HISTÓRIA
          // Se a IA escreveu [FIM] ou se estamos na última seção prevista e o texto parece conclusivo
          if (cleanedChunk.includes("[FIM]") || i === numberOfChunks - 1) {
            cleanedChunk = cleanedChunk.replace(/\[FIM\]/gi, ""); // Limpa a tag
            storyFinished = true; // Impede o próximo loop
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

        // 4. Montagem Final e Limpeza Global
        const joinedScript = scriptChunks.map((chunk) => chunk.content).join("\n\n");

        // AQUI APLICAMOS A QUEBRA DE PARÁGRAFOS GIGANTES
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
          targetWords,
          isComplete: true,
          percentage: 100,
        });

        toast({ title: "Roteiro gerado com sucesso!", description: `${totalWords} palavras.` });

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
