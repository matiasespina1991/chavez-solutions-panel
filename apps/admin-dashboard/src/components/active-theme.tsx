'use client';

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

const COOKIE_NAME = 'active_theme';
const DEFAULT_THEME = 'default';
const AUTO_SCALE_MIN_HEIGHT = 900;
const AUTO_THEME_MAP: Record<string, { base: string; scaled: string }> = {
  auto: { base: 'default', scaled: 'default-scaled' },
  'auto-default': { base: 'default', scaled: 'default-scaled' },
  'auto-gray': { base: 'gray', scaled: 'gray-scaled' },
  'auto-blue': { base: 'blue', scaled: 'blue-scaled' }
};

function setThemeCookie(theme: string) {
  if (typeof window === 'undefined') return;

  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`;
}

type ThemeContextType = {
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ActiveThemeProvider({
  children,
  initialTheme
}: {
  children: ReactNode;
  initialTheme?: string;
}) {
  const [activeTheme, setActiveTheme] = useState<string>(
    () => initialTheme || DEFAULT_THEME
  );
  const [resolvedTheme, setResolvedTheme] = useState<string>(activeTheme);

  useEffect(() => {
    setThemeCookie(activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateResolvedTheme = () => {
      if (!activeTheme.startsWith('auto')) {
        setResolvedTheme(activeTheme);
        return;
      }

      const mapping = AUTO_THEME_MAP[activeTheme] ?? AUTO_THEME_MAP.auto;
      const useScaled = window.innerHeight < AUTO_SCALE_MIN_HEIGHT;
      setResolvedTheme(useScaled ? mapping.scaled : mapping.base);
    };

    updateResolvedTheme();

    if (activeTheme.startsWith('auto')) {
      window.addEventListener('resize', updateResolvedTheme);
      return () => window.removeEventListener('resize', updateResolvedTheme);
    }
  }, [activeTheme]);

  useEffect(() => {
    Array.from(document.body.classList)
      .filter((className) => className.startsWith('theme-'))
      .forEach((className) => {
        document.body.classList.remove(className);
      });
    document.body.classList.add(`theme-${resolvedTheme}`);
    if (resolvedTheme.endsWith('-scaled')) {
      document.body.classList.add('theme-scaled');
    }
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ activeTheme, setActiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeConfig() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error(
      'useThemeConfig must be used within an ActiveThemeProvider'
    );
  }
  return context;
}
