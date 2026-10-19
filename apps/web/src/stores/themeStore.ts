import { create } from 'zustand';

export type MivoThemeId =
  | 'crimson-cream'
  | 'midnight'
  | 'titanium'
  | 'cyber'
  | 'light-frost'
  | 'solar-warm';

export interface MivoThemeMeta {
  id: MivoThemeId;
  name: string;
  category: 'dark' | 'light';
  description: string;
  colors: {
    bg: string;
    sidebar: string;
    card: string;
    accent: string;
    text: string;
  };
}

export const MIVO_THEMES: MivoThemeMeta[] = [
  {
    id: 'crimson-cream',
    name: 'Velvet Crimson & Silk Cream',
    category: 'light',
    description: 'Sophisticated warm cream canvas with velvet crimson red, obsidian black typography, and radiant accents.',
    colors: {
      bg: '#FAF6F0',
      sidebar: '#F4ECE1',
      card: '#FFFFFF',
      accent: '#DC2626',
      text: '#111827',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight OLED',
    category: 'dark',
    description: 'Deep cosmic OLED black with Apple Indigo and vibrant neon violet accents.',
    colors: {
      bg: '#06070B',
      sidebar: '#090B12',
      card: '#0F121C',
      accent: '#5E5CE6',
      text: '#FFFFFF',
    },
  },
  {
    id: 'titanium',
    name: 'Apple Titanium',
    category: 'dark',
    description: 'Frosted gunmetal slate with Apple Cyan and brushed metallic glass.',
    colors: {
      bg: '#12151E',
      sidebar: '#161A26',
      card: '#1E2333',
      accent: '#64D2FF',
      text: '#FFFFFF',
    },
  },
  {
    id: 'cyber',
    name: 'Cyberpunk Neon',
    category: 'dark',
    description: 'Ultraviolet dark chassis with electric magenta and neon cyan illumination.',
    colors: {
      bg: '#080716',
      sidebar: '#0D0B24',
      card: '#17133B',
      accent: '#FF375F',
      text: '#FFFFFF',
    },
  },
  {
    id: 'light-frost',
    name: 'Apple Aurora Frost',
    category: 'light',
    description: 'Crisp bright frosted glass with high-contrast text and vivid iOS 18 accents.',
    colors: {
      bg: '#F4F5F9',
      sidebar: '#EAECEF',
      card: '#FFFFFF',
      accent: '#0A84FF',
      text: '#0B0C10',
    },
  },
  {
    id: 'solar-warm',
    name: 'Solarized Amber',
    category: 'light',
    description: 'Warm paper cream bright mode with obsidian typography and amber glows.',
    colors: {
      bg: '#F8F7F2',
      sidebar: '#EFECE4',
      card: '#FFFFFF',
      accent: '#FF9F0A',
      text: '#1A1814',
    },
  },
];

interface ThemeState {
  currentTheme: MivoThemeId;
  setTheme: (theme: MivoThemeId) => void;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: 'crimson-cream',
  isThemeModalOpen: false,
  setIsThemeModalOpen: (open) => set({ isThemeModalOpen: open }),
  setTheme: (theme: MivoThemeId) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mivo_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'crimson-cream' || theme === 'light-frost' || theme === 'solar-warm') {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark-mode');
      } else {
        document.documentElement.classList.add('dark-mode');
        document.documentElement.classList.remove('light-mode');
      }
    }
    set({ currentTheme: theme });
  },
}));
