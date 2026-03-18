
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMobileResponsive, getResponsiveClasses } from '@/hooks/useMobileResponsive';

interface ResponsiveFormProps {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  loading?: boolean;
}

export function ResponsiveForm({ 
  title, 
  children, 
  actions, 
  onSubmit,
  loading = false 
}: ResponsiveFormProps) {
  const { isMobile, isTablet } = useMobileResponsive();
  const classes = getResponsiveClasses(isMobile, isTablet);

  return (
    <Card className={`${classes.card} w-full`}>
      {title && (
        <CardHeader className={isMobile ? 'mobile-card-header' : ''}>
          <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>
            {title}
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className={classes.container}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className={`form-grid ${classes.grid} ${classes.spacing}`}>
            {children}
          </div>
          
          {actions && (
            <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-end gap-3'} pt-4 border-t border-border`}>
              {loading ? (
                <div className="flex items-center justify-center p-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              ) : (
                actions
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// Responsive form field wrapper
interface ResponsiveFormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
}

export function ResponsiveFormField({ 
  label, 
  children, 
  required = false, 
  error,
  className = '' 
}: ResponsiveFormFieldProps) {
  const { isMobile } = useMobileResponsive();
  
  return (
    <div className={`form-field ${className}`}>
      <label className={`form-label ${isMobile ? 'text-sm' : 'text-base'}`}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <div className="mt-1">
        {children}
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
