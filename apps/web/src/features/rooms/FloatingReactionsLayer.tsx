'use client';

import * as React from 'react';

export interface FloatingReaction {
  id: string;
  emoji: string;
  leftPercent: number;
}

// Global Reaction Emitter Bus
type ReactionListener = (emoji: string) => void;
class ReactionEventBus {
  private listeners: ReactionListener[] = [];

  subscribe(listener: ReactionListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(emoji: string) {
    this.listeners.forEach((l) => l(emoji));
  }
}

export const reactionBus = new ReactionEventBus();

export const FloatingReactionsLayer: React.FC = () => {
  const [reactions, setReactions] = React.useState<FloatingReaction[]>([]);

  React.useEffect(() => {
    const unsubscribe = reactionBus.subscribe((emoji) => {
      const newReaction: FloatingReaction = {
        id: Math.random().toString(),
        emoji,
        leftPercent: 35 + Math.random() * 30, // Centered random spread
      };

      setReactions((prev) => [...prev, newReaction]);

      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 2500);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
      {reactions.map((r) => (
        <div
          key={r.id}
          style={{ left: `${r.leftPercent}%` }}
          className="absolute bottom-20 text-3xl sm:text-4xl animate-float-up pointer-events-none filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)]"
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
};
