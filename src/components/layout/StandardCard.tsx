
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StandardCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

export const StandardCard: React.FC<StandardCardProps> = ({
  children,
  title,
  subtitle,
  icon: Icon,
  actions,
  className = ''
}) => {
  return (
    <Card className={`bg-card border-border shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-card-foreground flex items-center gap-2 text-lg sm:text-xl">
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
            <div>
              {title}
              {subtitle && <p className="text-sm text-muted-foreground font-normal mt-1">{subtitle}</p>}
            </div>
          </CardTitle>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
};
