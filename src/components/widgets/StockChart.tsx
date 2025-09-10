'use client';

import { useState, useEffect } from 'react';
import { Widget } from '@/types';
import { cachedFetch } from '@/services/apiCache';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { format } from 'date-fns';

interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickProps {
  payload: ChartDataPoint;
  x: number;
  y: number;
  width: number;
  height: number;
}

const Candlestick = ({ payload, x, y, width, height }: CandlestickProps) => {
  const { open, high, low, close } = payload;
  const isPositive = close >= open;
  const color = isPositive ? '#10b981' : '#ef4444';
  const bodyHeight = Math.abs(close - open);
  const bodyY = Math.min(open, close);
  
  return (
    <g>
      {/* Wick */}
      <line
        x1={x + width / 2}
        y1={high}
        x2={x + width / 2}
        y2={low}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body */}
      <rect
        x={x + width * 0.2}
        y={bodyY}
        width={width * 0.6}
        height={bodyHeight || 1}
        fill={isPositive ? color : 'transparent'}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

interface StockChartProps {
  widget: Widget;
  isLoading: boolean;
  error: string | null;
  onError: (error: string | null) => void;
  onLoading: (loading: boolean) => void;
}

export default function StockChart({ 
  widget, 
  isLoading, 
  error, 
  onError, 
  onLoading 
}: StockChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedInterval, setSelectedInterval] = useState('daily');
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
  
  // Extract API configuration from widget
  const apiUrl = widget.config?.apiUrl;
  const symbol = widget.config?.symbol || 'AAPL';

  useEffect(() => {
    loadChartData();
  }, [widget.lastUpdated, symbol, selectedInterval]);

  const loadChartData = async () => {
    if (!apiUrl) {
      onError('No API URL configured for chart data');
      return;
    }

    onLoading(true);
    onError(null);

    try {
      // Build API URL with interval parameter
      const url = new URL(apiUrl);
      url.searchParams.set('symbol', symbol);
      url.searchParams.set('interval', selectedInterval);
      
      // Add common stock API parameters
      if (selectedInterval === 'daily') {
        url.searchParams.set('function', 'TIME_SERIES_DAILY');
      } else if (selectedInterval === 'weekly') {
        url.searchParams.set('function', 'TIME_SERIES_WEEKLY');
      } else if (selectedInterval === 'monthly') {
        url.searchParams.set('function', 'TIME_SERIES_MONTHLY');
      } else {
        url.searchParams.set('function', 'TIME_SERIES_INTRADAY');
      }
      
      const response = await cachedFetch(
        url.toString(),
        {
          method: 'GET',
          headers: widget.config?.apiHeaders || {}
        },
        { ttl: 60000 } // 1 minute cache
      );
      
      // Transform response data to chart format
      const transformedData = transformApiDataToChart(response);
      setChartData(transformedData);
      
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      onLoading(false);
    }
  };
  
  const transformApiDataToChart = (data: any): ChartDataPoint[] => {
    if (!data) return [];
    
    // Use widget field mappings to extract data
    const fieldMappings = widget.config?.fieldMappings || [];
    
    // Helper function to get nested value from path
    const getNestedValue = (obj: any, path: string): any => {
      if (path.includes('[0]')) {
        // Handle array notation like "values[0].open"
        const parts = path.split('[0].');
        if (parts.length === 2) {
          const arrayPath = parts[0];
          const fieldPath = parts[1];
          const arrayData = obj[arrayPath];
          if (Array.isArray(arrayData) && arrayData.length > 0) {
            return arrayData.map((item: any) => ({
              item,
              value: fieldPath.split('.').reduce((curr, key) => curr?.[key], item)
            }));
          }
        }
      }
      return path.split('.').reduce((curr, key) => curr?.[key], obj);
    };
    
    // Find field mappings for OHLC and date
    const openField = fieldMappings.find(f => f.displayName.toLowerCase().includes('open') || f.apiField.toLowerCase().includes('open'));
    const highField = fieldMappings.find(f => f.displayName.toLowerCase().includes('high') || f.apiField.toLowerCase().includes('high'));
    const lowField = fieldMappings.find(f => f.displayName.toLowerCase().includes('low') || f.apiField.toLowerCase().includes('low'));
    const closeField = fieldMappings.find(f => f.displayName.toLowerCase().includes('close') || f.apiField.toLowerCase().includes('close'));
    const dateField = fieldMappings.find(f => f.type === 'date' || f.displayName.toLowerCase().includes('date') || f.apiField.toLowerCase().includes('date'));
    const volumeField = fieldMappings.find(f => f.displayName.toLowerCase().includes('volume') || f.apiField.toLowerCase().includes('volume'));
    
    // Handle array-based data (like Twelve Data API)
    if (data.values && Array.isArray(data.values)) {
      return data.values.slice(0, 100).map((item: any) => ({
        date: item.datetime || item.date || item.timestamp || item.time,
        open: parseFloat(item.open || 0),
        high: parseFloat(item.high || 0),
        low: parseFloat(item.low || 0),
        close: parseFloat(item.close || 0),
        volume: parseInt(item.volume || 0)
      })).reverse(); // Most recent first
    }
    
    // Handle field mapping based extraction for array data
    if (openField && openField.apiField.includes('[0]')) {
      const openData = getNestedValue(data, openField.apiField);
      if (Array.isArray(openData)) {
        return openData.slice(0, 100).map((entry: any) => {
          const item = entry.item;
          return {
            date: dateField ? getNestedValue({[dateField.apiField.split('[0].')[0]]: [item]}, dateField.apiField) || item.datetime || item.date : item.datetime || item.date,
            open: parseFloat(item.open || 0),
            high: parseFloat(item.high || 0),
            low: parseFloat(item.low || 0),
            close: parseFloat(item.close || 0),
            volume: parseInt(item.volume || 0)
          };
        }).reverse();
      }
    }
    
    // Handle Alpha Vantage format
    let timeSeries: any = {};
    if (data['Time Series (Daily)']) {
      timeSeries = data['Time Series (Daily)'];
    } else if (data['Weekly Time Series']) {
      timeSeries = data['Weekly Time Series'];
    } else if (data['Monthly Time Series']) {
      timeSeries = data['Monthly Time Series'];
    } else if (data['Time Series (5min)']) {
      timeSeries = data['Time Series (5min)'];
    } else if (data['Time Series (15min)']) {
      timeSeries = data['Time Series (15min)'];
    } else if (data['Time Series (30min)']) {
      timeSeries = data['Time Series (30min)'];
    } else if (data['Time Series (60min)']) {
      timeSeries = data['Time Series (60min)'];
    }
    // Generic format - direct array
    else if (Array.isArray(data)) {
      return data.slice(0, 100).map((item: any) => ({
        date: item.date || item.datetime || item.timestamp || item.time,
        open: parseFloat(item.open || item.o || 0),
        high: parseFloat(item.high || item.h || 0),
        low: parseFloat(item.low || item.l || 0),
        close: parseFloat(item.close || item.c || 0),
        volume: parseInt(item.volume || item.v || 0)
      }));
    }
    // Generic object format
    else if (typeof data === 'object') {
      timeSeries = data;
    }
    
    // Transform Alpha Vantage time series data
    if (Object.keys(timeSeries).length > 0) {
      return Object.entries(timeSeries)
        .slice(0, 100)
        .map(([date, values]: [string, any]) => ({
          date,
          open: parseFloat(values['1. open'] || values.open || values.o || 0),
          high: parseFloat(values['2. high'] || values.high || values.h || 0),
          low: parseFloat(values['3. low'] || values.low || values.l || 0),
          close: parseFloat(values['4. close'] || values.close || values.c || 0),
          volume: parseInt(values['5. volume'] || values.volume || values.v || 0)
        }))
        .reverse(); // Most recent first
    }
    
    return [];
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'volume') {
      return [value.toLocaleString(), 'Volume'];
    }
    return [
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value),
      name.charAt(0).toUpperCase() + name.slice(1)
    ];
  };

  const formatXAxisLabel = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      if (selectedInterval === 'daily') {
        return format(date, 'MMM dd');
      } else {
        return format(date, 'HH:mm');
      }
    } catch {
      return tickItem;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        No chart data available
      </div>
    );
  }

  const intervals = [
    { value: '5min', label: '5m' },
    { value: '15min', label: '15m' },
    { value: '30min', label: '30m' },
    { value: '60min', label: '1h' },
    { value: 'daily', label: '1D' },
    { value: 'weekly', label: '1W' },
    { value: 'monthly', label: '1M' },
  ];
  
  const chartTypes = [
    { value: 'line', label: 'Line' },
    { value: 'candlestick', label: 'Candlestick' },
  ];

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {symbol} Price Chart
        </h4>
        <div className="flex items-center space-x-2">
          {/* Chart Type Selector */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {chartTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setChartType(type.value as 'line' | 'candlestick')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === type.value
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
          
          {/* Interval Selector */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {intervals.map((interval) => (
              <button
                key={interval.value}
                onClick={() => setSelectedInterval(interval.value)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedInterval === interval.value
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {interval.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-gray-200 dark:stroke-gray-700" 
              />
              <XAxis 
                dataKey="date"
                tickFormatter={formatXAxisLabel}
                className="text-gray-600 dark:text-gray-400"
                fontSize={12}
              />
              <YAxis 
                domain={['dataMin - 1', 'dataMax + 1']}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                className="text-gray-600 dark:text-gray-400"
                fontSize={12}
              />
              <Tooltip
                formatter={formatTooltipValue}
                labelFormatter={(label) => {
                  try {
                    return format(new Date(label), 'PPpp');
                  } catch {
                    return label;
                  }
                }}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg)',
                  border: '1px solid var(--tooltip-border)',
                  borderRadius: '8px',
                  color: 'var(--tooltip-color)',
                }}
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#0ea5e9' }}
              />
            </LineChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-gray-200 dark:stroke-gray-700" 
              />
              <XAxis 
                dataKey="date"
                tickFormatter={formatXAxisLabel}
                className="text-gray-600 dark:text-gray-400"
                fontSize={12}
              />
              <YAxis 
                domain={['dataMin - 1', 'dataMax + 1']}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                className="text-gray-600 dark:text-gray-400"
                fontSize={12}
              />
              <Tooltip
                formatter={(value: any, name: any, props: any) => {
                  const data = props.payload;
                  if (String(name) === 'close') {
                    return [
                      <div key="candlestick-tooltip" className="space-y-1">
                        <div>Open: ${data.open?.toFixed(2)}</div>
                        <div>High: ${data.high?.toFixed(2)}</div>
                        <div>Low: ${data.low?.toFixed(2)}</div>
                        <div>Close: ${data.close?.toFixed(2)}</div>
                        {data.volume && <div>Volume: {data.volume.toLocaleString()}</div>}
                      </div>,
                      'OHLC'
                    ];
                  }
                  return formatTooltipValue(value as number, String(name));
                }}
                labelFormatter={(label) => {
                  try {
                    return format(new Date(label), 'PPpp');
                  } catch {
                    return label;
                  }
                }}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg)',
                  border: '1px solid var(--tooltip-border)',
                  borderRadius: '8px',
                  color: 'var(--tooltip-color)',
                }}
              />
              {/* Render candlesticks manually */}
              {chartData.map((point, index) => {
                const isPositive = point.close >= point.open;
                const color = isPositive ? '#10b981' : '#ef4444';
                return (
                  <ReferenceLine
                    key={index}
                    x={point.date}
                    stroke={color}
                    strokeWidth={2}
                  />
                );
              })}
              <Line
                type="monotone"
                dataKey="close"
                stroke="transparent"
                dot={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Stats */}
      <div className="grid grid-cols-4 gap-4 text-center">
        {chartData.length > 0 && (
          <>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Open</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                ${chartData[0]?.open.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">High</div>
              <div className="font-semibold text-green-600">
                ${Math.max(...chartData.map(d => d.high)).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Low</div>
              <div className="font-semibold text-red-600">
                ${Math.min(...chartData.map(d => d.low)).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Close</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                ${chartData[chartData.length - 1]?.close.toFixed(2)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
