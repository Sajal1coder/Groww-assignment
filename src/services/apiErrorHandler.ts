export interface ApiError {
  type: 'rate_limit' | 'network' | 'auth' | 'server' | 'timeout' | 'unknown';
  message: string;
  retryAfter?: number; // seconds
  canRetry: boolean;
  statusCode?: number;
  originalError?: any;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

export class ApiErrorHandler {
  private static defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2
  };

  static parseError(error: any): ApiError {
    // Handle Axios errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // Alpha Vantage specific error handling
      if (data && typeof data === 'object') {
        // Alpha Vantage rate limit error
        if (data.Note && data.Note.includes('API call frequency')) {
          return {
            type: 'rate_limit',
            message: 'API rate limit exceeded. Please wait before making another request.',
            retryAfter: 60, // Alpha Vantage typically requires 1 minute wait
            canRetry: true,
            statusCode: status,
            originalError: error
          };
        }
        
        // Alpha Vantage premium feature error
        if (data.Note && data.Note.includes('premium')) {
          return {
            type: 'auth',
            message: 'This feature requires a premium API key.',
            canRetry: false,
            statusCode: status,
            originalError: error
          };
        }
        
        // Alpha Vantage invalid API key
        if (data['Error Message'] && data['Error Message'].includes('Invalid API call')) {
          return {
            type: 'auth',
            message: 'Invalid API key or endpoint. Please check your configuration.',
            canRetry: false,
            statusCode: status,
            originalError: error
          };
        }
      }
      
      // Standard HTTP status code handling
      switch (status) {
        case 429:
          const retryAfter = error.response.headers['retry-after'] 
            ? parseInt(error.response.headers['retry-after']) 
            : 60;
          return {
            type: 'rate_limit',
            message: `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`,
            retryAfter,
            canRetry: true,
            statusCode: status,
            originalError: error
          };
        
        case 401:
        case 403:
          return {
            type: 'auth',
            message: 'Authentication failed. Please check your API key.',
            canRetry: false,
            statusCode: status,
            originalError: error
          };
        
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            type: 'server',
            message: 'Server error. The API service is temporarily unavailable.',
            canRetry: true,
            statusCode: status,
            originalError: error
          };
        
        default:
          return {
            type: 'unknown',
            message: `API request failed with status ${status}`,
            canRetry: status >= 500,
            statusCode: status,
            originalError: error
          };
      }
    }
    
    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        type: 'network',
        message: 'Network error. Please check your internet connection.',
        canRetry: true,
        originalError: error
      };
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Request timed out. The API is taking too long to respond.',
        canRetry: true,
        originalError: error
      };
    }
    
    // Generic error
    return {
      type: 'unknown',
      message: error.message || 'An unknown error occurred',
      canRetry: false,
      originalError: error
    };
  }

  static async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: ApiError;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = this.parseError(error);
        
        // Don't retry if it's not retryable or if this is the last attempt
        if (!lastError.canRetry || attempt === retryConfig.maxRetries) {
          throw lastError;
        }
        
        // Calculate delay with exponential backoff
        let delay = retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt);
        
        // Use retry-after header if available for rate limits
        if (lastError.type === 'rate_limit' && lastError.retryAfter) {
          delay = Math.max(delay, lastError.retryAfter * 1000);
        }
        
        // Cap the delay at maxDelay
        delay = Math.min(delay, retryConfig.maxDelay);
        
        // Add some jitter to prevent thundering herd
        delay = delay + Math.random() * 1000;
        
        console.log(`API call failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}). Retrying in ${Math.round(delay/1000)} seconds...`);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static getErrorMessage(error: ApiError): string {
    switch (error.type) {
      case 'rate_limit':
        return `Rate limit exceeded. ${error.retryAfter ? `Please wait ${error.retryAfter} seconds before retrying.` : 'Please wait before making another request.'}`;
      
      case 'auth':
        return 'Authentication failed. Please check your API key and permissions.';
      
      case 'network':
        return 'Network connection failed. Please check your internet connection and try again.';
      
      case 'timeout':
        return 'Request timed out. The API service may be slow or overloaded.';
      
      case 'server':
        return 'API service is temporarily unavailable. Please try again later.';
      
      default:
        return error.message || 'An unexpected error occurred while fetching data.';
    }
  }

  static getErrorIcon(error: ApiError): string {
    switch (error.type) {
      case 'rate_limit':
        return '⏱️';
      case 'auth':
        return '🔐';
      case 'network':
        return '🌐';
      case 'timeout':
        return '⏰';
      case 'server':
        return '🔧';
      default:
        return '❌';
    }
  }

  static shouldShowRetryButton(error: ApiError): boolean {
    return error.canRetry && error.type !== 'rate_limit';
  }

  static getRetryDelay(error: ApiError): number {
    if (error.type === 'rate_limit' && error.retryAfter) {
      return error.retryAfter * 1000;
    }
    return this.defaultRetryConfig.baseDelay;
  }
}
