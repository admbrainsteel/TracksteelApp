
import React from 'react';
import { MobileNavigation } from './MobileNavigation';
import { useMobileResponsive, getResponsiveClasses } from '@/hooks/useMobileResponsive';

interface ResponsiveLayoutProps {
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveLayout({ 
  title, 
  onBack, 
  actions, 
  filters, 
  children,
  className = '' 
}: ResponsiveLayoutProps) {
  const { isMobile, isTablet } = useMobileResponsive();
  const classes = getResponsiveClasses(isMobile, isTablet);

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <MobileNavigation 
        title={title} 
        onBack={onBack} 
        actions={actions}
      >
        {filters}
      </MobileNavigation>
      
      <main className={`${classes.container} ${classes.spacing}`}>
        {children}
      </main>
    </div>
  );
}

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  className = '' 
}: ResponsiveGridProps) {
  const { isMobile, isTablet } = useMobileResponsive();
  
  const gridCols = isMobile 
    ? `grid-cols-${cols.mobile}` 
    : isTablet 
      ? `grid-cols-${cols.tablet}` 
      : `grid-cols-${cols.desktop}`;
  
  const gap = isMobile ? 'gap-3' : isTablet ? 'gap-4' : 'gap-6';
  
  return (
    <div className={`grid ${gridCols} ${gap} ${className}`}>
      {children}
    </div>
  );
}

// Responsive tabs component
interface ResponsiveTabsProps {
  tabs: {
    id: string;
    label: string;
    content: React.ReactNode;
  }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function ResponsiveTabs({ 
  tabs, 
  activeTab, 
  onTabChange,
  className = '' 
}: ResponsiveTabsProps) {
  const { isMobile } = useMobileResponsive();
  
  return (
    <div className={className}>
      <div className={`${isMobile ? 'flex flex-col gap-1' : 'flex gap-1'} border-b border-border`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-4 py-3 text-sm font-medium transition-colors touch-target
              ${isMobile ? 'w-full justify-start' : 'whitespace-nowrap'}
              ${activeTab === tab.id 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="mt-4">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}
