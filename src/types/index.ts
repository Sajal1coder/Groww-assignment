export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

export interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Widget {
  id: string;
  type: 'table' | 'card' | 'chart' | 'watchlist' | 'gainers' | 'performance' | 'custom';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: WidgetConfig;
  data?: any;
  lastUpdated?: string;
  lastError?: {
    type: 'rate_limit' | 'network' | 'auth' | 'server' | 'timeout' | 'unknown';
    message: string;
    timestamp: number;
    retryAfter?: number;
    retryCount?: number;
  };
}

export interface WidgetConfig {
  symbol?: string;
  symbols?: string[];
  interval?: '1min' | '5min' | '15min' | '30min' | '60min' | 'daily' | 'weekly' | 'monthly';
  chartType?: 'line' | 'candlestick';
  cardType?: 'default' | 'watchlist' | 'market-gainers' | 'performance' | 'financial';
  fields?: string[];
  refreshInterval?: number; // in seconds
  pageSize?: number;
  filters?: Record<string, any>;
  apiUrl?: string;
  apiHeaders?: Record<string, string>;
  displayMode?: 'card' | 'table' | 'chart';
  selectedFields?: FieldMapping[];
  availableFields?: ApiField[];
  fieldMappings?: FieldMapping[];
  width?: number; // Widget width in pixels
  height?: number; // Widget height in pixels
  minWidth?: number;
  minHeight?: number;
}

export interface ApiField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  path: string;
  sample?: any;
}

export interface FieldMapping {
  apiField: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'currency' | 'percentage';
  format?: string;
}

export interface DashboardLayout {
  widgets: Widget[];
  theme: 'light' | 'dark';
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  rateLimitRemaining?: number;
}

export interface MarketData {
  gainers: StockData[];
  losers: StockData[];
  mostActive: StockData[];
  lastUpdated: string;
}

export type WidgetType = Widget['type'];

export interface DragItem {
  id: string;
  type: string;
  index: number;
}
