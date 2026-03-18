
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type IconStyleType = 'white' | 'themed' | 'colorful';

interface IconStyleContextType {
  iconStyle: IconStyleType;
  setIconStyle: (style: IconStyleType) => void;
}

const IconStyleContext = createContext<IconStyleContextType | undefined>(undefined);

interface IconStyleProviderProps {
  children: ReactNode;
}

export function IconStyleProvider({ children }: IconStyleProviderProps) {
  const [iconStyle, setIconStyle] = useState<IconStyleType>(() => {
    const saved = localStorage.getItem('icon-style') as IconStyleType;
    return saved || 'colorful'; // Default to colorful for the new design
  });

  const handleSetIconStyle = (style: IconStyleType) => {
    setIconStyle(style);
    localStorage.setItem('icon-style', style);
  };

  useEffect(() => {
    // Apply icon style to document root
    const root = document.documentElement;
    root.setAttribute('data-icon-style', iconStyle);
    
    // Remove previous icon style classes
    root.classList.remove('icon-style-white', 'icon-style-themed', 'icon-style-colorful');
    
    // Add current icon style class
    root.classList.add(`icon-style-${iconStyle}`);
  }, [iconStyle]);

  const value = {
    iconStyle,
    setIconStyle: handleSetIconStyle,
  };

  return (
    <IconStyleContext.Provider value={value}>
      {children}
    </IconStyleContext.Provider>
  );
}

export const useIconStyle = () => {
  const context = useContext(IconStyleContext);
  if (context === undefined) {
    throw new Error('useIconStyle must be used within an IconStyleProvider');
  }
  return context;
};
