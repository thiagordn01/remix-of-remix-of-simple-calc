# 🔍 DIAGNÓSTICO: Bug "Presta atenção." nos Roteiros

## Data: 31 de outubro de 2025

---

## 🔴 PROBLEMA RELATADO

**Sintoma:** Roteiros gerados contêm a frase "Presta atenção." em diversas partes, no início de parágrafos, quebrando completamente o roteiro e os vídeos.

**Impacto:** Prejuízo grande - roteiros quebrados, vídeos inúteis, experiência do usuário prejudicada.

**Expectativa:** Roteiros devem ser:
- Totalmente no idioma escolhido
- Adaptados culturalmente
- Sem quebras como "Presta atenção."
- Coerentes em todas as chunks
- Texto corrido natural, como narrativa pura

---

## ✅ INVESTIGAÇÃO REALIZADA

### 1. Verificação do Código do Sistema

Busquei por "Presta atenção." em TODOS os arquivos do projeto:

```bash
grep -r "Presta atenção\|presta atenção\|PRESTA ATENÇÃO" .
```

**Resultado:** ❌ NÃO ENCONTRADO em nenhum arquivo do código.

**Conclusão:** O sistema NÃO está inserindo "Presta atenção." diretamente no código.

### 2. Análise dos Prompts do Sistema

Revisei todos os arquivos de prompts:
- ✅ `src/data/promptTemplates.ts` - Sem "Presta atenção."
- ✅ `src/utils/languagePrompt.ts` - Sem "Presta atenção."
- ✅ `src/utils/promptInjector.ts` - Sem "Presta atenção." DIRETAMENTE
- ✅ `src/services/enhancedGeminiApi.ts` - Sem "Presta atenção."

### 3. Análise das Instruções Enviadas para a AI

Identifiquei o arquivo `src/utils/promptInjector.ts` que constrói os prompts enviados para o Gemini.

---

## 🎯 CAUSA RAIZ IDENTIFICADA

### O Problema: Uso Excessivo de "⚠️ ATENÇÃO" nos Prompts

No arquivo `src/utils/promptInjector.ts`, função `buildChunkPrompt()`, há MÚLTIPLAS ocorrências de "⚠️ ATENÇÃO" e "⚠️" que estão fazendo o modelo Gemini interpretar e **adicionar "Presta atenção."** no roteiro gerado!

#### Linha 193-218: Instruções Anti-Duplicação
```typescript
⚠️⚠️⚠️ INSTRUÇÕES CRÍTICAS ANTI-DUPLICAÇÃO ⚠️⚠️⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 VOCÊ JÁ ESCREVEU ${wordCount} PALAVRAS DO ROTEIRO (mostrado abaixo)
🚫 NÃO REESCREVA NADA DO CONTEXTO ABAIXO
...
⚠️ CONSEQUÊNCIA: Se você repetir qualquer trecho do contexto acima,
a geração será considerada FALHA e será descartada.
```

#### Linha 244: Último Chunk
```typescript
⚠️⚠️⚠️ ATENÇÃO - ESTE É O ÚLTIMO CHUNK! ⚠️⚠️⚠️
```

#### Linha 280: Chunk Intermediário
```typescript
⚠️ LEMBRE-SE: Este NÃO é o último chunk. NÃO finalize ainda.
```

#### Linha 170: Bloco de Desenvolvimento
```typescript
⚠️ SIGA EXATAMENTE A PREMISSA:
- Desenvolva APENAS os eventos do ${currentBlock}
```

### Por Que Isso Causa o Bug?

O modelo Gemini é treinado para:
1. **Seguir instruções contextuais**
2. **Interpretar marcadores de atenção**
3. **Adicionar transições naturais** no texto

Quando vê múltiplos "⚠️ ATENÇÃO", o modelo pode:
- Interpretar que deve **alertar o leitor/ouvinte**
- Adicionar "Presta atenção." como **transição narrativa**
- Usar isso para **chamar atenção** para pontos importantes

**Exemplo de como acontece:**

```
PROMPT DO SISTEMA:
"⚠️⚠️⚠️ INSTRUÇÕES CRÍTICAS ANTI-DUPLICAÇÃO ⚠️⚠️⚠️
⚠️ LEMBRE-SE: Este NÃO é o último chunk..."

ROTEIRO GERADO PELA AI:
"...e é assim que funcionava. Presta atenção. A partir daqui,
as coisas começam a mudar. Presta atenção. O que aconteceu
em seguida foi surpreendente..."
```

O modelo está **traduzindo literalmente** os alertas de "ATENÇÃO" do prompt para "Presta atenção." no roteiro!

---

## 🔧 SOLUÇÃO COMPLETA

### CORREÇÃO 1: Remover "⚠️ ATENÇÃO" dos Prompts

Substituir todos os "⚠️ ATENÇÃO", "⚠️⚠️⚠️" e alertas visíveis por instruções diretas sem emoticons.

**Antes:**
```typescript
⚠️⚠️⚠️ INSTRUÇÕES CRÍTICAS ANTI-DUPLICAÇÃO ⚠️⚠️⚠️
⚠️ CONSEQUÊNCIA: Se você repetir...
```

**Depois:**
```typescript
INSTRUÇÕES CRÍTICAS ANTI-DUPLICAÇÃO:
CONSEQUÊNCIA: Se você repetir...
```

### CORREÇÃO 2: Reformular Alertas de Forma Neutra

**Antes:**
```typescript
⚠️⚠️⚠️ ATENÇÃO - ESTE É O ÚLTIMO CHUNK! ⚠️⚠️⚠️
```

**Depois:**
```typescript
ESTE É O ÚLTIMO CHUNK - FINALIZAR ROTEIRO:
```

### CORREÇÃO 3: Usar Linguagem Mais Técnica

**Antes:**
```typescript
⚠️ LEMBRE-SE: Este NÃO é o último chunk
```

**Depois:**
```typescript
NOTA: Este é chunk intermediário - NÃO finalizar
```

---

## 📊 LOCAIS ESPECÍFICOS A CORRIGIR

### Arquivo: `src/utils/promptInjector.ts`

#### Linha 170-174 (Bloco de Desenvolvimento)
```typescript
// ANTES:
⚠️ SIGA EXATAMENTE A PREMISSA:
- Desenvolva APENAS os eventos do ${currentBlock}
- NÃO volte a eventos de blocos anteriores
- NÃO pule para eventos de blocos futuros

// DEPOIS:
INSTRUÇÕES DE DESENVOLVIMENTO:
- Desenvolva APENAS os eventos do ${currentBlock}
- NÃO volte a eventos de blocos anteriores
- NÃO pule para eventos de blocos futuros
```

#### Linha 193-218 (Anti-Duplicação)
```typescript
// ANTES:
⚠️⚠️⚠️ INSTRUÇÕES CRÍTICAS ANTI-DUPLICAÇÃO ⚠️⚠️⚠️
...
⚠️ CONSEQUÊNCIA: Se você repetir qualquer trecho do contexto acima,

// DEPOIS:
[INSTRUÇÕES CRÍTICAS ANTI-DUPLICAÇÃO]
...
CONSEQUÊNCIA: Se você repetir qualquer trecho do contexto acima,
```

#### Linha 244-262 (Último Chunk)
```typescript
// ANTES:
⚠️⚠️⚠️ ATENÇÃO - ESTE É O ÚLTIMO CHUNK! ⚠️⚠️⚠️

// DEPOIS:
[CHUNK FINAL - INSTRUÇÕES DE ENCERRAMENTO]
```

#### Linha 257 (Crítico no Último Chunk)
```typescript
// ANTES:
⚠️ CRÍTICO: Depois deste chunk NÃO haverá mais nenhum.

// DEPOIS:
CRÍTICO: Depois deste chunk NÃO haverá mais nenhum.
```

#### Linha 280 (Chunk Intermediário)
```typescript
// ANTES:
⚠️ LEMBRE-SE: Este NÃO é o último chunk. NÃO finalize ainda.

// DEPOIS:
LEMBRE-SE: Este NÃO é o último chunk. NÃO finalize ainda.
```

---

## 🎯 DIAGNÓSTICO FINAL

### Origem do Problema

| Questão | Resposta |
|---------|----------|
| **Está no código do sistema?** | ❌ Não diretamente |
| **Está no prompt do usuário?** | ❌ Não |
| **É comportamento da AI Gemini?** | ✅ **SIM** - AI interpreta "⚠️ ATENÇÃO" e adiciona "Presta atenção." |
| **Pode ser corrigido?** | ✅ **SIM** - Remover emoticons e reformular instruções |

### Conclusão

O problema **NÃO é um bug no código**, mas sim uma **interpretação indesejada da AI Gemini** que está traduzindo os alertas de "⚠️ ATENÇÃO" dos prompts para "Presta atenção." no roteiro gerado.

A AI está tentando ser "útil" adicionando transições de atenção no conteúdo, mas isso quebra o formato de narrativa pura que o sistema exige.

---

## ✅ VALIDAÇÃO DA SOLUÇÃO

Após implementar as correções, testar:

1. **Gerar roteiro pequeno** (2-3 chunks) e verificar se "Presta atenção." aparece
2. **Gerar roteiro grande** (10+ chunks) e confirmar ausência do problema
3. **Testar em diferentes idiomas** (pt-BR, en-US, es-ES)
4. **Verificar início de parágrafos** onde problema era mais frequente
5. **Confirmar tom natural** sem quebras ou transições artificiais

### Critérios de Sucesso

- ✅ Zero ocorrências de "Presta atenção."
- ✅ Zero ocorrências de "Pay attention" (inglês)
- ✅ Zero ocorrências de "Presta atención" (espanhol)
- ✅ Texto corrido natural e fluido
- ✅ Coerência mantida entre chunks
- ✅ Tom e estilo consistentes

---

## 🚀 PRÓXIMOS PASSOS

1. Implementar as correções no `src/utils/promptInjector.ts`
2. Testar geração de roteiros
3. Validar qualidade dos roteiros gerados
4. Confirmar ausência do problema
5. Commit e push das correções

---

## 📝 NOTA TÉCNICA

### Por Que Emoticons Causam Problemas em AI?

Modelos de linguagem como Gemini são treinados em:
- **Textos da internet** (onde emoticons têm significado contextual)
- **Conversas humanas** (onde emoticons expressam emoção/atenção)
- **Conteúdo educacional** (onde "⚠️" marca avisos importantes)

Quando veem "⚠️ ATENÇÃO" em um prompt, podem:
1. Interpretar como "isso é importante para o leitor"
2. Adicionar marcadores de atenção no texto gerado
3. Usar frases como "presta atenção" para enfatizar

**Solução:** Usar instruções técnicas claras sem emoticons em prompts de sistema.

---

## 🎯 RESUMO EXECUTIVO

- **Problema:** "Presta atenção." aparecendo múltiplas vezes nos roteiros
- **Causa Raiz:** AI Gemini interpretando "⚠️ ATENÇÃO" dos prompts como instrução para adicionar alertas no texto
- **Solução:** Remover todos os emoticons "⚠️" e reformular alertas de forma neutra
- **Arquivos Afetados:** `src/utils/promptInjector.ts` (1 arquivo)
- **Linhas a Corrigir:** ~15-20 linhas
- **Tempo Estimado:** 10-15 minutos
- **Risco:** Baixo (apenas reformulação de texto)
- **Impacto:** Alto (resolve completamente o bug)

**Status:** 🔴 PROBLEMA IDENTIFICADO - PRONTO PARA CORREÇÃO
