// Audio utilities: decode, concatenate and export WAV

/**
 * Calcula o RMS (Root Mean Square) de um AudioBuffer
 * Usado para normalização de volume
 */
function calculateRMS(buffer: AudioBuffer): number {
  let sum = 0;
  let count = 0;

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
      count++;
    }
  }

  return Math.sqrt(sum / count);
}

/**
 * Normaliza um AudioBuffer para um RMS target específico
 * Garante volume consistente entre chunks
 */
function normalizeBufferToRMS(buffer: AudioBuffer, targetRMS: number): AudioBuffer {
  const currentRMS = calculateRMS(buffer);

  // Evitar divisão por zero
  if (currentRMS === 0) return buffer;

  const gain = targetRMS / currentRMS;

  // Criar novo buffer normalizado
  const ctx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );
  const normalized = ctx.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  // Aplicar gain em todos os canais
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch);
    const output = normalized.getChannelData(ch);

    for (let i = 0; i < input.length; i++) {
      // Aplicar gain e clamping para evitar clipping
      output[i] = Math.max(-1, Math.min(1, input[i] * gain));
    }
  }

  return normalized;
}

export async function decodeToBuffer(arrayBuffer: ArrayBuffer, audioContext?: AudioContext) {
  const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

export function concatAudioBuffers(buffers: AudioBuffer[], sampleRate?: number) {
  if (buffers.length === 0) throw new Error('No buffers to concatenate');

  // ✅ NORMALIZAR VOLUMES ANTES DE CONCATENAR
  // Calcular RMS médio de todos os buffers (sem logs para não bloquear UI)
  const rmsValues = buffers.map(b => calculateRMS(b));
  const averageRMS = rmsValues.reduce((sum, rms) => sum + rms, 0) / rmsValues.length;

  // Normalizar todos os buffers para o RMS médio (sem logs)
  const normalizedBuffers = buffers.map(buffer => normalizeBufferToRMS(buffer, averageRMS));

  // Continuar com concatenação normal
  const channels = Math.max(...normalizedBuffers.map(b => b.numberOfChannels));
  const rate = sampleRate || normalizedBuffers[0].sampleRate;
  const totalLength = normalizedBuffers.reduce((sum, b) => sum + b.length, 0);
  const ctx = new OfflineAudioContext(channels, totalLength, rate);
  const output = ctx.createBuffer(channels, totalLength, rate);

  let offset = 0;
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

export function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const samples = buffer.length * numChannels;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const bufferLength = 44 + samples * bytesPerSample;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  let offset = 0;

  const writeString = (s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); offset += s.length; };
  const writeUint32 = (d: number) => { view.setUint32(offset, d, true); offset += 4; };
  const writeUint16 = (d: number) => { view.setUint16(offset, d, true); offset += 2; };

  // RIFF header
  writeString('RIFF');
  writeUint32(36 + samples * bytesPerSample);
  writeString('WAVE');

  // fmt chunk
  writeString('fmt ');
  writeUint32(16);
  writeUint16(format);
  writeUint16(numChannels);
  writeUint32(sampleRate);
  writeUint32(sampleRate * blockAlign);
  writeUint16(blockAlign);
  writeUint16(bitDepth);

  // data chunk
  writeString('data');
  writeUint32(samples * bytesPerSample);

  // interleave channels and write PCM samples
  const channelsData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) channelsData.push(buffer.getChannelData(ch));

  const sampleCount = buffer.length;
  for (let i = 0; i < sampleCount; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let s = Math.max(-1, Math.min(1, channelsData[ch][i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, s, true);
      offset += 2;
    }
  }
  return arrayBuffer;
}

