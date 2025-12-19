import { useState, useCallback } from 'react';
import { ScriptGenerationRequest, ScriptGenerationResult, ScriptGenerationProgress, GeminiApiKey, ScriptChunk, AIProvider } from '@/types/scripts';
import { Agent } from '@/types/agents';
import { enhancedGeminiService } from '@/services/enhancedGeminiApi';
import { puterDeepseekService } from '@/services/puterDeepseekService';
import { injectPremiseContext, buildChunkPrompt, generateProgressiveSummary, ProgressiveSummary } from '@/utils/promptInjector';
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

      // Gerar premissa usando Enhanced Gemini Service
      const premiseTargetWords = 700;
      
      setProgress({
        stage: 'premise',
        currentChunk: 1,
        totalChunks: 1,
        completedWords: 0,
        targetWords: premiseTargetWords,
        isComplete: false,
        percentage: 10
      });

      // ✅ VERSÃO 2.0: Calcular número de seções baseado na duração
      // Mais seções = mais chunks = melhor granularidade
      const numberOfSectionsForPremise = Math.max(3, Math.ceil(config.duration / 3));

      // Injetar contexto automaticamente no prompt de premissa
      const processedPremisePrompt = injectPremiseContext(config.premisePrompt, {
        title: request.title,
        channelName: config.channelName,
        duration: config.duration,
        language: config.language,
        location: config.location
      }, numberOfSectionsForPremise);

      console.log(`Solicitando premissa com ${numberOfSectionsForPremise} secoes (${providerName})`);

      // Gerar premissa usando o provedor selecionado
      const premiseResult = provider === 'deepseek'
        ? await puterDeepseekService.generatePremise(
            processedPremisePrompt,
            premiseTargetWords,
            (message) => console.log('Premissa (DeepSeek):', message)
          )
        : await enhancedGeminiService.generatePremise(
            processedPremisePrompt,
            activeGeminiKeys,
            premiseTargetWords,
            (message) => console.log('Premissa (Gemini):', message)
          );

      const premise = premiseResult.content; // ✅ Extrair content do resultado
      const premiseWordCount = premise.split(/\s+/).length;
      console.log(`✅ Premissa gerada: ${premiseWordCount} palavras`);

      // ✅ VERSÃO 2.0: Calcular número de seções baseado na premissa
      const targetWords = config.duration * 170;
      const numberOfSections = countSectionsInPremise(premise);
      const wordsPerSection = Math.ceil(targetWords / numberOfSections);

      console.log(`📊 Diagnóstico de geração:
  - Duração: ${config.duration} min
  - Palavras alvo total: ${targetWords}
  - Seções na premissa: ${numberOfSections}
  - Palavras por seção: ${wordsPerSection}
  - Idioma: ${detectedLanguage}
  - Provedor: ${providerName}
`);

      setProgress({
        stage: 'script',
        currentChunk: 1,
        totalChunks: numberOfSections,
        completedWords: 0,
        targetWords: targetWords,
        isComplete: false,
        percentage: 35,
        message: `Iniciando geração do roteiro (${numberOfSections} seções)...`
      });

      let scriptContent = '';
      const scriptChunks: ScriptChunk[] = [];

      // ✅ VERSÃO 3.1: Inicializar resumo progressivo
      let progressiveSummary: ProgressiveSummary = {
        eventsNarrated: [],
        revelationsMade: [],
        lastSentences: '',
        totalWordsWritten: 0,
        sectionsCompleted: 0
      };

      // ✅ VERSÃO 3.1: SEMPRE gerar em seções com contexto progressivo
      // Cada seção recebe informação do que já foi narrado para evitar repetição
      if (true) { // Sempre usar seções
        const numberOfChunks = numberOfSections;

        for (let i = 0; i < numberOfChunks; i++) {
          // ✅ VERSÃO 3.1: Cada seção tem ~wordsPerSection palavras
          const chunkTargetWords = wordsPerSection;
          
      setProgress({
        stage: 'script',
        currentChunk: i + 1,
        totalChunks: numberOfChunks,
        completedWords: scriptContent.split(/\s+/).length,
        targetWords: targetWords,
        isComplete: false,
        percentage: 35 + ((i / numberOfChunks) * 55),
        message: `Gerando chunk ${i + 1}/${numberOfChunks}...`
      });

          // ✅ VERSÃO 3.1: Usar buildChunkPrompt com CONTEXTO PROGRESSIVO
          const chunkPrompt = buildChunkPrompt(config.scriptPrompt, {
            title: request.title,
            channelName: config.channelName,
            duration: config.duration,
            language: detectedLanguage,
            location: config.location,
            premise: premise, // ✅ SEMPRE presente
            previousContent: scriptContent, // ✅ TODO o roteiro acumulado
            chunkIndex: i,
            totalChunks: numberOfChunks,
            targetWords: chunkTargetWords,
            progressiveSummary: progressiveSummary // ✅ NOVO: Resumo progressivo para anti-repetição
          });

          // Gerar chunk usando o provedor selecionado
          const chunkContext = {
            premise,
            previousContent: scriptContent,
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

          // ✅ VERSÃO 2.0: Seções são independentes - não há duplicação
          // ✅ Sanitizar para remover metadados técnicos que escaparam
          const chunk = sanitizeScript(chunkResult.content);
          const chunkWordCount = chunk.split(/\s+/).length;

          console.log(`\n═══════════════════════════════════════════════════`);
          console.log(`📝 SEÇÃO ${i + 1}/${numberOfChunks} GERADA`);
          console.log(`📊 Palavras: ${chunkWordCount}`);
          console.log(`═══════════════════════════════════════════════════\n`);

          // ✅ Diagnóstico de fechamento (última seção)
          if (i === numberOfChunks - 1) {
            const lastWords = chunk.slice(-300);
            console.log(`\n🏁 DIAGNÓSTICO DO FECHAMENTO:`);
            console.log(`📝 Últimas 300 chars:`, lastWords);
            
            // Verificar padrões de CTA
            const hasCTA = /inscrev|curt|coment|like|subscribe|sininho/i.test(lastWords);
            const hasEnding = /\.$|!$|\?$/.test(lastWords.trim());
            
            console.log(`🎯 Contém CTA: ${hasCTA ? '✅' : '❌'}`);
            console.log(`📌 Termina com pontuação: ${hasEnding ? '✅' : '❌'}`);
          }

          // Concatenar ao roteiro
          scriptContent += (scriptContent ? '\n\n' : '') + chunk;

          // ✅ VERSÃO 3.1: Atualizar resumo progressivo após cada chunk
          progressiveSummary = generateProgressiveSummary(scriptContent, progressiveSummary);
          console.log(`📊 Resumo progressivo atualizado:
  - Seções completadas: ${progressiveSummary.sectionsCompleted}
  - Palavras escritas: ${progressiveSummary.totalWordsWritten}
  - Últimas frases: "${progressiveSummary.lastSentences.slice(0, 100)}..."`);

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
            message: `Chunk ${i + 1}/${numberOfChunks} concluído`
          });

          const scriptChunk: ScriptChunk = {
            id: crypto.randomUUID(),
            content: chunk,
            wordCount: chunkWordCount,
            chunkIndex: i,
            isComplete: true
          };
          scriptChunks.push(scriptChunk);
        }
      }
      // ✅ VERSÃO 2.0: Removido bloco else - agora SEMPRE usamos seções independentes

      const script = scriptChunks.map(chunk => chunk.content);
      const totalWords = scriptChunks.reduce((sum, chunk) => sum + chunk.wordCount, 0);
      const estimatedDuration = totalWords / 170;

      const finalResult: ScriptGenerationResult = {
        premise,
        script,
        chunks: scriptChunks,
        totalWords,
        estimatedDuration,
        agentUsed: agent?.name
      };

      setResult(finalResult);
      setProgress({
        stage: 'script',
        currentChunk: scriptChunks.length,
        totalChunks: scriptChunks.length,
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
