'use client';

import * as React from 'react';
import { Heart, ThumbsUp, Flame, Sparkles, Smile, PartyPopper, Zap } from 'lucide-react';

export interface FloatingReaction {
  id: string;
  emoji: string;
  leftPercent: number;
}

export const FloatingReactionsLayer: React.FC = () => {
  const [reactions, setReactions] = React.useState<FloatingReaction[]>([]);

  const triggerReaction = (emoji: string) => {
    const newReaction: FloatingReaction = {
      id: Math.random().toString(),
      emoji,
      leftPercent: 30 + Math.random() * 40, // Centered random spread
    };

    setReactions((prev) => [...prev, newReaction]);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);
  };

  const reactionEmojis = ['❤️', '👏', '🔥', '🎉', '👍', '😂', '🚀', '💯'];

  return (
    <>
      {/* Floating Particles Area */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
        {reactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.leftPercent}%` }}
            className="absolute bottom-16 text-3xl sm:text-4xl animate-float-up pointer-events-none filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Floating Quick Reaction Pill (Telegram / Zoom style) */}
      <div className="absolute bottom-24 right-8 z-30 flex items-center gap-1 p-1.5 rounded-[20px] bg-[#07090F]/85 border border-white/[0.12] backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.06] pointer-events-auto select-none">
        {reactionEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => triggerReaction(emoji)}
            className="p-1.5 sm:p-2 rounded-[14px] hover:bg-white/[0.1] hover:scale-125 active:scale-95 transition-all duration-150 text-base sm:text-lg cursor-pointer"
            title={`Send ${emoji} Reaction`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};
