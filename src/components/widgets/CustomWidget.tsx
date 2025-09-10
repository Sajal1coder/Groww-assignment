'use client';

import React, { useState, useEffect } from 'react';
import { Widget } from '@/types';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  AlertCircle,
  Clock,
  Settings,
  Minus
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cachedFetch } from '@/services/apiCache';

interface CustomWidgetProps {
  widget: Widget;
}

interface CustomApiData {
  [key: string]: any;
}

export default function CustomWidget({ widget }: CustomWidgetProps) {
  const [data, setData] = useState<CustomApiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { autoRefresh, refreshInterval, updateWidgetData } = useDashboardStore();

  const fetchData = async (skipCache = false) => {
    if (!widget.config?.apiUrl) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...widget.config.apiHeaders,
      };

      // Use cached fetch with custom TTL based on refresh interval
      const refreshInterval = widget.config?.refreshInterval || 30;
      const ttl = refreshInterval * 1000; // Convert to milliseconds

      const result = await cachedFetch(
        widget.config.apiUrl,
        {
          method: 'GET',
          headers,
        },
        {
          ttl,
          skipCache,
        }
      );

      setData(Array.isArray(result) ? result : [result]);
      updateWidgetData(widget.id, result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [widget.config?.apiUrl]);

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  };

  const flattenObject = (obj: any, prefix = '', maxDepth = 2, currentDepth = 0): Record<string, any> => {
    const flattened: Record<string, any> = {};
    
    if (currentDepth >= maxDepth) {
      return { [prefix]: obj };
    }
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          // For objects like 'rates', show a few sample entries instead of flattening everything
          if (key === 'rates' || key === 'data' || key === 'prices') {
            const entries = Object.entries(value).slice(0, 5);
            entries.forEach(([subKey, subValue], index) => {
              if (index < 3) { // Show only first 3 entries
                flattened[`${key}.${subKey}`] = subValue;
              }
            });
            if (Object.keys(value).length > 3) {
              flattened[`${key}.more`] = `+${Object.keys(value).length - 3} more`;
            }
          } else {
            Object.assign(flattened, flattenObject(value, newKey, maxDepth, currentDepth + 1));
          }
        } else {
          flattened[newKey] = value;
        }
      }
    }
    
    return flattened;
  };

  const formatValue = (value: any, type: string): string => {
    if (value === null || value === undefined) return 'N/A';
    
    // Handle objects by showing a summary or key info
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return `Array (${value.length} items)`;
      } else {
        const keys = Object.keys(value);
        if (keys.length <= 3) {
          // Show small objects inline
          return keys.map(k => `${k}: ${String(value[k]).substring(0, 20)}`).join(', ');
        } else {
          return `Object (${keys.length} properties)`;
        }
      }
    }
    
    switch (type) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      case 'currency':
        return typeof value === 'number' ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(value);
      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(2)}%` : String(value);
      case 'date':
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return String(value);
        }
      default:
        return String(value);
    }
  };

  const formatKey = (key: string): string => {
    // Remove common prefixes like 'data.', 'rates.', 'prices.' etc.
    const cleanKey = key.replace(/^(data|rates|prices|info|details|meta)\./i, '');
    
    // Handle nested keys by taking the last meaningful part
    const parts = cleanKey.split('.');
    const lastPart = parts[parts.length - 1];
    
    // Convert camelCase to readable format
    return lastPart
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str: string) => str.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
  };

  const renderCardView = () => {
    if (!data || data.length === 0) return null;

    const item = data[0];
    const flattenedData = flattenObject(item);
    
    return (
      <div className="widget-content">
        {Object.entries(flattenedData).slice(0, 5).map(([key, value], index) => {
          const displayKey = formatKey(key);
          const displayValue = formatValue(value, 'text');
          const numericValue = parseFloat(String(value).replace(/[^\d.-]/g, ''));
          
          return (
            <div key={index} className="widget-row">
              <span className="widget-key">
                {displayKey}
              </span>
              <span className={`widget-value ${
                !isNaN(numericValue) && numericValue > 0 ? 'positive' : 
                !isNaN(numericValue) && numericValue < 0 ? 'negative' : 
                ''
              }`}>
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTableView = () => {
    if (!data || data.length === 0) return null;

    const fieldMappings = widget.config?.fieldMappings || [];
    
    // If no field mappings, show all available fields from the data
    if (fieldMappings.length === 0) {
      const flattenedData = flattenObject(data[0]);
      
      return (
        <div className="space-y-2">
          {Object.entries(flattenedData).slice(0, 10).map(([key, value], index) => {
            const isNumeric = typeof value === 'number';
            const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            const displayValue = formatValue(value, isNumeric ? 'number' : 'string');
            
            return (
              <div key={index} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {displayKey}
                </span>
                <span className={`text-sm font-semibold ml-4 ${
                  isNumeric && typeof value === 'number'
                    ? value > 0 ? 'text-green-600 dark:text-green-400'
                    : value < 0 ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {displayValue}
                </span>
              </div>
            );
          })}
          {data.length > 1 && (
            <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400">
              Showing first item of {data.length} total items
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {fieldMappings.map((field, index) => {
          const key = field.apiField;
          const value = getNestedValue(data[0], key);
          const isNumeric = typeof value === 'number';
          const displayKey = field.displayName || key.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase());
          const displayValue = formatValue(value, field.type);
          
          return (
            <div key={index} className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {displayKey}
              </span>
              <span className={`text-sm font-semibold ml-4 ${
                isNumeric && typeof value === 'number'
                  ? value > 0 ? 'text-green-600 dark:text-green-400'
                  : value < 0 ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderChartView = () => {
    if (!data || data.length === 0) return null;

    const fieldMappings = widget.config?.fieldMappings || [];
    const numericFields = fieldMappings.filter(field => 
      field.type === 'number' || field.type === 'currency' || field.type === 'percentage'
    );
    
    if (numericFields.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No numeric fields available for chart display
        </div>
      );
    }

    // Prepare chart data
    const chartData = data.slice(0, 20).map((item, index) => {
      const dataPoint: any = { index: index + 1 };
      numericFields.forEach(field => {
        const value = getNestedValue(item, field.apiField);
        dataPoint[field.displayName] = typeof value === 'number' ? value : 0;
      });
      return dataPoint;
    });

    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="index" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '6px',
              }}
            />
            {numericFields.map((field, index) => (
              <Line
                key={field.apiField}
                type="monotone"
                dataKey={field.displayName}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
        <button
          onClick={() => fetchData(true)}
          className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  const renderContent = () => {
    const displayMode = widget.config?.displayMode || 'card';
    
    switch (displayMode) {
      case 'table':
        return renderTableView();
      case 'chart':
        return renderChartView();
      default:
        return renderCardView();
    }
  };

  return (
    <div className="space-y-4">
      {renderContent()}
    </div>
  );
}
