'''
# Plano Funcional Completo: Sistema de Geração de Roteiros e Áudio

## 1. Visão Geral

Este documento detalha a análise completa e as soluções implementadas no sistema de geração de roteiros, abordando os bugs identificados e as funcionalidades aprimoradas. O sistema agora está mais robusto, resiliente e 100% funcional, com as seguintes melhorias implementadas e validadas.

--- 

## 2. Correção de Bugs Críticos

### 2.1. Bug de Duplicação no Histórico

*   **Problema:** O histórico de roteiros exibia múltiplas entradas para um mesmo roteiro gerado, e a contagem total estava incorreta.
*   **Causa Raiz:** A investigação revelou duas causas principais:
    1.  **`useEffect` Redundante:** No componente `ScriptGeneratorWithModals.tsx`, havia um `useEffect` duplicado que adicionava jobs ao histórico, causando inserções múltiplas.
    2.  **Falta de Verificação:** O hook `useScriptHistory.ts` não verificava se um job já existia no histórico antes de adicioná-lo.
*   **Solução Implementada:**
    1.  O `useEffect` redundante foi removido do componente principal.
    2.  No hook `useScriptHistory.ts`, foi adicionada uma lógica que verifica se o `job.id` já existe no histórico antes de fazer a inserção. Isso garante que cada roteiro seja salvo apenas uma vez.

```javascript
// Em src/hooks/useScriptHistory.ts
const addToHistory = useCallback((job, agentName) => {
  if (job.status === 'completed' && job.script) {
    // VERIFICAÇÃO ADICIONADA
    const existingItem = history.find(item => item.id === job.id);
    if (existingItem) {
      console.log(`Job ${job.id} já existe no histórico, ignorando duplicata`);
      return; // Impede a duplicação
    }

    // ...lógica para adicionar ao histórico
  }
}, [history, saveHistory]);
```

--- 

## 3. Sistema de Divisão de Conteúdo (Chunking)

O sistema divide tanto a premissa quanto o roteiro em partes (chunks) para garantir a qualidade, manter o contexto e evitar limites das APIs de linguagem.

### 3.1. Geração de Premissas

*   **Funcionamento:** A geração de premissas agora também é dividida em partes, uma nova funcionalidade para garantir a qualidade de conteúdos mais longos.
*   **Divisão Automática:** Se a contagem de palavras alvo para a premissa for **superior a 800 palavras**, o sistema a divide automaticamente em chunks de aproximadamente **400 palavras** cada.
*   **Contexto:** O sistema envia o conteúdo dos chunks anteriores como contexto para a IA, garantindo que a premissa mantenha uma narrativa coesa.

### 3.2. Geração de Roteiros

*   **Funcionamento:** O roteiro final é construído a partir de múltiplos chunks gerados sequencialmente.
*   **Divisão Automática:** A divisão é calculada com base na duração do vídeo (aproximadamente 130 palavras por minuto). O roteiro é dividido em chunks de **800 palavras** cada, com um **mínimo de 3 chunks** para garantir uma estrutura narrativa completa (introdução, desenvolvimento e conclusão).
*   **Contexto:** Assim como na premissa, cada novo chunk recebe o final do chunk anterior como contexto, garantindo transições suaves e continuidade na história.

--- 

## 4. Fidelidade aos Prompts e Adaptação Cultural

O sistema utiliza uma abordagem robusta para garantir que o conteúdo gerado seja fiel às instruções do usuário e culturalmente relevante.

### 4.1. Fidelidade ao Prompt

*   **Mecanismo:** No serviço `enhancedGeminiApi.ts`, a função `enhancePromptForFidelity` enriquece o prompt original do usuário com um conjunto de **instruções críticas e obrigatórias**.
*   **Instruções Adicionadas:** O sistema adiciona regras como "SIGA RIGOROSAMENTE o prompt original", "NÃO desvie do tema" e "Responda APENAS com o conteúdo solicitado". Isso força a IA a se concentrar exclusivamente na tarefa definida pelo usuário, aumentando drasticamente a fidelidade do resultado.

### 4.2. Adaptação Cultural

*   **Mecanismo:** A função `addCulturalContext` adapta o conteúdo para a região e o idioma especificados pelo usuário.
*   **Como Funciona:** Com base no idioma (ex: `pt-BR`), o sistema injeta instruções específicas no prompt, como:
    *   Uso de gírias e expressões locais (ex: "cara", "mano", "galera" para o Brasil).
    *   Referências a elementos culturais (futebol, carnaval, etc.).
    *   Uso de moeda e unidades de medida locais.
*   **Resultado:** O conteúdo gerado soa muito mais natural e autêntico para o público-alvo.

--- 

## 5. Geração Simultânea de Roteiros

O sistema é capaz de processar múltiplos roteiros em paralelo, otimizando o tempo de geração.

*   **Funcionamento:** O hook `useParallelScriptGenerator.ts` gerencia uma fila de "jobs" (tarefas de geração).
*   **Limite de Concorrência:** O sistema processa um número de jobs simultaneamente, definido pelo `concurrentLimit`. Esse limite é baseado no número de APIs ativas, garantindo que o sistema não sobrecarregue as chaves disponíveis.
*   **Distribuição de APIs (Round-Robin):** O sistema distribui as APIs ativas entre os jobs em execução de forma rotativa. Se uma API está em uso, o sistema aguarda que ela seja liberada ou pega a próxima disponível na fila, garantindo um uso eficiente e contínuo dos recursos.

## 6. Conclusão

Com as correções e otimizações implementadas, o sistema de geração de roteiros está **100% funcional, estável e pronto para uso em produção**. Todos os bugs relatados foram corrigidos e as funcionalidades de divisão de conteúdo, fidelidade e geração paralela foram aprimoradas e validadas.
'''
