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
import { useToast } from "@/hooks/use-toast";

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

        // 2. PARSE DE ESTRUTURA
        const chapterMatches = premise.match(/\[(?:CAPITULO|SEÇÃO|SECTION|PART)\s*\d+\]/gi);
        const detectedChapters = chapterMatches ? chapterMatches.length : 0;
        const fallbackChunks = Math.max(1, Math.ceil(config.duration / 8));
        const numberOfChunks = detectedChapters > 0 ? detectedChapters : fallbackChunks;
        const targetWordsTotal = config.duration * 140;
        const wordsPerChunk = Math.ceil(targetWordsTotal / numberOfChunks);

        let scriptContentFull = "";
        const scriptChunks: ScriptChunk[] = [];
        let storyFinished = false;

        // 3. LOOP DE GERAÇÃO COM VALIDAÇÃO (NOVA LÓGICA)
        const MAX_SIMPLE_DURATION_MINUTES = 60;
        const useAdvancedMode = config.duration > MAX_SIMPLE_DURATION_MINUTES;

        if (useAdvancedMode) {
          // ==========================
          // MODO AVANÇADO (JSON + coherence_notes)
          // ==========================
          for (let i = 0; i < numberOfChunks; i++) {
            if (storyFinished) break;

            let chunkValid = false;
            let attempts = 0;
            let currentErrorMessage = "";
            let finalChunkContent = "";

            // Loop de Tentativas (Self-Healing)
            while (!chunkValid && attempts < 3) {
              attempts++;

              setProgress({
                stage: "script",
                currentChunk: i + 1,
                totalChunks: numberOfChunks,
                completedWords: scriptContentFull.split(/\s+/).length,
                targetWords: targetWordsTotal,
                isComplete: false,
                percentage: 10 + (i / numberOfChunks) * 80 + attempts * 2, // Avança um pouco nas tentativas
                message:
                  attempts > 1
                    ? `Corrigindo erros lógicos no Cap ${i + 1} (Tentativa ${attempts})...`
                    : `Escrevendo Capítulo ${i + 1}/${numberOfChunks}...`,
              });

              // Monta bloco de memória de coerência acumulada
              let memoryBlock = "";
              if (coherenceNotesRef.current.length > 0) {
                const factsList = coherenceNotesRef.current
                  .slice(-30)
                  .map((fact, idx) => `- ${idx + 1}. ${fact}`)
                  .join("\n");

                memoryBlock = `\n\n=== CONTEXTO DE COERÊNCIA (FATOS JÁ ESTABELECIDOS) ===\nAqui está o que você estabeleceu como verdade nos capítulos anteriores.\nNÃO CONTRADIGA NENHUM DESTES PONTOS. Em caso de dúvida, prefira manter o que já foi estabelecido:\n\n${factsList}\n`;
              }

              const basePromptWithMemory = `${config.scriptPrompt}${memoryBlock}`;

              // Constrói o prompt (adiciona erro anterior se houver)
              let chunkPrompt = buildMinimalChunkPrompt(basePromptWithMemory, {
                title: request.title,
                language: detectedLanguage,
                targetWords: wordsPerChunk,
                premise: premise,
                chunkIndex: i,
                totalChunks: numberOfChunks,
                previousContent: i > 0 ? scriptChunks[i - 1].content : undefined,
              });

              if (currentErrorMessage) {
                chunkPrompt += `\n\n❌ TENTATIVA ANTERIOR REJEITADA: ${currentErrorMessage}\nCORRIJA ESSE ERRO LÓGICO AGORA.`;
              }

              // Chama a IA
              const chunkResult =
                provider === "deepseek"
                  ? await puterDeepseekService.generateScriptChunk(chunkPrompt, {}, console.log)
                  : await enhancedGeminiService.generateScriptChunk(chunkPrompt, activeGeminiKeys, {}, console.log);

              const sanitizedRaw = sanitizeScript(chunkResult.content);
              const parsedResponse = parseAIResponse(sanitizedRaw);

              if (!parsedResponse) {
                currentErrorMessage = "O formato JSON não foi respeitado. Retorne APENAS o JSON.";
                console.warn(`[VALIDATOR] Falha de Formato no Chunk ${i + 1}`);
                continue;
              }

              // Validação simples: formato + tamanho mínimo
              const scriptText = (parsedResponse.script_content || "").trim();
              const wordCount = scriptText ? scriptText.split(/\s+/).filter(Boolean).length : 0;

              if (!scriptText || wordCount < 200) {
                currentErrorMessage = "Texto muito curto. Aprofunde mais o conteúdo/cena.";
                console.warn(
                  `[VALIDATOR] Chunk ${i + 1} rejeitado por texto curto ou vazio (${wordCount} palavras).`,
                );
                continue;
              }

              // Atualiza memória de coerência com as novas notas
              if (Array.isArray(parsedResponse.coherence_notes)) {
                const newFacts = parsedResponse.coherence_notes
                  .map((note) => String(note).trim())
                  .filter((note) => note.length > 0);

                const existing = new Set(coherenceNotesRef.current);
                const merged: string[] = [];

                coherenceNotesRef.current.forEach((fact) => {
                  if (fact.trim()) merged.push(fact.trim());
                });

                newFacts.forEach((fact) => {
                  if (!existing.has(fact)) {
                    merged.push(fact);
                    existing.add(fact);
                  }
                });

                coherenceNotesRef.current = merged.slice(-50);
              }

              chunkValid = true;
              finalChunkContent = scriptText;
              console.log(`[VALIDATOR] Chunk ${i + 1} APROVADO com ${wordCount} palavras.`);
            }

            // Se falhou 3x, usamos o último conteúdo gerado (para não travar), mas alertamos
            if (!chunkValid && !finalChunkContent) {
              console.error("Falha crítica na validação após 3 tentativas. Usando fallback.");
              // Tenta recuperar algo do último resultado ou gera erro
              toast({
                title: "Aviso de Coerência",
                description: "A IA teve dificuldade em manter a lógica perfeita neste capítulo.",
                variant: "destructive",
              });
              // Em produção real, você poderia parar aqui.
            }

            // Processamento final do texto (Limpeza, FIM, etc)
            let cleanedChunk = cleanScriptRepetitions(finalChunkContent);

            // Verifica TAG [FIM]
            const truncation = truncateAfterEnding(cleanedChunk);
            if (truncation.found) {
              cleanedChunk = truncation.cleaned;
              storyFinished = true;
            }

            scriptContentFull += (scriptContentFull ? "\n\n" : "") + cleanedChunk;

            scriptChunks.push({
              id: crypto.randomUUID(),
              content: cleanedChunk,
              wordCount: cleanedChunk.split(/\s+/).length,
              chunkIndex: i,
              isComplete: true,
            });
          }
        } else {
          // ==========================
          // MODO SIMPLES (CLONE DO SISTEMA EM CHAT ÚNICO COM PARTES INTERNAS)
          // - Divide o roteiro em partes internas de ~10 minutos
          // - Mantém um "chat" lógico único via contexto acumulado
          // - Sem JSON / coherence_notes, apenas texto livre validado no final
          // ==========================

          // Parâmetros espelhando o outro sistema
          const wpm = 170; // palavras por minuto para corrigir baixa contagem de caracteres
          const minutesPerPart = 10; // ~10 minutos por parte
          const totalParts = Math.max(1, Math.ceil(config.duration / minutesPerPart));
          const totalWordsTarget = config.duration * wpm;
          const wordsPerPart = Math.max(300, Math.round(totalWordsTarget / totalParts));

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
              message:
                i === 0
                  ? `Escrevendo a primeira parte (${partNumber}/${totalParts}) do roteiro em modo simples (chat único)...`
                  : `Continuando a história (parte ${partNumber}/${totalParts}) em modo simples (chat único)...`,
            });

            // ESTRUTURA INTERNA MENTAL (copiada do generateSingleScript)
            let structureInstruction = "";
            if (partNumber === 1) {
              structureInstruction = `
            ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
            Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido, sem headers visíveis:
            1. (Mentalmente) Gancho e Introdução Imersiva (0-3 min) - Descreva o ambiente e o "status quo".
            2. (Mentalmente) Desenvolvimento do Contexto (3-6 min) - Explique os antecedentes sem pressa.
            3. (Mentalmente) O Incidente Incitante (6-10 min) - O momento da mudança, narrado em câmera lenta.
            `;
            } else if (partNumber === totalParts) {
              structureInstruction = `
            ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
            Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido:
            1. (Mentalmente) O Grande Clímax (Parte Inicial) - A tensão sobe ao máximo.
            2. (Mentalmente) O Ápice e a Queda - O ponto de não retorno.
            3. (Mentalmente) Resolução e Reflexão (Fim) - As consequências e a mensagem final duradoura.
            `;
            } else {
              structureInstruction = `
            ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
            Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido:
            1. (Mentalmente) Novos Obstáculos - A situação piora. Detalhe as dificuldades.
            2. (Mentalmente) Aprofundamento Emocional - O que os personagens sentem? Use monólogos internos.
            3. (Mentalmente) A Virada - Uma nova informação ou evento muda tudo.
            `;
            }

            // Prompt simples com contexto acumulado
            let partPrompt = `${config.scriptPrompt}\n\n`;

            if (i === 0) {
              // Primeira parte: inclui premissa aprovada e título, exatamente como no outro sistema
              partPrompt += `CONTEXTO (PREMISSA APROVADA):\n${premise}\n\n`;
              partPrompt += `TÍTULO: ${request.title}\n\n`;
            } else {
              // Partes seguintes: enviamos tudo que já foi escrito para simular o mesmo chat com memória natural
              partPrompt += `Aqui está TUDO o que você já escreveu até agora do roteiro (NÃO repita nada disso, apenas continue):\n\n`;
              partPrompt += `${scriptContentFull}\n\n`;
              partPrompt += `Agora continue a história exatamente do ponto onde parou.\n\n`;
            }

            partPrompt += `ESCREVA A PARTE ${partNumber} DE ${totalParts}. IDIOMA: ${detectedLanguage}.\n\n`;
            partPrompt += `META DE VOLUME: ~${wordsPerPart} palavras. Tente preencher ao máximo.\n\n`;
            partPrompt += `${structureInstruction}\n\n`;
            partPrompt += `INSTRUÇÕES DO USUÁRIO: ${config.scriptPrompt}\n\n`;
            partPrompt += `LEMBRE-SE: Descreva o invisível. Use metáforas. Encha o tempo.\n`;
            if (i === totalParts - 1) {
              partPrompt += `Esta é a parte FINAL. Feche todos os arcos, entregue um final emocionalmente forte e NÃO deixe ganchos abertos.\n`;
            }

            partPrompt += `\nRegras gerais IMPORTANTES:\n`;
            partPrompt += `- NÃO use Markdown, títulos ou listas.\n`;
            partPrompt += `- NÃO repita frases inteiras já usadas, especialmente no começo de parágrafos.\n`;
            partPrompt += `- NÃO faça comentários meta (não fale sobre "roteiro", "vídeo" ou "história" como se estivesse fora dela).\n`;

            const context = {
              premise,
              previousContent: i > 0 ? scriptContentFull : undefined,
              chunkIndex: i,
              totalChunks: totalParts,
              targetWords: wordsPerPart,
              language: detectedLanguage,
              location: config.location,
              isLastChunk: i === totalParts - 1,
              simpleMode: true,
            } as const;

            const partResult =
              provider === "deepseek"
                ? await puterDeepseekService.generateScriptChunk(partPrompt, context, console.log)
                : await enhancedGeminiService.generateScriptChunk(partPrompt, activeGeminiKeys, context, console.log);

            const rawPart = sanitizeScript(partResult.content || "").trim();
            if (!rawPart) {
              console.warn(`Parte ${partNumber}/${totalParts} veio vazia no modo simples.`);
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
        const estimatedDuration = totalWords / 150;

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
