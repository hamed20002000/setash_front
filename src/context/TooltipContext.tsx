import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Tooltip, TooltipProps } from '@mui/material';

const TOOLTIP_ENABLED_KEY = 'isTooltipEnabled';
interface TooltipContextType {
  isTooltipGloballyEnabled: boolean;
  toggleTooltipGlobal: (enabled: boolean) => void;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

interface TooltipProviderProps {
  children: ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  const [isTooltipGloballyEnabled, setIsTooltipGloballyEnabled] = useState<boolean>(() => {
    const savedState = localStorage.getItem(TOOLTIP_ENABLED_KEY);
    return savedState === 'true' || savedState === null;
  });

  const toggleTooltipGlobal = (enabled: boolean) => {
    setIsTooltipGloballyEnabled(enabled);
    localStorage.setItem(TOOLTIP_ENABLED_KEY, enabled.toString());
  };

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === TOOLTIP_ENABLED_KEY) {
        setIsTooltipGloballyEnabled(event.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const contextValue: TooltipContextType = {
    isTooltipGloballyEnabled,
    toggleTooltipGlobal,
  };

  return (
    <TooltipContext.Provider value={contextValue}>
      {children}
    </TooltipContext.Provider>
  );
};

export const useTooltip = () => {
  const context = useContext(TooltipContext);
  if (context === undefined) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return context;
};

export const CustomTooltip: React.FC<TooltipProps> = ({ children, ...props }) => {
  const { isTooltipGloballyEnabled } = useTooltip();

  if (!isTooltipGloballyEnabled) {
    return <>{children}</>;
  }
  return <Tooltip {...props}>{children}</Tooltip>;
};