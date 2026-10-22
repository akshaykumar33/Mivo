'use client';

import * as React from 'react';
import { Sparkles, Clock, Zap, ArrowRight, RotateCcw, AlertTriangle, Flame } from 'lucide-react';
import { sounds } from './soundEffects';

interface WordAssociationGameProps {
  sessionId: string;
  myPseudonym: string;
  partnerPseudonym: string;
  isFirstPlayer: boolean;
  onScoreUpdate: (points: number, isSelf: boolean) => void;
  sendAction: (action: string, payload: any) => void;
  lastAction: { action: string; payload: any; timestamp: number } | null;
  botMode: boolean;
}

interface ChainItem {
  word: string;
  author: string;
  points: number;
}

const STARTER_WORDS = ['COSMIC', 'QUANTUM', 'NEBULA', 'GALAXY', 'PHOENIX', 'CYBER', 'DRAGON', 'SYNAPSE'];

export const WordAssociationGame: React.FC<WordAssociationGameProps> = ({
  sessionId,
  myPseudonym,
  partnerPseudonym,
  isFirstPlayer,
  onScoreUpdate,
  sendAction,
  lastAction,
  botMode,
}) => {
  const [chain, setChain] = React.useState<ChainItem[]>([
    {
      word: STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)],
      author: 'System',
      points: 0,
    },
  ]);

  const [inputWord, setInputWord] = React.useState('');
  const [isMyTurn, setIsMyTurn] = React.useState(isFirstPlayer);
  const [timeLeft, setTimeLeft] = React.useState(12);
  const [gameOver, setGameOver] = React.useState(false);
  const [loserName, setLoserName] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [streak, setStreak] = React.useState(0);

  const lastWord = chain[chain.length - 1].word;
  const requiredChar = lastWord.slice(-1).toUpperCase();

  // Turn timer countdown tick
  React.useEffect(() => {
    if (gameOver || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 3 && next > 0) {
          sounds.playTick();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameOver, timeLeft]);

  // Handle timeout game over outside render
  React.useEffect(() => {
    if (timeLeft === 0 && !gameOver) {
      setGameOver(true);
      const loser = isMyTurn ? myPseudonym : partnerPseudonym;
      setLoserName(loser);
      setFeedback(`💣 Boom! ${loser} ran out of time!`);
      sounds.playBounce();
      onScoreUpdate(100, !isMyTurn);
    }
  }, [timeLeft, gameOver, isMyTurn, myPseudonym, partnerPseudonym, onScoreUpdate]);

  // Remote actions sync
  React.useEffect(() => {
    if (!lastAction) return;
    const { action, payload } = lastAction;

    if (action === 'WORD_SUBMIT') {
      setChain((prev) => [...prev, payload.item]);
      setIsMyTurn(payload.nextPlayer === myPseudonym);
      setTimeLeft(12);
      setStreak((s) => s + 1);
      setFeedback(null);
      sounds.playPop();
    } else if (action === 'WORD_RESET') {
      resetGame(payload.starter);
    }
  }, [lastAction, myPseudonym]);

  const resetGame = (starterWord?: string) => {
    const starter = starterWord || STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)];
    setChain([{ word: starter, author: 'System', points: 0 }]);
    setIsMyTurn(isFirstPlayer);
    setTimeLeft(12);
    setGameOver(false);
    setLoserName(null);
    setFeedback(null);
    setStreak(0);
    setInputWord('');
  };

  const handleSubmitWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || gameOver) return;

    const clean = inputWord.trim().toUpperCase();
    if (!clean) return;

    // Validation 1: Starts with required character
    if (!clean.startsWith(requiredChar)) {
      setFeedback(`⚠️ Word must start with the letter "${requiredChar}"!`);
      sounds.playBounce();
      return;
    }

    // Validation 2: Min length 3
    if (clean.length < 3) {
      setFeedback('⚠️ Minimum 3 letters required!');
      sounds.playBounce();
      return;
    }

    // Validation 3: Not already used
    if (chain.some((item) => item.word === clean)) {
      setFeedback(`⚠️ "${clean}" was already used in this chain!`);
      sounds.playBounce();
      return;
    }

    // Calculate score
    const points = clean.length * 10 + (timeLeft > 8 ? 20 : 0);
    const newItem: ChainItem = { word: clean, author: myPseudonym, points };

    setChain((prev) => [...prev, newItem]);
    setIsMyTurn(false);
    setTimeLeft(12);
    setStreak((s) => s + 1);
    setInputWord('');
    setFeedback(null);
    sounds.playCorrect();
    onScoreUpdate(points, true);

    sendAction('WORD_SUBMIT', {
      item: newItem,
      nextPlayer: partnerPseudonym,
    });
  };

  // Bot simulation
  React.useEffect(() => {
    if (!botMode || isMyTurn || gameOver) return;

    const botTimer = setTimeout(() => {
      // Pick a word starting with requiredChar
      const mockDictionary: Record<string, string[]> = {
        A: ['ASTRONAUT', 'AVALANCHE', 'AURORA', 'ANDROID'],
        B: ['BLIZZARD', 'BOULDER', 'BEACON', 'BUTTERFLY'],
        C: ['CYBERNETIC', 'CRYSTAL', 'CHAMELEON', 'COSMOS'],
        D: ['DYNAMITE', 'DOLPHIN', 'DIAMOND', 'DRAGON'],
        E: ['ECLIPSE', 'ELEPHANT', 'EMERALD', 'ENERGY'],
        F: ['FIREFLY', 'FALCON', 'FLAMINGO', 'FUSION'],
        G: ['GALAXY', 'GLACIER', 'GRAVITY', 'GRIFFIN'],
        H: ['HORIZON', 'HYPERDRIVE', 'HURRICANE', 'HOLOGRAM'],
        I: ['INFINITY', 'ICEBERG', 'IGNITION', 'ISLAND'],
        J: ['JUPITER', 'JAGUAR', 'JUNGLE', 'JEWEL'],
        K: ['KINETIC', 'KANGAROO', 'KRAKEN', 'KNIGHT'],
        L: ['LIGHTNING', 'LABYRINTH', 'LUNAR', 'LASER'],
        M: ['METEOR', 'MAGNET', 'MYSTERY', 'MIRAGE'],
        N: ['NEBULA', 'NANO', 'NAVIGATOR', 'NIGHTFALL'],
        O: ['ORBIT', 'OCTOPUS', 'OBSIDIAN', 'OASIS'],
        P: ['PULSAR', 'PHOENIX', 'PYRAMID', 'PLANET'],
        Q: ['QUANTUM', 'QUASAR', 'QUICKSILVER', 'QUARTZ'],
        R: ['RADIATION', 'RADAR', 'REPTILE', 'ROCKET'],
        S: ['SUPERNOVA', 'SATELLITE', 'SHADOW', 'SYMPHONY'],
        T: ['TELESCOPE', 'TITANIUM', 'TORNADO', 'TSUNAMI'],
        U: ['UNIVERSE', 'URANIUM', 'UTOPIA', 'UNICORN'],
        V: ['VOLCANO', 'VELOCITY', 'VORTEX', 'VIPER'],
        W: ['WORMHOLE', 'WARP', 'WAVEFORM', 'WIZARD'],
        X: ['XENON', 'XYLOPHONE', 'XRAY', 'XENITH'],
        Y: ['YELLOWSTONE', 'YETI', 'YEARBOOK', 'YACHT'],
        Z: ['ZEPPELIN', 'ZENITH', 'ZODIAC', 'ZEPHYR'],
      };

      const candidates = mockDictionary[requiredChar] || [`${requiredChar}TRAIN`, `${requiredChar}ZONE`];
      const botPick = candidates[Math.floor(Math.random() * candidates.length)];
      const botItem: ChainItem = { word: botPick, author: partnerPseudonym, points: botPick.length * 10 };

      setChain((prev) => [...prev, botItem]);
      setIsMyTurn(true);
      setTimeLeft(12);
      setStreak((s) => s + 1);
      sounds.playPop();
    }, 2500);

    return () => clearTimeout(botTimer);
  }, [botMode, isMyTurn, gameOver, requiredChar, partnerPseudonym]);

  return (
    <div className="flex flex-col h-full bg-[#090A15] text-white p-3 sm:p-4 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold tracking-tight">
                Word Chain Blitz
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Flame className="w-3 h-3 text-amber-400" />
                Streak: {streak}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Type a word starting with the last letter of the previous word!
            </p>
          </div>
        </div>

        {/* Turn & Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-xs ${
              timeLeft <= 4
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-bounce'
                : 'bg-white/5 border-white/10 text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>

          <button
            onClick={() => {
              const nextStarter = STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)];
              resetGame(nextStarter);
              sendAction('WORD_RESET', { starter: nextStarter });
              sounds.playPop();
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs"
            title="Reset Game"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Required Letter Callout */}
      <div className="my-2.5 p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-rose-950/40 to-indigo-950/40 border border-amber-500/30 flex items-center justify-between shrink-0">
        <div>
          <span className="text-[10px] text-amber-300 uppercase tracking-wider font-extrabold block">
            Next Word Must Start With:
          </span>
          <span className="text-2xl font-black text-amber-400 font-mono tracking-wider">
            Letter "{requiredChar}"
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-gray-400 block">Current Turn:</span>
          <span
            className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg ${
              isMyTurn
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-gray-800 text-gray-300'
            }`}
          >
            {isMyTurn ? '👉 Your Turn' : `${partnerPseudonym}'s Turn`}
          </span>
        </div>
      </div>

      {/* Word Chain History Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 rounded-2xl bg-[#0D0F1E] border border-white/5 shadow-inner">
        {chain.map((item, idx) => {
          const isSelf = item.author === myPseudonym;
          const isSys = item.author === 'System';
          return (
            <div
              key={idx}
              className={`flex items-center gap-2 text-xs font-mono animate-fade-in ${
                isSys
                  ? 'justify-center text-gray-400 py-1'
                  : isSelf
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              {!isSys && !isSelf && (
                <span className="text-[10px] text-gray-500">{item.author}:</span>
              )}

              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                  isSys
                    ? 'bg-white/5 border-white/10 text-gray-300'
                    : isSelf
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                    : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                }`}
              >
                <span className="font-bold tracking-wider">{item.word}</span>
                {item.points > 0 && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-amber-400 font-mono font-bold">
                    +{item.points}
                  </span>
                )}
              </div>

              {!isSys && isSelf && (
                <span className="text-[10px] text-gray-500">You</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="my-2 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-center space-y-2 animate-fade-in">
          <div className="text-xl">💣 💥</div>
          <div className="text-sm font-black text-rose-300 font-display">
            {loserName === myPseudonym ? 'You Ran Out of Time!' : `${partnerPseudonym} Ran Out of Time!`}
          </div>
          <p className="text-xs text-gray-300">
            Chain reached {chain.length - 1} connected words!
          </p>
          <button
            onClick={() => {
              const nextStarter = STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)];
              resetGame(nextStarter);
              sendAction('WORD_RESET', { starter: nextStarter });
              sounds.playPop();
            }}
            className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            Play Again ⚡
          </button>
        </div>
      )}

      {/* Input Field */}
      {!gameOver && (
        <form onSubmit={handleSubmitWord} className="mt-2 space-y-1 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              disabled={!isMyTurn}
              value={inputWord}
              onChange={(e) => setInputWord(e.target.value.toUpperCase())}
              placeholder={
                isMyTurn
                  ? `Type a word starting with "${requiredChar}"...`
                  : `Waiting for ${partnerPseudonym}...`
              }
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white/10 border border-white/15 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-40 uppercase font-mono font-bold"
            />
            <button
              type="submit"
              disabled={!isMyTurn || !inputWord.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>Submit</span>
              <ArrowRight className="w-3.5 h-3.5" />
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
