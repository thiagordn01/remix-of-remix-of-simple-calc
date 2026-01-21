export interface ApiErrorOptions {
  message: string;
  code?: string;
  status?: number;
  retryable?: boolean;
  quotaInfo?: {
    quotaId: string;
    quotaMetric: string;
    quotaValue: string;
    retryDelay?: number;
  };
}

export class ApiError extends Error {
  code?: string;
  status?: number;
  retryable?: boolean;
  quotaInfo?: {
    quotaId: string;
    quotaMetric: string;
    quotaValue: string;
    retryDelay?: number;
  };

  constructor(messageOrOptions: string | ApiErrorOptions, status?: number, retryable?: boolean) {
    if (typeof messageOrOptions === 'string') {
      super(messageOrOptions);
      this.status = status;
      this.retryable = retryable;
    } else {
      super(messageOrOptions.message);
      this.code = messageOrOptions.code;
      this.status = messageOrOptions.status;
      this.retryable = messageOrOptions.retryable;
      this.quotaInfo = messageOrOptions.quotaInfo;
    }
    
    // Configurar protótipo para funcionar corretamente com instanceof
    Object.setPrototypeOf(this, ApiError.prototype);
    this.name = 'ApiError';
  }
}
