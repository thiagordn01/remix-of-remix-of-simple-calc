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
// ✅ IMPORTADO cleanScriptRepetitions
import { cleanFinalScript, validateScriptQuality, cleanScriptRepetitions } from "@/utils/scriptCleanup";
import { useToast } from "@/hooks/use-toast";

function sanitizeScript(text: string): string {
  let sanitized = text;
  sanitized = sanitized.replace(
    /\[(?:IMAGEM|IMAGEN|IMAGE|MÚSICA|MUSIC|SFX|CENA|SCENE|SOUND|IMG|FOTO|PHOTO|EFEITO|EFFECT)[:\s][^\]]*\]/gi,
    "",
  );
  sanitized = sanitized.replace(/\[[A-Z][A-Z\s]{2,30}:[^\]]*\]/g, "");
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n");
  sanitized = sanitized.replace(/^\s*\n/, "");
  return sanitized.trim();
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
        if (!config.channelName) throw new Error("Nome do canal obrigatório");

        const activeGeminiKeys = apiKeys.filter(
          (key) => key.isActive && key.status !== "suspended" && key.status !== "invalid",
        );

        if (provider === "gemini" && activeGeminiKeys.length === 0) throw new Error("Sem chaves Gemini ativas");
        if (provider === "deepseek" && !puterDeepseekService.isAvailable()) {
          const available = await puterDeepseekService.waitForPuter(5000);
          if (!available) throw new Error("DeepSeek indisponível");
        }

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
            ? await puterDeepseekService.generatePremise(processedPremisePrompt, undefined, (msg) =>
                console.log("DeepSeek:", msg),
              )
            : await enhancedGeminiService.generatePremise(processedPremisePrompt, activeGeminiKeys, undefined, (msg) =>
                console.log("Gemini:", msg),
              );

        const premise = premiseResult.content;
        console.log("Premissa gerada");

        // 2. Configurar Chunks
        const targetWords = config.duration * 170;
        const minutesPerChunk = 10;
        const numberOfChunks = Math.max(1, Math.ceil(config.duration / minutesPerChunk));
        const wordsPerChunk = Math.ceil(targetWords / numberOfChunks);

        setProgress({
          stage: "script",
          currentChunk: 1,
          totalChunks: numberOfChunks,
          completedWords: 0,
          targetWords,
          isComplete: false,
          percentage: 35,
          message: `Iniciando roteiro (${numberOfChunks} partes)...`,
        });

        let scriptContent = "";
        const scriptChunks: ScriptChunk[] = [];

        // 3. Loop de Geração
        for (let i = 0; i < numberOfChunks; i++) {
          setProgress({
            stage: "script",
            currentChunk: i + 1,
            totalChunks: numberOfChunks,
            completedWords: scriptContent.split(/\s+/).length,
            targetWords,
            isComplete: false,
            percentage: 35 + (i / numberOfChunks) * 55,
            message: `Gerando parte ${i + 1}/${numberOfChunks}...`,
          });

          // Extrai contexto LIMPO
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

          // ✅ LIMPEZA CRÍTICA AQUI
          let cleanedChunk = sanitizeScript(chunkResult.content);
          // Remove duplicatas imediatas (Efeito Eco)
          cleanedChunk = cleanScriptRepetitions(cleanedChunk);

          scriptContent += (scriptContent ? "\n\n" : "") + cleanedChunk;

          scriptChunks.push({
            id: crypto.randomUUID(),
            content: cleanedChunk,
            wordCount: cleanedChunk.split(/\s+/).length,
            chunkIndex: i,
            isComplete: true,
          });
        }

        // Montagem Final
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
        const estimatedDuration = totalWords / 170;

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
