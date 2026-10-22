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
  HelpCircle,
  Share2,
  Copy,
  Check,
  Users,
  ExternalLink,
  X,
} from 'lucide-react';
import { realtime } from '@/lib/socket-client';
import { REALTIME_EVENTS, AnonGameActionBroadcast } from '@mivo/shared';
import { sounds } from './soundEffects';
import { GameRulesModal, GAME_RULES_DATA } from './GameRulesModal';

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
  sessionRoomCode?: string;
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
  sessionRoomCode,
  onGameEventNotice,
}) => {
  const [activeGame, setActiveGame] = React.useState<JamGameType>('DOODLE');
  const [myScore, setMyScore] = React.useState(0);
  const [partnerScore, setPartnerScore] = React.useState(0);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [playMode, setPlayMode] = React.useState<'ONLINE' | 'BOT' | 'HOTSEAT'>('ONLINE');
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [rulesModalOpen, setRulesModalOpen] = React.useState(false);
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

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

  // Safe score update wrapped in useCallback to avoid setState-in-render issues
  const handleScoreUpdate = React.useCallback((pts: number, isSelf: boolean) => {
    if (isSelf) {
      setMyScore((s) => s + pts);
    } else {
      setPartnerScore((s) => s + pts);
    }

    // Trigger celebration confetti
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2500);
  }, []);

  // Room code for sharing
  const roomCode = sessionRoomCode || sessionId.replace(/[^A-Za-z0-9]/g, '').slice(-5).toUpperCase();
  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?jamCode=${roomCode}`
    : `http://localhost:3000/channels?jamCode=${roomCode}`;

  const handleCopyInvite = () => {
    navigator.clipboard?.writeText(inviteLink);
    setCopiedLink(true);
    sounds.playPop();
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const activeRuleData = GAME_RULES_DATA[activeGame];

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
              Interactive playground: draw, duel, quiz &amp; compete in real-time
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

          {/* Rules & Guide Button */}
          <button
            type="button"
            onClick={() => {
              setRulesModalOpen(true);
              sounds.playPop();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            title="Read Rules & How to Play"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {/* Invite 2nd Player Button */}
          <button
            type="button"
            onClick={() => {
              setInviteModalOpen(true);
              sounds.playPop();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
            title="Invite 2nd Player (Room Code & Link)"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite 2nd Player</span>
          </button>
        </div>
      </div>

      {/* Game Selector Tabs Bar */}
      <div className="px-3 py-1.5 bg-[#0A0C16] border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-1.5">
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

        {/* Quick Rule Pill for Active Game */}
        <button
          type="button"
          onClick={() => {
            setRulesModalOpen(true);
            sounds.playPop();
          }}
          className="text-[11px] text-gray-400 hover:text-amber-300 font-semibold flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <HelpCircle className="w-3 h-3 text-amber-400" />
          <span className="hidden md:inline">How to play {activeRuleData.title.split(' ')[0]}</span>
        </button>
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
            botMode={partnerPseudonym.includes('AI') || playMode === 'BOT'}
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
            botMode={partnerPseudonym.includes('AI') || playMode === 'BOT'}
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
            botMode={partnerPseudonym.includes('AI') || playMode === 'BOT'}
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
            botMode={partnerPseudonym.includes('AI') || playMode === 'BOT'}
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
            botMode={partnerPseudonym.includes('AI') || playMode === 'BOT'}
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
            botMode={partnerPseudonym.includes('AI') || playMode === 'BOT'}
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
            botMode={partnerPseudonym.includes('AI') || playMode === 'BOT'}
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
            botMode={partnerPseudonym.includes('AI') || playMode === 'BOT'}
          />
        )}
      </div>

      {/* Rules Modal */}
      <GameRulesModal
        isOpen={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
        defaultGame={activeGame}
      />

      {/* Invite 2nd Player Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#0D1022] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-display text-white">
                    Invite 2nd Player
                  </h3>
                  <p className="text-xs text-gray-400">
                    Connect a friend or open a 2nd tab to play live!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room Code Callout */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-extrabold block">
                Jam Room Code
              </span>
              <div className="text-3xl font-black font-mono tracking-widest text-white">
                {roomCode}
              </div>
              <p className="text-[11px] text-gray-400">
                Your friend can enter this code in the Jam lobby to join immediately.
              </p>
            </div>

            {/* Direct Link Share */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                Direct Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/15 text-gray-300 font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                  }`}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 1-Click Second Tab Launcher */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={() => {
                  window.open(inviteLink, '_blank');
                  setInviteModalOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in 2nd Browser Tab (Test Live Multiplayer)</span>
              </button>

              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
