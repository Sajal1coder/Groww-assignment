'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Minus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Star,
  Eye,
  Wifi,
  WifiOff,
  Shield,
  Server
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cachedFetch } from '@/services/apiCache';
import { ApiErrorHandler, ApiError } from '@/services/apiErrorHandler';
import ErrorDisplay from './ErrorDisplay';

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
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const { autoRefresh, refreshInterval, updateWidgetData, updateWidget } = useDashboardStore();
  
  // Table view state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterValue, setFilterValue] = useState('');
  const itemsPerPage = 10;

  const fetchData = useCallback(async (skipCache = false) => {
    if (!widget.config?.apiUrl) return;
    
    setLoading(true);
    setError(null);
    setApiError(null);
    
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
          withRetry: true
        }
      );

      setData(Array.isArray(result) ? result : [result]);
      updateWidgetData(widget.id, result);
      
      // Clear any previous error state on successful fetch
      updateWidget(widget.id, { lastError: undefined });
    } catch (err) {
      let apiErr: ApiError;
      
      // Check if it's already an ApiError from our handler
      if (err && typeof err === 'object' && 'type' in err) {
        apiErr = err as ApiError;
      } else {
        // Parse the error using our error handler
        apiErr = ApiErrorHandler.parseError(err);
      }
      
      setApiError(apiErr);
      setError(ApiErrorHandler.getErrorMessage(apiErr));
      
      // Store error state in widget for smart refresh logic
      const errorState = {
        type: apiErr.type,
        message: apiErr.message,
        timestamp: Date.now(),
        retryAfter: apiErr.retryAfter,
        retryCount: (widget.lastError?.retryCount || 0) + 1
      };
      
      updateWidget(widget.id, { lastError: errorState });
      
      // Start countdown for rate limit errors
      if (apiErr.type === 'rate_limit' && apiErr.retryAfter) {
        startRetryCountdown(apiErr.retryAfter);
      }
    } finally {
      setLoading(false);
    }
  }, [widget.config?.apiUrl, widget.config?.apiHeaders, widget.config?.refreshInterval, widget.id, widget.lastError?.retryCount, updateWidgetData, updateWidget]);

  const startRetryCountdown = (seconds: number) => {
    setRetryCountdown(seconds);
    const interval = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRetry = () => {
    if (retryCountdown === 0) {
      fetchData(true); // Skip cache on retry
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    const cardType = widget.config?.cardType || 'default';
    const fieldMappings = widget.config?.fieldMappings || [];
    
    // Render different card types based on configuration
    switch (cardType) {
      case 'watchlist':
        return renderWatchlistCards();
      case 'market-gainers':
        return renderMarketGainersCards();
      case 'performance':
        return renderPerformanceCards();
      case 'financial':
        return renderFinancialCards();
      default:
        return renderDefaultCards();
    }
  };
  
  const renderWatchlistCards = () => {
    const displayData = data.slice(0, 6); // Show up to 6 watchlist items
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayData.map((item, index) => {
          const symbol = getNestedValue(item, 'symbol') || getNestedValue(item, 'name') || `Stock ${index + 1}`;
          const price = getNestedValue(item, 'price') || getNestedValue(item, 'current_price') || 0;
          const change = getNestedValue(item, 'change') || getNestedValue(item, 'price_change_24h') || 0;
          const changePercent = getNestedValue(item, 'change_percent') || getNestedValue(item, 'price_change_percentage_24h') || 0;
          
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{symbol}</span>
                </div>
                <Eye className="w-4 h-4 text-gray-400" />
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatValue(price, 'currency')}
                </div>
                <div className={`text-sm font-medium flex items-center gap-1 ${
                  change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {formatValue(change, 'currency')} ({formatValue(changePercent, 'percentage')})
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  const renderMarketGainersCards = () => {
    // Sort by change percentage and take top gainers
    const sortedData = [...data].sort((a, b) => {
      const aChange = getNestedValue(a, 'change_percent') || getNestedValue(a, 'price_change_percentage_24h') || 0;
      const bChange = getNestedValue(b, 'change_percent') || getNestedValue(b, 'price_change_percentage_24h') || 0;
      return bChange - aChange;
    }).slice(0, 5);
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Top Gainers</h3>
        </div>
        {sortedData.map((item, index) => {
          const symbol = getNestedValue(item, 'symbol') || getNestedValue(item, 'name') || `Stock ${index + 1}`;
          const price = getNestedValue(item, 'price') || getNestedValue(item, 'current_price') || 0;
          const change = getNestedValue(item, 'change') || getNestedValue(item, 'price_change_24h') || 0;
          const changePercent = getNestedValue(item, 'change_percent') || getNestedValue(item, 'price_change_percentage_24h') || 0;
          
          return (
            <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-green-700 dark:text-green-300">#{index + 1}</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{symbol}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{formatValue(price, 'currency')}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-600 dark:text-green-400 font-semibold text-sm">
                  +{formatValue(changePercent, 'percentage')}
                </div>
                <div className="text-green-600 dark:text-green-400 text-xs">
                  +{formatValue(change, 'currency')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  const renderPerformanceCards = () => {
    const item = data[0];
    const fieldMappings = widget.config?.fieldMappings || [];
    
    return (
      <div className="grid grid-cols-2 gap-4">
        {fieldMappings.slice(0, 4).map((field, index) => {
          const value = getNestedValue(item, field.apiField);
          const isNumeric = typeof value === 'number';
          const displayValue = formatValue(value, field.type);
          const isPositive = isNumeric && value > 0;
          const isNegative = isNumeric && value < 0;
          
          return (
            <div key={index} className={`p-4 rounded-lg border ${
              isPositive ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
              isNegative ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
              'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isPositive && <TrendingUp className="w-4 h-4 text-green-600" />}
                {isNegative && <TrendingDown className="w-4 h-4 text-red-600" />}
                {!isPositive && !isNegative && <BarChart3 className="w-4 h-4 text-gray-600" />}
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {field.displayName || formatKey(field.apiField)}
                </span>
              </div>
              <div className={`text-xl font-bold ${
                isPositive ? 'text-green-600 dark:text-green-400' :
                isNegative ? 'text-red-600 dark:text-red-400' :
                'text-gray-900 dark:text-gray-100'
              }`}>
                {displayValue}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  const renderFinancialCards = () => {
    const item = data[0];
    const fieldMappings = widget.config?.fieldMappings || [];
    
    return (
      <div className="space-y-4">
        {fieldMappings.map((field, index) => {
          const value = getNestedValue(item, field.apiField);
          const displayValue = formatValue(value, field.type);
          const isNumeric = typeof value === 'number';
          
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {field.displayName || formatKey(field.apiField)}
                    </div>
                    <div className={`text-lg font-bold ${
                      isNumeric && typeof value === 'number'
                        ? value > 0 ? 'text-green-600 dark:text-green-400'
                        : value < 0 ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {displayValue}
                    </div>
                  </div>
                </div>
                {isNumeric && typeof value === 'number' && (
                  <div className={`p-2 rounded-full ${
                    value > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {value > 0 ? 
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" /> :
                      <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                    }
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  const renderDefaultCards = () => {
    const item = data[0];
    const fieldMappings = widget.config?.fieldMappings || [];
    
    // If no field mappings, show all available fields from the data (fallback behavior)
    if (fieldMappings.length === 0) {
      const flattenedData = flattenObject(item);
      
      return (
        <div className="widget-content">
          {Object.entries(flattenedData).slice(0, 5).map(([key, value], index) => {
            const displayKey = formatKey(key);
            
            // Special handling for rates and other nested objects
            let displayValue: string;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              // For rates object, show the actual currency values instead of "Object (X properties)"
              if (key.toLowerCase().includes('rates') || key.toLowerCase().includes('prices')) {
                const entries = Object.entries(value).slice(0, 3);
                displayValue = entries.map(([currency, rate]) => `${currency}: ${rate}`).join(', ');
                if (Object.keys(value).length > 3) {
                  displayValue += ` (+${Object.keys(value).length - 3} more)`;
                }
              } else {
                displayValue = formatValue(value, 'text');
              }
            } else {
              displayValue = formatValue(value, 'text');
            }
            
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
    }

    // Use field mappings when they exist (same logic as table view)
    return (
      <div className="widget-content">
        {fieldMappings.map((field, index) => {
          const key = field.apiField;
          const value = getNestedValue(item, key);
          const isNumeric = typeof value === 'number';
          const displayKey = field.displayName || key.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase());
          const displayValue = formatValue(value, field.type);
          
          return (
            <div key={index} className="widget-row">
              <span className="widget-key">
                {displayKey}
              </span>
              <span className={`widget-value ${
                isNumeric && typeof value === 'number'
                  ? value > 0 ? 'positive'
                  : value < 0 ? 'negative'
                  : ''
                  : ''
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
    
    // Filter and search data
    let filteredData = [...data];
    
    // Apply search filter
    if (searchTerm) {
      filteredData = filteredData.filter(item => {
        return Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    
    // Apply sorting
    if (sortField) {
      filteredData.sort((a, b) => {
        const aValue = getNestedValue(a, sortField);
        const bValue = getNestedValue(b, sortField);
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }
    
    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);
    
    const handleSort = (field: string) => {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    };
    
    return (
      <div className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search stocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterValue('');
              setSortField('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Clear
          </button>
        </div>
        
        {/* Table */}
        <div className="w-full">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {fieldMappings.length > 0 ? (
                  fieldMappings.map((field, index) => (
                    <th
                      key={index}
                      className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                      onClick={() => handleSort(field.apiField)}
                    >
                      <div className="flex items-center gap-2">
                        {field.displayName || field.apiField}
                        {sortField === field.apiField && (
                          <span className="text-blue-500">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))
                ) : (
                  Object.keys(flattenObject(data[0])).slice(0, 5).map((key, index) => (
                    <th
                      key={index}
                      className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                      onClick={() => handleSort(key)}
                    >
                      <div className="flex items-center gap-2">
                        {formatKey(key)}
                        {sortField === key && (
                          <span className="text-blue-500">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  {fieldMappings.length > 0 ? (
                    fieldMappings.map((field, colIndex) => {
                      const value = getNestedValue(item, field.apiField);
                      const isNumeric = typeof value === 'number';
                      const displayValue = formatValue(value, field.type);
                      
                      return (
                        <td key={colIndex} className="py-3 px-4 text-sm">
                          <span className={`${
                            isNumeric && typeof value === 'number'
                              ? value > 0 ? 'text-green-600 dark:text-green-400 font-semibold'
                              : value < 0 ? 'text-red-600 dark:text-red-400 font-semibold'
                              : 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {displayValue}
                          </span>
                        </td>
                      );
                    })
                  ) : (
                    Object.entries(flattenObject(item)).slice(0, 5).map(([key, value], colIndex) => {
                      const isNumeric = typeof value === 'number';
                      const displayValue = formatValue(value, isNumeric ? 'number' : 'string');
                      
                      return (
                        <td key={colIndex} className="py-3 px-4 text-sm">
                          <span className={`${
                            isNumeric && typeof value === 'number'
                              ? value > 0 ? 'text-green-600 dark:text-green-400 font-semibold'
                              : value < 0 ? 'text-red-600 dark:text-red-400 font-semibold'
                              : 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {displayValue}
                          </span>
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} items
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderChartView = () => {
    if (!data || data.length === 0) return null;

    const fieldMappings = widget.config?.fieldMappings || [];
    
    // Handle different data formats for charts
    let chartData: any[] = [];
    
    // Check if data has time series format (like CoinGecko API)
    const firstItem = data[0];
    
    // Format 1: Alpha Vantage style - { "Time Series (Daily)": { "2025-09-09": { "1. open": "256.12", ... } } }
    if (firstItem && firstItem['Time Series (Daily)']) {
      const timeSeriesData = firstItem['Time Series (Daily)'];
      chartData = Object.entries(timeSeriesData)
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .slice(0, 50)
        .map(([date, values]: [string, any]) => ({
          date: new Date(date).toLocaleDateString(),
          timestamp: new Date(date).getTime(),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseFloat(values['5. volume']),
          'Open': parseFloat(values['1. open']),
          'High': parseFloat(values['2. high']),
          'Low': parseFloat(values['3. low']),
          'Close': parseFloat(values['4. close']),
          'Volume': parseFloat(values['5. volume'])
        }));
    }
    // Format 2: CoinGecko style - { prices: [[timestamp, price], ...], market_caps: [...] }
    else if (firstItem && firstItem.prices && Array.isArray(firstItem.prices)) {
      chartData = firstItem.prices.slice(0, 50).map(([timestamp, price]: [number, number]) => ({
        date: new Date(timestamp).toLocaleDateString(),
        timestamp: timestamp,
        price: price,
        'Price (USD)': price
      }));
      
      // Add market cap data if available
      if (firstItem.market_caps) {
        firstItem.market_caps.slice(0, 50).forEach(([timestamp, marketCap]: [number, number], index: number) => {
          if (chartData[index] && chartData[index].timestamp === timestamp) {
            chartData[index]['Market Cap'] = marketCap;
          }
        });
      }
      
      // Add volume data if available
      if (firstItem.total_volumes) {
        firstItem.total_volumes.slice(0, 50).forEach(([timestamp, volume]: [number, number], index: number) => {
          if (chartData[index] && chartData[index].timestamp === timestamp) {
            chartData[index]['Volume'] = volume;
          }
        });
      }
    }
    // Format 2: Array of objects with time/date fields
    else if (Array.isArray(data) && data.length > 0) {
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

      chartData = data.slice(0, 50).map((item, index) => {
        const dataPoint: any = {};
        
        // Try to find a date/time field
        const dateField = Object.keys(item).find(key => 
          key.toLowerCase().includes('date') || 
          key.toLowerCase().includes('time') ||
          key.toLowerCase().includes('timestamp')
        );
        
        if (dateField) {
          const dateValue = item[dateField];
          if (typeof dateValue === 'number') {
            dataPoint.date = new Date(dateValue).toLocaleDateString();
            dataPoint.timestamp = dateValue;
          } else if (typeof dateValue === 'string') {
            dataPoint.date = new Date(dateValue).toLocaleDateString();
            dataPoint.timestamp = new Date(dateValue).getTime();
          }
        } else {
          dataPoint.date = `Point ${index + 1}`;
          dataPoint.timestamp = index;
        }
        
        // Add numeric fields
        numericFields.forEach(field => {
          const value = getNestedValue(item, field.apiField);
          if (typeof value === 'number') {
            dataPoint[field.displayName || field.apiField] = value;
          } else if (typeof value === 'string') {
            const numericValue = parseFloat(value);
            dataPoint[field.displayName || field.apiField] = !isNaN(numericValue) ? numericValue : 0;
          } else {
            dataPoint[field.displayName || field.apiField] = 0;
          }
        });
        
        return dataPoint;
      });
    }
    
    if (chartData.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No chart data available
        </div>
      );
    }

    // Get all numeric fields from the processed data
    const numericKeys = Object.keys(chartData[0]).filter(key => 
      key !== 'date' && key !== 'timestamp' && typeof chartData[0][key] === 'number'
    );

    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={Math.max(0, Math.floor(chartData.length / 8))}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
              width={80}
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(1)}K`;
                }
                return value.toFixed(2);
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '6px',
              }}
              formatter={(value: any, name: string) => [
                typeof value === 'number' ? value.toLocaleString() : value,
                name
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            {numericKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
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
      <ErrorDisplay
        error={error}
        apiError={apiError}
        retryCountdown={retryCountdown}
        onRetry={handleRetry}
        className="h-32"
      />
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
