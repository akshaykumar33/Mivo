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
    if (saved && ['midnight', 'titanium', 'cyber', 'light-frost', 'solar-warm'].includes(saved)) {
      setTheme(saved);
    }
  }, [setTheme]);

  if (!isThemeModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={() => setIsThemeModalOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-[#0C0F17]/95 border border-white/[0.12] p-6 shadow-2xl backdrop-blur-2xl text-white relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-gradient-to-r from-violet-600/30 via-indigo-500/20 to-cyan-500/30 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5E5CE6] to-[#BF5AF2] flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-white tracking-tight flex items-center gap-2">
                <span>Visual Themes & Aesthetics</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.08] text-violet-300 border border-white/[0.1]">
                  Multi-Theme Engine
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Choose between OLED dark palettes, cyberpunk neon, or ultra-crisp bright modes.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsThemeModalOpen(false)}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
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
                    ? 'border-[#5E5CE6] bg-white/[0.08] ring-2 ring-[#5E5CE6]/40 shadow-[0_8px_24px_rgba(94,92,230,0.25)]'
                    : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15]'
                }`}
              >
                {/* Active Selection Checkmark */}
                {isActive && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#5E5CE6] flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                )}

                {/* Theme Header & Type Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm font-bold text-white font-display">
                    {t.name}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isLight
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {isLight ? <Sun className="w-2.5 h-2.5" /> : <Moon className="w-2.5 h-2.5" />}
                    <span>{isLight ? 'Bright' : 'Dark'}</span>
                  </span>
                </div>

                <p className="text-xs text-white/50 mb-3.5 line-clamp-2 leading-relaxed">
                  {t.description}
                </p>

                {/* Mini Preview Color Bar */}
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 border border-white/[0.06] mt-auto">
                  <span className="text-[10px] font-mono text-white/40 mr-1">Palette:</span>
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
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08] text-xs text-white/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Theme persists automatically in your local browser settings</span>
          </div>
          <button
            onClick={() => setIsThemeModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
