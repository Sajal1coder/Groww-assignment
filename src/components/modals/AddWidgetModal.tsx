'use client';

import React, { useState, useEffect } from 'react';
import { Widget, ApiField, FieldMapping } from '@/types';
import { useDashboardStore } from '@/store/dashboardStore';
import { 
  X, 
  AlertCircle, 
  RefreshCw, 
  TestTube, 
  Plus, 
  Search,
  Table, 
  CreditCard, 
  BarChart3,
  CheckCircle,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Shield,
  Wifi
} from 'lucide-react';
import toast from 'react-hot-toast';
import { testApiEndpoint, ApiTestResult } from '@/services/apiTester';
import { ApiErrorHandler } from '@/services/apiErrorHandler';

// Using the enhanced testApiEndpoint from services

const extractFieldsFromData = (data: any, prefix = ''): ApiField[] => {
  const fields: ApiField[] = [];
  
  if (data && typeof data === 'object') {
    Object.keys(data).forEach(key => {
      const value = data[key];
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (Array.isArray(value) && value.length > 0) {
        // Handle arrays - extract fields from first item
        const firstItem = value[0];
        if (firstItem && typeof firstItem === 'object') {
          // Extract fields from array items with array notation
          fields.push(...extractFieldsFromData(firstItem, `${path}[0]`));
        }
      } else if (value && typeof value === 'object') {
        // Recursively extract nested fields
        fields.push(...extractFieldsFromData(value, path));
      } else {
        // Add leaf field
        const getFieldType = (val: any): 'string' | 'number' | 'boolean' | 'date' => {
          if (typeof val === 'number') return 'number';
          if (typeof val === 'boolean') return 'boolean';
          if (val instanceof Date) return 'date';
          // Check if string is numeric
          if (typeof val === 'string') {
            if (!isNaN(parseFloat(val)) && isFinite(parseFloat(val))) return 'number';
            if (!isNaN(Date.parse(val))) return 'date';
          }
          return 'string';
        };
        
        fields.push({
          key: path,
          label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          path: path,
          type: getFieldType(value)
        });
      }
    });
  }
  
  return fields;
};

export default function AddWidgetModal() {
  const { addWidget, setShowAddWidget } = useDashboardStore();
  const [title, setTitle] = useState('');
  
  // New API configuration states
  const [apiUrl, setApiUrl] = useState('');
  const [apiHeaders, setApiHeaders] = useState<Record<string, string>>({});
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [displayMode, setDisplayMode] = useState<'card' | 'table' | 'chart'>('table');
  const [availableFields, setAvailableFields] = useState<ApiField[]>([]);
  const [selectedFields, setSelectedFields] = useState<FieldMapping[]>([]);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<ApiTestResult | null>(null);
  const [showApiResponse, setShowApiResponse] = useState(false);
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [withRetry, setWithRetry] = useState(true);
  const [retryCountdown, setRetryCountdown] = useState(0);

  const testApi = async (useRetry = withRetry) => {
    if (!apiUrl.trim()) return;
    
    setIsTestingApi(true);
    setApiTestResult(null);
    
    try {
      const result = await testApiEndpoint(apiUrl, apiHeaders, useRetry);
      setApiTestResult(result);
      
      if (result.success && result.fields) {
        setAvailableFields(result.fields);
        
        // Auto-select fields for chart mode
        if (displayMode === 'chart') {
          autoSelectChartFields(result.fields);
        }
        
        toast.success(`API test successful! Found ${result.fields.length} fields`);
      } else if (result.apiError) {
        // Handle specific API errors
        const errorMessage = ApiErrorHandler.getErrorMessage(result.apiError);
        toast.error(errorMessage);
        
        // Start countdown for rate limit errors
        if (result.apiError.type === 'rate_limit' && result.retryAfter) {
          setRetryCountdown(result.retryAfter);
        }
      } else {
        toast.error(result.error || 'API test failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setApiTestResult({
        success: false,
        error: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setIsTestingApi(false);
    }
  };

  const addHeader = () => {
    if (headerKey.trim() && headerValue.trim()) {
      setApiHeaders(prev => ({
        ...prev,
        [headerKey.trim()]: headerValue.trim()
      }));
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const removeHeader = (key: string) => {
    setApiHeaders(prev => {
      const newHeaders = { ...prev };
      delete newHeaders[key];
      return newHeaders;
    });
  };

  const addFieldMapping = (field: ApiField) => {
    const mapping: FieldMapping = {
      apiField: field.path,
      displayName: field.label,
      type: field.type,
    };
    
    setSelectedFields(prev => [...prev, mapping]);
  };

  const removeFieldMapping = (index: number) => {
    setSelectedFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !apiUrl.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const config: any = {
      refreshInterval,
      displayMode,
      apiUrl,
      apiHeaders,
      fieldMappings: selectedFields.length > 0 ? selectedFields : [],
      availableFields,
    };

    addWidget({
      type: 'custom',
      title: title.trim(),
      position: { x: 0, y: 0 },
      size: { width: 400, height: 300 },
      config,
    });

    toast.success('Widget added successfully!');
    setShowAddWidget(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setApiUrl('');
    setApiHeaders({});
    setRefreshInterval(30);
    setDisplayMode('table');
    setAvailableFields([]);
    setSelectedFields([]);
    setApiTestResult(null);
    setShowApiResponse(false);
    setHeaderKey('');
    setHeaderValue('');
    setSearchQuery('');
  };

  // Auto-select appropriate fields for chart display
  const autoSelectChartFields = (fields: ApiField[]) => {
    const numericFields = fields.filter(field => field.type === 'number');
    const dateFields = fields.filter(field => 
      field.type === 'date' || 
      field.path.toLowerCase().includes('date') || 
      field.path.toLowerCase().includes('time') ||
      field.path.toLowerCase().includes('datetime')
    );
    
    const chartFields: FieldMapping[] = [];
    
    // Look for OHLC pattern (Open, High, Low, Close) - prioritize array-based fields
    const ohlcPatterns = ['open', 'high', 'low', 'close'];
    const ohlcFields = ohlcPatterns.map(pattern => 
      numericFields.find(field => 
        field.path.toLowerCase().includes(pattern) || 
        field.label.toLowerCase().includes(pattern)
      )
    ).filter(Boolean);
    
    if (ohlcFields.length >= 4) {
      // Stock data detected - add OHLC fields
      ohlcFields.forEach(field => {
        if (field) {
          chartFields.push({
            displayName: field.label,
            apiField: field.path,
            type: field.type
          });
        }
      });
    } else {
      // Generic numeric data - select first few numeric fields, prioritize array-based fields
      const arrayNumericFields = numericFields.filter(field => field.path.includes('[0]'));
      const regularNumericFields = numericFields.filter(field => !field.path.includes('[0]'));
      
      const fieldsToSelect = arrayNumericFields.length > 0 ? arrayNumericFields : regularNumericFields;
      fieldsToSelect.slice(0, 4).forEach(field => {
        chartFields.push({
          displayName: field.label,
          apiField: field.path,
          type: field.type
        });
      });
    }
    
    // Add date field if available, prioritize array-based date fields
    const arrayDateFields = dateFields.filter(field => field.path.includes('[0]'));
    const regularDateFields = dateFields.filter(field => !field.path.includes('[0]'));
    
    const dateFieldToUse = arrayDateFields.length > 0 ? arrayDateFields[0] : regularDateFields[0];
    if (dateFieldToUse) {
      chartFields.push({
        displayName: dateFieldToUse.label,
        apiField: dateFieldToUse.path,
        type: dateFieldToUse.type
      });
    }
    
    setSelectedFields(chartFields);
  };

  // Handle display mode change
  const handleDisplayModeChange = (mode: 'card' | 'table' | 'chart') => {
    setDisplayMode(mode);
    
    // Auto-select fields when switching to chart mode
    if (mode === 'chart' && availableFields.length > 0) {
      autoSelectChartFields(availableFields);
    } else if (mode !== 'chart') {
      // Clear selections when switching away from chart mode
      setSelectedFields([]);
    }
  };

  const handleClose = () => {
    setShowAddWidget(false);
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Add New Widget
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Widget Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Widget Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter widget name"
              className="input-field"
              required
            />
          </div>

          {/* API URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API URL *
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.example.com/data"
                className="input-field flex-1"
                required
              />
              <button
                type="button"
                onClick={testApi}
                disabled={isTestingApi || !apiUrl.trim()}
                className="btn-primary flex items-center space-x-2 px-4"
              >
                {isTestingApi ? (
                  <div className="loading-spinner w-4 h-4" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                <span>Test</span>
              </button>
            </div>
            {apiTestResult && (
              <div className={`mt-2 p-2 rounded text-sm ${
                apiTestResult.success 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                <div className="flex items-center space-x-2">
                  {apiTestResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>
                    {apiTestResult.success 
                      ? `Success! Response time: ${apiTestResult.responseTime}ms`
                      : apiTestResult.error
                    }
                  </span>
                  {apiTestResult.success && (
                    <button
                      type="button"
                      onClick={() => setShowApiResponse(!showApiResponse)}
                      className="ml-auto"
                    >
                      {showApiResponse ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {showApiResponse && apiTestResult.data && (
                  <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(apiTestResult.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* API Headers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Headers (Optional)
            </label>
            <div className="space-y-2">
              {Object.entries(apiHeaders).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{key}:</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">{value}</span>
                  <button
                    type="button"
                    onClick={() => removeHeader(key)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={headerKey}
                  onChange={(e) => setHeaderKey(e.target.value)}
                  placeholder="Header name"
                  className="input-field flex-1"
                />
                <input
                  type="text"
                  value={headerValue}
                  onChange={(e) => setHeaderValue(e.target.value)}
                  placeholder="Header value"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={addHeader}
                  disabled={!headerKey.trim() || !headerValue.trim()}
                  className="btn-secondary px-3"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Refresh Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Refresh Interval
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="input-field"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={600}>10 minutes</option>
            </select>
          </div>

          {/* Display Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Display Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { value: 'card', label: 'Card', icon: CreditCard },
                { value: 'table', label: 'Table', icon: Table },
                { value: 'chart', label: 'Chart', icon: BarChart3 },
              ].map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => handleDisplayModeChange(mode.value as any)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      displayMode === mode.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available Fields */}
          {availableFields.length > 0 && displayMode !== 'chart' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Available Fields
              </label>
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Tip:</strong> Select only the fields that are most relevant to your use case. 
                    Too many fields can make the widget cluttered and harder to read.
                  </span>
                </p>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {availableFields
                  .filter(field => 
                    field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    field.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    field.type.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((field, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {field.label}
                    </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {field.path} ({field.type})
                      </div>
                      {field.sample && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          Sample: {String(field.sample)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addFieldMapping(field)}
                      disabled={selectedFields.some(f => f.apiField === field.path)}
                      className="btn-secondary text-xs px-2 py-1 disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Fields */}
          {selectedFields.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {displayMode === 'chart' ? 'Auto-Selected Chart Fields' : 'Selected Fields'} ({selectedFields.length})
              </label>
              {displayMode === 'chart' && (
                <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs text-green-700 dark:text-green-300 flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Auto-Detection:</strong> Numeric fields have been automatically selected for chart display. 
                      The system detected {selectedFields.filter(f => f.type === 'number').length} numeric fields suitable for charting.
                    </span>
                  </p>
                </div>
              )}
              <div className="space-y-2">
                {selectedFields.map((field, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {field.displayName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {field.apiField} ({field.type})
                      </div>
                    </div>
                    {displayMode !== 'chart' && (
                      <button
                        type="button"
                        onClick={() => removeFieldMapping(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !apiUrl.trim()}
              className="btn-primary flex-1"
            >
              Add Widget
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
