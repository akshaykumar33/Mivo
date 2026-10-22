'use client';

import * as React from 'react';
import {
  Paintbrush,
  Eraser,
  RotateCcw,
  Sparkles,
  Trophy,
  Clock,
  ArrowRightLeft,
  Lightbulb,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import { sounds } from './soundEffects';

interface StrokePoint {
  x: number;
  y: number;
  type: 'start' | 'draw' | 'end';
  color?: string;
  width?: number;
}

interface SpeedDoodlingGameProps {
  sessionId: string;
  myPseudonym: string;
  partnerPseudonym: string;
  isMyTurnDrawer: boolean;
  onScoreUpdate: (points: number, isSelf: boolean) => void;
  sendAction: (action: string, payload: any) => void;
  lastAction: { action: string; payload: any; timestamp: number } | null;
  botMode: boolean;
}

const DOODLE_WORDS = [
  { word: 'PIZZA', hint: 'Cheesy Italian slice', category: 'Food 🍕' },
  { word: 'ROBOT', hint: 'Mechanical buddy with gears', category: 'Tech 🤖' },
  { word: 'PENGUIN', hint: 'Waddles on ice in a tuxedo', category: 'Animals 🐧' },
  { word: 'ROCKET', hint: 'Blasts off to outer space', category: 'Sci-Fi 🚀' },
  { word: 'TACO', hint: 'Crunchy shell with spicy salsa', category: 'Food 🌮' },
  { word: 'GHOST', hint: 'Says boo and walks through walls', category: 'Spooky 👻' },
  { word: 'GUITAR', hint: 'Six strings for rock & roll', category: 'Music 🎸' },
  { word: 'RAINBOW', hint: 'Colors after the rain storm', category: 'Nature 🌈' },
  { word: 'HAMBURGER', hint: 'Juicy patty between sesame buns', category: 'Food 🍔' },
  { word: 'VOLCANO', hint: 'Mountain spewing hot magma', category: 'Nature 🌋' },
  { word: 'ALIEN', hint: 'Green extraterrestrial visitor', category: 'Sci-Fi 👽' },
  { word: 'SUNGLASSES', hint: 'Cool shades for bright days', category: 'Fashion 🕶️' },
  { word: 'UNICORN', hint: 'Magical horse with a golden horn', category: 'Mythical 🦄' },
  { word: 'CATAPULT', hint: 'Medieval boulder hurler', category: 'History 🏰' },
  { word: 'HEADPHONES', hint: 'Over-ear audio listening gear', category: 'Tech 🎧' },
];

const PALETTE = [
  '#FFFFFF',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];

export const SpeedDoodlingGame: React.FC<SpeedDoodlingGameProps> = ({
  sessionId,
  myPseudonym,
  partnerPseudonym,
  isMyTurnDrawer,
  onScoreUpdate,
  sendAction,
  lastAction,
  botMode,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [color, setColor] = React.useState('#FFFFFF');
  const [brushWidth, setBrushWidth] = React.useState(4);
  const [isEraser, setIsEraser] = React.useState(false);

  // Game cycle state
  const [wordIndex, setWordIndex] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(60);
  const [timerActive, setTimerActive] = React.useState(true);
  const [isDrawer, setIsDrawer] = React.useState(isMyTurnDrawer);
  const [guessInput, setGuessInput] = React.useState('');
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [roundSolved, setRoundSolved] = React.useState(false);
  const [winnerName, setWinnerName] = React.useState<string | null>(null);
  const [revealedLetters, setRevealedLetters] = React.useState<number[]>([]);

  const activeWordObj = DOODLE_WORDS[wordIndex % DOODLE_WORDS.length];
  const targetWord = activeWordObj.word.toUpperCase();

  // Reset round
  const resetRound = (nextWordIndex?: number, drawerSelf = !isDrawer) => {
    const nextIdx = nextWordIndex !== undefined ? nextWordIndex : Math.floor(Math.random() * DOODLE_WORDS.length);
    setWordIndex(nextIdx);
    setIsDrawer(drawerSelf);
    setTimeLeft(60);
    setTimerActive(true);
    setRoundSolved(false);
    setWinnerName(null);
    setFeedback(null);
    setRevealedLetters([]);
    clearCanvas(false);
  };

  // Clear Canvas
  const clearCanvas = (notify = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (notify) {
      sendAction('DOODLE_CLEAR', {});
      sounds.playPop();
    }
  };

  // Timer Countdown tick
  React.useEffect(() => {
    if (!timerActive || roundSolved || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, roundSolved, timeLeft]);

  // Handle side-effects of timeLeft (hints at 40s/20s, timeup at 0s) outside render
  React.useEffect(() => {
    if (!timerActive || roundSolved) return;

    if (timeLeft === 0) {
      setTimerActive(false);
      setRoundSolved(true);
      setFeedback(`⏰ Time's up! The word was "${targetWord}"`);
      sounds.playBounce();
      return;
    }

    if (timeLeft === 40 || timeLeft === 20) {
      setRevealedLetters((existing) => {
        const unrevealed = targetWord
          .split('')
          .map((_, i) => i)
          .filter((i) => !existing.includes(i));
        if (unrevealed.length > 0) {
          const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
          return [...existing, pick];
        }
        return existing;
      });
      sounds.playTick();
    }
  }, [timeLeft, timerActive, roundSolved, targetWord]);

  // Sync actions from partner
  React.useEffect(() => {
    if (!lastAction) return;
    const { action, payload } = lastAction;

    if (action === 'DOODLE_DRAW') {
      drawRemotePoint(payload);
    } else if (action === 'DOODLE_CLEAR') {
      clearCanvas(false);
    } else if (action === 'DOODLE_SOLVED') {
      setRoundSolved(true);
      setTimerActive(false);
      setWinnerName(payload.winnerName);
      setFeedback(`🎉 ${payload.winnerName} got it! The word was "${payload.word}"`);
      sounds.playCorrect();
      onScoreUpdate(100, payload.winnerName === myPseudonym);
    } else if (action === 'DOODLE_NEW_ROUND') {
      resetRound(payload.wordIndex, payload.nextDrawer === myPseudonym);
    }
  }, [lastAction]);

  // Draw remote stroke
  const drawRemotePoint = (pt: StrokePoint) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = pt.color || '#FFFFFF';
    ctx.lineWidth = pt.width || 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (pt.type === 'start') {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    } else if (pt.type === 'draw') {
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else if (pt.type === 'end') {
      ctx.closePath();
    }
  };

  // Local drawing handlers
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer || roundSolved) return;
    setIsDrawing(true);
    const { x, y } = getCanvasPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const strokeColor = isEraser ? '#0A0B10' : color;
    const width = isEraser ? brushWidth * 3 : brushWidth;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);

    sendAction('DOODLE_DRAW', { x, y, type: 'start', color: strokeColor, width });
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer || roundSolved) return;
    const { x, y } = getCanvasPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();

    const strokeColor = isEraser ? '#0A0B10' : color;
    const width = isEraser ? brushWidth * 3 : brushWidth;
    sendAction('DOODLE_DRAW', { x, y, type: 'draw', color: strokeColor, width });
  };

  const handlePointerUp = () => {
    if (!isDrawing || !isDrawer) return;
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.closePath();
    sendAction('DOODLE_DRAW', { x: 0, y: 0, type: 'end' });
  };

  // Guesser submission
  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || roundSolved) return;

    const clean = guessInput.trim().toUpperCase();
    setGuessInput('');

    if (clean === targetWord) {
      setRoundSolved(true);
      setTimerActive(false);
      setWinnerName(myPseudonym);
      setFeedback(`🎉 Brilliant! You guessed "${targetWord}" correctly!`);
      sounds.playCorrect();
      onScoreUpdate(100, true);

      sendAction('DOODLE_SOLVED', {
        word: targetWord,
        winnerName: myPseudonym,
      });
    } else {
      // Check if close
      if (clean.includes(targetWord) || targetWord.includes(clean)) {
        setFeedback(`🔥 "${clean}" is burning hot! Almost there!`);
      } else {
        setFeedback(`❌ "${clean}" is not it. Keep trying!`);
      }
      sounds.playBounce();
    }
  };

  // Bot response simulation if bot mode is enabled
  React.useEffect(() => {
    if (!botMode || roundSolved || !timerActive) return;

    // If bot is guessing
    if (isDrawer) {
      const botTimer = setTimeout(() => {
        // 50% chance bot guesses correctly around 25s
        if (timeLeft < 35 && Math.random() > 0.35) {
          setRoundSolved(true);
          setTimerActive(false);
          setWinnerName(partnerPseudonym);
          setFeedback(`🤖 ${partnerPseudonym} guessed "${targetWord}"!`);
          sounds.playCorrect();
          onScoreUpdate(100, false);
        }
      }, 5000);
      return () => clearTimeout(botTimer);
    }
  }, [botMode, isDrawer, timeLeft, roundSolved, timerActive, targetWord]);

  return (
    <div className="flex flex-col h-full bg-[#0A0C13] text-white p-3 sm:p-4 select-none">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg text-white">
            <Paintbrush className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold tracking-tight">
                {isDrawer ? '🎨 You are Drawing!' : `👀 ${partnerPseudonym} is Drawing!`}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {activeWordObj.category}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              {isDrawer
                ? `Prompt: "${targetWord}" — Draw it so your partner can guess!`
                : `Guess the word before the timer expires!`}
            </p>
          </div>
        </div>

        {/* Timer & Swap */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-xs ${
              timeLeft <= 15
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-white/5 border-white/10 text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>

          <button
            onClick={() => {
              const nextIdx = Math.floor(Math.random() * DOODLE_WORDS.length);
              const nextDrawer = isDrawer ? partnerPseudonym : myPseudonym;
              resetRound(nextIdx, !isDrawer);
              sendAction('DOODLE_NEW_ROUND', {
                wordIndex: nextIdx,
                nextDrawer,
              });
              sounds.playPop();
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="Swap Roles or Next Word"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Swap</span>
          </button>
        </div>
      </div>

      {/* Secret Word Display for Guesser (Blanks with Hints) */}
      {!isDrawer && (
        <div className="py-2.5 px-4 my-2 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-indigo-300">
            <Lightbulb className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>Hint: {activeWordObj.hint}</span>
          </div>

          <div className="flex items-center gap-1.5 tracking-widest font-mono text-base font-black text-white">
            {targetWord.split('').map((char, idx) => (
              <span
                key={idx}
                className="w-6 h-8 flex items-center justify-center border-b-2 border-indigo-400 bg-white/5 rounded-t-md"
              >
                {revealedLetters.includes(idx) || roundSolved ? char : '_'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Canvas Work Area */}
      <div className="relative flex-1 min-h-[220px] rounded-2xl overflow-hidden bg-[#0D0F18] border border-white/10 flex items-center justify-center shadow-inner my-2">
        <canvas
          ref={canvasRef}
          width={640}
          height={380}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className={`w-full h-full object-contain ${
            isDrawer && !roundSolved ? 'cursor-crosshair' : 'cursor-default pointer-events-none'
          }`}
        />

        {/* Floating Success Celebration Overlay */}
        {roundSolved && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3 animate-fade-in z-20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center shadow-xl">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h4 className="text-lg font-black font-display text-white">
                {winnerName ? `${winnerName} Solved It!` : 'Round Complete!'}
              </h4>
              <p className="text-xs text-amber-300 font-mono mt-0.5">
                The Secret Word was <span className="font-black underline">{targetWord}</span> (+100 PTS)
              </p>
            </div>
            <button
              onClick={() => {
                const nextIdx = Math.floor(Math.random() * DOODLE_WORDS.length);
                const nextDrawer = isDrawer ? partnerPseudonym : myPseudonym;
                resetRound(nextIdx, !isDrawer);
                sendAction('DOODLE_NEW_ROUND', {
                  wordIndex: nextIdx,
                  nextDrawer,
                });
                sounds.playFanfare();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              Next Round (Swap Artist) 🚀
            </button>
          </div>
        )}
      </div>

      {/* Drawer Toolbar (Color swatches, brush size, eraser, clear) */}
      {isDrawer && !roundSolved && (
        <div className="p-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 shrink-0">
          {/* Colors */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  setIsEraser(false);
                  sounds.playPop();
                }}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                  color === c && !isEraser
                    ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0A0C13]'
                    : 'hover:scale-110 opacity-80'
                }`}
              />
            ))}
          </div>

          {/* Tools */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsEraser(!isEraser);
                sounds.playPop();
              }}
              className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                isEraser
                  ? 'bg-rose-500/30 border-rose-500 text-rose-300'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
              }`}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => clearCanvas(true)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-rose-400 transition-colors cursor-pointer text-xs"
              title="Clear Canvas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Guesser Input & Feedback */}
      {!isDrawer && !roundSolved && (
        <form onSubmit={handleGuessSubmit} className="mt-2 space-y-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              placeholder={`Type your guess for ${partnerPseudonym}'s sketch...`}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white/10 border border-white/15 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
            <button
              type="submit"
              disabled={!guessInput.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Guess!
            </button>
          </div>
          {feedback && (
            <div className="text-[11px] font-semibold text-amber-300 px-1 animate-pulse">
              {feedback}
            </div>
          )}
        </form>
      )}
    </div>
  );
};
