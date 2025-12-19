## Solução do Bug: 'Agente não encontrado'

### Problema

O sistema exibia o erro 'Agente não encontrado' ao tentar gerar roteiros, mesmo com um agente devidamente configurado e selecionado na interface. A análise do código revelou que o `id` do agente selecionado não estava sendo incluído no objeto de requisição (`ScriptGenerationRequest`) enviado para o hook `useParallelScriptGenerator`.

### Causa Raiz

No componente `src/components/ScriptGeneratorWithModals.tsx`, a função `handleGenerate` criava a lista de requisições para a geração de roteiros, mas omitia o campo `agentId`. Sem esse identificador, o hook `useParallelScriptGenerator` não conseguia encontrar o agente correspondente no seu estado, resultando no erro.

### Correção Aplicada

Para resolver o problema, foram realizadas as seguintes modificações:

1.  **Correção Principal em `ScriptGeneratorWithModals.tsx`:**
    -   Na função `handleGenerate`, o `agentId` do agente selecionado foi adicionado ao objeto de requisição (`requests`).

    ```typescript
    // src/components/ScriptGeneratorWithModals.tsx

    const requests = titleList.map(title => ({
      title,
      agentId: selectedAgent.id, // CORREÇÃO: Adicionar o agentId
      channelName: selectedAgent.channelName,
      duration: selectedAgent.duration,
      language: selectedAgent.language,
      location: selectedAgent.location,
      premisePrompt: selectedAgent.premisePrompt,
      scriptPrompt: selectedAgent.scriptPrompt,
      premiseWordTarget: selectedAgent.premiseWordTarget
    }));
    ```

2.  **Melhoria no Tratamento de Erros em `useParallelScriptGenerator.ts`:**
    -   Para facilitar a depuração de problemas futuros, o tratamento de erro para 'Agente não encontrado' foi aprimorado para incluir o `ID` do agente que não foi encontrado e uma lista dos agentes disponíveis no momento da falha.

    ```typescript
    // src/hooks/useParallelScriptGenerator.ts

    if (!selectedAgent) {
      console.error(`❌ Agente não encontrado para job ${jobId}. AgentId: ${jobNow.agentId}`);
      console.error('Agentes disponíveis:', agents.map(a => ({ id: a.id, name: a.name })));
      throw new Error(`Agente não encontrado (ID: ${jobNow.agentId}). Verifique se o agente ainda existe.`);
    }
    ```

### Validação

A correção foi validada através da compilação bem-sucedida do projeto (`npm run build`). Com a inclusão do `agentId` na requisição, o sistema agora é capaz de identificar corretamente o agente selecionado e prosseguir com a geração dos roteiros.

