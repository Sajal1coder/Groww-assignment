import React from 'react';
import { 
  AlertCircle, 
  Clock, 
  Wifi, 
  WifiOff, 
  Shield, 
  Server, 
  RefreshCw 
} from 'lucide-react';
import { ApiError, ApiErrorHandler } from '@/services/apiErrorHandler';

interface ErrorDisplayProps {
  error: string;
  apiError?: ApiError | null;
  retryCountdown?: number;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorDisplay({ 
  error, 
  apiError, 
  retryCountdown = 0, 
  onRetry, 
  className = '' 
}: ErrorDisplayProps) {
  const getErrorIcon = () => {
    if (!apiError) return <AlertCircle className="w-8 h-8 text-red-500" />;
    
    switch (apiError.type) {
      case 'rate_limit':
        return <Clock className="w-8 h-8 text-orange-500" />;
      case 'auth':
        return <Shield className="w-8 h-8 text-red-500" />;
      case 'network':
        return <WifiOff className="w-8 h-8 text-gray-500" />;
      case 'timeout':
        return <Clock className="w-8 h-8 text-yellow-500" />;
      case 'server':
        return <Server className="w-8 h-8 text-purple-500" />;
      default:
        return <AlertCircle className="w-8 h-8 text-red-500" />;
    }
  };

  const getErrorColor = () => {
    if (!apiError) return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
    
    switch (apiError.type) {
      case 'rate_limit':
        return 'border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800';
      case 'auth':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
      case 'network':
        return 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700';
      case 'timeout':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'server':
        return 'border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800';
      default:
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
    }
  };

  const getErrorTitle = () => {
    if (!apiError) return 'Error';
    
    switch (apiError.type) {
      case 'rate_limit':
        return 'Rate Limit Exceeded';
      case 'auth':
        return 'Authentication Error';
      case 'network':
        return 'Network Error';
      case 'timeout':
        return 'Request Timeout';
      case 'server':
        return 'Server Error';
      default:
        return 'API Error';
    }
  };

  const getHelpText = () => {
    if (!apiError) return null;
    
    switch (apiError.type) {
      case 'rate_limit':
        return 'This usually happens with free API keys. Consider upgrading to a premium plan or wait for the limit to reset.';
      case 'auth':
        return 'Please check your API key configuration in the widget settings.';
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'timeout':
        return 'The API service may be experiencing high load. Try again in a few moments.';
      case 'server':
        return 'The API service is temporarily unavailable. This is usually resolved quickly.';
      default:
        return 'Please try refreshing the widget or check your configuration.';
    }
  };

  const canRetry = apiError?.canRetry !== false && retryCountdown === 0;
  const showRetryButton = onRetry && ApiErrorHandler.shouldShowRetryButton(apiError || { type: 'unknown', message: error, canRetry: true });

  return (
    <div className={`rounded-lg border p-6 text-center ${getErrorColor()} ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        {getErrorIcon()}
        
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {getErrorTitle()}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
            {error}
          </p>
          
          {getHelpText() && (
            <p className="text-xs text-gray-500 dark:text-gray-500 max-w-md">
              {getHelpText()}
            </p>
          )}
        </div>

        {/* Rate limit countdown */}
        {apiError?.type === 'rate_limit' && retryCountdown > 0 && (
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <Clock className="w-4 h-4" />
            <span>Retry available in {retryCountdown} seconds</span>
          </div>
        )}

        {/* Retry button */}
        {showRetryButton && (
          <button
            onClick={onRetry}
            disabled={!canRetry}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              canRetry
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            {retryCountdown > 0 ? `Retry in ${retryCountdown}s` : 'Retry'}
          </button>
        )}

        {/* Status code for debugging */}
        {apiError?.statusCode && (
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Status: {apiError.statusCode}
          </div>
        )}
      </div>
    </div>
  );
}
