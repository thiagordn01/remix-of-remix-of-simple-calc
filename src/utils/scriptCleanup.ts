import { sanitizeScript as baseSanitizeScript, formatParagraphsForNarration } from './promptInjector';

/**
 * Limpa artefatos de IA e normaliza parágrafos para narração.
 * Foco: parte técnica, sem mudar sentido da história nem CTAs pedidos pelo usuário.
 */
export function cleanFinalScript(raw: string): string {
  if (!raw) return '';

  // 1) Sanitizar metadados/tags técnicas e formatar para narração
  let text = baseSanitizeScript(raw);
  text = formatParagraphsForNarration(text);

  // 2) Limpar duplicações em nível de parágrafo e frase (genérico)
  text = removeConsecutiveDuplicates(text);
  text = removeSentenceLevelDuplicates(text);

  // 3) Limitar repetições globais de frases idênticas (ex.: CTAs duplicados em loop)
  text = limitGlobalSentenceRepetitions(text, 3);

  return text.trim();
}

/**
 * Normaliza texto para comparação neutra (case-insensitive, espaços/pontuação básicos).
 * NÃO mexe em significado, só facilita detectar duplicações técnicas.
 */
function normalizeForComparison(input: string): string {
  return input
    .toLowerCase()
    .replace(/["'“”‘’]/g, '') // remove aspas
    .replace(/\s+/g, ' ') // normaliza espaços
    .replace(/[.!?…]+$/g, '.') // normaliza pontuação final
    .trim();
}

/**
 * Remove parágrafos consecutivos exatamente iguais (após normalização neutra).
 */
export function removeConsecutiveDuplicates(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  const cleaned: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const last = cleaned[cleaned.length - 1];
    if (last && normalizeForComparison(last) === normalizeForComparison(trimmed)) {
      // Pula duplicação óbvia (mesmo conteúdo técnico)
      continue;
    }

    cleaned.push(trimmed);
  }

  return cleaned.join('\n\n');
}

/**
 * Remove duplicações de frases consecutivas dentro de cada parágrafo.
 */
function removeSentenceLevelDuplicates(text: string): string {
  const paragraphs = text.split(/\n\n+/);

  const cleanedParas = paragraphs.map((p) => {
    const sentences = p.split(/(?<=[\.!?…])\s+/);
    const cleanedSentences: string[] = [];

    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;

      const last = cleanedSentences[cleanedSentences.length - 1];
      if (last && normalizeForComparison(last) === normalizeForComparison(trimmed)) {
        // Frase tecnicamente idêntica à anterior (ex.: CTA duplicado)
        continue;
      }

      cleanedSentences.push(trimmed);
    }

    return cleanedSentences.join(' ');
  });

  return cleanedParas.join('\n\n');
}

/**
 * Limita globalmente o número de ocorrências de frases tecnicamente idênticas.
 * Ex.: "Commenta dando un voto da 0 a 10" não passa de 3 repetições no roteiro inteiro.
 */
function limitGlobalSentenceRepetitions(text: string, maxOccurrences: number = 3): string {
  if (maxOccurrences <= 0) return text;

  const paragraphs = text.split(/\n\n+/);
  const globalCounts = new Map<string, number>();

  const cleanedParas = paragraphs.map((p) => {
    const sentences = p.split(/(?<=[\.!?…])\s+/);
    const kept: string[] = [];

    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;

      const key = normalizeForComparison(trimmed);
      if (!key) continue;

      const currentCount = globalCounts.get(key) ?? 0;
      if (currentCount >= maxOccurrences) {
        // Já atingiu o limite global de repetições para esta frase
        continue;
      }

      globalCounts.set(key, currentCount + 1);
      kept.push(trimmed);
    }

    return kept.join(' ');
  });

  return cleanedParas.join('\n\n');
}

/**
 * Validação técnica simples para diagnosticar problemas de desenvolvimento do roteiro.
 * 100% genérica: não olha conteúdo específico (CTA, frases, etc.).
 */
export function validateScriptQuality(text: string, targetWords: number) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const tooShort = targetWords > 0 && words < targetWords * 0.4; // < 40% da meta

  return {
    words,
    tooShort,
  };
}
