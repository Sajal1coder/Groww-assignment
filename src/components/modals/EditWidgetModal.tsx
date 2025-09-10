'use client';

import React, { useState, useEffect } from 'react';
import { Widget, ApiField, FieldMapping } from '@/types';
import { useDashboardStore } from '@/store/dashboardStore';
import { X, AlertCircle, RefreshCw, TestTube } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EditWidgetModalProps {
  widget: Widget;
  onClose: () => void;
}

export default function EditWidgetModal({ widget, onClose }: EditWidgetModalProps) {
  const { updateWidget } = useDashboardStore();
  const [formData, setFormData] = useState({
    name: widget.title || '',
    apiUrl: widget.config?.apiUrl || '',
    apiHeaders: widget.config?.apiHeaders || {},
    refreshInterval: widget.config?.refreshInterval || 30,
    displayMode: widget.config?.displayMode || 'card',
    fieldMappings: widget.config?.fieldMappings || []
  });

  const [availableFields, setAvailableFields] = useState<ApiField[]>([]);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  const testApiEndpoint = async () => {
    if (!formData.apiUrl) {
      toast.error('Please enter an API URL');
      return;
    }

    setIsTestingApi(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.apiUrl,
          headers: formData.apiHeaders
        })
      });

      const result = await response.json();
      setTestResult(result);

      if (result.success && result.data) {
        // Extract available fields from the response
        const fields = extractFieldsFromResponse(result.data);
        setAvailableFields(fields);
        toast.success('API test successful!');
      } else {
        toast.error(result.error || 'API test failed');
      }
    } catch (error) {
      toast.error('Failed to test API endpoint');
      setTestResult({ success: false, error: 'Network error' });
    } finally {
      setIsTestingApi(false);
    }
  };

  const extractFieldsFromResponse = (data: any): ApiField[] => {
    const fields: ApiField[] = [];
    
    const extractFromObject = (obj: any, path = '') => {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const currentPath = path ? `${path}.${key}` : key;
          
          if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            // For nested objects, add a few sample entries
            if (key === 'rates' || key === 'data' || key === 'prices') {
              const entries = Object.entries(value).slice(0, 3);
              entries.forEach(([subKey, subValue]) => {
                fields.push({
                  key: `${key}.${subKey}`,
                  label: `${key.toUpperCase()} ${subKey}`,
                  type: typeof subValue === 'number' ? 'number' : 'string',
                  path: `${currentPath}.${subKey}`,
                  sample: subValue
                });
              });
            } else {
              extractFromObject(value, currentPath);
            }
          } else {
            fields.push({
              key: currentPath,
              label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
              type: typeof value === 'number' ? 'number' : 
                    typeof value === 'boolean' ? 'boolean' :
                    value instanceof Date ? 'date' : 'string',
              path: currentPath,
              sample: value
            });
          }
        });
      }
    };

    if (Array.isArray(data) && data.length > 0) {
      extractFromObject(data[0]);
    } else {
      extractFromObject(data);
    }

    return fields;
  };

  const addHeader = () => {
    if (headerKey && headerValue) {
      setFormData(prev => ({
        ...prev,
        apiHeaders: {
          ...prev.apiHeaders,
          [headerKey]: headerValue
        }
      }));
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const removeHeader = (key: string) => {
    setFormData(prev => ({
      ...prev,
      apiHeaders: Object.fromEntries(
        Object.entries(prev.apiHeaders).filter(([k]) => k !== key)
      )
    }));
  };

  const toggleFieldMapping = (field: ApiField) => {
    setFormData(prev => {
      const existingIndex = prev.fieldMappings.findIndex(
        mapping => mapping.apiField === field.key
      );

      if (existingIndex >= 0) {
        // Remove field mapping
        return {
          ...prev,
          fieldMappings: prev.fieldMappings.filter((_, index) => index !== existingIndex)
        };
      } else {
        // Add field mapping
        const newMapping: FieldMapping = {
          apiField: field.key,
          displayName: field.label,
          type: field.type as any,
          format: field.type === 'number' ? 'number' : undefined
        };
        return {
          ...prev,
          fieldMappings: [...prev.fieldMappings, newMapping]
        };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a widget name');
      return;
    }

    if (!formData.apiUrl.trim()) {
      toast.error('Please enter an API URL');
      return;
    }

    // Update the widget
    updateWidget(widget.id, {
      title: formData.name,
      config: {
        ...widget.config,
        apiUrl: formData.apiUrl,
        apiHeaders: formData.apiHeaders,
        refreshInterval: formData.refreshInterval,
        displayMode: formData.displayMode,
        fieldMappings: formData.fieldMappings,
        availableFields
      }
    });

    toast.success('Widget updated successfully!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Edit Widget: {widget.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Widget Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Widget Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder="Enter widget name"
                required
              />
            </div>

            {/* API URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="url"
                  value={formData.apiUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
                  className="input-field flex-1"
                  placeholder="https://api.example.com/data"
                  required
                />
                <button
                  type="button"
                  onClick={testApiEndpoint}
                  disabled={isTestingApi}
                  className="btn-secondary flex items-center space-x-2"
                >
                  {isTestingApi ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  <span>Test</span>
                </button>
              </div>
            </div>

            {/* API Headers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Headers (Optional)
              </label>
              <div className="space-y-2">
                {Object.entries(formData.apiHeaders).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={key}
                      readOnly
                      className="input-field flex-1"
                    />
                    <input
                      type="text"
                      value={value}
                      readOnly
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(key)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={headerKey}
                    onChange={(e) => setHeaderKey(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Header name"
                  />
                  <input
                    type="text"
                    value={headerValue}
                    onChange={(e) => setHeaderValue(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Header value"
                  />
                  <button
                    type="button"
                    onClick={addHeader}
                    className="btn-secondary"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Mode
                </label>
                <select
                  value={formData.displayMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayMode: e.target.value as any }))}
                  className="input-field"
                >
                  <option value="card">Card View</option>
                  <option value="table">Table View</option>
                  <option value="chart">Chart View</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refresh Interval (seconds)
                </label>
                <input
                  type="number"
                  value={formData.refreshInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                  className="input-field"
                  min="5"
                  max="3600"
                />
              </div>
            </div>


            {/* Available Fields */}
            {availableFields.length > 0 && (
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
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {availableFields.map((field, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {field.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {field.key} • {field.type}
                          {field.sample !== undefined && (
                            <span> • Sample: {String(field.sample).substring(0, 30)}</span>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.fieldMappings.some(mapping => mapping.apiField === field.key)}
                        onChange={() => toggleFieldMapping(field)}
                        className="ml-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Update Widget
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
