'use client';

import * as React from 'react';
import { Zap, Trophy, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { sounds } from './soundEffects';

interface ReflexClashGameProps {
  sessionId: string;
  myPseudonym: string;
  partnerPseudonym: string;
  onScoreUpdate: (points: number, isSelf: boolean) => void;
  sendAction: (action: string, payload: any) => void;
  lastAction: { action: string; payload: any; timestamp: number } | null;
  subscribeToActions?: (listener: (action: string, payload: any) => void) => () => void;
  botMode: boolean;
}

type RoundState = 'READY' | 'WAITING' | 'CLICK_NOW' | 'EARLY_PENALTY' | 'ROUND_OVER';

interface RoundResult {
  round: number;
  myMs: number | 'FAIL';
  partnerMs: number | 'FAIL';
  winner: string;
}

export const ReflexClashGame: React.FC<ReflexClashGameProps> = ({
  sessionId,
  myPseudonym,
  partnerPseudonym,
  onScoreUpdate,
  sendAction,
  lastAction,
  subscribeToActions,
  botMode,
}) => {
  const [state, setState] = React.useState<RoundState>('READY');
  const [roundNumber, setRoundNumber] = React.useState(1);
  const [roundResults, setRoundResults] = React.useState<RoundResult[]>([]);
  const [myMs, setMyMs] = React.useState<number | 'FAIL' | null>(null);
  const [partnerMs, setPartnerMs] = React.useState<number | 'FAIL' | null>(null);

  const startTimeRef = React.useRef<number>(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Begin Waiting Phase
  const beginWaitingPhase = React.useCallback((delayMs?: number) => {
    setState('WAITING');
    setMyMs(null);
    setPartnerMs(null);

    const delay = delayMs || 2000 + Math.random() * 3000;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      startTimeRef.current = Date.now();
      setState('CLICK_NOW');
      sounds.playPop();
    }, delay);
  }, []);

  const resetMatch = React.useCallback(() => {
    setState('READY');
    setRoundNumber(1);
    setRoundResults([]);
    setMyMs(null);
    setPartnerMs(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Action handler (direct subscription or lastAction fallback)
  const handleAction = React.useCallback(
    (action: string, payload: any) => {
      if (action === 'REFLEX_TAP') {
        setPartnerMs(payload.ms);
        sounds.playPop();
      } else if (action === 'REFLEX_START_WAITING') {
        beginWaitingPhase(payload.delay);
      } else if (action === 'REFLEX_RESET') {
        resetMatch();
      }
    },
    [beginWaitingPhase, resetMatch]
  );

  React.useEffect(() => {
    if (subscribeToActions) {
      return subscribeToActions(handleAction);
    }
  }, [subscribeToActions, handleAction]);

  React.useEffect(() => {
    if (!subscribeToActions && lastAction) {
      handleAction(lastAction.action, lastAction.payload);
    }
  }, [subscribeToActions, lastAction, handleAction]);

  // When both tap or fail, compute winner of round
  React.useEffect(() => {
    if (myMs !== null && partnerMs !== null && state !== 'ROUND_OVER') {
      setState('ROUND_OVER');
      let roundWinner = 'TIE';

      if (myMs === 'FAIL' && partnerMs === 'FAIL') {
        roundWinner = 'DOUBLE FAULT';
      } else if (myMs === 'FAIL') {
        roundWinner = partnerPseudonym;
        onScoreUpdate(100, false);
      } else if (partnerMs === 'FAIL') {
        roundWinner = myPseudonym;
        onScoreUpdate(100, true);
        sounds.playCorrect();
      } else if (typeof myMs === 'number' && typeof partnerMs === 'number') {
        if (myMs < partnerMs) {
          roundWinner = myPseudonym;
          onScoreUpdate(100, true);
          sounds.playCorrect();
        } else {
          roundWinner = partnerPseudonym;
          onScoreUpdate(100, false);
          sounds.playBounce();
        }
      }

      setRoundResults((prev) => [
        ...prev,
        {
          round: roundNumber,
          myMs,
          partnerMs,
          winner: roundWinner,
        },
      ]);
    }
  }, [myMs, partnerMs, state, myPseudonym, partnerPseudonym, roundNumber]);

  const handleStartRound = () => {
    const delay = 2000 + Math.random() * 3000;
    beginWaitingPhase(delay);
    sendAction('REFLEX_START_WAITING', { delay });
    sounds.playPop();
  };

  // Tap handler
  const handleTap = () => {
    if (state === 'WAITING') {
      // False start!
      if (timerRef.current) clearTimeout(timerRef.current);
      setState('EARLY_PENALTY');
      setMyMs('FAIL');
      sounds.playBounce();
      sendAction('REFLEX_TAP', { ms: 'FAIL' });
    } else if (state === 'CLICK_NOW' && myMs === null) {
      const elapsed = Date.now() - startTimeRef.current;
      setMyMs(elapsed);
      sounds.playPop();
      sendAction('REFLEX_TAP', { ms: elapsed });
    }
  };

  const handleNextRound = () => {
    setRoundNumber((r) => r + 1);
    setState('READY');
    setMyMs(null);
    setPartnerMs(null);
  };

  // Bot simulation
  React.useEffect(() => {
    if (!botMode) return;

    if (state === 'CLICK_NOW' && partnerMs === null) {
      const botReaction = 190 + Math.floor(Math.random() * 140);
      const botTimer = setTimeout(() => {
        setPartnerMs(botReaction);
        sounds.playPop();
      }, botReaction);
      return () => clearTimeout(botTimer);
    }
  }, [botMode, state, partnerMs]);

  // Overall match winner
  const myWins = roundResults.filter((r) => r.winner === myPseudonym).length;
  const partnerWins = roundResults.filter((r) => r.winner === partnerPseudonym).length;
  const matchComplete = roundResults.length >= 5;

  return (
    <div className="flex flex-col h-full bg-[#080B15] text-white p-3 sm:p-4 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-black shadow-md">
            <Zap className="w-4 h-4 fill-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold tracking-tight">
                Reflex Tap Clash
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Round {roundNumber} of 5
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Wait for GREEN, then tap as fast as humanly possible!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-white/5 border border-white/10">
            <span className="text-emerald-400">{myWins}</span> :{' '}
            <span className="text-rose-400">{partnerWins}</span>
          </div>

          <button
            onClick={() => {
              resetMatch();
              sendAction('REFLEX_RESET', {});
              sounds.playPop();
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs"
            title="Reset Match"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Reactive Battle Arena */}
      <div
        onClick={handleTap}
        className={`flex-1 flex flex-col items-center justify-center my-3 rounded-3xl border-2 transition-all duration-150 cursor-pointer p-6 relative overflow-hidden select-none ${
          state === 'READY'
            ? 'bg-[#0E1122] border-white/10 hover:border-white/20'
            : state === 'WAITING'
            ? 'bg-rose-950/80 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse'
            : state === 'CLICK_NOW'
            ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_50px_#10B981] scale-[1.01]'
            : state === 'EARLY_PENALTY'
            ? 'bg-red-950 border-red-600'
            : 'bg-[#0F1326] border-indigo-500/30'
        }`}
      >
        {state === 'READY' && (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto text-3xl">
              ⚡
            </div>
            <div>
              <h2 className="text-lg font-black text-white font-display">Ready to Duel?</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                Press the button below. When the screen flashes GREEN, tap immediately!
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStartRound();
              }}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-black font-extrabold text-xs shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              Start Countdown! 🚀
            </button>
          </div>
        )}

        {state === 'WAITING' && (
          <div className="text-center space-y-2 pointer-events-none">
            <div className="text-4xl animate-bounce">🛑</div>
            <h2 className="text-2xl font-black text-white tracking-widest font-mono">
              WAIT FOR GREEN...
            </h2>
            <p className="text-xs text-rose-300">Don't tap yet or you'll get a penalty!</p>
          </div>
        )}

        {state === 'CLICK_NOW' && (
          <div className="text-center space-y-2 pointer-events-none">
            <div className="text-5xl animate-ping">⚡</div>
            <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight font-display">
              TAP NOW!
            </h2>
          </div>
        )}

        {state === 'EARLY_PENALTY' && (
          <div className="text-center space-y-2 pointer-events-none">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto animate-bounce" />
            <h2 className="text-lg font-black text-rose-300">FALSE START!</h2>
            <p className="text-xs text-rose-400">You tapped before the screen turned green.</p>
          </div>
        )}

        {state === 'ROUND_OVER' && (
          <div className="text-center space-y-3 pointer-events-none">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <span className="text-[10px] text-gray-400 block">Your Speed</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {myMs === 'FAIL' ? 'FAULT' : `${myMs}ms`}
                </span>
              </div>
              <span className="text-gray-600 font-mono text-sm">VS</span>
              <div className="text-center min-w-0 max-w-[140px]">
                <span className="text-[10px] text-gray-400 block truncate" title={partnerPseudonym}>{partnerPseudonym}&apos;s Speed</span>
                <span className="text-2xl font-black text-cyan-400 font-mono">
                  {partnerMs === 'FAIL' ? 'FAULT' : `${partnerMs}ms`}
                </span>
              </div>
            </div>

            <div className="text-sm font-black text-white">
              Round Winner:{' '}
              <span className="text-amber-400">
                {roundResults[roundResults.length - 1]?.winner}
              </span>
            </div>

            {!matchComplete ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextRound();
                }}
                className="pointer-events-auto px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Next Round ({roundNumber + 1}/5) →
              </button>
            ) : (
              <div className="pointer-events-auto p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-center space-y-2">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto animate-bounce" />
                <h3 className="text-base font-black text-white">
                  {myWins > partnerWins
                    ? 'Champion of the Quick-Draw! 🏆'
                    : `${partnerPseudonym} Takes the Belt! ⚡`}
                </h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetMatch();
                    sendAction('REFLEX_RESET', {});
                  }}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs cursor-pointer"
                >
                  Play Rematch
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Round Breakdown History */}
      {roundResults.length > 0 && (
        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-around text-[11px] font-mono shrink-0">
          {roundResults.map((res, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-gray-500 font-bold">R{res.round}:</span>
              <span className={res.winner === myPseudonym ? 'text-emerald-400 font-bold' : 'text-gray-400'}>
                {res.myMs === 'FAIL' ? 'X' : `${res.myMs}ms`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
