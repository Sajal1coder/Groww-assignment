import { ApiErrorHandler, ApiError } from './apiErrorHandler';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

class ApiCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config,
    };

    this.startCleanup();
  }

  private generateKey(url: string, headers?: Record<string, string>): string {
    const headersStr = headers ? JSON.stringify(headers) : '';
    return `${url}:${headersStr}`;
  }

  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));

    // If cache is still too large, remove oldest entries
    if (this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.config.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  get(url: string, headers?: Record<string, string>): any | null {
    const key = this.generateKey(url, headers);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(url: string, data: any, headers?: Record<string, string>, ttl?: number): void {
    const key = this.generateKey(url, headers);
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.defaultTTL);

    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt,
    };

    this.cache.set(key, entry);

    // Trigger cleanup if cache is getting too large
    if (this.cache.size > this.config.maxSize * 1.2) {
      this.cleanup();
    }
  }

  has(url: string, headers?: Record<string, string>): boolean {
    const key = this.generateKey(url, headers);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(url: string, headers?: Record<string, string>): boolean {
    const key = this.generateKey(url, headers);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
    };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Create a singleton instance
export const apiCache = new ApiCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50,
  cleanupInterval: 2 * 60 * 1000, // 2 minutes
});

// Enhanced fetch function with caching and error handling
export async function cachedFetch(
  url: string,
  options: RequestInit = {},
  cacheOptions: { ttl?: number; skipCache?: boolean; withRetry?: boolean } = {}
): Promise<any> {
  const { ttl, skipCache = false, withRetry = true } = cacheOptions;
  const headers = options.headers as Record<string, string> || {};

  // Only cache GET requests
  const method = options.method?.toUpperCase() || 'GET';
  if (method !== 'GET' || skipCache) {
    return await fetchWithErrorHandling(url, options, withRetry);
  }

  // Check cache first
  const cachedData = apiCache.get(url, headers);
  if (cachedData) {
    return cachedData;
  }

  // Fetch with error handling and cache
  const data = await fetchWithErrorHandling(url, options, withRetry);
  apiCache.set(url, data, headers, ttl);
  return data;
}

async function fetchWithErrorHandling(
  url: string, 
  options: RequestInit, 
  withRetry: boolean
): Promise<any> {
  const apiCall = async () => {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      // Create a mock error object that matches axios structure for our error handler
      const errorData = await response.text().then(text => {
        try {
          return JSON.parse(text);
        } catch {
          return { message: text || response.statusText };
        }
      });
      
      const error = {
        response: {
          status: response.status,
          data: errorData,
          headers: Object.fromEntries(response.headers.entries())
        },
        message: `HTTP error! status: ${response.status}`
      };
      
      throw error;
    }

    return response.json();
  };

  if (withRetry) {
    return await ApiErrorHandler.executeWithRetry(apiCall, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000
    });
  } else {
    return await apiCall();
  }
}

export default apiCache;
