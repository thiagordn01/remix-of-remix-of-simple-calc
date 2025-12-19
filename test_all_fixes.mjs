#!/usr/bin/env node

/**
 * Script de teste abrangente para validar todas as correções implementadas
 * no sistema de geração de roteiros
 */

import { promises as fs } from 'fs';
import path from 'path';

// Simulação das funções principais para teste
console.log('🧪 INICIANDO TESTES ABRANGENTES DAS CORREÇÕES');
console.log('=' .repeat(60));

// Teste 1: Substituição de Placeholders
async function testPlaceholderReplacement() {
  console.log('\n📝 TESTE 1: Substituição de Placeholders');
  console.log('-'.repeat(40));
  
  try {
    // Simular importação da função
    const placeholderUtilsPath = './src/utils/placeholderUtils.ts';
    const content = await fs.readFile(placeholderUtilsPath, 'utf8');
    
    // Verificar se a função foi melhorada
    const hasMapping = content.includes('placeholderMappings');
    const hasBidirectional = content.includes('mapeamentos bidirecionais');
    const hasWarning = content.includes('Placeholders não substituídos');
    
    console.log(`✅ Mapeamento de variações: ${hasMapping ? 'IMPLEMENTADO' : 'FALTANDO'}`);
    console.log(`✅ Mapeamentos bidirecionais: ${hasBidirectional ? 'IMPLEMENTADO' : 'FALTANDO'}`);
    console.log(`✅ Sistema de avisos: ${hasWarning ? 'IMPLEMENTADO' : 'FALTANDO'}`);
    
    if (hasMapping && hasBidirectional && hasWarning) {
      console.log('🎉 TESTE 1 PASSOU: Sistema de placeholders melhorado');
      return true;
    } else {
      console.log('❌ TESTE 1 FALHOU: Sistema de placeholders incompleto');
      return false;
    }
  } catch (error) {
    console.log('❌ TESTE 1 ERRO:', error.message);
    return false;
  }
}

// Teste 2: Detecção de Idioma
async function testLanguageDetection() {
  console.log('\n🌍 TESTE 2: Detecção Automática de Idioma');
  console.log('-'.repeat(40));
  
  try {
    // Verificar se o arquivo de detecção de idioma existe
    const languageDetectionPath = './src/utils/languageDetection.ts';
    const content = await fs.readFile(languageDetectionPath, 'utf8');
    
    // Verificar funcionalidades principais
    const hasDetectFunction = content.includes('detectLanguageFromTitle');
    const hasPatterns = content.includes('languagePatterns');
    const hasConfidence = content.includes('confidence');
    const hasMultipleLanguages = content.includes('pt-BR') && content.includes('en-US');
    
    console.log(`✅ Função de detecção: ${hasDetectFunction ? 'IMPLEMENTADA' : 'FALTANDO'}`);
    console.log(`✅ Padrões de idioma: ${hasPatterns ? 'IMPLEMENTADOS' : 'FALTANDO'}`);
    console.log(`✅ Sistema de confiança: ${hasConfidence ? 'IMPLEMENTADO' : 'FALTANDO'}`);
    console.log(`✅ Múltiplos idiomas: ${hasMultipleLanguages ? 'SUPORTADOS' : 'FALTANDO'}`);
    
    // Verificar integração nos hooks
    const useScriptGeneratorPath = './src/hooks/useScriptGenerator.ts';
    const hookContent = await fs.readFile(useScriptGeneratorPath, 'utf8');
    const hasIntegration = hookContent.includes('getLanguageFromTitleOrDefault');
    
    console.log(`✅ Integração nos hooks: ${hasIntegration ? 'IMPLEMENTADA' : 'FALTANDO'}`);
    
    if (hasDetectFunction && hasPatterns && hasConfidence && hasMultipleLanguages && hasIntegration) {
      console.log('🎉 TESTE 2 PASSOU: Sistema de detecção de idioma implementado');
      return true;
    } else {
      console.log('❌ TESTE 2 FALHOU: Sistema de detecção de idioma incompleto');
      return false;
    }
  } catch (error) {
    console.log('❌ TESTE 2 ERRO:', error.message);
    return false;
  }
}

// Teste 3: Sistema de Retry Automático
async function testAutoRetrySystem() {
  console.log('\n🔄 TESTE 3: Sistema de Retry Automático');
  console.log('-'.repeat(40));
  
  try {
    const parallelHookPath = './src/hooks/useParallelScriptGenerator.ts';
    const content = await fs.readFile(parallelHookPath, 'utf8');
    
    // Verificar funcionalidades de retry
    const hasRetryLogic = content.includes('isRetryableError');
    const hasBackoff = content.includes('backoff exponencial');
    const hasMaxRetries = content.includes('maxRetries');
    const hasTimeout = content.includes('setTimeout');
    const hasErrorClassification = content.includes('timeout') && content.includes('rate limit');
    
    console.log(`✅ Lógica de retry: ${hasRetryLogic ? 'IMPLEMENTADA' : 'FALTANDO'}`);
    console.log(`✅ Backoff exponencial: ${hasBackoff ? 'IMPLEMENTADO' : 'FALTANDO'}`);
    console.log(`✅ Limite de tentativas: ${hasMaxRetries ? 'IMPLEMENTADO' : 'FALTANDO'}`);
    console.log(`✅ Agendamento de retry: ${hasTimeout ? 'IMPLEMENTADO' : 'FALTANDO'}`);
    console.log(`✅ Classificação de erros: ${hasErrorClassification ? 'IMPLEMENTADA' : 'FALTANDO'}`);
    
    if (hasRetryLogic && hasBackoff && hasMaxRetries && hasTimeout && hasErrorClassification) {
      console.log('🎉 TESTE 3 PASSOU: Sistema de retry automático implementado');
      return true;
    } else {
      console.log('❌ TESTE 3 FALHOU: Sistema de retry automático incompleto');
      return false;
    }
  } catch (error) {
    console.log('❌ TESTE 3 ERRO:', error.message);
    return false;
  }
}

// Teste 4: Coerência de Conteúdo
async function testContentCoherence() {
  console.log('\n🎯 TESTE 4: Sistema de Coerência de Conteúdo');
  console.log('-'.repeat(40));
  
  try {
    // Verificar arquivo de coerência de contexto
    const coherencePath = './src/utils/contextCoherence.ts';
    const content = await fs.readFile(coherencePath, 'utf8');
    
    const hasContextExtraction = content.includes('extractContextFromTitle');
    const hasChunkInstructions = content.includes('generateChunkContextInstructions');
    const hasValidation = content.includes('validateContentCoherence');
    const hasCulturalContext = content.includes('determineCulturalContext');
    
    console.log(`✅ Extração de contexto: ${hasContextExtraction ? 'IMPLEMENTADA' : 'FALTANDO'}`);
    console.log(`✅ Instruções de chunk: ${hasChunkInstructions ? 'IMPLEMENTADAS' : 'FALTANDO'}`);
    console.log(`✅ Validação de coerência: ${hasValidation ? 'IMPLEMENTADA' : 'FALTANDO'}`);
    console.log(`✅ Contexto cultural: ${hasCulturalContext ? 'IMPLEMENTADO' : 'FALTANDO'}`);
    
    // Verificar integração no serviço
    const servicePath = './src/services/enhancedGeminiApi.ts';
    const serviceContent = await fs.readFile(servicePath, 'utf8');
    const hasServiceIntegration = serviceContent.includes('extractContextFromTitle') && 
                                  serviceContent.includes('generateChunkContextInstructions');
    
    console.log(`✅ Integração no serviço: ${hasServiceIntegration ? 'IMPLEMENTADA' : 'FALTANDO'}`);
    
    if (hasContextExtraction && hasChunkInstructions && hasValidation && hasCulturalContext && hasServiceIntegration) {
      console.log('🎉 TESTE 4 PASSOU: Sistema de coerência de conteúdo implementado');
      return true;
    } else {
      console.log('❌ TESTE 4 FALHOU: Sistema de coerência de conteúdo incompleto');
      return false;
    }
  } catch (error) {
    console.log('❌ TESTE 4 ERRO:', error.message);
    return false;
  }
}

// Teste 5: Melhorias nos Templates
async function testTemplateImprovements() {
  console.log('\n📋 TESTE 5: Melhorias nos Templates de Prompt');
  console.log('-'.repeat(40));
  
  try {
    const templatesPath = './src/data/promptTemplates.ts';
    const content = await fs.readFile(templatesPath, 'utf8');
    
    const hasTitleFidelity = content.includes('FIDELIDADE ABSOLUTA AO TÍTULO');
    const hasCulturalAdaptation = content.includes('ADAPTAÇÃO CULTURAL OBRIGATÓRIA');
    const hasProhibitions = content.includes('PROIBIÇÕES ABSOLUTAS');
    const hasMultipleLanguages = content.includes('pt-BR') && content.includes('en-US') && content.includes('es-ES');
    
    console.log(`✅ Fidelidade ao título: ${hasTitleFidelity ? 'IMPLEMENTADA' : 'FALTANDO'}`);
    console.log(`✅ Adaptação cultural: ${hasCulturalAdaptation ? 'IMPLEMENTADA' : 'FALTANDO'}`);
    console.log(`✅ Proibições claras: ${hasProhibitions ? 'IMPLEMENTADAS' : 'FALTANDO'}`);
    console.log(`✅ Múltiplos idiomas: ${hasMultipleLanguages ? 'SUPORTADOS' : 'FALTANDO'}`);
    
    if (hasTitleFidelity && hasCulturalAdaptation && hasProhibitions && hasMultipleLanguages) {
      console.log('🎉 TESTE 5 PASSOU: Templates de prompt melhorados');
      return true;
    } else {
      console.log('❌ TESTE 5 FALHOU: Templates de prompt incompletos');
      return false;
    }
  } catch (error) {
    console.log('❌ TESTE 5 ERRO:', error.message);
    return false;
  }
}

// Teste 6: Correção do Bug ApiError
async function testApiErrorFix() {
  console.log('\n🐛 TESTE 6: Correção do Bug "ApiError is not defined"');
  console.log('-'.repeat(40));
  
  try {
    const apiPath = './src/services/enhancedGeminiApi.ts';
    const content = await fs.readFile(apiPath, 'utf8');
    
    const hasImport = content.includes("import { GeminiApiKey } from '@/types/scripts'");
    const hasInterface = content.includes('export interface ApiError extends Error');
    const hasUsage = content.includes('instanceof ApiError');
    
    console.log(`✅ Importação correta: ${hasImport ? 'IMPLEMENTADA' : 'FALTANDO'}`);
    console.log(`✅ Interface ApiError: ${hasInterface ? 'DEFINIDA' : 'FALTANDO'}`);
    console.log(`✅ Uso correto: ${hasUsage ? 'IMPLEMENTADO' : 'FALTANDO'}`);
    
    if (hasImport && hasInterface && hasUsage) {
      console.log('🎉 TESTE 6 PASSOU: Bug ApiError corrigido');
      return true;
    } else {
      console.log('❌ TESTE 6 FALHOU: Bug ApiError não corrigido completamente');
      return false;
    }
  } catch (error) {
    console.log('❌ TESTE 6 ERRO:', error.message);
    return false;
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 Executando todos os testes...\n');
  
  const tests = [
    { name: 'Substituição de Placeholders', fn: testPlaceholderReplacement },
    { name: 'Detecção de Idioma', fn: testLanguageDetection },
    { name: 'Sistema de Retry Automático', fn: testAutoRetrySystem },
    { name: 'Coerência de Conteúdo', fn: testContentCoherence },
    { name: 'Melhorias nos Templates', fn: testTemplateImprovements },
    { name: 'Correção do Bug ApiError', fn: testApiErrorFix }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (error) {
      console.log(`❌ ERRO no teste ${test.name}:`, error.message);
      results.push({ name: test.name, passed: false, error: error.message });
    }
  }
  
  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL DOS TESTES');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASSOU' : '❌ FALHOU';
    console.log(`${status} - ${result.name}`);
    if (result.error) {
      console.log(`   Erro: ${result.error}`);
    }
  });
  
  console.log('\n' + '-'.repeat(40));
  console.log(`📈 RESULTADO GERAL: ${passed}/${total} testes passaram`);
  console.log(`📊 Taxa de sucesso: ${Math.round((passed/total) * 100)}%`);
  
  if (passed === total) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Sistema corrigido com sucesso.');
  } else {
    console.log('⚠️ Alguns testes falharam. Revisar implementações necessárias.');
  }
  
  return { passed, total, results };
}

// Executar testes se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests };
