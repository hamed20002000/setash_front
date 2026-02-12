// src/context/LayoutContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';

interface LayoutSettings {
  menuMode: 'Yatay' | 'Dikey';
}

interface LayoutContextType {
  settings: LayoutSettings;
  setMenuMode: (mode: 'Yatay' | 'Dikey') => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<LayoutSettings>(() => {
    try {
      const storedSettings = localStorage.getItem('appLayoutSettings');
      return storedSettings ? JSON.parse(storedSettings) : { menuMode: 'Yatay' };
    } catch (error) {
      console.error("Failed to parse layout settings from localStorage", error);
      return { menuMode: 'Yatay' };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('appLayoutSettings', JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save layout settings to localStorage", error);
    }
  }, [settings]);
  const setMenuMode = useCallback((mode: 'Yatay' | 'Dikey') => {
    setSettings(prevSettings => ({
      ...prevSettings,
      menuMode: mode,
    }));
  }, []);

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

export const useLayoutSettings = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayoutSettings must be used within a LayoutProvider');
  }
  return context;
};