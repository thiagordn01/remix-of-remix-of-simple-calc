import { DeepseekApiKey } from '@/types/scripts';

// Usar proxy do Supabase para evitar erro de CORS
const SUPABASE_URL = "https://wzldbdmcozbmivztbmik.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bGRiZG1jb3pibWl2enRibWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzIxMjEsImV4cCI6MjA3Nzc0ODEyMX0.J7bG_ymiHUT47WIBEqR82PVRIyGfW1NoVNBOY1sOuBQ";
const DEEPSEEK_PROXY_URL = `${SUPABASE_URL}/functions/v1/deepseek-proxy`;

export interface DeepseekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ApiKeyStatus {
  isValid: boolean;
  status: 'valid' | 'invalid' | 'suspended' | 'rate_limited' | 'unknown';
  message?: string;
  lastChecked?: Date;
}

export class DeepseekApiService {
  static async generateContent(
    prompt: string,
    apiKey: DeepseekApiKey,
    temperature: number = 0.7
  ): Promise<string> {
    const requestBody = {
      model: apiKey.model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature,
      max_tokens: 8192,
      stream: false
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    try {
      // Usar proxy do Supabase para evitar CORS
      const response = await fetch(DEEPSEEK_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'x-deepseek-api-key': apiKey.key
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';

        console.error('DeepSeek API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          model: apiKey.model
        });

        // Enhanced error mapping
        if (response.status === 429) {
          throw new Error('API_RATE_LIMIT');
        } else if (response.status === 401) {
          throw new Error('API_KEY_INVALID');
        } else if (response.status === 403) {
          if (errorMessage.includes('suspended')) {
            throw new Error('API_KEY_SUSPENDED');
          }
          throw new Error('API_KEY_FORBIDDEN');
        } else if (response.status === 404) {
          if (errorMessage.includes('model') || errorMessage.includes('Model')) {
            throw new Error('MODEL_NOT_FOUND');
          }
          throw new Error('API_REQUEST_INVALID');
        } else if (response.status === 400) {
          throw new Error('API_REQUEST_INVALID');
        } else if (response.status >= 500) {
          throw new Error('API_SERVER_ERROR');
        }

        throw new Error(`API_ERROR_${response.status}`);
      }

      const data: DeepseekResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('NO_CONTENT_GENERATED');
      }

      if (!data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('NO_CONTENT_GENERATED');
      }

      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('API_TIMEOUT');
      }

      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('NETWORK_ERROR');
      }

      throw error;
    }
  }

  static async validateApiKey(apiKey: DeepseekApiKey): Promise<ApiKeyStatus> {
    try {
      const result = await this.validateApiKeyLight(apiKey);

      return {
        isValid: true,
        status: 'valid',
        message: result === 'VALIDATION_SUCCESS_NO_CONTENT'
          ? 'API key valida (teste sem conteudo, mas funcionara no uso real)'
          : 'API key testada com sucesso',
        lastChecked: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      let status: ApiKeyStatus['status'] = 'unknown';
      let message = 'Erro desconhecido';

      switch (errorMessage) {
        case 'API_KEY_SUSPENDED':
          status = 'suspended';
          message = 'API key foi suspensa. Verifique sua conta DeepSeek.';
          break;
        case 'API_KEY_INVALID':
        case 'API_KEY_FORBIDDEN':
          status = 'invalid';
          message = 'API key invalida ou sem permissoes necessarias.';
          break;
        case 'MODEL_NOT_FOUND':
          status = 'invalid';
          message = `Modelo ${apiKey.model} nao encontrado.`;
          break;
        case 'API_RATE_LIMIT':
          status = 'rate_limited';
          message = 'Limite de uso atingido. Aguarde antes de tentar novamente.';
          break;
        case 'API_SERVER_ERROR':
          status = 'unknown';
          message = 'Erro temporario do servidor DeepSeek. Pode funcionar durante uso real.';
          break;
        case 'NETWORK_ERROR':
          status = 'unknown';
          message = 'Erro de conexao. Verifique sua internet e tente novamente.';
          break;
        case 'API_TIMEOUT':
          status = 'unknown';
          message = 'Timeout na validacao. Pode funcionar durante uso real.';
          break;
        default:
          status = 'unknown';
          message = `Erro no teste: ${errorMessage}. Pode funcionar durante uso real.`;
      }

      return {
        isValid: false,
        status,
        message,
        lastChecked: new Date()
      };
    }
  }

  static async validateApiKeyLight(apiKey: DeepseekApiKey): Promise<string> {
    const requestBody = {
      model: apiKey.model,
      messages: [
        {
          role: "user",
          content: 'Responda apenas com a palavra "sucesso".'
        }
      ],
      temperature: 0.1,
      max_tokens: 50,
      stream: false
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      // Usar proxy do Supabase para evitar CORS
      const response = await fetch(DEEPSEEK_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'x-deepseek-api-key': apiKey.key
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';

        if (response.status === 429) {
          throw new Error('API_RATE_LIMIT');
        } else if (response.status === 401) {
          throw new Error('API_KEY_INVALID');
        } else if (response.status === 403) {
          if (errorMessage.includes('suspended')) {
            throw new Error('API_KEY_SUSPENDED');
          }
          throw new Error('API_KEY_FORBIDDEN');
        } else if (response.status === 404) {
          throw new Error('MODEL_NOT_FOUND');
        } else if (response.status === 400) {
          throw new Error('API_REQUEST_INVALID');
        } else if (response.status >= 500) {
          throw new Error('API_SERVER_ERROR');
        }

        throw new Error(`API_ERROR_${response.status}`);
      }

      const data: DeepseekResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        console.warn('DeepSeek API validation: No choices in response, but API key is valid');
        return 'VALIDATION_SUCCESS_NO_CONTENT';
      }

      if (!data.choices[0].message || !data.choices[0].message.content) {
        console.warn('DeepSeek API validation: No content in response, but API key is valid');
        return 'VALIDATION_SUCCESS_NO_CONTENT';
      }

      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('API_TIMEOUT');
      }

      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('NETWORK_ERROR');
      }

      throw error;
    }
  }

  static getErrorMessage(error: string): string {
    switch (error) {
      case 'API_KEY_SUSPENDED':
        return 'API key suspensa. Verifique sua conta DeepSeek.';
      case 'API_KEY_INVALID':
        return 'API key invalida. Verifique se foi copiada corretamente.';
      case 'MODEL_NOT_FOUND':
        return 'Modelo nao encontrado. Tente deepseek-chat ou deepseek-reasoner.';
      case 'API_RATE_LIMIT':
        return 'Limite de uso atingido. Aguarde ou use outra API key.';
      case 'API_SERVER_ERROR':
        return 'Erro temporario do servidor. Tente novamente em alguns minutos.';
      case 'NETWORK_ERROR':
        return 'Erro de conexao. Verifique sua internet e tente novamente.';
      case 'API_TIMEOUT':
        return 'Timeout na requisicao. Verifique sua conexao.';
      case 'NO_CONTENT_GENERATED':
        return 'Nenhum conteudo foi gerado. Tente novamente com um prompt diferente.';
      case 'MAX_RETRIES_EXCEEDED':
        return 'Multiplas tentativas falharam. Verifique sua configuracao.';
      default:
        return 'Erro na API. Verifique suas configuracoes.';
    }
  }
}
