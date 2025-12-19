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

  // 2) Remover parágrafos consecutivos idênticos
  text = removeConsecutiveDuplicates(text);

  // 3) Limitar eco de CTAs genéricos em excesso (bugs de modelo)
  text = limitRepeatedCtas(text);

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
 * Evita flood de CTAs genéricos iguais várias vezes.
 * Mantém as primeiras ocorrências, corta apenas repetições posteriores
 * quando o parágrafo é basicamente só CTA.
 */
export function limitRepeatedCtas(text: string): string {
  const CTA_PATTERNS = [
    /guarda fino alla fine/i,
    /commenta dando un voto/i,
    /iscriviti per supportare il mio lavoro/i,
  ];

  const paragraphs = text.split(/\n\n+/);
  const cleaned: string[] = [];
  const ctaCounts: Record<string, number> = {};

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    let isPureCta = false;
    let matchedKey: string | null = null;

    for (const pattern of CTA_PATTERNS) {
      if (pattern.test(trimmed)) {
        matchedKey = pattern.source;
        // Considera "puro CTA" se o parágrafo for curto
        if (trimmed.length < 220) {
          isPureCta = true;
        }
        break;
      }
    }

    if (isPureCta && matchedKey) {
      const count = ctaCounts[matchedKey] ?? 0;
      ctaCounts[matchedKey] = count + 1;

      // Mantém no máximo 2 ocorrências do mesmo bloco de CTA
      if (count >= 2) {
        continue;
      }
    }

    cleaned.push(trimmed);
  }

  return cleaned.join('\n\n');
}

/**
 * Validação técnica simples para diagnosticar problemas de desenvolvimento do roteiro.
 * Não altera o texto; serve para logs e futuras ações automáticas.
 */
export function validateScriptQuality(text: string, targetWords: number) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const tooShort = targetWords > 0 && words < targetWords * 0.4; // < 40% da meta

  const repeatedHookCount = (text.match(/guarda fino alla fine/gi) || []).length;
  const repeatedCtaProblem = repeatedHookCount >= 4;

  return {
    words,
    tooShort,
    repeatedHookCount,
    repeatedCtaProblem,
  };
}
