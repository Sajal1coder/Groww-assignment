import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { ApiErrorHandler } from '@/services/apiErrorHandler';

export function useAutoRefresh() {
  const { 
    widgets, 
    autoRefresh, 
    refreshInterval, 
    updateWidget 
  } = useDashboardStore();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!autoRefresh || widgets.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Set up auto-refresh interval with smart error handling
    intervalRef.current = setInterval(() => {
      smartRefresh();
    }, refreshInterval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, widgets.length, updateWidget]);

  // Manual refresh function with error handling
  const refreshAll = () => {
    widgets.forEach(widget => {
      // Only refresh if widget doesn't have a recent rate limit error
      const lastError = widget.lastError;
      if (lastError && lastError.type === 'rate_limit' && lastError.retryAfter) {
        const timeSinceError = Date.now() - (lastError.timestamp || 0);
        const retryAfterMs = lastError.retryAfter * 1000;
        
        if (timeSinceError < retryAfterMs) {
          console.log(`Skipping refresh for widget ${widget.id} due to rate limit. Retry in ${Math.ceil((retryAfterMs - timeSinceError) / 1000)}s`);
          return;
        }
      }
      
      updateWidget(widget.id, {
        lastUpdated: new Date().toISOString()
      });
    });
  };

  // Smart refresh that respects rate limits
  const smartRefresh = () => {
    widgets.forEach(widget => {
      // Check if widget has recent errors
      const lastError = widget.lastError;
      
      // Skip refresh for rate-limited widgets
      if (lastError?.type === 'rate_limit') {
        const timeSinceError = Date.now() - (lastError.timestamp || 0);
        const retryAfterMs = (lastError.retryAfter || 60) * 1000;
        
        if (timeSinceError < retryAfterMs) {
          return; // Skip this widget
        }
      }
      
      // Skip refresh for auth errors (no point in retrying)
      if (lastError?.type === 'auth') {
        return;
      }
      
      // For other errors, use exponential backoff
      if (lastError && lastError.type !== 'rate_limit') {
        const timeSinceError = Date.now() - (lastError.timestamp || 0);
        const backoffDelay = Math.min(30000, 1000 * Math.pow(2, lastError.retryCount || 0)); // Max 30s
        
        if (timeSinceError < backoffDelay) {
          return; // Skip this widget
        }
      }
      
      updateWidget(widget.id, {
        lastUpdated: new Date().toISOString()
      });
    });
  };

  return { refreshAll, smartRefresh };
}
