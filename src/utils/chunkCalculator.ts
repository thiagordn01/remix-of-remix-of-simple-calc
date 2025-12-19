export interface ChunkDistribution {
  totalChunks: number;
  chunkSizes: number[];
  averageChunkSize: number;
}

export function calculateOptimalChunks(
  targetWords: number,
  maxChunkSize: number = 550,
  minChunkSize: number = 200
): ChunkDistribution {
  // Se o target é menor que o chunk mínimo, usar apenas 1 chunk
  if (targetWords <= minChunkSize) {
    return {
      totalChunks: 1,
      chunkSizes: [targetWords],
      averageChunkSize: targetWords
    };
  }

  // Se o target cabe em um chunk máximo, usar apenas 1 chunk
  if (targetWords <= maxChunkSize) {
    return {
      totalChunks: 1,
      chunkSizes: [targetWords],
      averageChunkSize: targetWords
    };
  }

  // Calcular número ideal de chunks
  const idealChunks = Math.ceil(targetWords / maxChunkSize);
  const averageChunkSize = Math.floor(targetWords / idealChunks);

  // Distribuir as palavras de forma equilibrada
  const chunkSizes: number[] = [];
  let remainingWords = targetWords;

  for (let i = 0; i < idealChunks; i++) {
    const isLastChunk = i === idealChunks - 1;
    
    if (isLastChunk) {
      // Último chunk pega todas as palavras restantes
      chunkSizes.push(remainingWords);
    } else {
      // Chunks intermediários usam o tamanho médio
      const chunkSize = Math.min(averageChunkSize, remainingWords);
      chunkSizes.push(chunkSize);
      remainingWords -= chunkSize;
    }
  }

  return {
    totalChunks: idealChunks,
    chunkSizes,
    averageChunkSize
  };
}

export function getChunkSize(chunkIndex: number, distribution: ChunkDistribution): number {
  return distribution.chunkSizes[chunkIndex] || 0;
}

export function getCompletedWords(chunkIndex: number, distribution: ChunkDistribution): number {
  return distribution.chunkSizes.slice(0, chunkIndex).reduce((sum, size) => sum + size, 0);
}
