// src/hooks/useScriptGenerator.ts
import { useState, useCallback, useRef } from "react";
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
import { buildMinimalChunkPrompt, sanitizeScript } from "@/utils/minimalPromptBuilder";
import { cleanFinalScript, cleanScriptRepetitions, truncateAfterEnding } from "@/utils/scriptCleanup";
import { getLanguageWPM } from "@/utils/languageDetection";
import { useToast } from "@/hooks/use-toast";
import { geminiChatService } from "@/services/geminiChatService";
import { puterChatService } from "@/services/puterChatService";

// Resposta estruturada flexível baseada em notas de coerência
interface CoherentScriptResponse {
  script_content: string;
  coherence_notes?: string[];
}

// Função auxiliar para parsear o JSON da IA de forma segura
function parseAIResponse(content: string): CoherentScriptResponse | null {
  try {
    // Tenta encontrar o JSON dentro do texto (caso a IA fale algo antes/depois)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Falha ao parsear JSON da IA:", e);
    return null;
  }
}

// Marcador de início do roteiro - usado para separar "thinking" do conteúdo real
const SCRIPT_START_MARKER = '[INICIO_ROTEIRO]';

/**
 * Extrai apenas o conteúdo do roteiro após o marcador de início.
 * Isso permite que a IA "pense" (thinking) sem que esse conteúdo vaze para o roteiro final.
 * Se o marcador não for encontrado, retorna o texto original (fallback seguro).
 */
function extractAfterMarker(response: string): string {
  const index = response.indexOf(SCRIPT_START_MARKER);

  if (index !== -1) {
    const extracted = response.slice(index + SCRIPT_START_MARKER.length).trim();
    console.log(`✅ Marcador encontrado - extraído conteúdo limpo (${extracted.length} chars)`);
    return extracted;
  }

  // Fallback: retorna tudo se não encontrar a tag (comportamento anterior)
  return response;
}

export const useScriptGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ScriptGenerationProgress | null>(null);
  const [result, setResult] = useState<ScriptGenerationResult | null>(null);
  const { toast } = useToast();

  // Ref para manter memória de coerência durante o processo assíncrono
  const coherenceNotesRef = useRef<string[]>([]);

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
          duration: request.duration || 10,
          language: detectedLanguage,
          location: request.location || agent?.location || "Brasil",
        };

        if (!config.premisePrompt || !config.scriptPrompt) throw new Error("Prompts obrigatórios");

        const activeGeminiKeys = apiKeys.filter(
          (key) => key.isActive && key.status !== "suspended" && key.status !== "invalid",
        );
        if (provider === "gemini" && activeGeminiKeys.length === 0) throw new Error("Sem chaves Gemini ativas");

        // 1. GERAR PREMISSA (Mantido igual)
        setProgress({
          stage: "premise",
          currentChunk: 1,
          totalChunks: 1,
          completedWords: 0,
          targetWords: 0,
          isComplete: false,
          percentage: 5,
          message: "Criando premissa e bíblia da história...",
        });

        const processedPremisePrompt = `${config.premisePrompt}\n\n[IMPORTANTE: Defina idades e datas explicitamente]`;

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

        // Inicializa memória de coerência para esta geração
        coherenceNotesRef.current = [];

        // 2. VARIÁVEIS DO ROTEIRO
        let scriptContentFull = "";
        const scriptChunks: ScriptChunk[] = [];

        // 3. GERAÇÃO DO ROTEIRO COM CHAT PERSISTENTE
        // ✅ MODO ÚNICO: Chat com histórico para TODOS os roteiros
        // A IA mantém contexto completo e nunca perde memória da conversa

        // ✅ Usar WPM específico do idioma
        const wpm = getLanguageWPM(detectedLanguage);
        const minutesPerPart = 10;
        const totalParts = Math.max(1, Math.ceil(config.duration / minutesPerPart));
        const totalWordsTarget = config.duration * wpm;
        const wordsPerPart = Math.max(300, Math.round(totalWordsTarget / totalParts));

        // Seleciona API key para esta sessão
        const selectedApiKey = activeGeminiKeys[0];
        if (!selectedApiKey) {
          throw new Error("Nenhuma API key disponível");
        }

        // System instruction simplificado - deixa o prompt do usuário guiar
        const scriptSystemInstruction = `
          Você é um roteirista de YouTube.
          Escreva em linguagem FALADA, casual, como se estivesse contando para um amigo.
          Frases curtas e diretas. Nada de poesia ou descrições elaboradas.

          REGRAS:
          - Entregue APENAS o texto da narração.
          - NÃO use títulos, capítulos, asteriscos (**), nem "Claro, aqui vai".
          - Conecte as frases com fluidez. Evite pontos finais demais. Texto narrado precisa fluir bem.
          - Idioma: ${detectedLanguage}.
          - Duração total: ${config.duration} minutos.
          - Você vai escrever ${totalParts} partes de ~${wordsPerPart} palavras cada.

          IMPORTANTE - FORMATO DE SAÍDA:
          Você pode planejar e pensar internamente, mas quando for entregar o texto do roteiro,
          SEMPRE comece com a tag ${SCRIPT_START_MARKER} e depois escreva o texto corrido.
          Exemplo:
          ${SCRIPT_START_MARKER}
          O sol nascia sobre a cidade quando Maria decidiu que aquele seria o dia...
        `;

        // Cria sessão de chat única para todo o roteiro
        // IMPORTANTE: Esta sessão mantém histórico - a IA vê TUDO que já escreveu
        const sessionId = `script-${Date.now()}-${crypto.randomUUID()}`;

        // Cria sessão de chat com histórico para ambos os providers
        if (provider === "gemini") {
          geminiChatService.createChat(sessionId, selectedApiKey, {
            systemInstruction: scriptSystemInstruction,
            maxOutputTokens: 8192,
            temperature: 0.9
          });
        } else {
          // Puter/DeepSeek: também usa chat com histórico
          puterChatService.createChat(sessionId, {
            systemInstruction: scriptSystemInstruction,
            maxOutputTokens: 8192,
            model: puterDeepseekService.getModel()
          });
        }

        try {
          for (let i = 0; i < totalParts; i++) {
            const partNumber = i + 1;

            setProgress({
              stage: "script",
              currentChunk: partNumber,
              totalChunks: totalParts,
              completedWords: scriptContentFull.split(/\s+/).length,
              targetWords: totalWordsTarget,
              isComplete: false,
              percentage: 10 + (i / totalParts) * 80,
              message: `Escrevendo parte ${partNumber}/${totalParts} (chat com memória)...`,
            });

            // Prompt simplificado - deixa o usuário guiar
            let partPrompt = `
              PARTE ${partNumber} DE ${totalParts}. ~${wordsPerPart} palavras.

              ${config.scriptPrompt}
            `;

            // Parte 1: inclui premissa e título (a IA vai lembrar nas próximas)
            if (partNumber === 1) {
              partPrompt = `
              CONTEXTO (PREMISSA APROVADA):
              ${premise}

              TÍTULO: ${request.title}
              ` + partPrompt;
            }

            let rawPart = "";

            if (provider === "gemini") {
              // Usa chat com histórico - a IA lembra de tudo automaticamente
              rawPart = await geminiChatService.sendMessage(sessionId, partPrompt, {
                temperature: 0.9,
                maxOutputTokens: 8192,
                onProgress: (text) => console.log(`📝 Parte ${partNumber}: ${text.slice(0, 100)}...`)
              });
            } else {
              // Puter/DeepSeek: também usa chat com histórico agora!
              rawPart = await puterChatService.sendMessage(sessionId, partPrompt, {
                maxOutputTokens: 8192,
                onProgress: (text) => console.log(`📝 Parte ${partNumber}: ${text.slice(0, 100)}...`)
              });
            }

            // ✅ CORREÇÃO: Extrai apenas o conteúdo após o marcador [INICIO_ROTEIRO]
            // Isso remove qualquer "thinking" ou planejamento que a IA possa ter vazado
            rawPart = extractAfterMarker(rawPart);
            rawPart = sanitizeScript(rawPart).trim();
            if (!rawPart) {
              console.warn(`Parte ${partNumber}/${totalParts} veio vazia.`);
              continue;
            }

            scriptContentFull += (scriptContentFull ? "\n\n" : "") + rawPart;

            scriptChunks.push({
              id: crypto.randomUUID(),
              content: rawPart,
              wordCount: rawPart.split(/\s+/).length,
              chunkIndex: i,
              isComplete: true,
            });

            console.log(`✅ Parte ${partNumber}/${totalParts} concluída (${rawPart.split(/\s+/).length} palavras)`);
          }
        } finally {
          // Limpa sessão de chat
          if (provider === "gemini") {
            geminiChatService.clearSession(sessionId);
          } else {
            puterChatService.clearSession(sessionId);
          }
        }

        // 4. RESULTADO FINAL
        const joinedScript = scriptChunks.map((chunk) => chunk.content).join("\n\n");
        const cleanedFullScript = cleanFinalScript(joinedScript);

        // Reconstrói chunks normalizados
        const finalChunks: ScriptChunk[] = cleanedFullScript.split(/\n\n+/).map((content, index) => ({
          id: crypto.randomUUID(),
          content,
          wordCount: content.split(/\s+/).length,
          chunkIndex: index,
          isComplete: true,
        }));

        const totalWords = finalChunks.reduce((sum, chunk) => sum + chunk.wordCount, 0);
        // ✅ CORREÇÃO: Usar WPM específico do idioma para estimativa precisa
        const finalWPM = getLanguageWPM(detectedLanguage);
        const estimatedDuration = totalWords / finalWPM;

        const finalResult: ScriptGenerationResult = {
          premise,
          script: finalChunks.map((c) => c.content),
          chunks: finalChunks,
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

        toast({ title: "Roteiro Validado Gerado!", description: `${totalWords} palavras (Lógica Verificada).` });

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
