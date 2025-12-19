// Utilitário para garantir coerência de contexto entre chunks de conteúdo

export interface ContextInfo {
  title: string;
  language: string;
  mainTopic: string;
  keyPoints: string[];
  culturalContext: string;
  targetAudience: string;
}

export interface ChunkContext {
  chunkIndex: number;
  totalChunks: number;
  previousContent: string;
  targetWords: number;
  isLastChunk: boolean;
}

/**
 * Extrai informações de contexto do título para garantir coerência
 */
export function extractContextFromTitle(title: string, language: string, location: string): ContextInfo {
  const lowerTitle = title.toLowerCase();
  
  // Identificar tópico principal baseado em palavras-chave
  let mainTopic = 'geral';
  const topicKeywords = {
    'tecnologia': ['technology', 'tech', 'ai', 'artificial intelligence', 'programming', 'software', 'computer', 'digital', 'internet', 'app', 'tecnologia', 'inteligência artificial', 'programação'],
    'negócios': ['business', 'entrepreneur', 'startup', 'company', 'market', 'economy', 'finance', 'negócios', 'empresa', 'mercado', 'economia'],
    'educação': ['education', 'learning', 'study', 'school', 'university', 'course', 'educação', 'aprendizado', 'estudo', 'escola'],
    'saúde': ['health', 'medical', 'doctor', 'medicine', 'fitness', 'wellness', 'saúde', 'médico', 'medicina'],
    'entretenimento': ['entertainment', 'movie', 'music', 'game', 'fun', 'entretenimento', 'filme', 'música', 'jogo'],
    'ciência': ['science', 'research', 'discovery', 'experiment', 'scientific', 'ciência', 'pesquisa', 'descoberta']
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      mainTopic = topic;
      break;
    }
  }

  // Extrair pontos-chave do título
  const keyPoints = extractKeyPointsFromTitle(title);

  // Determinar contexto cultural
  const culturalContext = determineCulturalContext(language, location, mainTopic);

  // Determinar audiência alvo
  const targetAudience = determineTargetAudience(title, language, location);

  return {
    title,
    language,
    mainTopic,
    keyPoints,
    culturalContext,
    targetAudience
  };
}

/**
 * Extrai pontos-chave do título para manter foco
 */
function extractKeyPointsFromTitle(title: string): string[] {
  const points: string[] = [];
  const lowerTitle = title.toLowerCase();

  // Palavras-chave importantes que devem ser abordadas
  const importantWords = title.split(/\s+/).filter(word => 
    word.length > 3 && 
    !['the', 'and', 'for', 'with', 'will', 'are', 'que', 'para', 'com', 'será', 'são'].includes(word.toLowerCase())
  );

  points.push(...importantWords.slice(0, 5)); // Máximo 5 pontos-chave

  // Identificar questões ou temas específicos
  if (lowerTitle.includes('future') || lowerTitle.includes('futuro')) {
    points.push('perspectivas futuras');
  }
  if (lowerTitle.includes('replace') || lowerTitle.includes('substituir')) {
    points.push('substituição/mudança');
  }
  if (lowerTitle.includes('ai') || lowerTitle.includes('artificial intelligence') || lowerTitle.includes('inteligência artificial')) {
    points.push('inteligência artificial');
  }

  return points;
}

/**
 * Determina contexto cultural apropriado
 */
function determineCulturalContext(language: string, location: string, mainTopic: string): string {
  const contexts = {
    'pt-BR': {
      'tecnologia': 'Contexto brasileiro de tecnologia: startups nacionais, mercado tech brasileiro, regulamentações locais, empresas como Nubank, iFood, Mercado Livre',
      'negócios': 'Contexto empresarial brasileiro: economia nacional, moeda real, mercado de trabalho brasileiro, empresas nacionais',
      'educação': 'Sistema educacional brasileiro: universidades públicas e privadas, ENEM, cursos técnicos, educação à distância',
      'default': 'Contexto cultural brasileiro: referências nacionais, personalidades brasileiras, situações do cotidiano brasileiro'
    },
    'en-US': {
      'tecnologia': 'Global technology context: Silicon Valley, major tech companies, international regulations, innovation hubs',
      'negócios': 'International business context: global economy, major corporations, international markets',
      'educação': 'Global education context: international universities, online learning platforms, educational trends',
      'default': 'International cultural context: global references, international personalities, universal situations'
    }
  };

  const langContexts = contexts[language] || contexts['en-US'];
  return langContexts[mainTopic] || langContexts['default'];
}

/**
 * Determina audiência alvo
 */
function determineTargetAudience(title: string, language: string, location: string): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('programmer') || lowerTitle.includes('developer') || lowerTitle.includes('programador')) {
    return language === 'pt-BR' ? 'Desenvolvedores e programadores brasileiros' : 'Developers and programmers';
  }
  
  if (lowerTitle.includes('business') || lowerTitle.includes('entrepreneur') || lowerTitle.includes('negócio')) {
    return language === 'pt-BR' ? 'Empreendedores e profissionais de negócios' : 'Entrepreneurs and business professionals';
  }
  
  if (lowerTitle.includes('student') || lowerTitle.includes('learning') || lowerTitle.includes('estudante')) {
    return language === 'pt-BR' ? 'Estudantes e pessoas interessadas em aprendizado' : 'Students and learning enthusiasts';
  }

  return language === 'pt-BR' ? 
    `Público geral interessado em ${title.toLowerCase()}` : 
    `General audience interested in ${title.toLowerCase()}`;
}

/**
 * Gera instruções de contexto para chunks
 */
export function generateChunkContextInstructions(
  contextInfo: ContextInfo,
  chunkContext: ChunkContext,
  previousChunk?: string
): string {
  const { title, language, mainTopic, keyPoints, culturalContext, targetAudience } = contextInfo;
  const { chunkIndex, totalChunks, targetWords, isLastChunk } = chunkContext;

  let instructions = '';

  if (language === 'pt-BR') {
    instructions = `
CONTEXTO OBRIGATÓRIO PARA ESTE CHUNK:

📋 INFORMAÇÕES DO CONTEÚDO:
- Título: "${title}"
- Tópico principal: ${mainTopic}
- Pontos-chave a abordar: ${keyPoints.join(', ')}
- Audiência: ${targetAudience}

🌍 CONTEXTO CULTURAL:
${culturalContext}

📝 INFORMAÇÕES DO CHUNK:
- Chunk ${chunkIndex + 1} de ${totalChunks}
- Meta de palavras: ${targetWords}
- ${isLastChunk ? 'ÚLTIMO CHUNK - Finalize completamente' : 'Chunk intermediário - Continue desenvolvendo'}

🎯 OBRIGAÇÕES ESPECÍFICAS:
1. MANTENHA foco absoluto no título "${title}"
2. DESENVOLVA os pontos-chave: ${keyPoints.join(', ')}
3. USE referências culturais brasileiras apropriadas
4. MANTENHA coerência com chunks anteriores
${isLastChunk ? '5. FINALIZE com conclusão satisfatória e call-to-action' : '5. PREPARE transição natural para próximo chunk'}`;
  } else {
    instructions = `
MANDATORY CONTEXT FOR THIS CHUNK:

📋 CONTENT INFORMATION:
- Title: "${title}"
- Main topic: ${mainTopic}
- Key points to address: ${keyPoints.join(', ')}
- Audience: ${targetAudience}

🌍 CULTURAL CONTEXT:
${culturalContext}

📝 CHUNK INFORMATION:
- Chunk ${chunkIndex + 1} of ${totalChunks}
- Target words: ${targetWords}
- ${isLastChunk ? 'LAST CHUNK - Finalize completely' : 'Intermediate chunk - Continue developing'}

🎯 SPECIFIC OBLIGATIONS:
1. MAINTAIN absolute focus on title "${title}"
2. DEVELOP key points: ${keyPoints.join(', ')}
3. USE appropriate cultural references
4. MAINTAIN coherence with previous chunks
${isLastChunk ? '5. FINALIZE with satisfying conclusion and call-to-action' : '5. PREPARE natural transition to next chunk'}`;
  }

  if (previousChunk) {
    const preview = previousChunk.substring(0, 200) + '...';
    instructions += `\n\n📖 CONTEXTO DO CHUNK ANTERIOR:\n${preview}\n\nContinue naturalmente a partir deste contexto.`;
  }

  return instructions;
}

/**
 * Valida se o conteúdo gerado mantém coerência com o contexto
 */
export function validateContentCoherence(
  content: string,
  contextInfo: ContextInfo,
  chunkContext: ChunkContext
): { isCoherent: boolean; issues: string[]; suggestions: string[] } {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const lowerContent = content.toLowerCase();
  const lowerTitle = contextInfo.title.toLowerCase();

  // Verificar se o conteúdo aborda o título (SUAVIZADO: 40% das palavras-chave)
  const titleWords = lowerTitle.split(/\s+/).filter(word => word.length > 3);
  const titleWordsInContent = titleWords.filter(word => lowerContent.includes(word));
  
  if (titleWordsInContent.length < titleWords.length * 0.4) {
    issues.push(`⚠️ AVISO: Conteúdo aborda ${Math.round((titleWordsInContent.length/titleWords.length)*100)}% das palavras do título "${contextInfo.title}" (recomendado: 40%)`);
    suggestions.push(`Sugestão: Incluir mais palavras-chave do título: ${titleWords.join(', ')}`);
  }

  // Verificar pontos-chave (SUAVIZADO: 30% dos pontos-chave)
  const keyPointsInContent = contextInfo.keyPoints.filter(point => 
    lowerContent.includes(point.toLowerCase())
  );
  
  if (keyPointsInContent.length < contextInfo.keyPoints.length * 0.3) {
    issues.push(`⚠️ AVISO: ${Math.round((keyPointsInContent.length/contextInfo.keyPoints.length)*100)}% dos pontos-chave foram abordados (recomendado: 30%)`);
    suggestions.push(`Sugestão: Desenvolver os pontos-chave: ${contextInfo.keyPoints.join(', ')}`);
  }

  // Verificar idioma (RIGOROSO: Falha CRÍTICA se errado)
  if (contextInfo.language === 'pt-BR') {
    const portugueseIndicators = ['que', 'para', 'com', 'uma', 'não', 'são', 'tem', 'de', 'o', 'a'];
    const portugueseCount = portugueseIndicators.filter(word => lowerContent.includes(word)).length;
    
    if (portugueseCount < 5) {
      issues.push('⚠️ AVISO: Conteúdo pode não estar em português brasileiro');
      suggestions.push('Sugestão: Verificar se o idioma está correto e reescrever em português brasileiro se necessário');
    }
  } else if (contextInfo.language.startsWith('en')) {
    const englishIndicators = ['the', 'is', 'and', 'to', 'of', 'in', 'that', 'it', 'for'];
    const englishCount = englishIndicators.filter(word => lowerContent.includes(word)).length;
    
    if (englishCount < 5) {
      issues.push('⚠️ AVISO: Conteúdo pode não estar em inglês');
      suggestions.push('Sugestão: Verificar se o idioma está correto e reescrever em inglês se necessário');
    }
  } else if (contextInfo.language.startsWith('es')) {
    const spanishIndicators = ['que', 'de', 'el', 'la', 'y', 'en', 'un', 'es', 'se'];
    const spanishCount = spanishIndicators.filter(word => lowerContent.includes(word)).length;
    
    if (spanishCount < 5) {
      issues.push('⚠️ AVISO: Conteúdo pode não estar em espanhol');
      suggestions.push('Sugestão: Verificar se o idioma está correto e reescrever em espanhol se necessário');
    }
  }

  // Verificar tamanho apropriado (RIGOROSO: 70% mínimo, 130% máximo)
  const wordCount = content.split(/\s+/).length;
  const targetWords = chunkContext.targetWords;
  
  if (wordCount < targetWords * 0.7) {
    issues.push(`⚠️ AVISO: Conteúdo curto (${wordCount} palavras, esperado ${targetWords})`);
    suggestions.push('Sugestão: Expandir o conteúdo para atingir pelo menos 70% do alvo');
  } else if (wordCount > targetWords * 1.3) {
    issues.push(`⚠️ AVISO: Conteúdo longo (${wordCount} palavras, esperado ${targetWords})`);
    suggestions.push('Sugestão: Considerar condensar o conteúdo');
  }

  return {
    isCoherent: issues.length === 0,
    issues,
    suggestions
  };
}
