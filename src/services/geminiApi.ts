import { GeminiApiKey } from '@/types/scripts';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface ApiKeyStatus {
  isValid: boolean;
  status: 'valid' | 'invalid' | 'suspended' | 'rate_limited' | 'unknown';
  message?: string;
  lastChecked?: Date;
}

export class GeminiApiService {
  static async generateContent(
    prompt: string,
    apiKey: GeminiApiKey,
    temperature: number = 0.7
  ): Promise<string> {
    const modelName = apiKey.model;

    // Try v1 first, fallback to v1beta for newer models
    let url = `${GEMINI_API_BASE_URL}/${modelName}:generateContent?key=${apiKey.key}`;
    let useV1Beta = false;

    const requestBody = {
      contents: [{
        role: "user",
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        // Adicionar thinkingConfig APENAS para modelos que suportam thinking explicitamente
        ...(modelName.includes('thinking') && {
          thinkingConfig: {
            thinkingLevel: 'HIGH'
          }
        })
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';

        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          model: apiKey.model,
          url,
          useV1Beta,
          endpoint: useV1Beta ? 'v1beta' : 'v1'
        });

        // Try v1beta if v1 returns 404 and we haven't tried it yet
        if (response.status === 404 && !useV1Beta && (modelName.includes('2.5') || modelName.includes('2.0'))) {
          useV1Beta = true;
          url = url.replace('/v1/models', '/v1beta/models');
          console.log('Retrying with v1beta endpoint:', url);

          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 120000);

          try {
            const retryResponse = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
              signal: retryController.signal
            });

            clearTimeout(retryTimeoutId);

            if (retryResponse.ok) {
              const retryData: GeminiResponse = await retryResponse.json();
              if (retryData.candidates && retryData.candidates.length > 0) {
                return retryData.candidates[0].content.parts[0].text;
              }
            }
          } catch (retryError) {
            clearTimeout(retryTimeoutId);
            console.error('v1beta retry failed:', retryError);
          }
        }

        // Enhanced error mapping
        if (response.status === 429) {
          throw new Error('API_RATE_LIMIT');
        } else if (response.status === 403) {
          if (errorMessage.includes('CONSUMER_SUSPENDED') || errorMessage.includes('suspended')) {
            throw new Error('API_KEY_SUSPENDED');
          } else if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid')) {
            throw new Error('API_KEY_INVALID');
          } else if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
            // Special handling for Pro model billing issues
            if (modelName.includes('2.5-pro') || modelName.includes('pro')) {
              throw new Error('API_KEY_PRO_BILLING_REQUIRED');
            }
            throw new Error('API_KEY_FORBIDDEN');
          } else {
            // Check if it's a Pro model that might need billing
            if (modelName.includes('2.5-pro') || modelName.includes('pro')) {
              throw new Error('API_KEY_PRO_BILLING_REQUIRED');
            }
            throw new Error('API_KEY_FORBIDDEN');
          }
        } else if (response.status === 404) {
          if (errorMessage.includes('model') || errorMessage.includes('Model')) {
            throw new Error('MODEL_NOT_FOUND');
          }
          throw new Error('API_REQUEST_INVALID');
        } else if (response.status === 400) {
          if (errorMessage.includes('API_KEY_INVALID')) {
            throw new Error('API_KEY_INVALID');
          }
          throw new Error('API_REQUEST_INVALID');
        } else if (response.status >= 500) {
          throw new Error('API_SERVER_ERROR');
        }

        throw new Error(`API_ERROR_${response.status}`);
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('NO_CONTENT_GENERATED');
      }

      if (!data.candidates[0].content || !data.candidates[0].content.parts ||
        data.candidates[0].content.parts.length === 0) {
        throw new Error('NO_CONTENT_GENERATED');
      }

      return data.candidates[0].content.parts[0].text;
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

  static async validateApiKey(apiKey: GeminiApiKey): Promise<ApiKeyStatus> {
    try {
      // Simple light validation - just try a minimal request
      const result = await this.validateApiKeyLight(apiKey);

      // If we got a response (even if it says no content), the API key is valid
      return {
        isValid: true,
        status: 'valid',
        message: result === 'VALIDATION_SUCCESS_NO_CONTENT'
          ? 'API key válida (teste sem conteúdo, mas funcionará no uso real)'
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
          message = 'API key foi suspensa. Verifique seu console do Google Cloud.';
          break;
        case 'API_KEY_INVALID':
        case 'API_KEY_FORBIDDEN':
          status = 'invalid';
          message = 'API key inválida ou sem permissões necessárias.';
          break;
        case 'API_KEY_PRO_BILLING_REQUIRED':
          status = 'invalid';
          message = 'Gemini 2.5 Pro requer faturamento ativo no Google AI Studio. Ative o billing para usar este modelo ou mude para gemini-2.5-flash.';
          break;
        case 'MODEL_NOT_FOUND':
          status = 'invalid';
          message = `Modelo ${apiKey.model} não encontrado. Verifique se está disponível.`;
          break;
        case 'API_RATE_LIMIT':
          status = 'rate_limited';
          message = 'Limite de uso atingido. Aguarde antes de tentar novamente.';
          break;
        case 'API_SERVER_ERROR':
          status = 'unknown';
          message = 'Erro temporário do servidor Google. Pode funcionar durante uso real.';
          break;
        case 'NETWORK_ERROR':
          status = 'unknown';
          message = 'Erro de conexão. Verifique sua internet e tente novamente.';
          break;
        case 'API_TIMEOUT':
          status = 'unknown';
          message = 'Timeout na validação. Pode funcionar durante uso real.';
          break;
        case 'API_REQUEST_INVALID':
          status = 'unknown';
          message = 'O teste rápido não é totalmente confiável para este modelo (ex.: Gemini 3 preview). A chave pode funcionar normalmente durante a geração real de roteiros.';
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

  // Simplified validation method - only checks if the API key works with a simple request
  static async validateApiKeyLight(apiKey: GeminiApiKey): Promise<string> {
    const modelName = apiKey.model;

    // Default to v1beta for newer models (1.5, 2.0, 3.0) to avoid 404s on v1
    const useBeta = modelName.includes('gemini-1.5') ||
      modelName.includes('gemini-2') ||
      modelName.includes('gemini-3') ||
      modelName.includes('thinking'); // Thinking usually requires beta

    const baseUrl = useBeta
      ? 'https://generativelanguage.googleapis.com/v1beta/models'
      : GEMINI_API_BASE_URL;

    let url = `${baseUrl}/${modelName}:generateContent?key=${apiKey.key}`;

    const requestBody = {
      contents: [{
        role: "user",
        parts: [{
          text: 'Responda apenas com a palavra "sucesso".'
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 50,
        // Adicionar thinkingConfig APENAS para modelos que suportam thinking explicitamente
        ...(modelName.includes('thinking') && {
          thinkingConfig: {
            thinkingLevel: 'HIGH'
          }
        })
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout (optimized)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';

        // Try v1beta if v1 returns 404 for newer models (qualquer modelo)
        if (response.status === 404 && url.includes('/v1/models')) {
          url = url.replace('/v1/models', '/v1beta/models');
          console.log('Retrying with v1beta endpoint:', url);

          const retryResponse = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });

          if (retryResponse.ok) {
            const retryData: GeminiResponse = await retryResponse.json();
            if (retryData.candidates && retryData.candidates.length > 0 &&
              retryData.candidates[0].content && retryData.candidates[0].content.parts &&
              retryData.candidates[0].content.parts.length > 0) {
              return retryData.candidates[0].content.parts[0].text;
            }
          }
        }

        // Enhanced error mapping
        if (response.status === 429) {
          throw new Error('API_RATE_LIMIT');
        } else if (response.status === 403) {
          if (errorMessage.includes('CONSUMER_SUSPENDED') || errorMessage.includes('suspended')) {
            throw new Error('API_KEY_SUSPENDED');
          } else if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid')) {
            throw new Error('API_KEY_INVALID');
          } else if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
            // Special handling for Pro model billing issues
            if (modelName.includes('2.5-pro') || modelName.includes('pro')) {
              throw new Error('API_KEY_PRO_BILLING_REQUIRED');
            }
            throw new Error('API_KEY_FORBIDDEN');
          } else {
            // Check if it's a Pro model that might need billing
            if (modelName.includes('2.5-pro') || modelName.includes('pro')) {
              throw new Error('API_KEY_PRO_BILLING_REQUIRED');
            }
            throw new Error('API_KEY_FORBIDDEN');
          }
        } else if (response.status === 404) {
          if (errorMessage.includes('model') || errorMessage.includes('Model')) {
            throw new Error('MODEL_NOT_FOUND');
          }
          throw new Error('API_REQUEST_INVALID');
        } else if (response.status === 400) {
          if (errorMessage.includes('API_KEY_INVALID')) {
            throw new Error('API_KEY_INVALID');
          }
          throw new Error('API_REQUEST_INVALID');
        } else if (response.status >= 500) {
          throw new Error('API_SERVER_ERROR');
        }

        throw new Error(`API_ERROR_${response.status}`);
      }

      const data: GeminiResponse = await response.json();

      // Check if response has candidates and content
      // In validation context, if API returned 200 OK but no content, it means the key works
      // Content may be filtered by safety settings, but the API key itself is valid
      if (!data.candidates || data.candidates.length === 0) {
        console.warn('API validation: No candidates in response, but API key is valid');
        return 'VALIDATION_SUCCESS_NO_CONTENT';
      }

      if (!data.candidates[0].content || !data.candidates[0].content.parts ||
        data.candidates[0].content.parts.length === 0) {
        console.warn('API validation: No content parts in response, but API key is valid');
        return 'VALIDATION_SUCCESS_NO_CONTENT';
      }

      return data.candidates[0].content.parts[0].text;
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
        return 'API key suspensa. Acesse o Google Cloud Console para resolver.';
      case 'API_KEY_INVALID':
        return 'API key inválida. Verifique se foi copiada corretamente.';
      case 'API_KEY_PRO_BILLING_REQUIRED':
        return 'Gemini 2.5 Pro requer faturamento ativo no Google AI Studio. Ative o billing para usar este modelo ou mude para gemini-2.5-flash.';
      case 'MODEL_NOT_FOUND':
        return 'Modelo não encontrado. Tente gemini-2.5-flash ou gemini-2.5-pro.';
      case 'API_RATE_LIMIT':
        return 'Limite de uso atingido. Aguarde ou use outra API key.';
      case 'API_SERVER_ERROR':
        return 'Erro temporário do servidor. Tente novamente em alguns minutos.';
      case 'NETWORK_ERROR':
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
      case 'API_TIMEOUT':
        return 'Timeout na requisição. Verifique sua conexão.';
      case 'NO_CONTENT_GENERATED':
        return 'Nenhum conteúdo foi gerado. Tente novamente com um prompt diferente.';
      case 'MAX_RETRIES_EXCEEDED':
        return 'Múltiplas tentativas falharam. Verifique sua configuração.';
      default:
        return 'Erro na API. Verifique suas configurações.';
    }
  }
}
