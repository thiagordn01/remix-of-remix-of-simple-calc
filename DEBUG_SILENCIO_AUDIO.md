# 🔍 DEBUG: Investigação de Silêncio no Áudio

**Data**: 2025-11-03
**Problema**: Áudios com grande parte em silêncio (28 min para conteúdo de ~10 min)
**Commit**: `2d0f031`

---

## 🎯 Problema Reportado

- Áudio gerado tem **grande parte em silêncio**
- Exemplo: 16k caracteres (alemão) → 28 minutos (esperado: ~10 min)
- Duração 60-180% maior que o esperado

## 🔍 Possíveis Causas

### 1. **API Gemini retornando áudio com silêncio**
   - Gemini pode estar adicionando pausas muito longas
   - Base64 PCM pode conter silêncio embutido
   - Problema intermitente da API

### 2. **Chunks falhadas gerando silêncio**
   - Se uma chunk falha mas não lança erro
   - ArrayBuffer vazio ou corrompido passando pela validação

### 3. **Concatenação adicionando silêncio extra**
   - Improvável baseado na revisão de código
   - concatAudioBuffers apenas normaliza volume, não adiciona silêncio

---

## ✅ Logs Adicionados

### **Fluxo Completo de Logging**

```
🚀 [PROCESSAMENTO] Iniciando geração de 6 chunks de áudio...

   ⏳ Chunk 1/6: Requisitando 443 palavras para Gemini TTS...
      ✅ Resposta recebida: 9234567 chars base64 (9015.26 KB) - MimeType: audio/pcm;rate=24000
      🎤 PCM: 6925424 bytes (6.60 MB) → Duração esperada: 144.28s @ 24000 Hz
      ✅ WAV convertido: 6925468 bytes (6.60 MB)

   ⏳ Chunk 2/6: Requisitando 433 palavras para Gemini TTS...
      ✅ Resposta recebida: ...
      🎤 PCM: ...
      ✅ WAV convertido: ...

   ... (chunks 3-6)

✅ [PROCESSAMENTO] 6 chunks processadas!

🔄 [CONVERSÃO] Convertendo 6 Blobs → ArrayBuffers...
   📦 Chunk 1/6: 6925468 bytes (6.60 MB)
   📦 Chunk 2/6: 6815468 bytes (6.50 MB)
   📦 Chunk 3/6: 6925468 bytes (6.60 MB)
   📦 Chunk 4/6: 6925468 bytes (6.60 MB)
   📦 Chunk 5/6: 6925468 bytes (6.60 MB)
   📦 Chunk 6/6: 6523468 bytes (6.22 MB)
✅ [CONVERSÃO] 6 ArrayBuffers prontos!

📊 [DECODIFICAÇÃO] Decodificando 6 WAV files...
   📝 Chunk 1/6: 144.28s (2.40 min) - 443 palavras
   📝 Chunk 2/6: 142.15s (2.37 min) - 433 palavras
   📝 Chunk 3/6: 144.28s (2.40 min) - 439 palavras
   📝 Chunk 4/6: 144.28s (2.40 min) - 442 palavras
   📝 Chunk 5/6: 144.28s (2.40 min) - 448 palavras
   📝 Chunk 6/6: 136.22s (2.27 min) - 412 palavras
   Sample Rate: 24000 Hz, Canais: 1, Duração: 144.28s
✅ [DECODIFICAÇÃO] 6 chunks decodificados com sucesso!

🔗 [CONCATENAÇÃO] Concatenando e normalizando volumes...
✅ [CONCATENAÇÃO] Áudio final: 855.49s (14.26 min) @ 24000 Hz

🔄 [ENCODING] Convertendo AudioBuffer → WAV...
✅ [WAV] Arquivo WAV gerado: 78.23 MB

🎵 [MP3] Convertendo WAV → MP3 (128 kbps)...
✅ [MP3] Arquivo MP3 gerado: 13.05 MB
```

---

## 📊 Como Interpretar os Logs

### **1. Tamanho do Base64 Recebido**

```
✅ Resposta recebida: 9234567 chars base64 (9015.26 KB)
```

- **Normal**: ~6-8 MB para 450 palavras (~3 min de áudio @ 24 kHz)
- **Anormal**: >15 MB para 450 palavras (indica áudio muito longo ou com silêncio)

### **2. Duração Esperada do PCM**

```
🎤 PCM: 6925424 bytes (6.60 MB) → Duração esperada: 144.28s @ 24000 Hz
```

- **Cálculo**: `numSamples / sampleRate = duração em segundos`
- **Normal**: 450 palavras → ~180 segundos (~3 min)
- **Anormal**: 450 palavras → >300 segundos (>5 min) indica áudio muito lento ou com silêncio

### **3. Duração Real após Decodificação**

```
📝 Chunk 1/6: 144.28s (2.40 min) - 443 palavras
```

- **Deve bater** com a "Duração esperada" do PCM
- Se for diferente → problema na decodificação
- **Normal**: ~0.4 segundos por palavra (150 pal/min)
- **Anormal**: >0.6 segundos por palavra (<100 pal/min)

### **4. Soma vs Concatenação**

```
Soma das durações individuais: 144.28 + 142.15 + ... = 855.49s
Duração após concatenação: 855.49s
```

- **Deve ser EXATAMENTE igual**
- Se concatenação > soma → bug na concatenação (adiciona silêncio)
- Se concatenação < soma → impossível (indicaria corte)

---

## 🎯 Diagnóstico Esperado

### **Cenário A: Gemini retorna áudio muito longo**

```
⏳ Chunk 1/6: Requisitando 443 palavras...
   🎤 PCM: 13850848 bytes (13.20 MB) → Duração esperada: 288.56s @ 24000 Hz  ❌ ANORMAL!
   📝 Chunk 1/6: 288.56s (4.81 min) - 443 palavras  ❌ 0.65s/palavra (muito lento!)
```

**Causa**: API Gemini está retornando áudio com pausas muito longas
**Solução**: Problema da API, não do código

---

### **Cenário B: Chunk específico tem problema**

```
📝 Chunk 1/6: 180.00s (3.00 min) - 443 palavras  ✅ OK
📝 Chunk 2/6: 720.00s (12.00 min) - 433 palavras  ❌ ANORMAL!
📝 Chunk 3/6: 180.00s (3.00 min) - 439 palavras  ✅ OK
```

**Causa**: Chunk específico foi processado incorretamente
**Solução**: Investigar o que há de especial no texto dessa chunk

---

### **Cenário C: Concatenação adiciona silêncio**

```
Soma das durações: 180 + 180 + 180 = 540s (9 min)
Áudio final: 1080s (18 min)  ❌ DOBROU!
```

**Causa**: Bug na função `concatAudioBuffers`
**Solução**: Revisar código de concatenação

---

## 🧪 Próximos Passos

1. **Gerar um áudio** (preferencialmente alemão com ~16k caracteres)
2. **Abrir console do navegador** (F12)
3. **Copiar TODOS os logs** e me enviar
4. **Analisar os logs** seguindo os critérios acima

Com os logs, vou conseguir identificar EXATAMENTE onde o silêncio está sendo introduzido.

---

## 📋 Checklist de Análise

- [ ] Tamanho do base64 está normal? (~6-8 MB para 450 palavras)
- [ ] Duração esperada do PCM está normal? (~180s para 450 palavras)
- [ ] Duração real após decodificação bate com a esperada?
- [ ] Todas as chunks têm duração similar? (variação <20%)
- [ ] Soma das durações = duração final após concatenação?

---

## 🔧 Arquivos Modificados

1. **src/hooks/useGeminiTtsQueue.ts**
   - Linha 147: Log de requisição de chunk
   - Linha 205: Log de resposta da API (base64)
   - Linha 210: Log de WAV convertido
   - Linha 236: Log de início do processamento
   - Linha 307: Log de tamanho de ArrayBuffers
   - Linha 326: Log de duração individual de chunks
   - Linha 344: Log de concatenação

2. **src/utils/pcmToWav.ts**
   - Linha 71: Log de PCM e duração esperada

---

**Resumo**: Adicionei logs completos em TODAS as etapas do pipeline para identificar onde o silêncio está sendo introduzido.
