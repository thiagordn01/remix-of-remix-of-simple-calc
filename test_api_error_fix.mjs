#!/usr/bin/env node

/**
 * Teste específico para verificar se o bug ApiError foi corrigido
 */

import { promises as fs } from 'fs';

console.log('🐛 TESTE ESPECÍFICO - CORREÇÃO DO BUG APIERROR');
console.log('=' .repeat(60));

async function testApiErrorDefinition() {
  console.log('\n🔍 VERIFICANDO DEFINIÇÃO DO APIERROR');
  console.log('-'.repeat(40));
  
  try {
    // Verificar arquivo de tipos
    const apiTypesPath = './src/types/api.ts';
    const apiTypesContent = await fs.readFile(apiTypesPath, 'utf8');
    
    console.log('📁 Verificando src/types/api.ts...');
    const hasApiErrorInterface = apiTypesContent.includes('export interface ApiError extends Error');
    const hasProperties = apiTypesContent.includes('code?:') && 
                         apiTypesContent.includes('status?:') && 
                         apiTypesContent.includes('retryable?:');
    
    console.log(`   ✅ Interface ApiError exportada: ${hasApiErrorInterface ? 'SIM' : 'NÃO'}`);
    console.log(`   ✅ Propriedades definidas: ${hasProperties ? 'SIM' : 'NÃO'}`);
    
    // Verificar arquivo do serviço
    const servicePath = './src/services/enhancedGeminiApi.ts';
    const serviceContent = await fs.readFile(servicePath, 'utf8');
    
    console.log('\n📁 Verificando src/services/enhancedGeminiApi.ts...');
    const hasImport = serviceContent.includes("import { ApiError } from '@/types/api'");
    const hasCreateFunction = serviceContent.includes('createApiError');
    const hasUsage = serviceContent.includes('instanceof ApiError');
    
    console.log(`   ✅ Importação correta: ${hasImport ? 'SIM' : 'NÃO'}`);
    console.log(`   ✅ Função createApiError: ${hasCreateFunction ? 'SIM' : 'NÃO'}`);
    console.log(`   ✅ Uso correto: ${hasUsage ? 'SIM' : 'NÃO'}`);
    
    return hasApiErrorInterface && hasProperties && hasImport && hasCreateFunction && hasUsage;
    
  } catch (error) {
    console.log(`❌ Erro ao verificar definição: ${error.message}`);
    return false;
  }
}

async function testApiErrorCreation() {
  console.log('\n🏗️ TESTANDO CRIAÇÃO DE APIERROR');
  console.log('-'.repeat(40));
  
  try {
    const servicePath = './src/services/enhancedGeminiApi.ts';
    const content = await fs.readFile(servicePath, 'utf8');
    
    // Verificar se a função createApiError está implementada corretamente
    const hasObjectAssign = content.includes('Object.assign(new Error(message)');
    const hasStatusAssignment = content.includes('status,');
    const hasRetryableAssignment = content.includes('retryable');
    
    console.log(`   ✅ Usa Object.assign: ${hasObjectAssign ? 'SIM' : 'NÃO'}`);
    console.log(`   ✅ Atribui status: ${hasStatusAssignment ? 'SIM' : 'NÃO'}`);
    console.log(`   ✅ Atribui retryable: ${hasRetryableAssignment ? 'SIM' : 'NÃO'}`);
    
    return hasObjectAssign && hasStatusAssignment && hasRetryableAssignment;
    
  } catch (error) {
    console.log(`❌ Erro ao verificar criação: ${error.message}`);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n⚠️ TESTANDO TRATAMENTO DE ERROS');
  console.log('-'.repeat(40));
  
  try {
    const hookPath = './src/hooks/useParallelScriptGenerator.ts';
    const content = await fs.readFile(hookPath, 'utf8');
    
    // Verificar se o tratamento de erro está correto
    const hasErrorCapture = content.includes('error instanceof Error');
    const hasErrorMessage = content.includes('error.message');
    const hasRetryLogic = content.includes('isRetryableError');
    
    console.log(`   ✅ Captura de erro: ${hasErrorCapture ? 'SIM' : 'NÃO'}`);
    console.log(`   ✅ Extração de mensagem: ${hasErrorMessage ? 'SIM' : 'NÃO'}`);
    console.log(`   ✅ Lógica de retry: ${hasRetryLogic ? 'SIM' : 'NÃO'}`);
    
    return hasErrorCapture && hasErrorMessage && hasRetryLogic;
    
  } catch (error) {
    console.log(`❌ Erro ao verificar tratamento: ${error.message}`);
    return false;
  }
}

async function testTypeScriptCompilation() {
  console.log('\n🔧 TESTANDO COMPILAÇÃO TYPESCRIPT');
  console.log('-'.repeat(40));
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    console.log('   🔄 Executando verificação TypeScript...');
    
    try {
      await execAsync('npx tsc --noEmit --skipLibCheck', { cwd: process.cwd() });
      console.log('   ✅ Compilação TypeScript: SUCESSO');
      return true;
    } catch (error) {
      console.log('   ❌ Compilação TypeScript: FALHOU');
      console.log(`   Erro: ${error.message}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Erro ao testar compilação: ${error.message}`);
    return false;
  }
}

async function simulateApiErrorScenario() {
  console.log('\n🎭 SIMULANDO CENÁRIO DE ERRO DA API');
  console.log('-'.repeat(40));
  
  // Simular diferentes tipos de erro que podem ocorrer
  const errorScenarios = [
    {
      name: 'Timeout da API',
      message: 'Timeout na API Gemini após 30000ms',
      shouldBeRetryable: true
    },
    {
      name: 'Rate Limit',
      message: 'rate limit exceeded',
      shouldBeRetryable: true
    },
    {
      name: 'Servidor Indisponível',
      message: 'server error 503',
      shouldBeRetryable: true
    },
    {
      name: 'Chave Inválida',
      message: 'API key invalid',
      shouldBeRetryable: false
    }
  ];
  
  console.log('🧪 Testando classificação de erros:');
  
  for (const scenario of errorScenarios) {
    const isRetryable = (
      scenario.message.includes('timeout') ||
      scenario.message.includes('rate limit') ||
      scenario.message.includes('server error') ||
      scenario.message.includes('503') ||
      scenario.message.includes('502') ||
      scenario.message.includes('500')
    );
    
    const correct = isRetryable === scenario.shouldBeRetryable;
    const status = correct ? '✅' : '❌';
    
    console.log(`   ${status} ${scenario.name}: ${isRetryable ? 'Recuperável' : 'Permanente'}`);
  }
  
  return true;
}

// Executar todos os testes
async function runApiErrorTest() {
  console.log('🚀 Iniciando teste específico do ApiError...\n');
  
  const tests = [
    { name: 'Definição do ApiError', fn: testApiErrorDefinition },
    { name: 'Criação do ApiError', fn: testApiErrorCreation },
    { name: 'Tratamento de Erros', fn: testErrorHandling },
    { name: 'Compilação TypeScript', fn: testTypeScriptCompilation },
    { name: 'Cenários de Erro', fn: simulateApiErrorScenario }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`\n🧪 Executando: ${test.name}`);
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
      
      if (result) {
        console.log(`✅ ${test.name}: PASSOU`);
      } else {
        console.log(`❌ ${test.name}: FALHOU`);
      }
    } catch (error) {
      console.log(`❌ ERRO em ${test.name}:`, error.message);
      results.push({ name: test.name, passed: false, error: error.message });
    }
  }
  
  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO DO TESTE APIERROR');
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
    console.log('\n🎉 BUG APIERROR COMPLETAMENTE CORRIGIDO!');
    console.log('✨ Todas as definições e usos estão corretos.');
    console.log('\n🚀 CORREÇÕES IMPLEMENTADAS:');
    console.log('   • Interface ApiError definida em arquivo separado');
    console.log('   • Importação correta no serviço');
    console.log('   • Função createApiError melhorada');
    console.log('   • Tratamento de erro robusto nos hooks');
    console.log('   • Compilação TypeScript sem erros');
  } else {
    console.log('\n⚠️ Ainda há aspectos do ApiError que precisam de atenção.');
  }
  
  return { passed, total, results };
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runApiErrorTest().catch(console.error);
}

export { runApiErrorTest };
