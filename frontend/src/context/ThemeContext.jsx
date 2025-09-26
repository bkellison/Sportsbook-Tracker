import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes, DEFAULT_THEME } from '../styles/themes';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Initialize with a default theme immediately to prevent undefined issues
  const getInitialTheme = () => {
    try {
      const savedTheme = localStorage.getItem('sportsbookTheme');
      if (savedTheme && themes[savedTheme]) {
        return savedTheme;
      }
    } catch (error) {
      console.warn('Could not access localStorage:', error);
    }
    return DEFAULT_THEME; // Use your DEFAULT_THEME constant
  };

  const getInitialGlowLines = () => {
    try {
      const savedGlowLines = localStorage.getItem('glowLinesEnabled');
      return savedGlowLines !== null ? savedGlowLines === 'true' : true;
    } catch (error) {
      console.warn('Could not access localStorage:', error);
    }
    return true;
  };

  const [currentThemeKey, setCurrentThemeKey] = useState(getInitialTheme);
  const [glowLinesEnabled, setGlowLinesEnabled] = useState(getInitialGlowLines);

  // Always ensure we have a valid theme object
  const currentTheme = themes[currentThemeKey] || themes[DEFAULT_THEME];

  const changeTheme = (themeKey) => {
    if (themes[themeKey]) {
      setCurrentThemeKey(themeKey);
      try {
        localStorage.setItem('sportsbookTheme', themeKey);
      } catch (error) {
        console.warn('Could not save theme to localStorage:', error);
      }
    }
  };

  const toggleGlowLines = (enabled) => {
    setGlowLinesEnabled(enabled);
    try {
      localStorage.setItem('glowLinesEnabled', enabled.toString());
    } catch (error) {
      console.warn('Could not save glow lines setting to localStorage:', error);
    }
  };

  const value = {
    currentTheme, // This matches your themes.js structure
    currentThemeKey,
    glowLinesEnabled,
    changeTheme,
    toggleGlowLines,
    themes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};