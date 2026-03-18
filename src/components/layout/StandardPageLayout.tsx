
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StandardPageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  actions?: React.ReactNode;
  className?: string;
}

export const StandardPageLayout: React.FC<StandardPageLayoutProps> = ({
  children,
  title,
  subtitle,
  badge,
  actions,
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-background p-4 sm:p-6 ${className}`}>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            {badge && (
              <Badge 
                variant={badge.variant || 'secondary'} 
                className="bg-muted text-muted-foreground border-border"
              >
                {badge.text}
              </Badge>
            )}
            {actions}
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
};
