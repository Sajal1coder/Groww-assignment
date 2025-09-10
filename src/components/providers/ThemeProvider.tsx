'use client';

import { useEffect } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useDashboardStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return <>{children}</>;
}
