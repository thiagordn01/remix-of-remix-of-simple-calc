// src/utils/minimalPromptBuilder.ts
/**
 * Sistema de Construção de Prompts
 *
 * PRINCÍPIO: O prompt do usuário define a estrutura.
 * Este sistema apenas fornece CONTEXTO para continuação.
 */

import {
  buildNarrativeMemory,
  formatMemoryForPrompt,
  detectSemanticDuplication,
  buildAntiDuplicationPrompt,
  NarrativeMemory
} from './narrativeMemory';

export interface MinimalChunkContext {
  title: string;
  language: string;
  targetWords: number;
  premise: string;
  chunkIndex: number;
  totalChunks: number;
  /** Texto já gerado nos chunks anteriores */
  previousContent?: string;
  /** Último parágrafo (fallback se previousContent não estiver disponível) */
  lastParagraph?: string;
  /** Âncoras semânticas extraídas */
  anchors?: string[];
}

const LANGUAGE_NAMES: Record<string, string> = {
  "pt-BR": "Português Brasileiro",
  "pt-PT": "Português",
  "en-US": "English",
  "en-GB": "English",
  "es-ES": "Español",
  "es-MX": "Español",
  "fr-FR": "Français",
  "de-DE": "Deutsch",
  "it-IT": "Italiano",
  "pl-PL": "Polski",
  "ru-RU": "Русский",
  "ja-JP": "日本語",
  "zh-CN": "中文",
  "ko-KR": "한국어",
  "ar-SA": "العربية",
  "hi-IN": "हिन्दी",
  "tr-TR": "Türkçe",
  "nl-NL": "Nederlands",
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  "pt-BR": "Escreva 100% em Português Brasileiro.",
  "pt-PT": "Escreva 100% em Português Europeu.",
  "en-US": "Write 100% in American English.",
  "en-GB": "Write 100% in British English.",
  "es-ES": "Escribe 100% en Español.",
  "es-MX": "Escribe 100% en Español Mexicano.",
  "fr-FR": "Écrivez 100% en Français.",
  "de-DE": "Schreiben Sie 100% auf Deutsch.",
  "it-IT": "Scrivi 100% in Italiano.",
  "pl-PL": "Pisz 100% po Polsku.",
  "ru-RU": "Пишите 100% на Русском.",
  "ja-JP": "100%日本語で書いてください。",
  "zh-CN": "请100%用中文写作。",
  "ko-KR": "100% 한국어로 작성하세요.",
  "ar-SA": "اكتب 100٪ باللغة العربية.",
  "hi-IN": "100% हिंदी में लिखें।",
  "tr-TR": "100% Türkçe yazın.",
  "nl-NL": "Schrijf 100% in het Nederlands.",
};

/**
 * Extrai a "Bíblia" (dados fixos) da premissa
 */
function extractBible(premise: string): string {
  const match = premise.match(/\[BIBLE\]([\s\S]*?)\[\/BIBLE\]/i);
  if (match) {
    return match[1].trim();
  }

  // Fallback: tentar extrair informações básicas do início da premissa
  const lines = premise.split('\n').slice(0, 10);
  const contextLines = lines.filter(line =>
    /(?:personagem|character|nome|name|local|lugar|época|period|ano|year)/i.test(line)
  );

  if (contextLines.length > 0) {
    return contextLines.join('\n');
  }

  return '';
}

/**
 * Extrai o conteúdo de uma seção/capítulo específico da premissa
 * Flexível - funciona com diferentes formatos
 */
function extractPremiseSection(premise: string, sectionNumber: number): string {
  // Tentar múltiplos padrões de formatação
  const patterns = [
    // [CAPITULO 1], [CHAPTER 1], [SEÇÃO 1], etc.
    new RegExp(
      `\\[(?:CAPITULO|CHAPTER|SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*${sectionNumber}[^\\]]*\\]([\\s\\S]*?)(?=\\[(?:CAPITULO|CHAPTER|SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*\\d|$)`,
      'i'
    ),
    // CAPITULO 1:, CHAPTER 1:, etc.
    new RegExp(
      `(?:CAPITULO|CHAPTER|SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*${sectionNumber}\\s*[:\\-]?\\s*([\\s\\S]*?)(?=(?:CAPITULO|CHAPTER|SEÇÃO|SECAO|SECTION|BLOCO|BLOCK|PARTE|PART)\\s*\\d|$)`,
      'i'
    ),
    // Numeração simples: 1., 1), 1-
    new RegExp(
      `(?:^|\\n)${sectionNumber}[.\\)\\-]\\s*([^\\n]+(?:\\n(?!\\d+[.\\)\\-]).*)*?)(?=\\n\\d+[.\\)\\-]|$)`,
      'm'
    ),
  ];

  for (const pattern of patterns) {
    const match = premise.match(pattern);
    if (match && match[1] && match[1].trim().length > 20) {
      return match[1].replace(/^[:\-\s]+/, '').trim();
    }
  }

  // Fallback inteligente: dividir premissa em partes proporcionais
  const lines = premise.split('\n').filter(line => line.trim().length > 10);
  if (lines.length >= sectionNumber) {
    const linesPerSection = Math.ceil(lines.length / 5);
    const startLine = (sectionNumber - 1) * linesPerSection;
    const endLine = Math.min(startLine + linesPerSection, lines.length);
    const section = lines.slice(startLine, endLine).join('\n');

    if (section.trim().length > 20) {
      return section.trim();
    }
  }

  return '';
}

/**
 * Constrói o prompt para um chunk de roteiro
 *
 * IMPORTANTE: Respeita o prompt do usuário como fonte de verdade.
 * Adiciona apenas contexto para continuação.
 */
export function buildMinimalChunkPrompt(
  userPrompt: string,
  context: MinimalChunkContext
): string {
  const {
    title,
    language,
    targetWords,
    premise,
    chunkIndex,
    totalChunks,
    previousContent,
    lastParagraph
  } = context;

  const languageName = LANGUAGE_NAMES[language] || language;
  const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || `Escreva 100% em ${languageName}.`;

  // Construir memória narrativa do que já foi escrito
  const memory = buildNarrativeMemory(previousContent || '', chunkIndex);

  // Extrair dados da premissa
  const bible = extractBible(premise);
  const sectionContent = extractPremiseSection(premise, chunkIndex + 1);

  // Início do prompt - Instruções básicas
  let prompt = `📝 TAREFA: Escrever parte ${chunkIndex + 1} de ${totalChunks} do roteiro.

📌 DADOS:
- Título: "${title}"
- Idioma: ${languageName}
- Palavras: ~${targetWords}

🌐 IDIOMA OBRIGATÓRIO: ${languageInstruction}
`;

  // Adicionar contexto da premissa se disponível
  if (bible) {
    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📘 DADOS FIXOS DA HISTÓRIA (use estes nomes/fatos):
${bible}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  // Adicionar memória do que já foi escrito (se não for primeiro chunk)
  if (chunkIndex > 0 && memory.wordCount > 0) {
    prompt += formatMemoryForPrompt(memory);
  } else if (chunkIndex > 0 && lastParagraph) {
    // Fallback: usar lastParagraph se previousContent não estiver disponível
    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 CONTINUE A PARTIR DE:
"${lastParagraph}"

⚠️ NÃO repita este texto. Continue a narrativa.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  // Adicionar direção da premissa para este trecho
  if (sectionContent) {
    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎬 DIREÇÃO PARA ESTA PARTE:
${sectionContent}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  // PROMPT DO USUÁRIO - PRIORIDADE MÁXIMA
  prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INSTRUÇÕES DO CRIADOR (SIGA ESTAS DIRETRIZES):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${userPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  // Instruções de posição (sem impor estrutura, apenas guiar)
  if (chunkIndex === 0) {
    prompt += `
⚡ ESTA É A ABERTURA:
- Comece de forma envolvente
- Capture a atenção do espectador
`;
  } else if (chunkIndex === totalChunks - 1) {
    prompt += `
🏁 ESTE É O FECHAMENTO:
- Conclua a narrativa
- Não deixe pontas soltas
- NÃO faça recapitulação/resumo do que aconteceu
`;
  } else {
    prompt += `
📈 ESTA É UMA PARTE INTERMEDIÁRIA:
- Continue naturalmente
- Mantenha o engajamento
- NÃO faça introduções ou encerramentos
`;
  }

  // Regras técnicas finais
  prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGRAS DE FORMATAÇÃO:
- Entregue APENAS texto narrativo (será narrado em voz alta)
- NÃO use títulos, capítulos, numerações
- NÃO use [TAGS], (instruções), *formatações*
- NÃO faça meta-comentários sobre o texto
- Termine em frase completa (com ponto final)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Escreva o roteiro:
`;

  return prompt;
}

/**
 * Extrai o último parágrafo de um texto
 */
export function extractLastParagraph(text: string): string {
  if (!text) return '';

  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);

  if (paragraphs.length === 0) {
    // Fallback: últimas 5 frases
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(-5).join(' ').trim();
  }

  return paragraphs[paragraphs.length - 1].trim();
}

/**
 * Remove metadados, tags e formatações do texto gerado
 */
export function sanitizeScript(text: string): string {
  if (!text) return '';

  let sanitized = text;

  // Remover tags de mídia [IMAGEM: ...], [MÚSICA: ...], etc.
  sanitized = sanitized.replace(
    /\[(?:IMAGEM|IMAGEN|IMAGE|MÚSICA|MUSICA|MUSIC|SFX|CENA|SCENE|SOUND|IMG|FOTO|PHOTO|EFEITO|EFFECT|VIDEO|AUDIO)[:\s][^\]]*\]/gi,
    ''
  );

  // Remover outras tags entre colchetes com conteúdo de instrução
  sanitized = sanitized.replace(/\[[A-Z][A-Z\s]{2,30}:[^\]]*\]/g, '');

  // Remover tags de fim
  sanitized = sanitized.replace(/\[(?:FIM|END|FIN|THE END)\]/gi, '');

  // Remover linhas que parecem títulos de capítulo
  sanitized = sanitized.replace(/^(?:Capítulo|Chapter|Parte|Part|Seção|Section)\s*\d+.*$/gim, '');

  // Remover formatação markdown
  sanitized = sanitized.replace(/\*\*([^*]+)\*\*/g, '$1'); // **bold**
  sanitized = sanitized.replace(/\*([^*]+)\*/g, '$1'); // *italic*
  sanitized = sanitized.replace(/^#+\s+/gm, ''); // # headers
  sanitized = sanitized.replace(/^[-*]\s+/gm, ''); // bullets

  // Normalizar quebras de linha
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  return sanitized.trim();
}

/**
 * Extrai âncoras semânticas (personagens, locais, objetos importantes)
 */
export function extractSemanticAnchors(text: string): string[] {
  if (!text || text.length < 50) return [];

  const anchors: Set<string> = new Set();

  // Extrair nomes próprios (palavras capitalizadas que não iniciam frases)
  const properNouns = text.match(/(?<=[a-z]\s)([A-Z][a-záéíóúàèìòùâêîôûãõç]+)/g) || [];
  properNouns.forEach(noun => {
    if (noun.length > 2 && noun.length < 20) {
      anchors.add(noun);
    }
  });

  // Extrair termos após "o/a" (provavelmente personagens ou objetos importantes)
  const definiteNouns = text.match(/\b(?:o|a|os|as)\s+([a-záéíóúàèìòùâêîôûãõç]+)/gi) || [];
  definiteNouns.forEach(match => {
    const noun = match.replace(/^(?:o|a|os|as)\s+/i, '');
    if (noun.length > 3 && /^[a-z]/.test(noun)) {
      anchors.add(noun);
    }
  });

  return Array.from(anchors).slice(0, 15);
}

/**
 * Detecta duplicação de parágrafos entre novo texto e texto anterior
 */
export function detectParagraphDuplication(
  newText: string,
  previousText: string
): { hasDuplication: boolean; duplicatedText?: string } {
  // Usar a função do narrativeMemory
  const result = detectSemanticDuplication(newText, previousText, 0.35);

  return {
    hasDuplication: result.hasDuplication,
    duplicatedText: result.duplicatedText
  };
}

/**
 * Constrói prompt de emergência quando duplicação é detectada
 */
export function buildEmergencyPrompt(
  userPrompt: string,
  context: MinimalChunkContext,
  duplicatedText?: string
): string {
  const memory = buildNarrativeMemory(context.previousContent || '', context.chunkIndex);

  let prompt = buildMinimalChunkPrompt(userPrompt, context);

  // Adicionar aviso de duplicação
  if (duplicatedText) {
    prompt += buildAntiDuplicationPrompt(duplicatedText, memory);
  } else {
    prompt += `
⚠️⚠️⚠️ ALERTA: DUPLICAÇÃO DETECTADA ⚠️⚠️⚠️

O texto anterior foi rejeitado por conter repetição.

REGRAS OBRIGATÓRIAS:
1. Escreva conteúdo 100% NOVO
2. NÃO repita ideias, cenas ou diálogos anteriores
3. AVANCE a narrativa para algo que ainda não aconteceu
4. Se necessário, pule para a próxima cena

Continue com conteúdo ORIGINAL:
`;
  }

  return prompt;
}

/**
 * Formata parágrafos para narração (quebra blocos muito longos)
 */
export function formatParagraphsForNarration(text: string): string {
  if (!text) return '';

  const paragraphs = text.split(/\n\n+/);

  const formatted = paragraphs.map(paragraph => {
    // Se o parágrafo for muito longo (> 500 chars), tentar quebrar em frases
    if (paragraph.length > 500) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

      // Agrupar frases em blocos de ~200-300 caracteres
      const blocks: string[] = [];
      let currentBlock = '';

      for (const sentence of sentences) {
        if (currentBlock.length + sentence.length > 350 && currentBlock.length > 100) {
          blocks.push(currentBlock.trim());
          currentBlock = sentence;
        } else {
          currentBlock += ' ' + sentence;
        }
      }

      if (currentBlock.trim()) {
        blocks.push(currentBlock.trim());
      }

      return blocks.join('\n\n');
    }

    return paragraph;
  });

  return formatted.join('\n\n').trim();
}

// Re-exportar tipo do narrativeMemory para uso externo
export type { MinimalChunkContext };
