/**
 * ✅ SISTEMA "PROMPT INVISÍVEL 2.0"
 * 
 * Filosofia: O prompt do sistema deve ser INVISÍVEL.
 * Apenas o prompt do usuário guia a criação.
 * Anti-duplicação por VALIDAÇÃO, não por instruções verbosas.
 * 
 * Objetivo: Roteiros humanizados com 40-50% de retenção (vs 17% atual)
 */

// Mapeamento simples de idiomas
const LANGUAGE_NAMES: Record<string, string> = {
  'pt-BR': 'Português Brasileiro',
  'pt-PT': 'Português',
  'en-US': 'English',
  'en-GB': 'English',
  'es-ES': 'Español',
  'es-MX': 'Español',
  'fr-FR': 'Français',
  'de-DE': 'Deutsch',
  'it-IT': 'Italiano',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
  'zh-CN': '中文',
  'ru-RU': 'Русский'
};

export interface MinimalChunkContext {
  title: string;
  language: string;
  targetWords: number;
  premise: string;
  chunkIndex: number;
  totalChunks: number;
  lastParagraph?: string;
  anchors?: string[];
}

/**
 * Extrai seção específica da premissa (aceita SEÇÃO, BLOCO ou PARTE)
 */
function extractPremiseSection(premise: string, sectionNumber: number): string {
  // ✅ CORREÇÃO: Regex flexível que aceita [SEÇÃO N], [BLOCO N], [PARTE N] ou apenas SEÇÃO N
  // Aceita com ou sem colchetes, case insensitive
  const sectionRegex = new RegExp(
    `(?:[\[\(]?)?\\b(?:SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*${sectionNumber}\\b(?:[\]\)]?|[:\\-–])\\s*(?:[\\-–:]\\s*)?([^\\n]*)([\\s\\S]*?)(?=(?:[\\[\\(]?)?\\b(?:SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*\\d+|$)` ,
    'i'
  );

  const match = premise.match(sectionRegex);
  if (match) {
    const title = (match[1] || '').trim();
    const content = (match[2] || '').trim();
    // Retorna o conteúdo limpo, removendo o cabeçalho para não confundir a IA
    return content || title;
  }

  // Fallback melhorado: se não achar, tenta dividir por parágrafos (linhas duplas)
  const paragraphs = premise
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length >= 3) {
    const totalSections = 3;
    const perSection = Math.ceil(paragraphs.length / totalSections);
    const startIndex = (sectionNumber - 1) * perSection;
    const slice = paragraphs.slice(startIndex, startIndex + perSection);
    if (slice.length > 0) {
      return slice.join('\n\n');
    }
  }

  // Último recurso: divisão por linhas (original, mas só se tudo falhar)
  const lines = premise
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return '';

  const totalSectionsCalc = Math.max(3, Math.ceil(lines.length / 10));
  const linesPerSection = Math.ceil(lines.length / totalSectionsCalc);
  const start = (sectionNumber - 1) * linesPerSection;
  const end = Math.min(start + linesPerSection, lines.length);

  return lines.slice(start, end).join('\n');
}

/**
 * Constrói prompt minimalista com regras fortes de continuidade
 */
export function buildMinimalChunkPrompt(
  userPrompt: string,
  context: MinimalChunkContext
): string {
  const { title, language, targetWords, premise, chunkIndex, totalChunks, lastParagraph } = context;

  const isFirst = chunkIndex === 0;
  const isLast = chunkIndex === totalChunks - 1;
  const languageName = LANGUAGE_NAMES[language] || language;

  // Extrair conteúdo da seção atual
  const sectionContent = extractPremiseSection(premise, chunkIndex + 1);

  let prompt = `Role: Roteirista Profissional de YouTube
Idioma de Saída: ${languageName} (Obrigatório)
Meta: ~${targetWords} palavras
Título: "${title}"

CONTEXTO: Estamos escrevendo a PARTE ${chunkIndex + 1} de ${totalChunks} de um roteiro longo.

---
📝 PREMISSA/RESUMO PARA ESTA PARTE ESPECÍFICA (Foque nisto):
${sectionContent}
---

⚠️ INSTRUÇÕES DE ESTILO DO CRIADOR:
(Use estas instruções para tom e estilo. Se houver ordens de enredo como "comece com", IGNORE se não for a Parte 1)
"""
${userPrompt}
"""

`;

  // Lógica de Continuidade Anti-Duplicação
  if (!isFirst && lastParagraph) {
    prompt += `
🔗 CONTEXTO ANTERIOR (Onde a história parou):
"...${lastParagraph.slice(-300)}"

🚨 REGRA CRÍTICA DE CONTINUIDADE:
1. NÃO repita o texto acima.
2. NÃO resuma o que já aconteceu.
3. Comece a nova frase IMEDIATAMENTE dando sequência à ação/pensamento.
4. Mantenha o fluxo como se fosse um único texto contínuo.
`;
  } else if (isFirst) {
    prompt += `
🚀 INSTRUÇÃO: Este é o INÍCIO do vídeo. Comece com um gancho forte.
`;
  }

  if (isLast) {
    prompt += `
🏁 INSTRUÇÃO: Esta é a PARTE FINAL. Conclua a história/assunto de forma satisfatória.
`;
  }

  prompt += `
Escreva agora APENAS o texto da Parte ${chunkIndex + 1} (sem introduções meta):
`;

  return prompt;
}

/**
 * ✅ EXTRAI ÂNCORAS SEMÂNTICAS do conteúdo anterior
 * 
 * Substitui listas verbosas de "eventos já narrados" por 3 âncoras curtas
 */
export function extractSemanticAnchors(previousContent: string, maxAnchors: number = 3): string[] {
  if (!previousContent || previousContent.trim().length < 100) {
    return [];
  }
  
  const anchors: string[] = [];
  const contentLower = previousContent.toLowerCase();
  
  // 1. Extrair nomes próprios (personagens principais)
  const nameMatches = previousContent.match(/[A-Z][a-záàâãéèêíïóôõöúç]+(?:\s[A-Z][a-záàâãéèêíïóôõöúç]+)?/g);
  if (nameMatches) {
    const uniqueNames = [...new Set(nameMatches)]
      .filter(name => name.length > 3 && !['Ele', 'Ela', 'Era', 'Foi', 'Mas', 'Então', 'Quando'].includes(name))
      .slice(0, 2);
    if (uniqueNames.length > 0) {
      anchors.push(`personagens: ${uniqueNames.join(', ')}`);
    }
  }
  
  // 2. Detectar se houve revelação/descoberta importante
  const revelationKeywords = ['descobr', 'revel', 'perceb', 'entend', 'segredo', 'verdade'];
  const hasRevelation = revelationKeywords.some(kw => contentLower.includes(kw));
  if (hasRevelation) {
    anchors.push('revelação feita');
  }
  
  // 3. Detectar locais mencionados
  const locationPatterns = /(?:na |no |em |para (?:a |o )?)(fazenda|casa|hospital|praça|cidade|vila|sala|quarto|escritório|rua|estrada)[^,.\n]*/gi;
  const locations = previousContent.match(locationPatterns);
  if (locations && locations.length > 0) {
    const uniqueLocations = [...new Set(locations.map(l => l.trim()))].slice(0, 2);
    anchors.push(`cenas em: ${uniqueLocations.join(', ')}`);
  }
  
  return anchors.slice(0, maxAnchors);
}

/**
 * ✅ DETECTA DUPLICAÇÃO DE PARÁGRAFOS (pós-geração)
 * 
 * Verifica se algum parágrafo do novo chunk já existe no conteúdo anterior
 * Usa "fingerprinting" de palavras para detecção eficiente
 */
export function detectParagraphDuplication(
  newChunk: string,
  previousContent: string,
  minWords: number = 25
): { hasDuplication: boolean; duplicatedText?: string } {
  if (!previousContent || previousContent.length < 200 || !newChunk) {
    return { hasDuplication: false };
  }
  
  // Normalizar conteúdo anterior
  const previousNormalized = previousContent
    .toLowerCase()
    .replace(/[^\w\sáàâãéèêíïóôõöúç]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Dividir novo chunk em parágrafos
  const newParagraphs = newChunk
    .split(/\n\n+/)
    .filter(p => p.trim().length > 80);
  
  for (const paragraph of newParagraphs) {
    // Criar "fingerprint" do parágrafo (primeiras N palavras normalizadas)
    const words = paragraph
      .toLowerCase()
      .replace(/[^\w\sáàâãéèêíïóôõöúç]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, minWords);
    
    if (words.length < minWords * 0.7) continue; // Parágrafo muito curto
    
    const fingerprint = words.join(' ');
    
    // Verificar se fingerprint existe no conteúdo anterior
    if (previousNormalized.includes(fingerprint)) {
      return {
        hasDuplication: true,
        duplicatedText: paragraph.slice(0, 150) + '...'
      };
    }
  }
  
  return { hasDuplication: false };
}

/**
 * ✅ SANITIZA ROTEIRO PÓS-GERAÇÃO
 * 
 * Remove metadados, tags e formatações indesejadas
 */
export function sanitizeScript(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remover tags de metadados
  cleaned = cleaned.replace(/\[IMAGEM:[^\]]*\]/gi, '');
  cleaned = cleaned.replace(/\[MÚSICA:[^\]]*\]/gi, '');
  cleaned = cleaned.replace(/\[CENA:[^\]]*\]/gi, '');
  cleaned = cleaned.replace(/\[SFX:[^\]]*\]/gi, '');
  cleaned = cleaned.replace(/\[NARRADOR:[^\]]*\]/gi, '');
  
  // Remover indicações técnicas soltas
  cleaned = cleaned.replace(/^(Silêncio\.|Pausa\.|Música\.)\s*/gim, '');
  cleaned = cleaned.replace(/\(pausa[^)]*\)/gi, '');
  cleaned = cleaned.replace(/\(silêncio[^)]*\)/gi, '');
  cleaned = cleaned.replace(/\(suspiro[^)]*\)/gi, '');
  
  // Remover títulos de seção/capítulo
  cleaned = cleaned.replace(/^(Capítulo|Parte|Seção|Bloco)\s*\d+[:\-–]?\s*/gim, '');
  cleaned = cleaned.replace(/^(Introdução|Conclusão|Abertura|Fechamento)[:\-–]?\s*/gim, '');
  
  // Remover introduções meta
  cleaned = cleaned.replace(/^(Claro,? aqui (está|vai)|Certo,? vou|Ok,? aqui)[^.]*\.\s*/i, '');
  cleaned = cleaned.replace(/^(Aqui está o roteiro|Segue o texto)[^.]*\.\s*/i, '');
  
  // Remover asteriscos e formatações markdown
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/^#+\s*/gm, '');
  
  // Remover bullets e numerações no início de parágrafos
  cleaned = cleaned.replace(/^\s*[-•*]\s+/gm, '');
  cleaned = cleaned.replace(/^\s*\d+[.)]\s+/gm, '');
  
  // Limpar múltiplas quebras de linha
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * ✅ FORMATA PARÁGRAFOS PARA NARRAÇÃO
 * 
 * Quebra parágrafos longos (>3 frases) em parágrafos menores (2-3 frases)
 * Isso melhora a retenção em vídeos de YouTube
 */
export function formatParagraphsForNarration(text: string): string {
  if (!text) return '';
  
  // Dividir em parágrafos
  const paragraphs = text.split(/\n\n+/);
  
  const formattedParagraphs = paragraphs.map(para => {
    const trimmedPara = para.trim();
    if (!trimmedPara) return '';
    
    // Contar frases (terminadas com . ! ?)
    const sentences = trimmedPara.match(/[^.!?]+[.!?]+/g) || [];
    
    // Se tem mais de 3 frases, quebrar em grupos de 2-3
    if (sentences.length > 3) {
      const chunks: string[] = [];
      for (let i = 0; i < sentences.length; i += 2) {
        const chunk = sentences.slice(i, Math.min(i + 3, sentences.length)).join(' ').trim();
        if (chunk) chunks.push(chunk);
      }
      return chunks.join('\n\n');
    }
    
    return trimmedPara;
  });
  
  // Remover parágrafos vazios e juntar com dupla quebra
  return formattedParagraphs
    .filter(p => p.length > 0)
    .join('\n\n');
}

/**
 * ✅ EXTRAI ÚLTIMO PARÁGRAFO COMPLETO
 * 
 * Usado para contexto de continuação entre chunks
 */
export function extractLastParagraph(text: string): string {
  if (!text || text.trim().length < 50) return '';
  
  // Dividir em parágrafos
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 30);
  
  if (paragraphs.length === 0) {
    // Fallback: últimos 300 caracteres
    return text.slice(-300).trim();
  }
  
  // Retornar último parágrafo (limitado a 400 chars)
  const lastPara = paragraphs[paragraphs.length - 1].trim();
  return lastPara.length > 400 ? lastPara.slice(-400) : lastPara;
}

/**
 * ✅ PROMPT DE EMERGÊNCIA (ainda mais simples)
 * 
 * Usado quando detecção de duplicação falha e precisa regenerar
 */
export function buildEmergencyPrompt(
  userPrompt: string,
  context: MinimalChunkContext,
  duplicatedText?: string
): string {
  const { title, language, targetWords, premise, chunkIndex, totalChunks } = context;
  const languageName = LANGUAGE_NAMES[language] || language;
  const sectionContent = extractPremiseSection(premise, chunkIndex + 1);
  
  let prompt = `Narrador de histórias. Prosa corrida. ${languageName}. ~${targetWords} palavras.

"${title}"

Estilo: ${userPrompt.slice(0, 500)}

Premissa: ${sectionContent.slice(0, 600)}
`;

  if (duplicatedText) {
    prompt += `
⚠️ CRÍTICO: Você repetiu texto já existente:
"${duplicatedText.slice(0, 100)}..."

Escreva conteúdo 100% NOVO. AVANCE a história.
`;
  }

  if (chunkIndex === totalChunks - 1) {
    prompt += `\nÚltima parte. Conclua a história.\n`;
  }

  prompt += `\nNarre agora:\n`;

  return prompt;
}
