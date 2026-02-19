'use client';

import * as React from 'react';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from './createEmotionCache';
import { useServerInsertedHTML } from 'next/navigation';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

const getDesignTokens = (mode: PaletteMode) => ({
  typography: {
    fontSize: 13,
    fontFamily: 'Helvetica Neue, Arial, sans-serif',
  },
  components: {
    MuiToolbar: {
      styleOverrides: {
        dense: {
          height: 70,
          minHeight: 70,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        disableElevation: true,
        root: {
          boxShadow: 'none',
          borderRadius: 0,
        },
        text: {
          borderBottom: '1px solid rgba(0, 0, 0, 0)',
          marginBottom: '-1px',
          transition: '0.4s ease border-bottom',
        },
        contained: {
          backgroundColor: mode === 'light' ? 'black' : 'white',
          color: mode === 'light' ? 'white' : 'black',
          ':hover': {
            boxShadow: 'none',
            backgroundColor: mode === 'light' ? '#cacaca' : '#333333',
          },
        },
        outlined: {
          color: mode === 'light' ? 'black' : 'white',
          border: `1px solid ${mode === 'light' ? 'white' : 'black'}`,
          ':hover': {
            backgroundColor: mode === 'light' ? '#1e1e1eff' : '#e0e0e0',
            color: mode === 'light' ? 'white' : 'black',
            border: `1px solid ${mode === 'light' ? 'white' : 'black'}`,
          },
        },
      },
    },
  },
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#ffffff' : '#000000',
    },
    secondary: {
      main: mode === 'light' ? '#000000' : '#ffffff',
    },
    text: {
      primary: mode === 'light' ? '#000000' : '#ffffff',
    },
    background: {
      default: mode === 'light' ? '#ffffff' : '#121212',
      paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
    },
  },
});

export const ThemeContext = React.createContext({
  toggleTheme: () => {},
  mode: 'light' as PaletteMode,
});

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cache] = React.useState(() => createEmotionCache());
  const [mode, setMode] = React.useState<PaletteMode>('light');

  React.useEffect(() => {
    const savedMode = localStorage.getItem('themeMode') as PaletteMode;
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  // Aplicar/remover clase 'dark' al elemento html
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (mode === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [mode]);

  const toggleTheme = React.useCallback(() => {
    setMode((prevMode: string) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  }, []);

  const theme = React.useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  useServerInsertedHTML(() => {
    const tags = (cache.sheet as any)?.tags ?? [];
    if (tags.length === 0) return null;
    const html = tags.map((t: any) => t.textContent).join('');
    return (
      <style
        key="emotion-server-side"
        data-emotion={`${cache.key}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeContext.Provider value={{ toggleTheme, mode }}>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </ThemeContext.Provider>
    </CacheProvider>
  );
}
