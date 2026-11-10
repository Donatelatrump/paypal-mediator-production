'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={cn('transition-all duration-200', 'ml-64 min-h-screen')}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}