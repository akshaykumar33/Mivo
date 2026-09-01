'use client';

import * as React from 'react';
import { translationManager } from '@/lib/translation-manager';
import { Volume2, Globe, Sparkles } from 'lucide-react';

export interface SubtitleItem {
  id: string;
  speaker: string;
  text: string;
  translatedText?: string;
  timestamp: number;
}

export interface LiveSubtitlesOverlayProps {
  isEnabled: boolean;
  targetLang?: string;
}

export const LiveSubtitlesOverlay: React.FC<LiveSubtitlesOverlayProps> = ({
  isEnabled,
  targetLang = 'es',
}) => {
  const [currentSubtitle, setCurrentSubtitle] = React.useState<SubtitleItem | null>({
    id: 'initial',
    speaker: 'Dev Admin',
    text: 'WebRTC media and multilingual translation pipeline active.',
    translatedText: 'Canalización de medios WebRTC y traducción multilingüe activa.',
    timestamp: Date.now(),
  });

  React.useEffect(() => {
    if (!isEnabled) {
      setCurrentSubtitle(null);
      return;
    }

    const unsubscribe = translationManager.onSubtitle((data) => {
      setCurrentSubtitle({
        id: Date.now().toString(),
        speaker: data.speaker,
        text: data.text,
        translatedText: data.translatedText,
        timestamp: Date.now(),
      });
    });

    return () => {
      unsubscribe();
    };
  }, [isEnabled]);

  // Auto-dismiss after 7 seconds if no new speech
  React.useEffect(() => {
    if (!currentSubtitle) return;
    const timeout = setTimeout(() => {
      setCurrentSubtitle(null);
    }, 7000);
    return () => clearTimeout(timeout);
  }, [currentSubtitle]);

  if (!isEnabled || !currentSubtitle) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[90%] pointer-events-auto select-none animate-slide-up">
      <div className="p-3.5 sm:p-4 rounded-[22px] bg-[#07090F]/90 border border-white/[0.14] backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.08] flex items-start gap-3">
        <div className="w-8 h-8 rounded-[12px] bg-gradient-to-tr from-[#5E5CE6] to-[#0A84FF] flex items-center justify-center text-white flex-shrink-0 shadow-md">
          <Globe className="w-4 h-4 stroke-[2.2]" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64D2FF] font-display flex items-center gap-1.5">
              <span>{currentSubtitle.speaker}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/[0.08] text-white/60 font-mono">
                Live Subtitles (CC)
              </span>
            </span>

            {currentSubtitle.translatedText && (
              <button
                onClick={() =>
                  translationManager.speakText(
                    currentSubtitle.translatedText || currentSubtitle.text,
                    targetLang
                  )
                }
                className="p-1 rounded-lg text-white/50 hover:text-[#64D2FF] hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Listen to Live Spoken Audio (TTS)"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Original Verbal Speech */}
          <p className="text-xs text-white/80 leading-relaxed font-medium">
            "{currentSubtitle.text}"
          </p>

          {/* Translated Dual Subtitle */}
          {currentSubtitle.translatedText && (
            <p className="text-xs text-[#30D158] font-semibold leading-relaxed pt-0.5 border-t border-white/[0.05]">
              🌐 {currentSubtitle.translatedText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
