'use client';

import { useEffect } from 'react';
// Removed react-beautiful-dnd import - using HTML5 drag and drop instead
import { useDashboardStore } from '@/store/dashboardStore';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useResponsive } from '@/hooks/useResponsive';
import Header from './layout/Header';
import WidgetContainer from './widgets/WidgetContainer';
import AddWidgetModal from './modals/AddWidgetModal';
import ErrorBoundary from './layout/ErrorBoundary';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  const {
    widgets,
    theme,
    showAddWidget,
    setShowAddWidget,
    reorderWidgets,
  } = useDashboardStore();

  const { isMobile, getGridColumns } = useResponsive();
  useAutoRefresh();

  useEffect(() => {
    // Initialize theme on mount
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleDragStart = (e: React.DragEvent, widgetId: string, index: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ widgetId, index }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { index: sourceIndex } = data;
      
      if (sourceIndex !== targetIndex) {
        reorderWidgets(sourceIndex, targetIndex);
      }
    } catch (error) {
      // Silently handle drag and drop errors
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-10 max-w-lg backdrop-blur-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Plus className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Welcome to FinBoard
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                Start building your personalized finance dashboard by adding your first widget.
              </p>
              <button
                onClick={() => setShowAddWidget(true)}
                className="btn-primary w-full"
              >
                Add Your First Widget
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start">
            {widgets.map((widget, index) => (
              <div
                key={widget.id}
                draggable
                onDragStart={(e) => handleDragStart(e, widget.id, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className="transition-all duration-200 hover:scale-[1.02]"
              >
                <ErrorBoundary>
                  <WidgetContainer
                    widget={widget}
                    dragHandleProps={{
                      onMouseDown: (e: React.MouseEvent) => {
                        e.currentTarget.closest('[draggable]')?.setAttribute('draggable', 'true');
                      }
                    }}
                    isDragging={false}
                  />
                </ErrorBoundary>
              </div>
            ))}
          </div>
        )}

        {/* Floating Add Button */}
        {widgets.length > 0 && (
          <button
            onClick={() => setShowAddWidget(true)}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 z-50 hover:scale-110 border border-blue-500/20"
            aria-label="Add Widget"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </main>

      {showAddWidget && <AddWidgetModal />}
    </div>
  );
}
