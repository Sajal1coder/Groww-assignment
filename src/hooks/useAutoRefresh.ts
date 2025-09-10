import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';

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

    // Set up auto-refresh interval
    intervalRef.current = setInterval(() => {
      widgets.forEach(widget => {
        // Update each widget's lastUpdated to trigger refresh
        updateWidget(widget.id, {
          lastUpdated: new Date().toISOString()
        });
      });
    }, refreshInterval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, widgets.length, updateWidget]);

  // Manual refresh function
  const refreshAll = () => {
    widgets.forEach(widget => {
      updateWidget(widget.id, {
        lastUpdated: new Date().toISOString()
      });
    });
  };

  return { refreshAll };
}
