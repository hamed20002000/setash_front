// src/context/LayoutContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';

// 1. تعریف Interface برای نوع حالت Layout
interface LayoutSettings {
  menuMode: 'Yatay' | 'Dikey'; // 'Yatay' برای افقی، 'Dikey' برای عمودی
  // اگر تنظیمات دیگری هم برای Layout دارید، اینجا اضافه کنید.
  // مثلاً: isSidebarOpen: boolean; themeVariant: 'light' | 'dark';
}

// 2. تعریف Interface برای نوع Context Value
interface LayoutContextType {
  settings: LayoutSettings;
  setMenuMode: (mode: 'Yatay' | 'Dikey') => void;
  // اگر توابع دیگری برای تغییر تنظیمات دارید، اینجا اضافه کنید.
}

// 3. ایجاد Context با مقدار پیش‌فرض undefined
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

// 4. تعریف Props برای Provider
interface LayoutProviderProps {
  children: ReactNode;
}

// 5. کامپوننت LayoutProvider
export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  // 6. لود کردن تنظیمات از localStorage یا استفاده از مقدار پیش‌فرض
  const [settings, setSettings] = useState<LayoutSettings>(() => {
    try {
      const storedSettings = localStorage.getItem('appLayoutSettings');
      // مقدار پیش‌فرض menuMode شما اینجا تعیین می‌شود.
      // بر اساس تصویری که فرستادید، به نظر می‌رسد 'Yatay' حالت مورد علاقه شماست.
      return storedSettings ? JSON.parse(storedSettings) : { menuMode: 'Yatay' }; 
    } catch (error) {
      console.error("Failed to parse layout settings from localStorage", error);
      return { menuMode: 'Yatay' }; // مقدار پیش‌فرض در صورت خطا
    }
  });

  // 7. ذخیره تنظیمات در localStorage هر زمان که تغییر کنند
  useEffect(() => {
    try {
      localStorage.setItem('appLayoutSettings', JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save layout settings to localStorage", error);
    }
  }, [settings]); // وقتی settings تغییر کند، این useEffect اجرا می‌شود.

  // 8. تابع برای تغییر حالت منو
  const setMenuMode = useCallback((mode: 'Yatay' | 'Dikey') => {
    setSettings(prevSettings => ({
      ...prevSettings,
      menuMode: mode,
    }));
  }, []);

  // 9. مقدار Context برای Provider
  const layoutContextValue: LayoutContextType = {
    settings,
    setMenuMode,
  };

  return (
    <LayoutContext.Provider value={layoutContextValue}>
      {children}
    </LayoutContext.Provider>
  );
};

// 10. هوک کاستوم برای استفاده از Context
export const useLayoutSettings = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayoutSettings must be used within a LayoutProvider');
  }
  return context;
};