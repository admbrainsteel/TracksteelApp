
import { useState, useEffect } from 'react';

export interface MobileResponsiveConfig {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  touchSupport: boolean;
}

export function useMobileResponsive(): MobileResponsiveConfig {
  const [config, setConfig] = useState<MobileResponsiveConfig>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLandscape: false,
    screenWidth: 0,
    screenHeight: 0,
    touchSupport: false
  });

  useEffect(() => {
    const updateConfig = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setConfig({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isLandscape: width > height,
        screenWidth: width,
        screenHeight: height,
        touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0
      });
    };

    updateConfig();
    window.addEventListener('resize', updateConfig);
    window.addEventListener('orientationchange', updateConfig);

    return () => {
      window.removeEventListener('resize', updateConfig);
      window.removeEventListener('orientationchange', updateConfig);
    };
  }, []);

  return config;
}

// Utility functions for responsive design
export const getResponsiveClasses = (mobile: boolean, tablet: boolean) => {
  return {
    container: mobile ? 'px-2 py-4' : tablet ? 'px-4 py-6' : 'px-6 py-8',
    grid: mobile ? 'grid-cols-1' : tablet ? 'grid-cols-2' : 'grid-cols-3',
    spacing: mobile ? 'gap-3' : tablet ? 'gap-4' : 'gap-6',
    text: mobile ? 'text-sm' : tablet ? 'text-base' : 'text-base',
    button: mobile ? 'w-full min-h-[44px]' : 'w-auto',
    card: mobile ? 'p-4' : tablet ? 'p-5' : 'p-6'
  };
};

export const getTableResponsiveClasses = (mobile: boolean) => {
  return {
    container: mobile ? 'mobile-table-scroll' : '',
    table: mobile ? 'min-w-full text-sm' : 'min-w-full',
    cell: mobile ? 'px-2 py-3' : 'px-4 py-3',
    header: mobile ? 'px-2 py-2 text-xs font-medium' : 'px-4 py-3 text-sm font-medium'
  };
};

export const getModalResponsiveClasses = (mobile: boolean) => {
  return {
    content: mobile ? 'mobile-modal' : 'max-w-2xl',
    header: mobile ? 'mobile-modal-header' : 'p-6 pb-4',
    body: mobile ? 'mobile-modal-content' : 'px-6 py-4',
    footer: mobile ? 'mobile-modal-footer' : 'p-6 pt-4 flex justify-end gap-3'
  };
};
