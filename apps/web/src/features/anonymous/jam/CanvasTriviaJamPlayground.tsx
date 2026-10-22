'use client';

import * as React from 'react';
import {
  Paintbrush,
  Gamepad2,
  CircleDot,
  Zap,
  Layers,
  Brain,
  Smile,
  Clock,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Bot,
  UserCheck,
  Flame,
} from 'lucide-react';
import { realtime } from '@/lib/socket-client';
import { REALTIME_EVENTS, AnonGameActionBroadcast } from '@mivo/shared';
import { sounds } from './soundEffects';

import { SpeedDoodlingGame } from './SpeedDoodlingGame';
import { RetroPongGame } from './RetroPongGame';
import { ConnectFourGame } from './ConnectFourGame';
import { WordAssociationGame } from './WordAssociationGame';
import { DilemmaDeckGame } from './DilemmaDeckGame';
import { TriviaBlitzGame } from './TriviaBlitzGame';
import { EmojiDecoderGame } from './EmojiDecoderGame';
import { ReflexClashGame } from './ReflexClashGame';

export type JamGameType =
  | 'DOODLE'
  | 'PONG'
  | 'CONNECT4'
  | 'WORD_CHAIN'
  | 'DILEMMA'
  | 'TRIVIA'
  | 'EMOJI'
  | 'REFLEX';

interface CanvasTriviaJamPlaygroundProps {
  sessionId: string;
  myPseudonym: string;
  partnerPseudonym: string;
  isHost: boolean;
  onGameEventNotice?: (notice: string) => void;
}

const JAM_GAMES = [
  { id: 'DOODLE', name: 'Speed Doodle', icon: Paintbrush, color: 'from-pink-500 to-rose-600', badge: '60s Draw' },
  { id: 'PONG', name: 'Retro Pong', icon: Gamepad2, color: 'from-cyan-500 to-blue-600', badge: 'Arcade 2P' },
  { id: 'CONNECT4', name: 'Connect-4', icon: CircleDot, color: 'from-indigo-500 to-purple-600', badge: 'Tactics' },
  { id: 'WORD_CHAIN', name: 'Word Chain', icon: Zap, color: 'from-amber-500 to-rose-600', badge: 'Fast Chain' },
  { id: 'DILEMMA', name: 'Dilemma Deck', icon: Layers, color: 'from-purple-500 to-pink-600', badge: 'Would You Rather' },
  { id: 'TRIVIA', name: 'Trivia Blitz', icon: Brain, color: 'from-yellow-400 to-orange-500', badge: '10s Duel' },
  { id: 'EMOJI', name: 'Emoji Riddle', icon: Smile, color: 'from-emerald-400 to-teal-500', badge: 'Decoders' },
  { id: 'REFLEX', name: 'Reflex Clash', icon: Clock, color: 'from-rose-500 to-red-600', badge: 'Speed Tap' },
] as const;

export const CanvasTriviaJamPlayground: React.FC<CanvasTriviaJamPlaygroundProps> = ({
  sessionId,
  myPseudonym,
  partnerPseudonym,
  isHost,
  onGameEventNotice,
}) => {
  const [activeGame, setActiveGame] = React.useState<JamGameType>('DOODLE');
  const [myScore, setMyScore] = React.useState(0);
  const [partnerScore, setPartnerScore] = React.useState(0);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [botMode, setBotMode] = React.useState(false);
  const [showConfetti, setShowConfetti] = React.useState(false);

  // Incoming socket game action
  const [lastAction, setLastAction] = React.useState<{
    action: string;
    payload: any;
    timestamp: number;
  } | null>(null);

  // Toggle sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
    if (next) sounds.playPop();
  };

  // Socket listener for real-time game events
  React.useEffect(() => {
    const socket = realtime.getSocket();
    if (!socket || !sessionId) return;

    const handleGameAction = (broadcast: AnonGameActionBroadcast) => {
      if (broadcast.sessionId !== sessionId) return;

      // If partner changed the game tab
      if (broadcast.game && broadcast.action === 'SWITCH_GAME') {
        setActiveGame(broadcast.payload.gameId);
        sounds.playPop();
        onGameEventNotice?.(`${partnerPseudonym} switched to ${broadcast.payload.gameId}!`);
        return;
      }

      setLastAction({
        action: broadcast.action,
        payload: broadcast.payload,
        timestamp: broadcast.timestamp,
      });
    };

    socket.on(REALTIME_EVENTS.ANON_GAME_ACTION, handleGameAction);

    return () => {
      socket.off(REALTIME_EVENTS.ANON_GAME_ACTION, handleGameAction);
    };
  }, [sessionId, partnerPseudonym, onGameEventNotice]);

  // Send action to partner over socket
  const sendAction = React.useCallback(
    (action: string, payload: any) => {
      realtime.emit(REALTIME_EVENTS.ANON_GAME_ACTION, {
        sessionId,
        game: activeGame,
        action,
        payload,
      });
    },
    [sessionId, activeGame]
  );

  // Switch game tab
  const handleSelectGame = (gameId: JamGameType) => {
    setActiveGame(gameId);
    sounds.playPop();
    sendAction('SWITCH_GAME', { gameId });
  };

  // Handle score update
  const handleScoreUpdate = (pts: number, isSelf: boolean) => {
    if (isSelf) {
      setMyScore((s) => s + pts);
    } else {
      setPartnerScore((s) => s + pts);
    }

    // Trigger celebration confetti
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-[#080912] border-l border-white/10 overflow-hidden relative font-sans">
      {/* Top Banner: Arena Header & Scoreboard */}
      <div className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-[#0F1224] to-[#141832] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 via-amber-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-tight text-white font-display">
                Co-Op Canvas &amp; Trivia Jam
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Interactive playground for strangers to play, doodle &amp; compete
            </p>
          </div>
        </div>

        {/* Score & Controls */}
        <div className="flex items-center gap-2">
          {/* Live Score Counter */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/40 border border-white/10 font-mono text-xs">
            <div className="flex items-center gap-1">
              <span className="text-cyan-400 font-bold">You:</span>
              <span className="text-white font-black">{myScore}</span>
            </div>
            <span className="text-gray-600">:</span>
            <div className="flex items-center gap-1">
              <span className="text-rose-400 font-bold">{partnerPseudonym}:</span>
              <span className="text-white font-black">{partnerScore}</span>
            </div>
          </div>

          {/* Sound FX Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer text-xs ${
              soundEnabled
                ? 'bg-white/10 border-white/20 text-yellow-300'
                : 'bg-white/5 border-white/10 text-gray-500'
            }`}
            title={soundEnabled ? 'Mute Game Sounds' : 'Enable Game Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Bot Companion Test Toggle */}
          <button
            type="button"
            onClick={() => {
              setBotMode(!botMode);
              sounds.playPop();
            }}
            className={`px-2 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              botMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 ring-1 ring-purple-500/30'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
            title="Toggle AI Companion (solo practice & testing)"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{botMode ? 'AI Bot Active' : 'Test AI'}</span>
          </button>
        </div>
      </div>

      {/* Game Selector Tabs Bar */}
      <div className="px-3 py-1.5 bg-[#0A0C16] border-b border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {JAM_GAMES.map((game) => {
          const Icon = game.icon;
          const isActive = activeGame === game.id;
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => handleSelectGame(game.id as JamGameType)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? `bg-gradient-to-r ${game.color} text-white shadow-md scale-[1.02]`
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{game.name}</span>
            </button>
          );
        })}
      </div>

      {/* Confetti Visual Celebration */}
      {showConfetti && (
        <div className="absolute inset-x-0 top-16 flex justify-center pointer-events-none z-30 animate-bounce">
          <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 text-white font-extrabold text-xs shadow-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
            <span>SPECTACULAR MOVE! +PTS</span>
          </div>
        </div>
      )}

      {/* Active Game Stage View */}
      <div className="flex-1 overflow-hidden relative">
        {activeGame === 'DOODLE' && (
          <SpeedDoodlingGame
            sessionId={sessionId}
            myPseudonym={myPseudonym}
            partnerPseudonym={partnerPseudonym}
            isMyTurnDrawer={isHost}
            onScoreUpdate={handleScoreUpdate}
            sendAction={sendAction}
            lastAction={lastAction}
            botMode={botMode}
          />
        )}

        {activeGame === 'PONG' && (
          <RetroPongGame
            sessionId={sessionId}
            myPseudonym={myPseudonym}
            partnerPseudonym={partnerPseudonym}
            isHostPlayer={isHost}
            onScoreUpdate={handleScoreUpdate}
            sendAction={sendAction}
            lastAction={lastAction}
            botMode={botMode}
          />
        )}

        {activeGame === 'CONNECT4' && (
          <ConnectFourGame
            sessionId={sessionId}
            myPseudonym={myPseudonym}
            partnerPseudonym={partnerPseudonym}
            isPlayer1={isHost}
            onScoreUpdate={handleScoreUpdate}
            sendAction={sendAction}
            lastAction={lastAction}
            botMode={botMode}
          />
        )}

        {activeGame === 'WORD_CHAIN' && (
          <WordAssociationGame
            sessionId={sessionId}
            myPseudonym={myPseudonym}
            partnerPseudonym={partnerPseudonym}
            isFirstPlayer={isHost}
            onScoreUpdate={handleScoreUpdate}
            sendAction={sendAction}
            lastAction={lastAction}
            botMode={botMode}
          />
        )}

        {activeGame === 'DILEMMA' && (
          <DilemmaDeckGame
            sessionId={sessionId}
            myPseudonym={myPseudonym}
            partnerPseudonym={partnerPseudonym}
            onScoreUpdate={handleScoreUpdate}
            sendAction={sendAction}
            lastAction={lastAction}
            botMode={botMode}
          />
        )}

        {activeGame === 'TRIVIA' && (
          <TriviaBlitzGame
            sessionId={sessionId}
            myPseudonym={myPseudonym}
            partnerPseudonym={partnerPseudonym}
            onScoreUpdate={handleScoreUpdate}
            sendAction={sendAction}
            lastAction={lastAction}
            botMode={botMode}
          />
        )}

        {activeGame === 'EMOJI' && (
          <EmojiDecoderGame
            sessionId={sessionId}
            myPseudonym={myPseudonym}
            partnerPseudonym={partnerPseudonym}
            onScoreUpdate={handleScoreUpdate}
            sendAction={sendAction}
            lastAction={lastAction}
            botMode={botMode}
          />
        )}

        {activeGame === 'REFLEX' && (
          <ReflexClashGame
            sessionId={sessionId}
            myPseudonym={myPseudonym}
            partnerPseudonym={partnerPseudonym}
            onScoreUpdate={handleScoreUpdate}
            sendAction={sendAction}
            lastAction={lastAction}
            botMode={botMode}
          />
        )}
      </div>
    </div>
  );
};
