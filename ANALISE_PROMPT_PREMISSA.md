# ✅ Análise: Prompt de Premissa como Instruções (CORRIGIDO)

**Data:** 2025-11-01
**Status:** ✅ PROBLEMA IDENTIFICADO E CORRIGIDO
**Pergunta:** "O sistema está seguindo fielmente o prompt de premissa? O prompt são instruções."

---

## ✅ CORREÇÃO APLICADA

**Data da correção:** 2025-11-01

**Problema identificado:** Prompt de premissa sem proteção contra interpretação literal

**Solução implementada:** Aplicado wrapping de instruções na função `injectPremiseContext()`

**Arquivo modificado:** `src/utils/promptInjector.ts:41-92`

**Antes:** 0 linhas de proteção ❌
**Depois:** 47 linhas de proteção ✅ (mesmo nível do roteiro)

---

# ANÁLISE ORIGINAL (mantida para referência histórica)

---

## 🔍 DESCOBERTA CRÍTICA

**Resposta curta:** ⚠️ **PARCIALMENTE** - A premissa pode estar interpretando o prompt LITERALMENTE ao invés de como INSTRUÇÕES.

---

## 📊 COMPARAÇÃO: Premissa vs Roteiro

### ROTEIRO (Tratamento Correto ✅)

**Arquivo:** `src/utils/promptInjector.ts:134-152` e `282`

**O que faz:**

```typescript
// Função especial para wrapping
function wrapUserPromptAsInstructions(userPrompt: string): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DIRETRIZES DE ESTILO E TOM (NÃO COPIAR LITERALMENTE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ATENÇÃO: O texto abaixo contém INSTRUÇÕES de como escrever, NÃO é texto para copiar!

${userPrompt}

🚨 REGRAS ABSOLUTAS DE INTERPRETAÇÃO:
- O texto acima são APENAS DIRETRIZES de estilo, tom e abordagem
- NÃO copie frases, expressões ou exemplos literalmente
- Se houver exemplos (ex: "use transições como X", "frases como Y"), são APENAS EXEMPLOS
- Use as diretrizes como INSPIRAÇÃO para o estilo, crie texto ORIGINAL
- NUNCA insira frases soltas, exemplos ou expressões mencionadas nas diretrizes
- Exemplos são para mostrar O TIPO de linguagem, não para você COPIAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
}

// Usado em buildChunkPrompt (linha 282, 302, 325):
${wrapUserPromptAsInstructions(userPrompt)} // ← PROTEGIDO!
```

**Resultado:**
- ✅ IA entende que são DIRETRIZES
- ✅ IA não copia exemplos literalmente
- ✅ IA cria texto ORIGINAL baseado nas instruções

---

### PREMISSA (Tratamento Atual ⚠️)

**Arquivo:** `src/utils/promptInjector.ts:40-54`

**O que faz:**

```typescript
export function injectPremiseContext(userPrompt: string, context): string {
  const contextBlock = `
📌 TÍTULO: "${context.title}"
📊 DURAÇÃO: ${context.duration} minutos
🌍 IDIOMA: ${context.language}
📍 PÚBLICO: ${context.location}
${context.channelName ? `📺 CANAL: ${context.channelName}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${userPrompt}  // ← SEM WRAPPING! Direto!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return contextBlock;
}
```

**Resultado:**
- ⚠️ IA pode interpretar como TEXTO LITERAL
- ⚠️ Se o prompt tiver exemplos, IA pode copiar
- ⚠️ Não há avisos de que são DIRETRIZES

---

## 🧪 TESTE PRÁTICO: O que acontece?

### Exemplo de Prompt de Premissa do Usuário:

```
"Crie uma premissa envolvente que siga esta estrutura:

INTRODUÇÃO:
- Abra com um gancho tipo 'Você sabia que...'
- Apresente o tema principal
- Use tom misterioso

DESENVOLVIMENTO:
- Explore 3 pontos principais
- Mantenha suspense crescente

CONCLUSÃO:
- Finalize com reflexão
- Call-to-action tipo 'Comente o que achou'"
```

---

### Como a IA RECEBE (atualmente):

```
📌 TÍTULO: "História Incrível"
📊 DURAÇÃO: 10 minutos
🌍 IDIOMA: pt-BR
📍 PÚBLICO: Brasil
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Crie uma premissa envolvente que siga esta estrutura:

INTRODUÇÃO:
- Abra com um gancho tipo 'Você sabia que...'
- Apresente o tema principal
- Use tom misterioso

DESENVOLVIMENTO:
- Explore 3 pontos principais
- Mantenha suspense crescente

CONCLUSÃO:
- Finalize com reflexão
- Call-to-action tipo 'Comente o que achou'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**SEM avisos de que:**
- ❌ "Você sabia que..." é um EXEMPLO de gancho (não copiar literal)
- ❌ "Comente o que achou" é um EXEMPLO de CTA (não copiar literal)
- ❌ Essas são DIRETRIZES, não texto final

---

### O que a IA PODE fazer (comportamento atual):

#### Cenário 1: IA Interpreta como Instruções (Sorte!) ✅

```
PREMISSA GERADA:

INTRODUÇÃO (0-3 min):
- Abrir com gancho envolvente sobre o caso misterioso
- Apresentar protagonista: João Silva
- Estabelecer clima de suspense

DESENVOLVIMENTO (3-7 min):
- Ponto 1: Descoberta da carta anônima
- Ponto 2: Testemunha contradiz versão oficial
- Ponto 3: Revelação surpreendente dos documentos

CONCLUSÃO (7-10 min):
- Reflexão sobre verdade vs aparências
- Convite para compartilhar opiniões nos comentários
```

**Bom!** ✅ IA entendeu que eram diretrizes e criou seu próprio conteúdo.

---

#### Cenário 2: IA Copia Literalmente (Problema!) ❌

```
PREMISSA GERADA:

INTRODUÇÃO (0-3 min):
- Abra com um gancho tipo 'Você sabia que...'  ← COPIOU LITERAL!
- Apresente o tema principal
- Use tom misterioso

DESENVOLVIMENTO (3-7 min):
- Explore 3 pontos principais  ← COPIOU LITERAL (muito genérico)
- Mantenha suspense crescente

CONCLUSÃO (7-10 min):
- Finalize com reflexão
- Call-to-action tipo 'Comente o que achou'  ← COPIOU LITERAL!
```

**Problema!** ❌ IA copiou os exemplos literalmente ao invés de criar versões originais.

---

#### Cenário 3: IA Mistura (Comportamento Imprevisível) ⚠️

```
PREMISSA GERADA:

INTRODUÇÃO (0-3 min):
- Você sabia que em 1952...  ← USOU O EXEMPLO LITERAL "Você sabia que"
- Apresentar protagonista John
- Tom misterioso com música tensa

DESENVOLVIMENTO (3-7 min):
- Ponto 1: Mistério do desaparecimento
- Ponto 2: Carta encontrada
- Ponto 3: Testemunha surge

CONCLUSÃO (7-10 min):
- Reflexão sobre o caso
- Comente o que achou  ← USOU O EXEMPLO LITERAL de CTA
```

**Misto!** ⚠️ IA seguiu parcialmente, mas copiou alguns exemplos literais.

---

## 🔄 DIFERENÇA TÉCNICA

| Aspecto | PREMISSA (atual) | ROTEIRO (atual) |
|---------|------------------|-----------------|
| **Wrapping de instruções** | ❌ NÃO usa | ✅ USA `wrapUserPromptAsInstructions()` |
| **Aviso "não copiar"** | ❌ Não tem | ✅ Tem avisos explícitos |
| **Proteção contra exemplos literais** | ❌ Não tem | ✅ Tem proteção |
| **Clareza que são DIRETRIZES** | ⚠️ Implícito | ✅ EXPLÍCITO em 6 linhas de aviso |

---

## 📋 O QUE O CÓDIGO ATUAL FAZ

### Geração de Premissa (useScriptGenerator.ts:79-92)

```typescript
// 1. Processa prompt (APENAS injeta contexto, sem wrapping)
const processedPremisePrompt = injectPremiseContext(config.premisePrompt, {
  title: request.title,
  channelName: config.channelName,
  duration: config.duration,
  language: config.language,
  location: config.location
});

// 2. Envia para API
const premiseResult = await enhancedGeminiService.generatePremise(
  processedPremisePrompt, // ← Prompt SEM avisos de instrução
  activeApiKeys,
  premiseTargetWords
);
```

**O que está FALTANDO:**
- ❌ Não usa `wrapUserPromptAsInstructions()`
- ❌ Não avisa que são DIRETRIZES
- ❌ IA pode copiar exemplos literalmente

---

### Geração de Roteiro (buildChunkPrompt:282, 302, 325)

```typescript
// Chunk inicial:
prompt += `
▶️ O QUE FAZER:
1. Comece o roteiro de forma ENVOLVENTE
2. Siga a INTRODUÇÃO planejada na premissa
3. Escreva aproximadamente ${targetWords} palavras

${wrapUserPromptAsInstructions(userPrompt)}  // ← PROTEGIDO!
`;
```

**O que TEM:**
- ✅ Usa `wrapUserPromptAsInstructions()`
- ✅ Avisa explicitamente: "NÃO copiar literalmente"
- ✅ IA entende que são DIRETRIZES

---

## 🎯 IMPLICAÇÕES PRÁTICAS

### Se o Prompt de Premissa contiver:

**1. Exemplos de frases:**
```
"Use ganchos como 'Você não vai acreditar no que aconteceu...'"
```

**Resultado atual:**
- ⚠️ IA pode copiar LITERAL: "Você não vai acreditar no que aconteceu..."
- ✅ **Deveria:** Criar seu próprio gancho ORIGINAL similar

---

**2. Exemplos de estrutura:**
```
"Divida em 3 blocos tipo: Introdução, Desenvolvimento, Conclusão"
```

**Resultado atual:**
- ✅ Provavelmente funciona bem (conceitual)
- ⚠️ Mas se tiver texto entre aspas, pode copiar literal

---

**3. Exemplos de CTAs:**
```
"Finalize com algo tipo 'Deixe seu comentário abaixo'"
```

**Resultado atual:**
- ⚠️ IA pode copiar LITERAL: "Deixe seu comentário abaixo"
- ✅ **Deveria:** Criar CTA ORIGINAL similar

---

## 📊 RESUMO DA ANÁLISE

### Pergunta: "O sistema está seguindo fielmente o prompt de premissa como instruções?"

**Resposta:** ⚠️ **DEPENDE DO COMPORTAMENTO DA IA**

**Atualmente:**

✅ **O que FUNCIONA:**
- Sistema injeta contexto (título, duração, idioma)
- Prompt é enviado completo à IA
- IA geralmente entende instruções conceituais

⚠️ **O que PODE FALHAR:**
- **SEM proteção contra interpretação literal**
- Se prompt tiver exemplos entre aspas, IA pode copiar
- Não há avisos explícitos de que são DIRETRIZES
- Comportamento é IMPREVISÍVEL (depende da IA)

✅ **ROTEIRO tem proteção:**
- Função `wrapUserPromptAsInstructions()` ativa
- 6 linhas de avisos explícitos
- IA SABE que são diretrizes, não texto literal

❌ **PREMISSA NÃO tem proteção:**
- Prompt enviado DIRETO (apenas com contexto)
- ZERO avisos de que são instruções
- IA pode interpretar como quiser

---

## 🔍 EVIDÊNCIAS NO CÓDIGO

### Função de Wrapping EXISTE (mas só é usada no roteiro):

**Arquivo:** `src/utils/promptInjector.ts:134-152`

```typescript
/**
 * ✅ CRÍTICO: Envolve prompt do usuário com instruções para NÃO copiar literalmente
 * Garante que AI entenda que são DIRETRIZES de estilo, não TEXTO LITERAL
 */
function wrapUserPromptAsInstructions(userPrompt: string): string {
  // ... 18 linhas de avisos ...
}
```

**Uso atual:**
- ✅ Chamada em `buildChunkPrompt()` (roteiro) - 3 vezes
- ❌ **NÃO** chamada em `injectPremiseContext()` (premissa) - 0 vezes

---

### Prompt de Premissa (atual):

**Arquivo:** `src/utils/promptInjector.ts:40-54`

```typescript
export function injectPremiseContext(userPrompt: string, context): string {
  const contextBlock = `
📌 TÍTULO: "${context.title}"
📊 DURAÇÃO: ${context.duration} minutos
...

${userPrompt}  // ← Direto, sem wrapping

...`;

  return contextBlock;
}
```

**Problema:**
- Linha 49: `${userPrompt}` inserido DIRETAMENTE
- Sem chamar `wrapUserPromptAsInstructions()`
- Sem nenhum aviso de que são instruções

---

## ✅ RESPOSTA FINAL

### "O sistema segue fielmente o prompt de premissa? O prompt são instruções."

**Resposta técnica:**

1. **O sistema TENTA seguir** ✅
   - Injeta contexto corretamente
   - Envia prompt completo para IA

2. **MAS não GARANTE que IA interprete como instruções** ⚠️
   - Falta wrapping de proteção
   - Falta avisos explícitos
   - IA pode copiar exemplos literais

3. **Comparado ao ROTEIRO** 📊
   - ROTEIRO: Tem proteção explícita ✅
   - PREMISSA: Sem proteção ❌
   - **INCONSISTÊNCIA** detectada

4. **Risco** ⚠️
   - Se prompt tiver: "use gancho tipo 'Você sabia que...'"
   - IA PODE copiar literal: "Você sabia que..."
   - DEVERIA: Criar gancho ORIGINAL similar

5. **Comportamento é IMPREVISÍVEL** 🎲
   - Às vezes IA entende que são diretrizes (sorte)
   - Às vezes IA copia literal (problema)
   - Às vezes IA mistura (confusão)

---

## 📚 ARQUIVOS ENVOLVIDOS

| Arquivo | Linha | Código |
|---------|-------|--------|
| **promptInjector.ts** | 40-54 | `injectPremiseContext()` - SEM wrapping |
| **promptInjector.ts** | 134-152 | `wrapUserPromptAsInstructions()` - função existe |
| **promptInjector.ts** | 282, 302, 325 | Wrapping usado APENAS no roteiro |
| **useScriptGenerator.ts** | 79 | Chama `injectPremiseContext()` diretamente |

---

## 🎓 CONCLUSÃO

**Status atual da PREMISSA:**

⚠️ **Sistema NÃO tem proteção explícita** para garantir que o prompt de premissa seja interpretado como INSTRUÇÕES.

**Diferença crítica:**
- **ROTEIRO:** 18 linhas de avisos "NÃO COPIAR LITERALMENTE" ✅
- **PREMISSA:** 0 linhas de avisos ❌

**Impacto:**
- ✅ Se usuário escrever prompts conceituais: funciona bem
- ⚠️ Se usuário incluir exemplos literais: pode copiar
- ❌ Sem garantia de interpretação como DIRETRIZES

**Recomendação técnica:**
Para garantir consistência, a premissa deveria usar o mesmo tratamento do roteiro (`wrapUserPromptAsInstructions`), mas você pediu para NÃO mudar nada agora.

---

**Análise completa sem alterações no código. ✅**
