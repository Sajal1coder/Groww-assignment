'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Widget } from '@/types';
import { useDashboardStore } from '@/store/dashboardStore';
import { 
  GripVertical, 
  Settings, 
  X, 
  RefreshCw,
  AlertCircle 
} from 'lucide-react';
import LoadingSpinner from '../layout/LoadingSpinner';
import StockChart from './StockChart';
import CustomWidget from './CustomWidget';
import EditWidgetModal from '../modals/EditWidgetModal';

interface WidgetContainerProps {
  widget: Widget;
  dragHandleProps?: any;
  isDragging?: boolean;
}

export default function WidgetContainer({ 
  widget, 
  dragHandleProps, 
  isDragging 
}: WidgetContainerProps) {
  const { removeWidget, updateWidget, setSelectedWidget } = useDashboardStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const refreshWidget = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Trigger widget refresh by updating lastUpdated
      updateWidget(widget.id, { 
        lastUpdated: new Date().toISOString() 
      });
    } catch (err) {
      setError('Failed to refresh widget');
    } finally {
      setIsLoading(false);
    }
  };

  const renderWidget = () => {
    const commonProps = {
      widget,
      isLoading,
      error,
      onError: setError,
      onLoading: setIsLoading,
    };

    switch (widget.type) {
      case 'chart':
        return <StockChart {...commonProps} />;
      case 'table':
      case 'card':
      case 'custom':
      default:
        return <CustomWidget widget={widget} />;
    }
  };

  const widgetStyle = {
    width: widget.config?.displayMode === 'table' ? 'fit-content' : 
           widget.config?.displayMode === 'chart' ? 'fit-content' : 'fit-content',
    minWidth: widget.config?.displayMode === 'table' ? '600px' : 
              widget.config?.displayMode === 'chart' ? '800px' : '320px',
    maxWidth: widget.config?.displayMode === 'table' ? 'none' : 
              widget.config?.displayMode === 'chart' ? 'none' : '500px',
    height: 'auto'
  };

  return (
    <div 
      className={`widget-card group ${isDragging ? 'shadow-2xl scale-105' : ''}`} 
      style={widgetStyle}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1 px-2 truncate text-sm">
          {widget.title}
        </h3>
        <div className="flex items-center space-x-1">
          {isLoading && <LoadingSpinner />}
          {error && (
            <div title={error}>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          )}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={refreshWidget}
              className="p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 shadow-sm"
              title="Refresh widget"
            >
              <RefreshCw className="w-4 h-4 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" />
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 shadow-sm"
              title="Edit widget"
            >
              <Settings className="w-4 h-4 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" />
            </button>
            <button
              onClick={() => removeWidget(widget.id)}
              className="p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 transition-all duration-200 shadow-sm"
              title="Remove widget"
            >
              <X className="w-4 h-4 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="widget-content">
        {error ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
            <p className="text-red-600 dark:text-red-400 font-medium mb-1">
              Error loading widget
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {error}
            </p>
            <button
              onClick={refreshWidget}
              className="btn-primary text-sm"
            >
              Try Again
            </button>
          </div>
        ) : (
          renderWidget()
        )}
      </div>

      {/* Last Updated */}
      {widget.lastUpdated && !isLoading && (
        <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {new Date(widget.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Edit Modal - Rendered at document level using portal */}
      {showEditModal && typeof window !== 'undefined' && createPortal(
        <EditWidgetModal
          widget={widget}
          onClose={() => setShowEditModal(false)}
        />,
        document.body
      )}
    </div>
  );
}
