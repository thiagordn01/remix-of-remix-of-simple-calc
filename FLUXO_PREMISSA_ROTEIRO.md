# 📚 Como Funciona: Premissa → Roteiro

**Data:** 2025-11-01
**Status:** Documentação técnica do fluxo atual (SEM ALTERAÇÕES)

---

## 🎯 VISÃO GERAL

O sistema gera roteiros em **2 ETAPAS**:

```
1. PREMISSA (planejamento do vídeo)
          ↓
2. ROTEIRO (texto final para narração)
```

---

## 📋 ETAPA 1: GERAÇÃO DA PREMISSA

### O que é a Premissa?

**Premissa** = "Plano estruturado" ou "esqueleto" do vídeo
- Define o que será abordado
- Organiza introdução, desenvolvimento e conclusão
- Serve como "bíblia" para o roteiro seguir

### Como é Gerada?

**Arquivo:** `src/hooks/useScriptGenerator.ts:87-92`

```typescript
// 1. Injeta contexto automático no prompt do usuário
const processedPremisePrompt = injectPremiseContext(config.premisePrompt, {
  title: "História de ...",
  channelName: "Canal X",
  duration: 10, // minutos
  language: "pt-BR",
  location: "Brasil"
});

// 2. Chama API do Gemini
const premiseResult = await enhancedGeminiService.generatePremise(
  processedPremisePrompt,
  activeApiKeys,
  premiseTargetWords, // Ex: 700 palavras
  (message) => console.log('📝 Premissa:', message)
);

// 3. Extrai o conteúdo
const premise = premiseResult.content; // ← Texto da premissa
```

### O que o Prompt Recebe?

**Arquivo:** `src/utils/promptInjector.ts:40-54` (função `injectPremiseContext`)

**ANTES** (o que o usuário escreveu):
```
"Crie uma premissa envolvente sobre suspense..."
```

**DEPOIS** (o que a IA recebe):
```
📌 TÍTULO: "O Mistério do Caso X"
📊 DURAÇÃO: 10 minutos
🌍 IDIOMA: pt-BR
📍 PÚBLICO: Brasil
📺 CANAL: Canal de Histórias
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Crie uma premissa envolvente sobre suspense...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Configurações Técnicas da Premissa:

**Arquivo:** `src/services/enhancedGeminiApi.ts:1335-1360`

```typescript
generatePremise(prompt, apis, targetWords) {
  // Parâmetros:
  - temperature: 0.6 (criativo, mas controlado)
  - timeout: 180000ms (3 minutos)
  - maxTokens: 40000
  - targetWords: 700 palavras (padrão, configurável)

  // Geração:
  - 1 ÚNICA requisição (não divide em chunks)
  - Retorna texto completo de uma vez
}
```

### Exemplo de Premissa Gerada:

```
📋 PREMISSA (exemplo):

INTRODUÇÃO (0-3 min):
- Abrir com gancho: "Em 1952, um caso mudou tudo..."
- Apresentar protagonista: John Smith, detetive
- Estabelecer cenário: Cidade pequena, inverno rigoroso

DESENVOLVIMENTO (3-7 min):
- Primeiro mistério: Desaparecimento inexplicável
- Pista crucial: Carta encontrada
- Reviravolta: Testemunha surge com nova versão

CONCLUSÃO (7-10 min):
- Revelação final: O culpado era...
- Consequências: Cidade nunca mais foi a mesma
- Fechamento: Lição sobre confiar nas aparências
- Call-to-action: Peça comentários
```

**Tamanho:** ~500-800 palavras
**Função:** Guiar a geração do roteiro completo

---

## 📝 ETAPA 2: GERAÇÃO DO ROTEIRO

### Como a Premissa é Usada?

A premissa é **injetada em TODOS os chunks** do roteiro.

### Roteiro Curto (≤1000 palavras)

**Arquivo:** `src/hooks/useScriptGenerator.ts:208-238`

```typescript
// Se vídeo pequeno (≤1000 palavras):
const chunkPrompt = buildChunkPrompt(config.scriptPrompt, {
  title: "...",
  channelName: "...",
  duration: 10,
  language: "pt-BR",
  location: "Brasil",
  premise: premise, // ← PREMISSA COMPLETA
  previousContent: '', // Vazio (chunk único)
  chunkIndex: 0,
  totalChunks: 1,
  targetWords: 1000
});

// Gera roteiro completo em 1 requisição
const scriptResult = await enhancedGeminiService.generateScriptChunk(
  chunkPrompt,
  activeApiKeys,
  { /* contexto */ }
);
```

### Roteiro Longo (>1000 palavras)

**Arquivo:** `src/hooks/useScriptGenerator.ts:115-207`

```typescript
// Se vídeo grande (>1000 palavras):
const wordsPerChunk = 1000; // Divide em chunks de 1000 palavras
const numberOfChunks = Math.ceil(targetWords / wordsPerChunk);

for (let i = 0; i < numberOfChunks; i++) {
  // CADA chunk recebe:
  const chunkPrompt = buildChunkPrompt(config.scriptPrompt, {
    title: "...",
    channelName: "...",
    duration: 10,
    language: "pt-BR",
    location: "Brasil",

    premise: premise, // ← PREMISSA COMPLETA (SEMPRE!)

    previousContent: scriptContent, // ← TODO roteiro já gerado

    chunkIndex: i, // Ex: 0, 1, 2, 3...
    totalChunks: numberOfChunks, // Ex: 5
    targetWords: 1000
  });

  // Gera chunk
  const chunkResult = await enhancedGeminiService.generateScriptChunk(...);

  // Acumula roteiro
  scriptContent += '\n\n' + chunkResult.content;
}
```

---

## 🔍 COMO A PREMISSA É INJETADA NO PROMPT

**Arquivo:** `src/utils/promptInjector.ts:175-361` (função `buildChunkPrompt`)

### Estrutura do Prompt Enviado à IA:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 TÍTULO DO VÍDEO:
"História do Caso X"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 PREMISSA (SIGA FIELMENTE - ESTA É SUA BÍBLIA):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[TEXTO COMPLETO DA PREMISSA GERADA NA ETAPA 1]

INTRODUÇÃO (0-3 min):
- Abrir com gancho: "Em 1952, um caso mudou tudo..."
- Apresentar protagonista: John Smith, detetive
...

DESENVOLVIMENTO (3-7 min):
- Primeiro mistério: Desaparecimento inexplicável
...

CONCLUSÃO (7-10 min):
- Revelação final: O culpado era...
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 PROGRESSO: Chunk 2/5 (40%)
🎯 VOCÊ DEVE DESENVOLVER: 📍 BLOCO 2 - DESENVOLVIMENTO da premissa acima

⚠️ SIGA EXATAMENTE A PREMISSA:
- Desenvolva APENAS os eventos do BLOCO 2 - DESENVOLVIMENTO
- NÃO volte a eventos de blocos anteriores
- NÃO pule para eventos de blocos futuros
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[SE TEM CONTEÚDO ANTERIOR:]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 CONTEXTO COMPLETO JÁ ESCRITO (2500 palavras):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[TODO O ROTEIRO JÁ GERADO ATÉ AGORA]

Em 1952, um caso mudou a história da cidade de...
[... 2500 palavras ...]
...e foi quando ele percebeu que algo estava muito errado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 ÚLTIMAS FRASES QUE VOCÊ ESCREVEU:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"...e foi quando ele percebeu que algo estava muito errado."

⚠️ CONSEQUÊNCIA: Se você repetir qualquer trecho do contexto acima,
a geração será considerada FALHA e será descartada.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 CHUNK 2/5 - DESENVOLVIMENTO (40% do roteiro)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶️ O QUE FAZER:
1. Continue EXATAMENTE da última frase acima
2. NÃO comece com "...", "Como vimos", "Voltando ao" ou similares
3. Comece uma NOVA frase que AVANÇA a narrativa
4. Desenvolva os próximos pontos da premissa
5. Escreva aproximadamente 1000 palavras NOVAS
6. Termine em fim de parágrafo (NUNCA corte no meio de frase)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DIRETRIZES DE ESTILO E TOM (NÃO COPIAR LITERALMENTE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[PROMPT DO USUÁRIO]
Use tom envolvente, suspense crescente, narrativa em primeira pessoa...

🚨 REGRAS ABSOLUTAS DE INTERPRETAÇÃO:
- O texto acima são APENAS DIRETRIZES de estilo, tom e abordagem
- NÃO copie frases, expressões ou exemplos literalmente
- Use as diretrizes como INSPIRAÇÃO para o estilo, crie texto ORIGINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ LEMBRE-SE: Este NÃO é o último chunk. NÃO finalize ainda.
Continue desenvolvendo a história segundo a premissa.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 REGRAS OBRIGATÓRIAS DE FORMATO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ TEXTO CORRIDO APENAS - SEM FORMATAÇÕES:
- NÃO use numerações (1., 2., 3.)
- NÃO use marcadores (•, -, *)
- NÃO use títulos ("Capítulo 1", "Introdução")
- APENAS parágrafos naturais separados por linha em branco

✅ NARRAÇÃO PURA - SEM INDICAÇÕES TÉCNICAS:
- NÃO escreva: "Silêncio.", "Pausa.", "Música tensa"
- SIM escreva: "Um silêncio pesado tomou conta."

✅ CONTINUIDADE PERFEITA:
- Continue da ÚLTIMA FRASE (não repita)
- NÃO use "..." ou reticências no início
- SEMPRE termine em fim de parágrafo completo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📊 DIVISÃO EM BLOCOS

**Arquivo:** `src/utils/promptInjector.ts:190-200`

O sistema divide automaticamente o roteiro em 3 BLOCOS baseado no progresso:

```typescript
const progress = (chunkIndex + 1) / totalChunks;

if (progress <= 0.3) {
  currentBlock = '📍 BLOCO 1 - INÍCIO';
} else if (progress <= 0.7) {
  currentBlock = '📍 BLOCO 2 - DESENVOLVIMENTO';
} else {
  currentBlock = '📍 BLOCO 3 - CONCLUSÃO';
}
```

### Exemplo (5 chunks):

| Chunk | Progresso | Bloco Instrução |
|-------|-----------|-----------------|
| 1/5 | 20% | 📍 BLOCO 1 - INÍCIO |
| 2/5 | 40% | 📍 BLOCO 2 - DESENVOLVIMENTO |
| 3/5 | 60% | 📍 BLOCO 2 - DESENVOLVIMENTO |
| 4/5 | 80% | 📍 BLOCO 3 - CONCLUSÃO |
| 5/5 | 100% | 📍 BLOCO 3 - CONCLUSÃO |

**Objetivo:** Garantir que a IA siga a estrutura da premissa (introdução → meio → fim)

---

## 🔄 CONTEXTO ACUMULADO

**Arquivo:** `src/hooks/useScriptGenerator.ts:142` e `src/utils/promptInjector.ts:224-267`

### Como Funciona:

```typescript
let scriptContent = ''; // Inicia vazio

// Chunk 1:
scriptContent = "Em 1952, um caso mudou..."; // 1000 palavras

// Chunk 2:
// A IA recebe:
// - Premissa completa ✅
// - previousContent = "Em 1952, um caso mudou..." (1000 palavras) ✅
scriptContent += "\n\n" + "A carta revelava..."; // +1000 palavras

// Chunk 3:
// A IA recebe:
// - Premissa completa ✅
// - previousContent = "Em 1952... A carta revelava..." (2000 palavras) ✅
scriptContent += "\n\n" + "Finalmente, a verdade..."; // +1000 palavras

// Total: 3000 palavras
```

### Limite de Contexto:

**Arquivo:** `src/utils/promptInjector.ts:6-7` e `229-232`

```typescript
const MAX_CONTEXT_WORDS = 6000;

// Se roteiro já tem >6000 palavras:
const contextBody = allWords.length > MAX_CONTEXT_WORDS
  ? allWords.slice(-MAX_CONTEXT_WORDS).join(' ') // ← Pega últimas 6000
  : previousContent; // ← Ou todo o contexto se <6000
```

**Motivo:** Evitar exceder limites de tokens da API Gemini

---

## 🎯 RESUMO DO FLUXO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│ USUÁRIO PREENCHE:                                           │
│ - Título: "História do Caso X"                              │
│ - Duração: 10 minutos                                       │
│ - Prompt premissa: "Crie premissa envolvente..."            │
│ - Prompt roteiro: "Use tom suspense, primeira pessoa..."    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 1: GERAÇÃO DA PREMISSA                                │
│                                                             │
│ 1. Injeta contexto (título, duração, idioma, etc)          │
│ 2. Chama Gemini API (1 requisição, ~700 palavras)          │
│ 3. Retorna PREMISSA (planejamento estruturado)             │
│                                                             │
│ Exemplo:                                                    │
│ "INTRODUÇÃO: Abrir com gancho sobre 1952...                │
│  DESENVOLVIMENTO: Mistério do desaparecimento...            │
│  CONCLUSÃO: Revelação final + call-to-action..."            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 2: GERAÇÃO DO ROTEIRO                                 │
│                                                             │
│ Calcula palavras necessárias: 10 min × 150 = 1500 palavras │
│                                                             │
│ Se ≤1000 palavras:                                          │
│   → 1 chunk único com premissa completa                     │
│                                                             │
│ Se >1000 palavras:                                          │
│   → Divide em chunks de 1000 palavras                       │
│   → CADA chunk recebe:                                      │
│       • Premissa COMPLETA                                   │
│       • TODO roteiro já gerado (contexto)                   │
│       • Instrução do bloco atual (início/meio/fim)          │
│                                                             │
│ Exemplo (1500 palavras = 2 chunks):                         │
│                                                             │
│ CHUNK 1 (1000 palavras):                                    │
│   Prompt inclui:                                            │
│   - Premissa completa ✅                                     │
│   - previousContent = '' (vazio)                            │
│   - Instrução: "BLOCO 1 - INÍCIO"                           │
│   Resultado: "Em 1952, um caso mudou..."                    │
│                                                             │
│ CHUNK 2 (500 palavras):                                     │
│   Prompt inclui:                                            │
│   - Premissa completa ✅                                     │
│   - previousContent = chunk 1 (1000 palavras) ✅             │
│   - Instrução: "BLOCO 2 - DESENVOLVIMENTO"                  │
│   Resultado: "A carta revelava segredos..."                 │
│                                                             │
│ Roteiro final = Chunk 1 + Chunk 2 (1500 palavras)          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ RESULTADO FINAL:                                            │
│                                                             │
│ {                                                           │
│   premise: "INTRODUÇÃO: ...\nDESENVOLVIMENTO: ..."         │
│   script: ["Em 1952, um caso...", "A carta revelava..."]   │
│   totalWords: 1500                                          │
│   estimatedDuration: 10 minutos                             │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 PONTOS-CHAVE

### 1. Premissa SEMPRE Completa

✅ A premissa completa é enviada em **TODOS** os chunks do roteiro
✅ Nunca é dividida ou resumida
✅ Serve como "bíblia" que a IA deve seguir

### 2. Contexto Acumulado

✅ Cada chunk recebe TODO o roteiro já gerado
✅ Limite: últimas 6000 palavras se muito grande
✅ Objetivo: Manter continuidade e evitar repetição

### 3. Divisão em Blocos Automática

✅ Sistema calcula automaticamente qual bloco desenvolver
✅ Baseado no progresso (0-30% = início, 30-70% = meio, 70-100% = fim)
✅ Instrui IA a seguir estrutura da premissa

### 4. Configurações Técnicas

| Parâmetro | Premissa | Roteiro |
|-----------|----------|---------|
| **temperature** | 0.6 (criativo controlado) | 0.7 (balanceado) |
| **timeout** | 3 minutos | 5-6 minutos |
| **maxTokens** | 40,000 | 50,000-80,000 |
| **targetWords** | ~700 palavras | ~1000 palavras/chunk |

### 5. Instruções Anti-Duplicação

✅ Sistema avisa IA para NÃO repetir contexto
✅ Destaca últimas frases para continuar naturalmente
✅ Proíbe recapitulação ou voltar atrás

---

## 📁 ARQUIVOS PRINCIPAIS

1. **useScriptGenerator.ts** (hook principal)
   - Orquestra todo o fluxo
   - Chama geração de premissa e roteiro
   - Gerencia chunks e progresso

2. **promptInjector.ts** (formatação de prompts)
   - `injectPremiseContext()`: Adiciona contexto à premissa
   - `buildChunkPrompt()`: Monta prompt com premissa + contexto
   - Divide em blocos (início/meio/fim)

3. **enhancedGeminiApi.ts** (comunicação com API)
   - `generatePremise()`: Gera premissa em 1 requisição
   - `generateScriptChunk()`: Gera cada chunk do roteiro
   - Configurações técnicas (temperature, timeout, etc)

---

## ❓ PERGUNTAS FREQUENTES

**P: A premissa é enviada apenas no primeiro chunk?**
R: ❌ NÃO! A premissa completa é enviada em TODOS os chunks.

**P: O contexto anterior é resumido?**
R: ⚠️ Só se passar de 6000 palavras (pega últimas 6000). Caso contrário, envia tudo.

**P: A IA pode "esquecer" a premissa nos chunks finais?**
R: ❌ Não, porque recebe a premissa completa em cada requisição.

**P: Chunks menores melhoram a consistência?**
R: ✅ Sim! Menos palavras por chunk = menos risco de desvio da premissa.

**P: Posso aumentar o tamanho da premissa?**
R: ✅ Sim, via `premiseWordTarget` (padrão: 700 palavras).

**P: O que acontece se o roteiro ficar muito longo?**
R: ⚠️ Contexto é truncado para últimas 6000 palavras para evitar exceder limites da API.

---

## 🎓 CONCLUSÃO

O sistema trabalha em **2 camadas**:

1. **Premissa** = "Plano de voo" (o que será feito)
2. **Roteiro** = "Viagem real" (execução do plano)

A premissa é **injetada completamente em cada chunk**, garantindo que a IA sempre saiba:
- ✅ Qual o plano completo
- ✅ O que já foi escrito
- ✅ Qual parte desenvolver agora
- ✅ Como continuar sem repetir

Isso cria roteiros coesos, estruturados e que seguem fielmente o planejamento inicial.
