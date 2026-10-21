/**
 * Module: Theme Context & Hook
 * Responsibility: Provides reactive theme switching (light/dark/system), automatically
 * syncing with system appearance and supplying colors, spacing, radius, and typography tokens.
 */

import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ThemeColors } from './colors';
import { spacing, Spacing } from './spacing';
import { typography, Typography } from './typography';
import { radius, Radius } from './radius';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  colors: ThemeColors;
  spacing: Spacing;
  typography: Typography;
  radius: Radius;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const value = useMemo<Theme>(() => {
    return {
      colors: isDark ? darkColors : lightColors,
      spacing,
      typography,
      radius,
      isDark,
      themeMode,
      setThemeMode,
    };
  }, [isDark, themeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
