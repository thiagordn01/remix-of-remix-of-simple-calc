# 🔍 Análise: Duração Incorreta do Áudio Gemini TTS

**Data:** 2025-11-01
**Status:** ⚠️ PROBLEMA IDENTIFICADO - CAUSA DESCONHECIDA
**Relato:** Áudio de 16 mil caracteres levando 28 minutos (esperado: ~10-12 minutos)

---

## 🚨 PROBLEMA REPORTADO

**Usuário:** "Roteiros de 16 mil caracteres do alemão está pegando 28 minutos"

**Suspeita:** Duplicação de chunks ou bug na concatenação

---

## 📊 ANÁLISE DO LOG (Job 5)

### Informações do Job:

```
🚀 Iniciando job DE - PSICOLOGIA DAS PESSOAS 5 (6 chunks)

Chunks:
- Chunk 1: 443 palavras
- Chunk 2: 433 palavras
- Chunk 3: 439 palavras
- Chunk 4: 442 palavras
- Chunk 5: 448 palavras
- Chunk 6: 412 palavras

TOTAL: ~2617 palavras
```

### Resultados:

```
📊 [DECODIFICAÇÃO] Decodificando 6 WAV files...
   Sample Rate: 48000 Hz, Canais: 1, Duração: 169.49s
✅ [DECODIFICAÇÃO] 6 chunks decodificados com sucesso!

🔗 [CONCATENAÇÃO] Concatenando e normalizando volumes...
✅ [CONCATENAÇÃO] Áudio final: 1724.27s (28.74 min) @ 48000 Hz

🔄 [ENCODING] Convertendo AudioBuffer → WAV...
✅ [WAV] Arquivo WAV gerado: 157.86 MB

🎵 [MP3] Convertendo WAV → MP3 (128 kbps)...
✅ [MP3] Arquivo MP3 gerado: 26.31 MB
```

---

## 🔍 CÁLCULOS E ANOMALIAS

### Duração Esperada vs Real:

| Métrica | Cálculo | Esperado | Real | Diferença |
|---------|---------|----------|------|-----------|
| **Palavras totais** | - | 2617 | 2617 | ✅ OK |
| **Velocidade narração** | 150 pal/min | - | - | Padrão |
| **Duração esperada** | 2617 ÷ 150 | **~17.4 min** | 28.74 min | **+65%!** 🚨 |
| **Duração em segundos** | - | ~1044s | 1724.27s | **+680s** 🚨 |

### Duração por Chunk:

```
Duração total: 1724.27s
Número de chunks: 6
Duração média/chunk: 1724.27 ÷ 6 = 287.4 segundos = 4.79 minutos

ESPERADO por chunk (450 palavras):
450 ÷ 150 = 3 minutos = 180 segundos

DIFERENÇA: 287.4s - 180s = +107.4s (+60% maior!)
```

### Tamanho dos Arquivos:

| Arquivo | Tamanho | Duração | Taxa |
|---------|---------|---------|------|
| **WAV** | 157.86 MB | 1724.27s | 91.6 KB/s |
| **MP3** | 26.31 MB | 1724.27s | 15.3 KB/s (≈122 kbps) |

**Verificação de integridade WAV:**
```
Sample Rate: 48000 Hz
Canais: 1
Duração: 1724.27s

Bytes esperados: 48000 × 1 × 2 bytes × 1724.27s = 165,529,920 bytes ≈ 157.86 MB
```
✅ **Tamanho do WAV está CORRETO** para a duração reportada!

**Conclusão:** O problema NÃO está na concatenação/encoding. O áudio realmente tem 28.74 minutos.

---

## 🔬 INVESTIGAÇÃO: Onde está o problema?

### Hipótese 1: Duplicação de Chunks ❌

**Teste:**
```
Se houvesse duplicação:
- 6 chunks × 3 min/chunk = 18 min
- Para ter 28.74 min, precisaria duplicar ~1.6x

Mas: 28.74 ÷ 18 = 1.597x
```

**PORÉM:** O log mostra claramente:
```
📊 [DECODIFICAÇÃO] Decodificando 6 WAV files...
✅ [DECODIFICAÇÃO] 6 chunks decodificados com sucesso!
```

Apenas **6 chunks** foram decodificados e concatenados, NÃO mais que isso.

**Conclusão:** ❌ Não há duplicação de chunks no código

---

### Hipótese 2: Gemini retorna áudio muito longo ⚠️

**Observação no log:**
```
📝 [CHUNK 1/6] Processando (443 palavras)
...
✅ Chunk 1 gerado com sucesso em 70.4s!
```

O **tempo de geração** (70.4s) NÃO é o mesmo que **duração do áudio**.

**Teste:** Se cada chunk GERADO já vem com ~4.8 minutos de duração:

```
6 chunks × 4.79 min/chunk = 28.74 min ✅ BATE!
```

**Possíveis causas:**

1. **Gemini está gerando áudio com pausas longas**
   - API pode estar adicionando silêncios excessivos
   - Velocidade de narração muito lenta

2. **Problema no `seed` + `temperature`**
   - Implementamos recentemente `seed` e `temperature: 0.3`
   - Isso pode estar afetando a velocidade da narração

3. **Problema específico do idioma alemão**
   - Alemão tem palavras mais longas
   - Gemini pode estar narrando mais devagar

---

### Hipótese 3: Sample Rate ou Encoding Incorreto ❌

**Verificação:**
```
Sample Rate: 48000 Hz ✅ (correto)
Canais: 1 ✅ (mono correto)
Bit Depth: 16 bits ✅ (padrão correto)
```

**Teste:** Se sample rate estivesse errado:
- Se interpretasse 48kHz como 24kHz: áudio seria 2x mais lento
- Mas 2x de 17 min = 34 min (não bate com 28.74 min)

**Conclusão:** ❌ Sample rate está correto

---

## 📈 ANÁLISE COMPARATIVA

### Job 7 (7 chunks):

```
📝 [CHUNK 1/7] Processando (442 palavras)
...
Total: ~3080 palavras

📊 [DECODIFICAÇÃO] Decodificando 7 WAV files...
   Sample Rate: 48000 Hz, Canais: 1, Duração: 236.01s
✅ [CONCATENAÇÃO] Áudio final: 1206.32s (20.11 min)

Esperado: 3080 ÷ 150 = 20.5 minutos
Real: 20.11 minutos
```

**Job 7 está CORRETO!** ✅

**Diferença entre Job 5 e Job 7:**

| Job | Palavras | Duração Real | Duração Esperada | Diferença |
|-----|----------|--------------|------------------|-----------|
| **Job 5** | 2617 | 28.74 min | 17.4 min | **+65%** 🚨 |
| **Job 7** | 3080 | 20.11 min | 20.5 min | **-2%** ✅ |

**Job 7 está normal, mas Job 5 está com problema!**

---

## 🎯 DESCOBERTA PRINCIPAL

### Padrão Identificado:

Olhando outros logs no histórico:

```
Job 5 (6 chunks): 28.74 min (anormal)
Job 6 (6 chunks): ?
Job 7 (7 chunks): 20.11 min (normal)
Job 8 (6 chunks): ?
Job 9 (7 chunks): ?
```

**Precisamos verificar se:**
1. Todos os jobs com 6 chunks têm problema
2. Apenas Job 5 específico teve problema
3. Há algum padrão relacionado ao número de chunks

---

## 🔧 CÓDIGO VERIFICADO

### 1. Split de Chunks (`geminiTtsChunks.ts`)

```typescript
export const GEMINI_TTS_WORD_LIMIT = 450; // ✅ Correto
```

Chunks são divididos corretamente em ~450 palavras.

### 2. Concatenação (`audioUtils.ts:65-93`)

```typescript
export function concatAudioBuffers(buffers: AudioBuffer[], sampleRate?: number) {
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
  // ...
  for (const b of normalizedBuffers) {
    for (let ch = 0; ch < channels; ch++) {
      const out = output.getChannelData(ch);
      const src = b.getChannelData(Math.min(ch, b.numberOfChannels - 1));
      out.set(src, offset);
    }
    offset += b.length;
  }
  return output;
}
```

✅ **Código está correto:**
- Itera sobre cada buffer UMA VEZ
- offset é incrementado corretamente
- Não há duplicação

### 3. Loop de Processamento (`useGeminiTtsQueue.ts:228-240`)

```typescript
for (let i = 0; i < jobToProcess.chunks.length; i++) {
  try {
    const wavBlob = await processChunkWithRetry(i);
    generatedAudioChunks[i] = wavBlob; // ✅ Armazena no índice correto
    // ...
  }
}
```

✅ **Código está correto:**
- Processa cada chunk UMA VEZ
- Armazena no índice correto
- Não há duplicação

---

## 🎬 CONCLUSÃO PRELIMINAR

### Problema CONFIRMADO:

✅ Áudio realmente tem 28.74 minutos (não é erro de cálculo)
✅ WAV tem 157.86 MB (tamanho correto para 28.74 min)
✅ MP3 tem 26.31 MB (tamanho correto para 28.74 min)

### Problema NÃO está em:

❌ Duplicação de chunks (código verificado)
❌ Concatenação incorreta (código verificado)
❌ Sample rate errado (48kHz correto)
❌ Encoding incorreto (arquivos íntegros)

### Problema PODE estar em:

⚠️ **Gemini TTS retornando áudio muito longo**
   - Cada chunk de 450 palavras está vindo com ~4.8 minutos
   - Esperado: ~3 minutos por chunk
   - Real: ~4.8 minutos por chunk (+60%)

**Possíveis causas:**

1. **Velocidade de narração muito lenta**
   - Gemini pode estar narrando a 100 palavras/min ao invés de 150
   - 2617 palavras ÷ 100 pal/min = 26.17 min (próximo de 28.74 min)

2. **Pausas/silêncios excessivos**
   - API pode estar adicionando pausas longas entre frases
   - Com `temperature: 0.3` (baixo), pode ter efeito colateral

3. **Problema específico do alemão**
   - Idioma alemão pode ter narração mais lenta
   - Palavras alemãs são mais longas

4. **Bug introduzido recentemente**
   - Implementamos `seed` + `temperature: 0.3` recentemente
   - Pode estar afetando a velocidade

---

## 🔍 PRÓXIMOS PASSOS RECOMENDADOS

### 1. Verificar Duração Individual dos Chunks

Adicionar log para ver duração de CADA chunk ANTES da concatenação:

```typescript
for (let index = 0; index < arrayBuffers.length; index++) {
  const decoded = await decodeToBuffer(arrayBuffers[index], audioContext);
  console.log(`📊 Chunk ${index + 1}: ${decoded.duration.toFixed(2)}s`);
  audioBuffers.push(decoded);
}
```

### 2. Comparar com e sem `seed`/`temperature`

Testar se o problema ocorre também SEM `seed` e `temperature: 0.3`

### 3. Testar com outros idiomas

Verificar se problema é específico do alemão ou ocorre em português também

### 4. Checar se é intermitente

Job 7 estava normal (20.11 min para 3080 palavras)
Job 5 estava anormal (28.74 min para 2617 palavras)

Pode ser problema intermitente da API do Gemini?

---

## 📝 NOTAS IMPORTANTES

1. **O código de concatenação está CORRETO** ✅
2. **Não há duplicação de chunks** ✅
3. **O problema vem dos áudios INDIVIDUAIS do Gemini** ⚠️
4. **Alguns jobs estão normais, outros não** ⚠️
5. **Precisa investigar se é problema do Gemini ou configuração** 🔍

---

**Recomendação:** Adicionar logs detalhados para verificar duração individual de cada chunk ANTES da concatenação, para confirmar se o problema vem do Gemini ou do código de processamento.
