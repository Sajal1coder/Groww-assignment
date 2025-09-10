import axios from 'axios';
import { ApiField, ApiResponse } from '@/types';
import { ApiErrorHandler, ApiError } from './apiErrorHandler';

export interface ApiTestResult {
  success: boolean;
  data?: any;
  error?: string;
  apiError?: ApiError;
  fields?: ApiField[];
  responseTime?: number;
  canRetry?: boolean;
  retryAfter?: number;
}

export async function testApiEndpoint(
  url: string, 
  headers: Record<string, string> = {},
  withRetry: boolean = false
): Promise<ApiTestResult> {
  const startTime = Date.now();
  
  const apiCall = async () => {
    return await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 15000, // Increased timeout for better reliability
    });
  };

  try {
    let response;
    
    if (withRetry) {
      response = await ApiErrorHandler.executeWithRetry(apiCall, {
        maxRetries: 2, // Reduced retries for testing
        baseDelay: 2000,
        maxDelay: 10000
      });
    } else {
      response = await apiCall();
    }

    const responseTime = Date.now() - startTime;
    const fields = extractFieldsFromResponse(response.data);

    return {
      success: true,
      data: response.data,
      fields,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Check if it's already an ApiError from our handler
    if (error && typeof error === 'object' && 'type' in error) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: ApiErrorHandler.getErrorMessage(apiError),
        apiError,
        responseTime,
        canRetry: apiError.canRetry,
        retryAfter: apiError.retryAfter,
      };
    }
    
    // Parse the error using our error handler
    const apiError = ApiErrorHandler.parseError(error);
    return {
      success: false,
      error: ApiErrorHandler.getErrorMessage(apiError),
      apiError,
      responseTime,
      canRetry: apiError.canRetry,
      retryAfter: apiError.retryAfter,
    };
  }
}

function extractFieldsFromResponse(data: any, path = '', maxDepth = 3): ApiField[] {
  const fields: ApiField[] = [];
  
  if (maxDepth <= 0 || data === null || data === undefined) {
    return fields;
  }

  if (Array.isArray(data)) {
    // If it's an array, analyze the first item
    if (data.length > 0) {
      return extractFieldsFromResponse(data[0], path, maxDepth - 1);
    }
    return fields;
  }

  if (typeof data === 'object') {
    Object.keys(data).forEach(key => {
      const value = data[key];
      const fieldPath = path ? `${path}.${key}` : key;
      const fieldType = getFieldType(value);

      // Add the field
      fields.push({
        key,
        label: formatFieldLabel(key),
        type: fieldType,
        path: fieldPath,
        sample: getSampleValue(value),
      });

      // Recursively extract nested fields (but limit depth)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nestedFields = extractFieldsFromResponse(value, fieldPath, maxDepth - 1);
        fields.push(...nestedFields);
      }
    });
  }

  return fields;
}

function getFieldType(value: any): 'string' | 'number' | 'boolean' | 'date' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    // Try to detect if it's a date first
    if (isDateString(value)) return 'date';
    
    // Try to detect if it's a numeric string
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && isFinite(numericValue) && value.trim() !== '') {
      // Additional check to ensure it's actually a number string, not just contains numbers
      const cleanValue = value.replace(/[,\s$%]/g, ''); // Remove common formatting
      if (/^-?\d*\.?\d+$/.test(cleanValue)) {
        return 'number';
      }
    }
    
    return 'string';
  }
  return 'string';
}

function isDateString(value: string): boolean {
  // Simple date detection patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
  ];
  
  return datePatterns.some(pattern => pattern.test(value)) && !isNaN(Date.parse(value));
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function getSampleValue(value: any): any {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null;
  }
  if (typeof value === 'object' && value !== null) {
    return '[Object]';
  }
  return value;
}

export function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}
