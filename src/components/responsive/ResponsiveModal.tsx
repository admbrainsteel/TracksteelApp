
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useMobileResponsive, getModalResponsiveClasses } from '@/hooks/useMobileResponsive';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ResponsiveModal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children, 
  footer,
  size = 'md' 
}: ResponsiveModalProps) {
  const { isMobile } = useMobileResponsive();
  const modalClasses = getModalResponsiveClasses(isMobile);

  // Mobile: Use Sheet for better mobile experience
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col">
          <SheetHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <SheetTitle className="text-lg font-semibold text-left">
                  {title}
                </SheetTitle>
                {description && (
                  <SheetDescription className="text-sm text-muted-foreground text-left mt-1">
                    {description}
                  </SheetDescription>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="touch-target"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
          
          {footer && (
            <div className="shrink-0 p-4 border-t border-border">
              <div className="flex flex-col gap-3">
                {footer}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop/Tablet: Use Dialog
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${sizeClasses[size]} max-h-[90vh] flex flex-col`}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-semibold">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {children}
        </div>
        
        {footer && (
          <div className="shrink-0 pt-4 border-t border-border">
            <div className="flex justify-end gap-3">
              {footer}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
