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

  return text.trim();
}

/**
 * Remove parágrafos consecutivos exatamente iguais (após trim).
 */
export function removeConsecutiveDuplicates(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  const cleaned: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const last = cleaned[cleaned.length - 1];
    if (last && last.trim() === trimmed) {
      // Pula duplicação óbvia
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
      if (last && last.trim() === trimmed) {
        continue;
      }

      cleanedSentences.push(trimmed);
    }

    return cleanedSentences.join(' ');
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
