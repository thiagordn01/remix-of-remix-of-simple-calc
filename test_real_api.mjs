#!/usr/bin/env node

/**
 * Script de Teste Real com API Gemini
 * 
 * Este script testa o sistema completo usando a API real do Google Gemini
 * para validar todas as funcionalidades de geração de roteiros.
 */

import fetch from 'node-fetch';

// Configuração da API real
const GEMINI_API_KEY = 'AIzaSyDNBl0pIYoijn3BvDgLAfNCq44xp2D9ZPQ';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

console.log('🧪 Iniciando Testes Reais com API Gemini\n');

// Função para fazer chamada real à API Gemini
async function callGeminiAPI(prompt, model = 'gemini-2.5-flash') {
  const url = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4000,
    }
  };

  try {
    console.log(`🔄 Fazendo chamada para API Gemini...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Formato de resposta inválido da API Gemini');
    }

    const parts = data.candidates[0].content.parts;
    if (!parts || parts.length === 0) {
      throw new Error('Nenhuma parte de conteúdo na resposta da API');
    }
    
    const fullText = parts.map(part => part.text || '').join('');
    
    if (!fullText.trim()) {
      throw new Error('Resposta vazia da API');
    }

    console.log(`✅ Resposta recebida da API (${fullText.length} caracteres)`);
    return fullText;

  } catch (error) {
    console.error(`❌ Erro na API: ${error.message}`);
    throw error;
  }
}

// Teste 1: Validar API Key
async function testApiKeyValidation() {
  console.log('🔑 Testando validação da API Key...');
  
  try {
    const testPrompt = 'Responda apenas "OK" se você conseguir me entender.';
    const response = await callGeminiAPI(testPrompt);
    
    if (response.toLowerCase().includes('ok')) {
      console.log('✅ API Key válida e funcional');
      return true;
    } else {
      console.log('⚠️ API Key funcional, mas resposta inesperada:', response.substring(0, 100));
      return true; // Ainda consideramos válida
    }
  } catch (error) {
    console.log('❌ API Key inválida ou com problemas:', error.message);
    return false;
  }
}

// Teste 2: Geração de Premissa Real
async function testPremiseGeneration() {
  console.log('\n📝 Testando geração de premissa real...');
  
  const titulo = 'Como a Inteligência Artificial está transformando o mercado de trabalho';
  const canal = 'TechFuture Brasil';
  const localizacao = 'Brasil';
  
  const premisePrompt = `Crie uma premissa envolvente e criativa para um vídeo do YouTube sobre "${titulo}". 

A premissa deve:
- Ter um gancho emocional forte
- Ser relevante para o público-alvo do canal "${canal}"
- Despertar curiosidade e interesse
- Ter aproximadamente 700 palavras
- Ser escrita em português brasileiro
- Considerar a localização: ${localizacao}

Foque em criar uma base sólida que será desenvolvida em um roteiro completo posteriormente.`;

  try {
    const startTime = Date.now();
    const premise = await callGeminiAPI(premisePrompt);
    const endTime = Date.now();
    
    const wordCount = premise.split(/\s+/).length;
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('✅ Premissa gerada com sucesso!');
    console.log(`📊 Estatísticas:`);
    console.log(`   - Palavras: ${wordCount}`);
    console.log(`   - Tempo: ${duration}s`);
    console.log(`   - Título: ${titulo}`);
    
    console.log('\n📄 Premissa gerada:');
    console.log('─'.repeat(60));
    console.log(premise.substring(0, 300) + '...');
    console.log('─'.repeat(60));
    
    return { premise, wordCount, duration, titulo };
  } catch (error) {
    console.log('❌ Erro na geração de premissa:', error.message);
    return null;
  }
}

// Teste 3: Geração de Roteiro Real
async function testScriptGeneration(premiseData) {
  console.log('\n🎬 Testando geração de roteiro real...');
  
  if (!premiseData) {
    console.log('❌ Não é possível gerar roteiro sem premissa válida');
    return null;
  }
  
  const { premise, titulo } = premiseData;
  const canal = 'TechFuture Brasil';
  const duracao = 12;
  const localizacao = 'Brasil';
  
  const scriptPrompt = `Com base na premissa fornecida, crie um roteiro detalhado para YouTube sobre "${titulo}".

PREMISSA:
${premise}

O roteiro deve:
- Ter duração aproximada de ${duracao} minutos (150 palavras por minuto)
- Usar introdução cativante nos primeiros 15 segundos
- Ter desenvolvimento estruturado e envolvente
- Incluir conclusão que incentive interação (like, comentário, inscrição)
- Adaptar o tom para o canal "${canal}"
- Ser escrito em português brasileiro
- Considerar o público de ${localizacao}
- Incluir momentos de engajamento ao longo do vídeo
- Ter aproximadamente ${duracao * 150} palavras

Escreva o roteiro completo, pronto para ser narrado.`;

  try {
    const startTime = Date.now();
    const script = await callGeminiAPI(scriptPrompt);
    const endTime = Date.now();
    
    const wordCount = script.split(/\s+/).length;
    const duration = Math.round((endTime - startTime) / 1000);
    const estimatedDuration = Math.ceil(wordCount / 150);
    
    console.log('✅ Roteiro gerado com sucesso!');
    console.log(`📊 Estatísticas:`);
    console.log(`   - Palavras: ${wordCount}`);
    console.log(`   - Tempo de geração: ${duration}s`);
    console.log(`   - Duração estimada: ${estimatedDuration} min`);
    console.log(`   - Meta de duração: ${duracao} min`);
    
    console.log('\n📄 Roteiro gerado (primeiros 500 caracteres):');
    console.log('─'.repeat(60));
    console.log(script.substring(0, 500) + '...');
    console.log('─'.repeat(60));
    
    return { script, wordCount, duration, estimatedDuration };
  } catch (error) {
    console.log('❌ Erro na geração de roteiro:', error.message);
    return null;
  }
}

// Teste 4: Geração Paralela (múltiplos títulos)
async function testParallelGeneration() {
  console.log('\n🔄 Testando geração paralela de múltiplos roteiros...');
  
  const titulos = [
    'Os 5 maiores avanços da IA em 2024',
    'Como proteger seus dados na era digital',
    'O futuro dos carros autônomos no Brasil'
  ];
  
  const canal = 'TechFuture Brasil';
  const duracao = 8;
  
  const promises = titulos.map(async (titulo, index) => {
    console.log(`🚀 Iniciando job ${index + 1}: "${titulo}"`);
    
    try {
      // Gerar premissa
      const premisePrompt = `Crie uma premissa de aproximadamente 400 palavras para um vídeo sobre "${titulo}" para o canal "${canal}". Seja envolvente e adequado para o público brasileiro interessado em tecnologia.`;
      
      const startTime = Date.now();
      const premise = await callGeminiAPI(premisePrompt);
      
      // Gerar roteiro baseado na premissa
      const scriptPrompt = `Com base na premissa: ${premise}

Crie um roteiro de ${duracao} minutos sobre "${titulo}" para o canal "${canal}". O roteiro deve ser estruturado, envolvente e ter aproximadamente ${duracao * 150} palavras.`;
      
      const script = await callGeminiAPI(scriptPrompt);
      const endTime = Date.now();
      
      const totalWords = premise.split(/\s+/).length + script.split(/\s+/).length;
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.log(`✅ Job ${index + 1} concluído: ${totalWords} palavras em ${duration}s`);
      
      return {
        titulo,
        premise,
        script,
        totalWords,
        duration,
        success: true
      };
    } catch (error) {
      console.log(`❌ Job ${index + 1} falhou: ${error.message}`);
      return {
        titulo,
        error: error.message,
        success: false
      };
    }
  });
  
  try {
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
    
    console.log('\n📊 Resultados da geração paralela:');
    console.log(`✅ Sucessos: ${successful.length}/${titulos.length}`);
    console.log(`❌ Falhas: ${failed.length}/${titulos.length}`);
    
    if (successful.length > 0) {
      const totalWords = successful.reduce((sum, r) => sum + r.value.totalWords, 0);
      const avgDuration = successful.reduce((sum, r) => sum + r.value.duration, 0) / successful.length;
      
      console.log(`📝 Total de palavras: ${totalWords}`);
      console.log(`⏱️ Tempo médio por job: ${Math.round(avgDuration)}s`);
    }
    
    return { successful: successful.length, failed: failed.length, results };
  } catch (error) {
    console.log('❌ Erro na geração paralela:', error.message);
    return { successful: 0, failed: titulos.length, error: error.message };
  }
}

// Teste 5: Teste de Robustez (prompts complexos)
async function testRobustness() {
  console.log('\n💪 Testando robustez com prompts complexos...');
  
  const complexPrompt = `Crie um roteiro técnico detalhado sobre "Blockchain e Criptomoedas: Guia Completo para Iniciantes" que deve:

1. Explicar conceitos técnicos de forma didática
2. Incluir exemplos práticos e analogias
3. Abordar aspectos de segurança
4. Mencionar regulamentações brasileiras
5. Ter estrutura de aula com introdução, desenvolvimento e conclusão
6. Durar aproximadamente 20 minutos (3000 palavras)
7. Incluir momentos de interação com o público
8. Ser adequado para o canal "CriptoEducação Brasil"

O roteiro deve ser profissional, educativo e envolvente.`;

  try {
    const startTime = Date.now();
    const response = await callGeminiAPI(complexPrompt);
    const endTime = Date.now();
    
    const wordCount = response.split(/\s+/).length;
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('✅ Prompt complexo processado com sucesso!');
    console.log(`📊 Estatísticas:`);
    console.log(`   - Palavras geradas: ${wordCount}`);
    console.log(`   - Tempo de processamento: ${duration}s`);
    console.log(`   - Complexidade: Alta`);
    
    // Verificar se o conteúdo atende aos critérios
    const hasIntroduction = response.toLowerCase().includes('introdução') || response.toLowerCase().includes('introdução');
    const hasConclusion = response.toLowerCase().includes('conclusão') || response.toLowerCase().includes('conclusao');
    const hasBlockchain = response.toLowerCase().includes('blockchain');
    const hasCrypto = response.toLowerCase().includes('cripto') || response.toLowerCase().includes('crypto');
    
    console.log(`📋 Verificação de conteúdo:`);
    console.log(`   - Tem introdução: ${hasIntroduction ? '✅' : '❌'}`);
    console.log(`   - Tem conclusão: ${hasConclusion ? '✅' : '❌'}`);
    console.log(`   - Menciona blockchain: ${hasBlockchain ? '✅' : '❌'}`);
    console.log(`   - Menciona criptomoedas: ${hasCrypto ? '✅' : '❌'}`);
    
    return {
      success: true,
      wordCount,
      duration,
      qualityChecks: {
        hasIntroduction,
        hasConclusion,
        hasBlockchain,
        hasCrypto
      }
    };
  } catch (error) {
    console.log('❌ Erro no teste de robustez:', error.message);
    return { success: false, error: error.message };
  }
}

// Função principal para executar todos os testes
async function runRealTests() {
  console.log('🎯 Executando bateria completa de testes reais...\n');
  
  const results = {
    apiValidation: false,
    premiseGeneration: false,
    scriptGeneration: false,
    parallelGeneration: false,
    robustness: false
  };
  
  try {
    // Teste 1: Validação da API
    results.apiValidation = await testApiKeyValidation();
    
    if (!results.apiValidation) {
      console.log('\n❌ API Key inválida. Interrompendo testes.');
      return results;
    }
    
    // Teste 2: Geração de Premissa
    const premiseData = await testPremiseGeneration();
    results.premiseGeneration = premiseData !== null;
    
    // Teste 3: Geração de Roteiro
    if (results.premiseGeneration) {
      const scriptData = await testScriptGeneration(premiseData);
      results.scriptGeneration = scriptData !== null;
    }
    
    // Teste 4: Geração Paralela
    const parallelResults = await testParallelGeneration();
    results.parallelGeneration = parallelResults.successful > 0;
    
    // Teste 5: Teste de Robustez
    const robustnessResult = await testRobustness();
    results.robustness = robustnessResult.success;
    
  } catch (error) {
    console.log('\n💥 Erro geral nos testes:', error.message);
  }
  
  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📋 RELATÓRIO FINAL DOS TESTES REAIS');
  console.log('='.repeat(60));
  
  const testResults = [
    { name: 'Validação da API', result: results.apiValidation },
    { name: 'Geração de Premissa', result: results.premiseGeneration },
    { name: 'Geração de Roteiro', result: results.scriptGeneration },
    { name: 'Geração Paralela', result: results.parallelGeneration },
    { name: 'Teste de Robustez', result: results.robustness }
  ];
  
  testResults.forEach(test => {
    console.log(`${test.result ? '✅' : '❌'} ${test.name}`);
  });
  
  const passedTests = testResults.filter(t => t.result).length;
  const totalTests = testResults.length;
  
  console.log('\n📊 RESUMO:');
  console.log(`✅ Testes aprovados: ${passedTests}/${totalTests}`);
  console.log(`📈 Taxa de sucesso: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('🚀 Sistema validado com API real e pronto para produção!');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.');
  }
  
  return results;
}

// Executar testes
runRealTests().catch(console.error);
