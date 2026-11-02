'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type WorkspaceTheme = 'light' | 'tech';
const storageKey = 'treasure-workspace-theme';
const ThemeContext = createContext<{
  theme: WorkspaceTheme;
  setTheme: (theme: WorkspaceTheme) => void;
}>({ theme: 'light', setTheme: () => {} });

function applyTheme(theme: WorkspaceTheme) {
  document.documentElement.dataset.uiTheme = theme;
  document.documentElement.classList.toggle('dark', theme === 'tech');
  document.documentElement.style.colorScheme =
    theme === 'tech' ? 'dark' : 'light';
}

export default function WorkspaceThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, updateTheme] = useState<WorkspaceTheme>('light');
  useEffect(() => {
    let initial: WorkspaceTheme = 'light';
    try {
      initial = localStorage.getItem(storageKey) === 'tech' ? 'tech' : 'light';
    } catch {}
    updateTheme(initial);
    applyTheme(initial);
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      const next = event.newValue === 'tech' ? 'tech' : 'light';
      updateTheme(next);
      applyTheme(next);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function setTheme(next: WorkspaceTheme) {
    updateTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {}
  }
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useWorkspaceTheme = () => useContext(ThemeContext);
