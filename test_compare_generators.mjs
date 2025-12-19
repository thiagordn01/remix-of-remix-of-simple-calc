// test_compare_generators.mjs
// Comparação estática entre o gerador simples (useScriptGenerator)
// e o gerador paralelo com concurrentLimit = 1.
//
// Uso:
//   node test_compare_generators.mjs
//
// O objetivo é garantir que:
// - ScriptGenerator usa o hook useScriptGenerator (fluxo simples)
// - ScriptGeneratorWithModals usa useParallelScriptGenerator (fluxo paralelo)
// - O limite paralelo padrão é 1 (equivalente conceitual ao simples)
// - A UI expõe explicitamente a opção "1" como modo seguro

import fs from 'fs/promises';
import path from 'path';

async function fileHasPatterns(filePath, patterns) {
  const content = await fs.readFile(filePath, 'utf8');
  return patterns.every((p) => content.includes(p));
}

async function run() {
  const base = path.resolve('.');

  const scriptGeneratorPath = path.join(base, 'src', 'components', 'ScriptGenerator.tsx');
  const scriptWithModalsPath = path.join(base, 'src', 'components', 'ScriptGeneratorWithModals.tsx');
  const parallelHookPath = path.join(base, 'src', 'hooks', 'useParallelScriptGenerator.ts');

  console.log('🔍 Verificando equivalência conceitual entre geradores...');

  // 1) ScriptGenerator deve usar useScriptGenerator (gerador simples)
  const simpleOk = await fileHasPatterns(scriptGeneratorPath, [
    'useScriptGenerator',
  ]);

  // 2) ScriptGeneratorWithModals deve usar useParallelScriptGenerator (gerador paralelo)
  const parallelOk = await fileHasPatterns(scriptWithModalsPath, [
    'useParallelScriptGenerator',
  ]);

  // 3) Hook paralelo deve ter limite padrão 1 salvo em localStorage
  const limitDefaultOk = await fileHasPatterns(parallelHookPath, [
    "localStorage.getItem('script_concurrent_limit')",
    'return saved ? parseInt(saved) : 1',
  ]);

  // 4) UI deve expor SelectItem value="1" no ScriptGeneratorWithModals
  const uiLimitOneOk = await fileHasPatterns(scriptWithModalsPath, [
    '<SelectItem value="1">1 ✅</SelectItem>',
  ]);

  const allOk = simpleOk && parallelOk && limitDefaultOk && uiLimitOneOk;

  console.log('\n📄 Resultados:');
  console.log(`- ScriptGenerator usa useScriptGenerator: ${simpleOk ? 'OK' : 'FALHANDO'}`);
  console.log(`- ScriptGeneratorWithModals usa useParallelScriptGenerator: ${parallelOk ? 'OK' : 'FALHANDO'}`);
  console.log(`- useParallelScriptGenerator limite padrão = 1: ${limitDefaultOk ? 'OK' : 'FALHANDO'}`);
  console.log(`- UI expõe opção de limite paralelo = 1: ${uiLimitOneOk ? 'OK' : 'FALHANDO'}`);

  console.log('\n🧠 Interpretação:');
  if (allOk) {
    console.log('- O gerador simples (ScriptGenerator + useScriptGenerator) processa um roteiro por vez.');
    console.log('- O gerador paralelo (ScriptGeneratorWithModals + useParallelScriptGenerator) inicia com concurrentLimit = 1,');
    console.log('  o que o torna conceitualmente equivalente ao simples em termos de concorrência (1 job ativo).');
  } else {
    console.log('- Alguma das garantias de equivalência conceitual entre os geradores não foi atendida.');
    console.log('- Revise as importações e o comportamento padrão de concurrentLimit no hook paralelo.');
  }

  process.exit(allOk ? 0 : 1);
}

run().catch((err) => {
  console.error('❌ Erro ao executar teste de comparação de geradores:', err);
  process.exit(1);
});
