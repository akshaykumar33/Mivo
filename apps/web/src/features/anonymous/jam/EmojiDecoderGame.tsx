'use client';

import * as React from 'react';
import { Smile, Sparkles, Lightbulb, Trophy, ArrowRight, RotateCcw } from 'lucide-react';
import { sounds } from './soundEffects';

interface EmojiDecoderGameProps {
  sessionId: string;
  myPseudonym: string;
  partnerPseudonym: string;
  onScoreUpdate: (points: number, isSelf: boolean) => void;
  sendAction: (action: string, payload: any) => void;
  lastAction: { action: string; payload: any; timestamp: number } | null;
  botMode: boolean;
}

interface EmojiRiddle {
  id: string;
  emojis: string;
  answer: string;
  category: string;
  hint: string;
}

const EMOJI_RIDDLES: EmojiRiddle[] = [
  {
    id: 'e-1',
    emojis: '🦁 👑 🌅 🐗',
    answer: 'THE LION KING',
    category: 'Disney Classic 🎬',
    hint: 'Hakuna Matata in the Pride Lands',
  },
  {
    id: 'e-2',
    emojis: '🚢 🧊 💔 🌊',
    answer: 'TITANIC',
    category: 'Epic Romance 🎥',
    hint: 'I will never let go, Jack',
  },
  {
    id: 'e-3',
    emojis: '🧙‍♂️ 💍 🌋 🧝',
    answer: 'LORD OF THE RINGS',
    category: 'Fantasy Epic ⚔️',
    hint: 'One Ring to rule them all in Mordor',
  },
  {
    id: 'e-4',
    emojis: '🕶️ 💊 🐇 💻',
    answer: 'THE MATRIX',
    category: 'Sci-Fi Action 🤖',
    hint: 'Red pill or blue pill with Neo',
  },
  {
    id: 'e-5',
    emojis: '👻 🚫 🔫 🧪',
    answer: 'GHOSTBUSTERS',
    category: '80s Comedy 👻',
    hint: 'Who you gonna call?',
  },
  {
    id: 'e-6',
    emojis: '🦖 🏝️ 🚙 🧬',
    answer: 'JURASSIC PARK',
    category: 'Adventure 🦕',
    hint: 'Life finds a way on Isla Nublar',
  },
  {
    id: 'e-7',
    emojis: '🕷️ 🧑 🕸️ 🗽',
    answer: 'SPIDER-MAN',
    category: 'Superhero 🦸',
    hint: 'Friendly neighborhood web slinger',
  },
  {
    id: 'e-8',
    emojis: '🦇 🃏 🌃 🚓',
    answer: 'THE DARK KNIGHT',
    category: 'Blockbuster 🦇',
    hint: 'Why so serious in Gotham City?',
  },
];

export const EmojiDecoderGame: React.FC<EmojiDecoderGameProps> = ({
  sessionId,
  myPseudonym,
  partnerPseudonym,
  onScoreUpdate,
  sendAction,
  lastAction,
  botMode,
}) => {
  const [riddleIndex, setRiddleIndex] = React.useState(0);
  const [guess, setGuess] = React.useState('');
  const [solved, setSolved] = React.useState(false);
  const [winnerName, setWinnerName] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [showHint, setShowHint] = React.useState(false);

  const currentRiddle = EMOJI_RIDDLES[riddleIndex % EMOJI_RIDDLES.length];
  const target = currentRiddle.answer.toUpperCase();

  // Reset riddle
  const resetRiddle = (nextIdx?: number) => {
    const idx = nextIdx !== undefined ? nextIdx : (riddleIndex + 1) % EMOJI_RIDDLES.length;
    setRiddleIndex(idx);
    setGuess('');
    setSolved(false);
    setWinnerName(null);
    setFeedback(null);
    setShowHint(false);
  };

  // Sync remote actions
  React.useEffect(() => {
    if (!lastAction) return;
    const { action, payload } = lastAction;

    if (action === 'EMOJI_SOLVED') {
      setSolved(true);
      setWinnerName(payload.winnerName);
      setFeedback(`🎉 ${payload.winnerName} solved it! "${currentRiddle.answer}"`);
      sounds.playCorrect();
      onScoreUpdate(100, payload.winnerName === myPseudonym);
    } else if (action === 'EMOJI_NEXT') {
      resetRiddle(payload.nextIndex);
      sounds.playPop();
    }
  }, [lastAction, myPseudonym, currentRiddle.answer]);

  // Submit guess
  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || solved) return;

    const clean = guess.trim().toUpperCase();
    setGuess('');

    // Normalize for comparison
    const normClean = clean.replace(/[^A-Z0-9]/g, '');
    const normTarget = target.replace(/[^A-Z0-9]/g, '');

    if (normClean === normTarget) {
      setSolved(true);
      setWinnerName(myPseudonym);
      setFeedback(`🎉 You nailed it! "${currentRiddle.answer}" (+100 PTS)`);
      sounds.playCorrect();
      onScoreUpdate(100, true);

      sendAction('EMOJI_SOLVED', {
        winnerName: myPseudonym,
        answer: currentRiddle.answer,
      });
    } else {
      setFeedback(`❌ "${clean}" is incorrect. Try another guess!`);
      sounds.playBounce();
    }
  };

  // Next Riddle
  const handleNextRiddle = () => {
    const nextIdx = (riddleIndex + 1) % EMOJI_RIDDLES.length;
    resetRiddle(nextIdx);
    sendAction('EMOJI_NEXT', { nextIndex: nextIdx });
    sounds.playPop();
  };

  // Bot simulation
  React.useEffect(() => {
    if (!botMode || solved) return;

    const timer = setTimeout(() => {
      // 40% chance bot solves it after 8s
      if (Math.random() > 0.6) {
        setSolved(true);
        setWinnerName(partnerPseudonym);
        setFeedback(`🤖 ${partnerPseudonym} decoded it! "${currentRiddle.answer}"`);
        sounds.playCorrect();
        onScoreUpdate(100, false);
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [botMode, solved, riddleIndex, partnerPseudonym, currentRiddle.answer]);

  return (
    <div className="flex flex-col h-full bg-[#0B0A17] text-white p-3 sm:p-4 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-400 to-pink-500 flex items-center justify-center text-white shadow-md">
            <Smile className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold tracking-tight">
                Emoji Riddle Jam
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                {currentRiddle.category}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Decode the movie or title from the emoji sequence!
            </p>
          </div>
        </div>

        <button
          onClick={handleNextRiddle}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
          title="Next Riddle"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Next</span>
        </button>
      </div>

      {/* Main Riddle Container */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4 my-2">
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 shadow-2xl flex items-center justify-center tracking-widest text-4xl sm:text-5xl animate-pulse">
          {currentRiddle.emojis}
        </div>

        {/* Word Outline Mask */}
        <div className="flex items-center gap-2 flex-wrap justify-center font-mono text-xs sm:text-sm font-black text-gray-400">
          {target.split(' ').map((word, wIdx) => (
            <div key={wIdx} className="flex items-center gap-1">
              {word.split('').map((char, cIdx) => (
                <span
                  key={cIdx}
                  className="w-5 h-7 border-b-2 border-pink-400 flex items-center justify-center text-white bg-white/5 rounded-t-sm"
                >
                  {solved ? char : '_'}
                </span>
              ))}
              <span className="w-2" />
            </div>
          ))}
        </div>

        {/* Hint button */}
        {!showHint && !solved && (
          <button
            type="button"
            onClick={() => {
              setShowHint(true);
              sounds.playPop();
            }}
            className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Need a Hint?</span>
          </button>
        )}

        {showHint && !solved && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-fade-in flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 shrink-0" />
            <span>Hint: {currentRiddle.hint}</span>
          </div>
        )}

        {/* Victory Notification */}
        {solved && (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-400/50 text-center space-y-2 animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg">
              <Trophy className="w-5 h-5 animate-bounce" />
            </div>
            <div className="text-sm font-black text-white font-display">
              {winnerName} Solved It!
            </div>
            <p className="text-xs text-emerald-300 font-mono">
              The Answer was "{currentRiddle.answer}" (+100 PTS)
            </p>
            <button
              onClick={handleNextRiddle}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Next Riddle 🚀
            </button>
          </div>
        )}
      </div>

      {/* Guess Input Bar */}
      {!solved && (
        <form onSubmit={handleGuessSubmit} className="mt-2 space-y-1 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Decode the riddle and type your answer..."
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white/10 border border-white/15 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
            <button
              type="submit"
              disabled={!guess.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Solve!
            </button>
          </div>
          {feedback && (
            <div className="text-[11px] font-semibold text-rose-400 px-1 animate-pulse">
              {feedback}
            </div>
          )}
        </form>
      )}
    </div>
  );
};
