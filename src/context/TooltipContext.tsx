import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Tooltip, TooltipProps } from '@mui/material';

// کلید برای ذخیره وضعیت Tooltip در localStorage
const TOOLTIP_ENABLED_KEY = 'isTooltipEnabled';

// تعریف نوع برای مقادیر Context
interface TooltipContextType {
  isTooltipGloballyEnabled: boolean;
  toggleTooltipGlobal: (enabled: boolean) => void;
}

// مقدار پیش‌فرض Context
const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

interface TooltipProviderProps {
  children: ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  // وضعیت Tooltip را از localStorage یا مقدار پیش‌فرض (true) بارگذاری کن
  const [isTooltipGloballyEnabled, setIsTooltipGloballyEnabled] = useState<boolean>(() => {
    const savedState = localStorage.getItem(TOOLTIP_ENABLED_KEY);
    return savedState === 'true' || savedState === null; // اگر ذخیره نشده بود یا "true" بود، فعال باشد
  });

  // تابعی برای تغییر وضعیت Tooltip در سطح گلوبال
  const toggleTooltipGlobal = (enabled: boolean) => {
    setIsTooltipGloballyEnabled(enabled);
    localStorage.setItem(TOOLTIP_ENABLED_KEY, enabled.toString());
  };

  // گوش دادن به تغییرات localStorage از تب‌های دیگر
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

// هوک سفارشی برای استفاده از TooltipContext
export const useTooltip = () => {
  const context = useContext(TooltipContext);
  if (context === undefined) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return context;
};

// **کامپوننت CustomTooltip برای استفاده در سراسر برنامه**
// این کامپوننت Tooltip استاندارد Material-UI را به صورت شرطی رندر می‌کند
export const CustomTooltip: React.FC<TooltipProps> = ({ children, ...props }) => {
  const { isTooltipGloballyEnabled } = useTooltip(); // وضعیت گلوبال را از Context بگیر

  if (!isTooltipGloballyEnabled) {
    return <>{children}</>; // اگر Tooltipها غیرفعال بودند، فقط فرزندان را رندر کن
  }
  return <Tooltip {...props}>{children}</Tooltip>; // در غیر این صورت، Tooltip را رندر کن
};