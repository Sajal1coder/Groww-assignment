import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Widget, DashboardLayout, StockData, MarketData } from '@/types';

interface DashboardState {
  // Layout and widgets
  widgets: Widget[];
  theme: 'light' | 'dark';
  autoRefresh: boolean;
  refreshInterval: number;
  
  // Data cache
  stockData: Record<string, StockData>;
  marketData: MarketData | null;
  chartData: Record<string, any>;
  apiCache: Record<string, { data: any; timestamp: number; ttl: number }>;
  
  // UI state
  isLoading: boolean;
  selectedWidget: string | null;
  showAddWidget: boolean;
  draggedWidget: string | null;
  
  // Actions
  addWidget: (widget: Omit<Widget, 'id'>) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  moveWidget: (id: string, position: { x: number; y: number }) => void;
  resizeWidget: (id: string, size: { width: number; height: number }) => void;
  reorderWidgets: (startIndex: number, endIndex: number) => void;
  
  // Data management
  setStockData: (symbol: string, data: StockData) => void;
  setMarketData: (data: MarketData) => void;
  setChartData: (key: string, data: any) => void;
  updateWidgetData: (widgetId: string, data: any) => void;
  clearCache: () => void;
  
  // UI actions
  setTheme: (theme: 'light' | 'dark') => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  setSelectedWidget: (id: string | null) => void;
  setShowAddWidget: (show: boolean) => void;
  setDraggedWidget: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Dashboard management
  exportDashboard: () => string;
  importDashboard: (config: string) => void;
  resetDashboard: () => void;
}

const generateId = () => `widget_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      // Initial state
      widgets: [],
      theme: 'light',
      autoRefresh: true,
      refreshInterval: 30,
      
      stockData: {},
      marketData: null,
      chartData: {},
      apiCache: {},
      
      isLoading: false,
      selectedWidget: null,
      showAddWidget: false,
      draggedWidget: null,
      
      // Widget actions
      addWidget: (widget) => {
        const newWidget: Widget = {
          ...widget,
          id: generateId(),
        };
        set((state) => ({
          widgets: [...state.widgets, newWidget],
        }));
      },
      
      removeWidget: (id) => {
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== id),
          selectedWidget: state.selectedWidget === id ? null : state.selectedWidget,
        }));
      },
      
      updateWidget: (id, updates) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      },
      
      moveWidget: (id, position) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, position } : w
          ),
        }));
      },
      
      resizeWidget: (id, size) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, size } : w
          ),
        }));
      },
      
      reorderWidgets: (startIndex, endIndex) => {
        set((state) => {
          const widgets = [...state.widgets];
          const [removed] = widgets.splice(startIndex, 1);
          widgets.splice(endIndex, 0, removed);
          return { widgets };
        });
      },
      
      // Data management
      setStockData: (symbol, data) => {
        set((state) => ({
          stockData: { ...state.stockData, [symbol]: data },
        }));
      },
      
      setMarketData: (data) => {
        set({ marketData: data });
      },
      
      setChartData: (key, data) => {
        set((state) => ({
          chartData: { ...state.chartData, [key]: data },
        }));
      },
      
      updateWidgetData: (widgetId, data) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === widgetId ? { ...w, data, lastUpdated: new Date().toISOString() } : w
          ),
        }));
      },
      
      clearCache: () => {
        set({
          stockData: {},
          marketData: null,
          chartData: {},
          apiCache: {},
        });
      },
      
      // UI actions
      setTheme: (theme) => {
        set({ theme });
        if (typeof window !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },
      
      setAutoRefresh: (autoRefresh) => set({ autoRefresh }),
      setRefreshInterval: (refreshInterval) => set({ refreshInterval }),
      setSelectedWidget: (selectedWidget) => set({ selectedWidget }),
      setShowAddWidget: (showAddWidget) => set({ showAddWidget }),
      setDraggedWidget: (draggedWidget) => set({ draggedWidget }),
      setLoading: (isLoading) => set({ isLoading }),
      
      // Dashboard management
      exportDashboard: () => {
        const state = get();
        const config: DashboardLayout = {
          widgets: state.widgets,
          theme: state.theme,
          autoRefresh: state.autoRefresh,
          refreshInterval: state.refreshInterval,
        };
        return JSON.stringify(config, null, 2);
      },
      
      importDashboard: (config) => {
        try {
          const parsed: DashboardLayout = JSON.parse(config);
          set({
            widgets: parsed.widgets || [],
            theme: parsed.theme || 'light',
            autoRefresh: parsed.autoRefresh ?? true,
            refreshInterval: parsed.refreshInterval || 30,
          });
        } catch (error) {
          // Silently handle import errors
        }
      },
      
      resetDashboard: () => {
        set({
          widgets: [],
          selectedWidget: null,
          showAddWidget: false,
          draggedWidget: null,
        });
      },
    }),
    {
      name: 'finboard-dashboard',
      partialize: (state) => ({
        widgets: state.widgets,
        theme: state.theme,
        autoRefresh: state.autoRefresh,
        refreshInterval: state.refreshInterval,
      }),
    }
  )
);
