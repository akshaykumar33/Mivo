'use client';

import * as React from 'react';
import { SUPPORTED_LANGUAGES, LanguageOption } from '@/lib/translation-manager';
import { Globe, ChevronDown, Check } from 'lucide-react';

export interface LanguageSelectorPopoverProps {
  value: string;
  onChange: (langCode: string) => void;
  label?: string;
}

export const LanguageSelectorPopover: React.FC<LanguageSelectorPopoverProps> = ({
  value,
  onChange,
  label,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const activeLang = SUPPORTED_LANGUAGES.find((l) => l.code === value) || SUPPORTED_LANGUAGES[0];

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left select-none" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-[var(--bg-surface-0)] hover:bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer shadow-sm hover:scale-102"
      >
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-600 border border-red-500/20">{activeLang.code.toUpperCase()}</span>
        <span className="text-[var(--text-primary)]">{activeLang.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--text-primary)]' : ''}`} />
      </button>

      {/* Luxury Glass Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-[18px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.15)] py-1.5 z-50 animate-slide-up overflow-hidden ring-1 ring-black/[0.05]">
          {label && (
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-1">
              {label}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto px-1 space-y-0.5 scrollbar-thin">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === value;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    onChange(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white font-bold shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex-shrink-0 border ${isSelected ? 'bg-white/20 text-white border-white/30' : 'bg-black/5 text-[var(--text-muted)] border-black/10'}`}>
                      {lang.code.toUpperCase()}
                    </span>
                    <div className="text-left min-w-0">
                      <div className="font-semibold truncate">{lang.name}</div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                        {lang.nativeName}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-2 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
