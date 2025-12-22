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
import { cleanFinalScript, cleanScriptRepetitions } from "@/utils/scriptCleanup";
import { useToast } from "@/hooks/use-toast";
import { sanitizeScript as sanitizeScriptUtils } from "@/utils/minimalPromptBuilder";

// ✅ NOVO: Detector Semântico de Fim de História
// Se a IA escrever qualquer uma dessas frases no final, paramos a geração IMEDIATAMENTE.
function hasEndingPhrases(text: string): boolean {
  const lower = text.toLowerCase().slice(-500); // Olha só o finalzinho
  const endTriggers = [
    // Tags explícitas
    "[fim]",
    "[the end]",
    "[fin]",
    "***",
    // Português
    "inscreva-se",
    "deixe seu like",
    "até a próxima",
    "obrigado por assistir",
    "nos vemos no próximo",
    // Inglês
    "subscribe",
    "thanks for watching",
    "see you in the next",
    "don't forget to like",
    // Polonês (Para seu caso específico)
    "subskrybuj",
    "do usłyszenia",
    "do zobaczenia",
    "dajcie znać w komentarzach",
    "oceniając ją w skali",
  ];

  return endTriggers.some((trigger) => lower.includes(trigger));
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

        // 2. Planejamento Inteligente
        // Se a premissa tiver [SEÇÃO X], usamos isso como contagem REAL.
        const sectionMatches = premise.match(/\[SEÇÃO\s*\d+\]/gi);
        const detectedSections = sectionMatches ? sectionMatches.length : 0;

        // Mínimo de 1 chunk, Máximo baseado na duração (1 chunk a cada ~8 min para garantir qualidade)
        const durationBasedChunks = Math.max(1, Math.ceil(config.duration / 8));

        // Se temos seções claras, obedecemos a premissa. Se não, vamos pela duração.
        const numberOfChunks = detectedSections > 0 ? detectedSections : durationBasedChunks;
        const targetWords = config.duration * 150;
        const wordsPerChunk = Math.ceil(targetWords / numberOfChunks);

        console.log(
          `Planejamento: ${numberOfChunks} partes (Baseado em: ${detectedSections > 0 ? "Seções da Premissa" : "Duração Estimada"})`,
        );

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
        let storyFinished = false;

        // 3. Loop de Geração
        for (let i = 0; i < numberOfChunks; i++) {
          // 🛑 KILL SWITCH: Se a história acabou no loop anterior, PARE AGORA.
          if (storyFinished) {
            console.log("🛑 História finalizada antecipadamente. Cancelando partes extras.");
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

          // 🔍 DETECÇÃO DE FIM DE HISTÓRIA (O segredo do sucesso)
          // Verifica se tem tag [FIM] OU se tem frases de "Obrigado por assistir/Subskrybuj"
          if (hasEndingPhrases(cleanedChunk) || i === numberOfChunks - 1) {
            cleanedChunk = cleanedChunk.replace(/\[FIM\]/gi, "");
            storyFinished = true; // Ativa a flag para não rodar o próximo loop
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

        // 4. Montagem e Limpeza Visual (Quebra de Parágrafos)
        const joinedScript = scriptChunks.map((chunk) => chunk.content).join("\n\n");
        const cleanedFullScript = cleanFinalScript(joinedScript); // <--- Aqui chamamos a função que quebra parágrafos

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
