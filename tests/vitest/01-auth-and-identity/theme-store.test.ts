import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, MIVO_THEMES, MivoThemeId } from '@/stores/themeStore';

describe('Theme Store & Multi-Theme Design Tokens', () => {
  beforeEach(() => {
    useThemeStore.setState({
      currentTheme: 'midnight',
      isThemeModalOpen: false,
    });
  });

  it('defines 6 curated high-contrast and OLED dark/light theme presets', () => {
    expect(MIVO_THEMES).toHaveLength(6);
    const themeIds = MIVO_THEMES.map((t) => t.id);

    expect(themeIds).toContain('crimson-cream');
    expect(themeIds).toContain('midnight');
    expect(themeIds).toContain('titanium');
    expect(themeIds).toContain('cyber');
    expect(themeIds).toContain('light-frost');
    expect(themeIds).toContain('solar-warm');

    const titanium = MIVO_THEMES.find((t) => t.id === 'titanium');
    expect(titanium?.name).toBe('Apple Titanium');
    expect(titanium?.category).toBe('dark');
  });

  it('switches themes and persists theme ID in state', () => {
    const store = useThemeStore.getState();
    expect(useThemeStore.getState().currentTheme).toBe('midnight');

    store.setTheme('titanium');
    expect(useThemeStore.getState().currentTheme).toBe('titanium');

    store.setTheme('cyber');
    expect(useThemeStore.getState().currentTheme).toBe('cyber');

    store.setTheme('crimson-cream');
    expect(useThemeStore.getState().currentTheme).toBe('crimson-cream');
  });

  it('manages theme modal visibility toggle', () => {
    const store = useThemeStore.getState();
    expect(useThemeStore.getState().isThemeModalOpen).toBe(false);

    store.setIsThemeModalOpen(true);
    expect(useThemeStore.getState().isThemeModalOpen).toBe(true);

    store.setIsThemeModalOpen(false);
    expect(useThemeStore.getState().isThemeModalOpen).toBe(false);
  });
});
