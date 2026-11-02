'use client';

import React from 'react';
import { useThemeStore, MIVO_THEMES, MivoThemeId } from '@/stores/themeStore';
import { Palette, Sun, Moon, Check, Sparkles, X } from 'lucide-react';

export const ThemeSwitcherModal: React.FC = () => {
  const { currentTheme, setTheme, isThemeModalOpen, setIsThemeModalOpen } = useThemeStore();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsThemeModalOpen(false);
      }
    };
    if (isThemeModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isThemeModalOpen, setIsThemeModalOpen]);

  // Load saved theme on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('mivo_theme') as MivoThemeId;
    if (saved && saved !== 'midnight' && ['crimson-cream', 'titanium', 'cyber', 'light-frost', 'solar-warm'].includes(saved)) {
      setTheme(saved);
    } else {
      setTheme('crimson-cream');
    }
  }, [setTheme]);

  if (!isThemeModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={() => setIsThemeModalOpen(false)}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] p-4 sm:p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] text-[var(--text-primary)] relative custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-[var(--border-subtle)] relative z-10 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[var(--brand-primary,#dc2626)] flex items-center justify-center shadow-sm flex-shrink-0">
              <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold font-display text-[var(--text-primary)] tracking-tight flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span>Visual Themes</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand-primary,#dc2626)]/10 text-[var(--brand-primary,#dc2626)] border border-[var(--brand-primary,#dc2626)]/20">
                  Multi-Theme Engine
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] truncate">
                Customize your appearance with Velvet Crimson, OLED dark, or light palettes.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsThemeModalOpen(false)}
            aria-label="Close dialog"
            className="p-1.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer flex-shrink-0"
            title="Close [ESC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-6 max-h-[60vh] overflow-y-auto pr-1">
          {MIVO_THEMES.map((t) => {
            const isActive = currentTheme === t.id;
            const isLight = t.category === 'light';

            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative group ${
                  isActive
                    ? 'border-[var(--brand-primary,#dc2626)] bg-[var(--bg-surface-2)] ring-2 ring-[var(--brand-primary,#dc2626)]/30 shadow-[0_4px_16px_rgba(220,38,38,0.12)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] hover:border-[var(--brand-primary,#dc2626)]/40'
                }`}
              >
                {/* Active Selection Checkmark */}
                {isActive && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--brand-primary,#dc2626)] flex items-center justify-center shadow-sm">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                )}

                {/* Theme Header & Type Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm font-bold text-[var(--text-primary)] font-display">
                    {t.name}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isLight
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {isLight ? <Sun className="w-2.5 h-2.5" /> : <Moon className="w-2.5 h-2.5" />}
                    <span>{isLight ? 'Bright' : 'Dark'}</span>
                  </span>
                </div>

                <p className="text-xs text-[var(--text-muted)] mb-3.5 line-clamp-2 leading-relaxed">
                  {t.description}
                </p>

                {/* Mini Preview Color Bar */}
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] mt-auto">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] mr-1">Palette:</span>
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: t.colors.bg }}
                    title={`Background: ${t.colors.bg}`}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: t.colors.sidebar }}
                    title={`Sidebar: ${t.colors.sidebar}`}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: t.colors.card }}
                    title={`Card: ${t.colors.card}`}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: t.colors.accent }}
                    title={`Accent: ${t.colors.accent}`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[var(--text-secondary)]">Theme persists automatically in your local browser settings</span>
          </div>
          <button
            onClick={() => setIsThemeModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
