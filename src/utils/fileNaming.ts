/**
 * Utilitários para nomenclatura de arquivos
 */

/**
 * Sanitiza um nome de arquivo removendo apenas caracteres perigosos do sistema de arquivos
 * Preserva espaços, acentos e outros caracteres especiais seguros
 *
 * Caracteres removidos/substituídos:
 * - / \ : * ? " < > | (caracteres inválidos em sistemas de arquivo)
 *
 * @param filename - Nome do arquivo a ser sanitizado
 * @returns Nome do arquivo sanitizado
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove apenas caracteres que são inválidos em sistemas de arquivo
  // Mantém espaços, acentos, números, letras e outros caracteres seguros
  return filename
    .replace(/[/\\:*?"<>|]/g, '-') // Substitui caracteres perigosos por hífen
    .replace(/\s+/g, ' ') // Normaliza múltiplos espaços em um único espaço
    .trim(); // Remove espaços no início e fim
};

/**
 * Cria um nome de arquivo com índice sequencial
 * Formato: "Roteiro 01 - Nome do Video.txt"
 *
 * @param title - Título do vídeo/roteiro
 * @param index - Índice do roteiro (começando em 1)
 * @param totalCount - Total de roteiros (para determinar padding de zeros)
 * @param extension - Extensão do arquivo (padrão: 'txt')
 * @returns Nome do arquivo formatado
 */
export const createSequentialFilename = (
  title: string,
  index: number,
  totalCount: number,
  extension: string = 'txt'
): string => {
  // Determina quantos zeros precisamos (ex: se total é 100, precisamos de 3 dígitos)
  const padding = totalCount.toString().length;
  const paddedIndex = index.toString().padStart(padding, '0');

  const sanitizedTitle = sanitizeFilename(title);

  return `Roteiro ${paddedIndex} - ${sanitizedTitle}.${extension}`;
};
