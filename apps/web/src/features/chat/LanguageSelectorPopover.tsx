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
        className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.09] text-xs font-semibold text-white transition-all cursor-pointer shadow-sm hover:scale-102"
      >
        <span className="text-sm">{activeLang.flag}</span>
        <span className="text-white/90">{activeLang.name}</span>
        <span className="text-[10px] text-white/40 font-mono uppercase">({activeLang.code})</span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      {/* Luxury Glass Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-[18px] bg-[#0E111C]/95 border border-white/[0.12] backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.8)] py-1.5 z-50 animate-slide-up overflow-hidden ring-1 ring-white/[0.06]">
          {label && (
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40 border-b border-white/[0.06] mb-1">
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
                      ? 'bg-gradient-to-r from-[#5E5CE6] to-[#0A84FF] text-white font-bold shadow-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base flex-shrink-0">{lang.flag}</span>
                    <div className="text-left min-w-0">
                      <div className="font-semibold truncate">{lang.name}</div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-white/40'}`}>
                        {lang.nativeName}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
