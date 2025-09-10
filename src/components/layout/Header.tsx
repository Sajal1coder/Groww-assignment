'use client';

import { useState } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { 
  Moon, 
  Sun, 
  Settings, 
  Download, 
  Upload, 
  RefreshCw,
  Plus,
  BarChart3 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Header() {
  const {
    theme,
    widgets,
    setTheme,
    setShowAddWidget,
    exportDashboard,
    importDashboard,
    resetDashboard,
  } = useDashboardStore();

  const [showSettings, setShowSettings] = useState(false);

  const handleExport = () => {
    try {
      const config = exportDashboard();
      const blob = new Blob([config], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finboard-dashboard-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Dashboard exported successfully!');
    } catch (error) {
      toast.error('Failed to export dashboard');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = e.target?.result as string;
        importDashboard(config);
        toast.success('Dashboard imported successfully!');
        setShowSettings(false);
      } catch (error) {
        toast.error('Failed to import dashboard');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your dashboard? This will remove all widgets.')) {
      resetDashboard();
      toast.success('Dashboard reset successfully!');
      setShowSettings(false);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-primary-600 p-2 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                FinBoard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {widgets.length} widget{widgets.length !== 1 ? 's' : ''} active
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Add Widget Button */}
            <button
              onClick={() => setShowAddWidget(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Widget</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            {/* Settings Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              {showSettings && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-4 space-y-4">
                    <hr className="border-gray-200 dark:border-gray-700" />

                    {/* Export/Import */}
                    <div className="space-y-2">
                      <button
                        onClick={handleExport}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export Dashboard</span>
                      </button>

                      <label className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>Import Dashboard</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImport}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />

                    {/* Reset Dashboard */}
                    <button
                      onClick={handleReset}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Reset Dashboard</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close settings */}
      {showSettings && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSettings(false)}
        />
      )}
    </header>
  );
}
