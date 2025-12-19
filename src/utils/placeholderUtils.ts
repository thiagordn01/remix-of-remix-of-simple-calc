// Função robusta de substituição de placeholders com mapeamento de variações

export function replacePlaceholders(
  template: string, 
  data: Record<string, any>
): string {
  let result = template;
  
  // Mapeamento de placeholders com suas variações
  const placeholderMappings: Record<string, string[]> = {
    title: ['titulo', 'title'],
    channelName: ['canal', 'channelName', 'channel'],
    duration: ['duracao', 'duration'],
    language: ['idioma', 'language', 'lang'],
    location: ['localizacao', 'location', 'local'],
    premise: ['premissa', 'premise'],
    // Adicionar outros mapeamentos conforme necessário
  };

  // Criar um mapa normalizado de dados
  const normalizedData: Record<string, any> = {};
  
  // Primeiro, adicionar todos os dados originais
  Object.keys(data).forEach(key => {
    normalizedData[key] = data[key];
  });

  // Depois, criar mapeamentos bidirecionais
  Object.keys(placeholderMappings).forEach(mainKey => {
    const variations = placeholderMappings[mainKey];
    const value = data[mainKey] || data[variations.find(v => data[v] !== undefined)];
    
    if (value !== undefined) {
      variations.forEach(variation => {
        normalizedData[variation] = value;
      });
    }
  });

  // Substituir todos os placeholders
  Object.keys(normalizedData).forEach(key => {
    const value = normalizedData[key];
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\[${key}\\]`, 'g');
      result = result.replace(regex, String(value));
    }
  });

  // Log para debug se ainda houver placeholders não substituídos
  const remainingPlaceholders = result.match(/\[[^\]]+\]/g);
  if (remainingPlaceholders && remainingPlaceholders.length > 0) {
    console.warn('⚠️ Placeholders não substituídos encontrados:', remainingPlaceholders);
    console.warn('📋 Dados disponíveis:', Object.keys(normalizedData));
  }

  return result;
}

// Validação de placeholders com sugestões inteligentes
export function validatePlaceholders(text: string): {
  valid: string[];
  invalid: string[];
  suggestions: string[];
} {
  const validPlaceholders = [
    'titulo', 'title',
    'canal', 'channelName', 'channel',
    'duracao', 'duration',
    'idioma', 'language', 'lang',
    'localizacao', 'location', 'local',
    'premissa', 'premise'
  ];

  // Encontrar todos os placeholders no texto
  const foundPlaceholders = text.match(/\[([^\]]+)\]/g) || [];
  const valid: string[] = [];
  const invalid: string[] = [];
  const suggestions: string[] = [];

  foundPlaceholders.forEach(placeholder => {
    const key = placeholder.slice(1, -1).toLowerCase();
    
    if (validPlaceholders.includes(key)) {
      if (!valid.includes(placeholder)) {
        valid.push(placeholder);
      }
    } else {
      if (!invalid.includes(placeholder)) {
        invalid.push(placeholder);
        
        // Sugerir correções baseadas em similaridade
        if (key.includes('titul') || key.includes('nome')) {
          suggestions.push('[titulo]');
        } else if (key.includes('can')) {
          suggestions.push('[canal]');
        } else if (key.includes('dur') || key.includes('tempo') || key.includes('minuto')) {
          suggestions.push('[duracao]');
        } else if (key.includes('idiom') || key.includes('ling') || key.includes('lang')) {
          suggestions.push('[idioma]');
        } else if (key.includes('local') || key.includes('lugar') || key.includes('region')) {
          suggestions.push('[localizacao]');
        }
      }
    }
  });

  return {
    valid: [...new Set(valid)],
    invalid: [...new Set(invalid)],
    suggestions: [...new Set(suggestions)]
  };
}
