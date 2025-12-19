import { ELEVENLABS_CHUNK_LIMIT } from './elevenLabsConfig';

export function splitTextForElevenLabs(text: string): string[] {
  if (!text.trim()) return [];
  
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const testChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    
    if (testChunk.length <= ELEVENLABS_CHUNK_LIMIT) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        // Sentence is too long, split by words
        const words = sentence.split(' ');
        let wordChunk = '';
        
        for (const word of words) {
          const testWordChunk = wordChunk ? `${wordChunk} ${word}` : word;
          
          if (testWordChunk.length <= ELEVENLABS_CHUNK_LIMIT) {
            wordChunk = testWordChunk;
          } else {
            if (wordChunk) {
              chunks.push(wordChunk.trim());
              wordChunk = word;
            } else {
              // Single word is too long, truncate
              chunks.push(word.substring(0, ELEVENLABS_CHUNK_LIMIT));
            }
          }
        }
        
        if (wordChunk) {
          currentChunk = wordChunk;
        }
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}