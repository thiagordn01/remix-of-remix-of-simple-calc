// Informa ao TypeScript que a variável 'lamejs' existe globalmente (injetada pelo index.html)
declare const lamejs: any;

// A importação foi removida, pois a biblioteca agora é carregada globalmente.

export function convertWavToMp3(wavBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          throw new Error("Não foi possível ler o arquivo WAV.");
        }

        const wavData = new Uint8Array(arrayBuffer);

        // Parse WAV header
        const view = new DataView(arrayBuffer);
        const sampleRate = view.getUint32(24, true);
        const numChannels = view.getUint16(22, true);

        // Find data chunk
        let dataOffset = 44; // Standard WAV header size

        const dataSize = view.getUint32(dataOffset - 4, true);
        const pcmData = new Int16Array(arrayBuffer, dataOffset, dataSize / 2);

        const samples = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          samples[i] = pcmData[i];
        }

        // Initialize MP3 encoder
        const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128); // Bitrate de 128kbps
        const mp3Data: Int8Array[] = [];

        const sampleBlockSize = 1152;

        if (numChannels === 1) {
          // Mono
          for (let i = 0; i < samples.length; i += sampleBlockSize) {
            const sampleChunk = samples.subarray(i, i + sampleBlockSize);
            const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
            if (mp3buf.length > 0) {
              mp3Data.push(mp3buf);
            }
          }
        } else {
          // Stereo - interleave channels
          const leftChannel = new Int16Array(samples.length / 2);
          const rightChannel = new Int16Array(samples.length / 2);

          for (let i = 0; i < samples.length / 2; i++) {
            leftChannel[i] = samples[i * 2];
            rightChannel[i] = samples[i * 2 + 1];
          }

          for (let i = 0; i < leftChannel.length; i += sampleBlockSize) {
            const leftChunk = leftChannel.subarray(i, i + sampleBlockSize);
            const rightChunk = rightChannel.subarray(i, i + sampleBlockSize);
            const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
            if (mp3buf.length > 0) {
              mp3Data.push(mp3buf);
            }
          }
        }

        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }

        const mp3Blob = new Blob(mp3Data as BlobPart[], { type: "audio/mp3" });
        resolve(mp3Blob);
      } catch (error) {
        console.error("Erro na conversão para MP3:", error);
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(wavBlob);
  });
}
