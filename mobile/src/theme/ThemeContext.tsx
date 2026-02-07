import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeColors, ColorScheme } from './colors';

const THEME_STORAGE_KEY = '@seeme_theme';

interface ThemeContextType {
  theme: ColorScheme;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (theme: ColorScheme | 'system') => void;
  toggleTheme: () => void;
  gradientColors: readonly string[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ColorScheme | 'system'>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine actual theme based on preference
  const theme: ColorScheme = themePreference === 'system'
    ? (systemColorScheme || 'light')
    : themePreference;

  const isDark = theme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const gradientColors = colors.chat.ownBubble;

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themePreference === 'system') {
        // Theme will update automatically through systemColorScheme
      }
    });

    return () => subscription.remove();
  }, [themePreference]);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        setThemePreference(saved as ColorScheme | 'system');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setTheme = async (newTheme: ColorScheme | 'system') => {
    setThemePreference(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        isDark,
        setTheme,
        toggleTheme,
        gradientColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default light theme if provider is not found
    return {
      theme: 'light',
      colors: Colors.light,
      isDark: false,
      setTheme: () => {},
      toggleTheme: () => {},
      gradientColors: Colors.light.chat.ownBubble,
    };
  }
  return context;
}

export { Colors };
