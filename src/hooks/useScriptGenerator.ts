import { useState, useCallback } from 'react';
import { ScriptGenerationRequest, ScriptGenerationResult, ScriptGenerationProgress, GeminiApiKey, ScriptChunk, AIProvider } from '@/types/scripts';
import { Agent } from '@/types/agents';
import { enhancedGeminiService } from '@/services/enhancedGeminiApi';
import { puterDeepseekService } from '@/services/puterDeepseekService';
import { injectPremiseContext, buildMinimalChunkPrompt, extractLastParagraph } from '@/utils/promptInjector';
import { cleanFinalScript, validateScriptQuality } from '@/utils/scriptCleanup';
import { useToast } from '@/hooks/use-toast';

/**
 * ✅ VERSÃO 3.1 - ARQUITETURA DE CONTEXTO PROGRESSIVO
 *
 * Mudanças na versão 3.1:
 * - Acumula resumo progressivo entre seções
 * - Passa lista de eventos já narrados para evitar duplicação
 * - Anti-repetição explícita com eventos listados
 *
 * Mudanças principais:
 * 1. Premissa é gerada com SEÇÕES NUMERADAS
 * 2. Cada chunk gera APENAS uma seção específica (não "continua")
 * 3. NÃO enviamos texto anterior - elimina duplicação
 * 4. Número de chunks = número de seções na premissa
 */

/**
 * Conta quantas seções existem na premissa
 */
function countSectionsInPremise(premise: string): number {
  const matches = premise.match(/\[SEÇÃO\s*\d+/gi);
  return matches ? matches.length : Math.max(3, Math.ceil(premise.split(/\s+/).length / 200));
}

/**
 * Remove metadados técnicos do texto gerado (segurança extra)
 */
function sanitizeScript(text: string): string {
  let sanitized = text;
  
  // Remove tags de produção [IMAGEM: ...], [MÚSICA: ...], etc
  sanitized = sanitized.replace(/\[(?:IMAGEM|IMAGEN|IMAGE|MÚSICA|MUSIC|SFX|CENA|SCENE|SOUND|IMG|FOTO|PHOTO|EFEITO|EFFECT)[:\s][^\]]*\]/gi, '');
  
  // Remove colchetes com instruções de produção (maiúsculas no início)
  sanitized = sanitized.replace(/\[[A-Z][A-Z\s]{2,30}:[^\]]*\]/g, '');
  
  // Limpa múltiplas quebras de linha criadas pela remoção
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  // Remove linhas que ficaram vazias no início
  sanitized = sanitized.replace(/^\s*\n/, '');
  
  return sanitized.trim();
}

export const useScriptGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ScriptGenerationProgress | null>(null);
  const [result, setResult] = useState<ScriptGenerationResult | null>(null);
  const { toast } = useToast();

  const generateScript = useCallback(async (
    request: ScriptGenerationRequest,
    agent: Agent | null,
    apiKeys: GeminiApiKey[],
    provider: AIProvider = 'gemini'
  ): Promise<ScriptGenerationResult> => {
    setIsGenerating(true);
    setProgress(null);
    setResult(null);

    try {
      // SEMPRE usar idioma configurado pelo usuário (NUNCA detectar automaticamente)
      const detectedLanguage = request.language || agent?.language || 'pt-BR';

      console.log('🔍 Idioma configurado:', {
        titulo: request.title,
        idiomaRequest: request.language,
        idiomaAgent: agent?.language,
        idiomaFinal: detectedLanguage
      });

      // Usar configurações do agente como fallback
      const config = {
        channelName: request.channelName || agent?.channelName || '',
        premisePrompt: request.premisePrompt || agent?.premisePrompt || '',
        scriptPrompt: request.scriptPrompt || agent?.scriptPrompt || '',
        duration: request.duration || agent?.duration || 10,
        language: detectedLanguage, // Prioriza configuração explícita, fallback para detecção
        location: request.location || agent?.location || 'Brasil'
      };

      // Validar configurações
      if (!config.premisePrompt || !config.scriptPrompt) {
        throw new Error('Prompts de premissa e roteiro são obrigatórios');
      }

      if (!config.channelName) {
        throw new Error('Nome do canal é obrigatório');
      }

      // Filtrar APIs ativas baseado no provedor selecionado
      const activeGeminiKeys = apiKeys.filter(key =>
        key.isActive &&
        key.status !== 'suspended' &&
        key.status !== 'invalid'
      );

      // Verificar se o provedor selecionado esta disponivel
      if (provider === 'gemini' && activeGeminiKeys.length === 0) {
        throw new Error('Nenhuma API key Gemini ativa disponivel');
      }
      if (provider === 'deepseek' && !puterDeepseekService.isAvailable()) {
        // Tentar aguardar o Puter.js carregar
        const available = await puterDeepseekService.waitForPuter(5000);
        if (!available) {
          throw new Error('DeepSeek (Puter.js) nao esta disponivel. Recarregue a pagina.');
        }
      }

      const providerName = provider === 'gemini' ? 'Gemini' : 'DeepSeek';
      console.log(`Usando provedor: ${providerName}`);

      // Gerar premissa sem meta rígida fixa de palavras (controle via prompt do criador)
      const premiseTargetWords = request.premiseWordTarget ?? 0;
      
      setProgress({
        stage: 'premise',
        currentChunk: 1,
        totalChunks: 1,
        completedWords: 0,
        targetWords: premiseTargetWords || 0,
        isComplete: false,
        percentage: 10
      });

      // Calcular número de seções para diagnóstico apenas (não usamos mais estrutura fixa)
      const numberOfSectionsForPremise = Math.max(3, Math.ceil(config.duration / 3));

      // Injetar contexto automaticamente no prompt de premissa (modelo minimalista, sem meta de palavras)
      const processedPremisePrompt = injectPremiseContext(config.premisePrompt, {
        title: request.title,
        channelName: config.channelName,
        duration: config.duration,
        language: config.language,
        location: config.location
      });

      console.log(`Solicitando premissa (diagnóstico: ${numberOfSectionsForPremise} secoes) com provedor ${providerName}`);

      // Gerar premissa usando o provedor selecionado
      const premiseResult = provider === 'deepseek'
        ? await puterDeepseekService.generatePremise(
            processedPremisePrompt,
            premiseTargetWords || undefined,
            (message) => console.log('Premissa (DeepSeek):', message)
          )
        : await enhancedGeminiService.generatePremise(
            processedPremisePrompt,
            activeGeminiKeys,
            premiseTargetWords || undefined,
            (message) => console.log('Premissa (Gemini):', message)
          );

      const premise = premiseResult.content; // ✅ Extrair content do resultado
      const premiseWordCount = premise.split(/\s+/).length;
      console.log(`✅ Premissa gerada: ${premiseWordCount} palavras`);

      // Calcular palavras alvo com base na duração
      const targetWords = config.duration * 170;

      // Definir número de partes baseado em blocos de ~10 minutos
      const minutesPerChunk = 10;
      const numberOfChunks = Math.max(1, Math.ceil(config.duration / minutesPerChunk));
      const wordsPerChunk = Math.ceil(targetWords / numberOfChunks);

      console.log(`📊 Diagnóstico de geração:
  - Duração: ${config.duration} min
  - Palavras alvo total: ${targetWords}
  - Partes (chunks): ${numberOfChunks}
  - Palavras por parte: ${wordsPerChunk}
  - Idioma: ${detectedLanguage}
  - Provedor: ${providerName}
`);

      setProgress({
        stage: 'script',
        currentChunk: 1,
        totalChunks: numberOfChunks,
        completedWords: 0,
        targetWords: targetWords,
        isComplete: false,
        percentage: 35,
        message: `Iniciando geração do roteiro (${numberOfChunks} partes)...`
      });

      let scriptContent = '';
      const scriptChunks: ScriptChunk[] = [];

      for (let i = 0; i < numberOfChunks; i++) {
        const chunkTargetWords = wordsPerChunk;

        setProgress({
          stage: 'script',
          currentChunk: i + 1,
          totalChunks: numberOfChunks,
          completedWords: scriptContent.split(/\s+/).length,
          targetWords: targetWords,
          isComplete: false,
          percentage: 35 + ((i / numberOfChunks) * 55),
          message: `Gerando parte ${i + 1}/${numberOfChunks}...`
        });

        // ✅ SISTEMA ALINHADO AO APP DE REFERÊNCIA
        // Para evitar reboots e duplicações, NÃO reenviamos o roteiro inteiro.
        // Só usamos um pequeno trecho final como âncora de continuidade, e apenas
        // quando necessário.
        const lastParagraph = scriptContent ? extractLastParagraph(scriptContent) : '';

        const chunkPrompt = buildMinimalChunkPrompt(config.scriptPrompt, {
          title: request.title,
          language: detectedLanguage,
          targetWords: chunkTargetWords,
          premise: premise,
          chunkIndex: i,
          totalChunks: numberOfChunks,
          lastParagraph: i > 0 && lastParagraph ? lastParagraph : undefined
        });

        // Contexto passado para diagnósticos internos e DeepSeek.
        // Para Gemini, o serviço já ignora previousContent no prompt para
        // manter o comportamento próximo de uma conversa contínua por seção.
        const chunkContext = {
          premise,
          previousContent: provider === 'deepseek' ? scriptContent : '',
          chunkIndex: i,
          totalChunks: numberOfChunks,
          targetWords: chunkTargetWords,
          language: detectedLanguage,
          location: config.location,
          isLastChunk: i === numberOfChunks - 1
        };

        const chunkResult = provider === 'deepseek'
          ? await puterDeepseekService.generateScriptChunk(
              chunkPrompt,
              chunkContext,
              (message) => console.log(`Roteiro parte ${i + 1} (DeepSeek):`, message)
            )
          : await enhancedGeminiService.generateScriptChunk(
              chunkPrompt,
              activeGeminiKeys,
              chunkContext,
              (message) => console.log(`Roteiro parte ${i + 1} (Gemini):`, message)
            );

        // Limpeza técnica leve por chunk (metadados e formatação básica)
        const cleanedChunk = sanitizeScript(chunkResult.content);
        const chunkWordCount = cleanedChunk.split(/\s+/).length;

        console.log(`\n═══════════════════════════════════════════════════`);
        console.log(`📝 PARTE ${i + 1}/${numberOfChunks} GERADA`);
        console.log(`📊 Palavras: ${chunkWordCount}`);
        console.log(`═══════════════════════════════════════════════════\n`);

        // Concatenar ao roteiro bruto
        scriptContent += (scriptContent ? '\n\n' : '') + cleanedChunk;

        // Atualizar progresso
        setProgress({
          stage: 'script',
          currentChunk: i + 1,
          totalChunks: numberOfChunks,
          completedWords: scriptContent.split(/\s+/).length,
          targetWords: targetWords,
          isComplete: false,
          percentage: 35 + (((i + 1) / numberOfChunks) * 55),
          currentApiKey: chunkResult.usedApiId,
          message: `Parte ${i + 1}/${numberOfChunks} concluída`
        });

        const scriptChunk: ScriptChunk = {
          id: crypto.randomUUID(),
          content: cleanedChunk,
          wordCount: chunkWordCount,
          chunkIndex: i,
          isComplete: true
        };
        scriptChunks.push(scriptChunk);
      }

      // Aplicar limpeza COMPLETA apenas sobre o roteiro final concatenado
      const joinedScript = scriptChunks.map(chunk => chunk.content).join('\n\n');
      const cleanedFullScript = cleanFinalScript(joinedScript);
      const cleanedParagraphs = cleanedFullScript.split(/\n\n+/);

      const normalizedChunks: ScriptChunk[] = cleanedParagraphs.map((content, index) => ({
        id: crypto.randomUUID(),
        content,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        chunkIndex: index,
        isComplete: true,
      }));

      const script = normalizedChunks.map(chunk => chunk.content);
      const totalWords = normalizedChunks.reduce((sum, chunk) => sum + chunk.wordCount, 0);
      const estimatedDuration = totalWords / 170;

      // Diagnóstico técnico simples da qualidade final
      const quality = validateScriptQuality(cleanedFullScript, targetWords);
      console.log('📊 Qualidade técnica do roteiro:', quality);

      const finalResult: ScriptGenerationResult = {
        premise,
        script,
        chunks: normalizedChunks,
        totalWords,
        estimatedDuration,
        agentUsed: agent?.name
      };

      setResult(finalResult);
      setProgress({
        stage: 'script',
        currentChunk: normalizedChunks.length,
        totalChunks: normalizedChunks.length,
        completedWords: targetWords,
        targetWords: targetWords,
        isComplete: true,
        percentage: 100
      });

      toast({
        title: "Roteiro gerado com sucesso!",
        description: `${totalWords} palavras, duração estimada: ${Math.round(estimatedDuration)} minutos`
      });

      return finalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro na geração",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  const clearResult = useCallback(() => {
    setResult(null);
    setProgress(null);
  }, []);

  return {
    generateScript,
    clearResult,
    isGenerating,
    progress,
    result
  };
};
