
import React from 'react';
import { ChevronLeft, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useMobileResponsive } from '@/hooks/useMobileResponsive';

interface MobileNavigationProps {
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function MobileNavigation({ title, onBack, actions, children }: MobileNavigationProps) {
  const { isMobile } = useMobileResponsive();

  if (!isMobile) {
    return (
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="touch-target"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {actions && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="touch-target">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col gap-4 mt-8">
                  {actions}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
      
      {children && (
        <div className="px-4 pb-4 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}
