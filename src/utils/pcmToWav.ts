function base64ToArrayBuffer(base64: string): ArrayBuffer {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error("Falha ao decodificar a string Base64:", error);
    // Retorna um buffer vazio em caso de erro para evitar que a aplicação quebre
    return new ArrayBuffer(0);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function pcmToWavHeader(
  sampleRate: number,
  numChannels: number,
  numSamples: number,
  bitsPerSample: number,
): ArrayBuffer {
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  return buffer;
}

export function convertPcmToWav(base64Pcm: string, mimeType: string): Uint8Array {
  const match = mimeType.match(/rate=(\d+)/);
  const sampleRate = match ? parseInt(match[1], 10) : 24000;

  const pcmData = base64ToArrayBuffer(base64Pcm);
  if (pcmData.byteLength === 0) {
    console.warn("⚠️ Dados PCM vazios, retornando WAV vazio.");
    return new Uint8Array(0);
  }

  // A API do Gemini retorna PCM de 16-bit
  const bitsPerSample = 16;
  const numChannels = 1;
  const pcm16 = new Int16Array(pcmData);
  const numSamples = pcm16.length;

  // ✅ LOG: Tamanho do PCM e duração esperada
  const expectedDurationSeconds = numSamples / sampleRate;
  const pcmSizeMB = (pcmData.byteLength / (1024 * 1024)).toFixed(2);
  console.log(`      🎤 PCM: ${pcmData.byteLength} bytes (${pcmSizeMB} MB) → Duração esperada: ${expectedDurationSeconds.toFixed(2)}s @ ${sampleRate} Hz`);

  const header = pcmToWavHeader(sampleRate, numChannels, numSamples, bitsPerSample);

  const wavBytes = new Uint8Array(header.byteLength + pcmData.byteLength);
  wavBytes.set(new Uint8Array(header), 0);
  wavBytes.set(new Uint8Array(pcmData), header.byteLength);

  return wavBytes;
}
