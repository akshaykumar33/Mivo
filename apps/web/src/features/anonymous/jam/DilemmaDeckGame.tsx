'use client';

import * as React from 'react';
import { Sparkles, Layers, Check, ArrowRight, RotateCcw, Heart, Flame, ShieldAlert, Award } from 'lucide-react';
import { sounds } from './soundEffects';

interface DilemmaDeckGameProps {
  sessionId: string;
  myPseudonym: string;
  partnerPseudonym: string;
  onScoreUpdate: (points: number, isSelf: boolean) => void;
  sendAction: (action: string, payload: any) => void;
  lastAction: { action: string; payload: any; timestamp: number } | null;
  botMode: boolean;
}

interface WouldYouRatherItem {
  id: string;
  type: 'WYR';
  title: string;
  optionA: { text: string; icon: string };
  optionB: { text: string; icon: string };
}

interface Rank4Item {
  id: string;
  type: 'RANK4';
  title: string;
  items: Array<{ id: string; label: string; icon: string }>;
}

const DILEMMAS: Array<WouldYouRatherItem | Rank4Item> = [
  {
    id: 'wyr-1',
    type: 'WYR',
    title: 'Superpower Dilemma',
    optionA: { text: 'Have 10Gbps Wi-Fi in your brain, but ads play in your dreams', icon: '📶' },
    optionB: { text: 'Be able to teleport anywhere, but arrive soaking wet each time', icon: '⚡' },
  },
  {
    id: 'wyr-2',
    type: 'WYR',
    title: 'Food Crisis',
    optionA: { text: 'Every meal tastes like delicious pizza forever', icon: '🍕' },
    optionB: { text: 'Can eat unlimited tacos without ever feeling full or unhealthy', icon: '🌮' },
  },
  {
    id: 'wyr-3',
    type: 'WYR',
    title: 'Time Paradox',
    optionA: { text: 'Travel 500 years into the future with a jetpack', icon: '🚀' },
    optionB: { text: 'Travel 500 years into the past as a wizard with a smartphone', icon: '🧙' },
  },
  {
    id: 'wyr-4',
    type: 'WYR',
    title: 'Social Hazard',
    optionA: { text: 'Speak only in rhyming rap verses in all serious conversations', icon: '🎤' },
    optionB: { text: 'Your search history is projected above your head for 10 minutes a day', icon: '🔎' },
  },
  {
    id: 'rank-1',
    type: 'RANK4',
    title: 'Rank the Ultimate Midnight Snacks 🌙',
    items: [
      { id: '1', label: 'Cold Leftover Pizza', icon: '🍕' },
      { id: '2', label: 'Instant Ramen with Egg', icon: '🍜' },
      { id: '3', label: 'Warm Chocolate Chip Cookies & Milk', icon: '🍪' },
      { id: '4', label: 'Tortilla Chips & Spicy Queso Dip', icon: '🧀' },
    ],
  },
  {
    id: 'rank-2',
    type: 'RANK4',
    title: 'Rank Survival Skills in a Zombie Apocalypse 🧟',
    items: [
      { id: '1', label: 'Parkour Ninja Mobility', icon: '🏃' },
      { id: '2', label: 'DIY Solar & Generator Engineering', icon: '⚡' },
      { id: '3', label: 'Wilderness Foraging & Pure Water Purifying', icon: '🍄' },
      { id: '4', label: 'Charismatic Leader Negotiator', icon: '👑' },
    ],
  },
  {
    id: 'rank-3',
    type: 'RANK4',
    title: 'Rank the Worst Work Annoyances 💻',
    items: [
      { id: '1', label: '"Quick Call" with No Agenda', icon: '📞' },
      { id: '2', label: 'Wi-Fi Drops Right During Presentation', icon: '⚠️' },
      { id: '3', label: 'Meeting That Could Have Been a Slack Message', icon: '📧' },
      { id: '4', label: 'Broken Coffee Machine on Monday Morning', icon: '☕' },
    ],
  },
];

export const DilemmaDeckGame: React.FC<DilemmaDeckGameProps> = ({
  sessionId,
  myPseudonym,
  partnerPseudonym,
  onScoreUpdate,
  sendAction,
  lastAction,
  botMode,
}) => {
  const [deckIndex, setDeckIndex] = React.useState(0);
  const currentDilemma = DILEMMAS[deckIndex % DILEMMAS.length];

  // WYR votes
  const [myWyrChoice, setMyWyrChoice] = React.useState<'A' | 'B' | null>(null);
  const [partnerWyrChoice, setPartnerWyrChoice] = React.useState<'A' | 'B' | null>(null);

  // Rank4 order
  const [myRankList, setMyRankList] = React.useState<string[]>([]);
  const [partnerRankList, setPartnerRankList] = React.useState<string[] | null>(null);
  const [myRankSubmitted, setMyRankSubmitted] = React.useState(false);

  // Initialize rank list when card changes
  React.useEffect(() => {
    setMyWyrChoice(null);
    setPartnerWyrChoice(null);
    setMyRankSubmitted(false);
    setPartnerRankList(null);

    if (currentDilemma.type === 'RANK4') {
      setMyRankList(currentDilemma.items.map((i) => i.id));
    }
  }, [deckIndex, currentDilemma]);

  // Sync remote actions
  React.useEffect(() => {
    if (!lastAction) return;
    const { action, payload } = lastAction;

    if (action === 'DILEMMA_VOTE_WYR') {
      setPartnerWyrChoice(payload.choice);
      sounds.playPop();
    } else if (action === 'DILEMMA_SUBMIT_RANK4') {
      setPartnerRankList(payload.rankList);
      sounds.playPop();
    } else if (action === 'DILEMMA_NEXT') {
      setDeckIndex(payload.nextIndex);
      sounds.playPop();
    }
  }, [lastAction]);

  // Handle local WYR vote
  const handleVoteWyr = (choice: 'A' | 'B') => {
    if (myWyrChoice) return;
    setMyWyrChoice(choice);
    sounds.playBounce();
    sendAction('DILEMMA_VOTE_WYR', { choice });

    if (partnerWyrChoice) {
      // Both have voted
      sounds.playCorrect();
      const isMatch = choice === partnerWyrChoice;
      onScoreUpdate(isMatch ? 100 : 50, true);
    }
  };

  // Move item in ranking
  const moveRankItem = (fromIdx: number, toIdx: number) => {
    if (myRankSubmitted || toIdx < 0 || toIdx >= myRankList.length) return;
    const updated = [...myRankList];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setMyRankList(updated);
    sounds.playTick();
  };

  // Submit Rank4
  const handleSubmitRank = () => {
    if (myRankSubmitted) return;
    setMyRankSubmitted(true);
    sounds.playBounce();
    sendAction('DILEMMA_SUBMIT_RANK4', { rankList: myRankList });

    if (partnerRankList) {
      sounds.playCorrect();
      onScoreUpdate(100, true);
    }
  };

  // Next Card
  const handleNextCard = () => {
    const nextIdx = deckIndex + 1;
    setDeckIndex(nextIdx);
    sendAction('DILEMMA_NEXT', { nextIndex: nextIdx });
    sounds.playPop();
  };

  // Bot simulation
  React.useEffect(() => {
    if (!botMode) return;

    const timer = setTimeout(() => {
      if (currentDilemma.type === 'WYR' && !partnerWyrChoice) {
        const botChoice: 'A' | 'B' = Math.random() > 0.4 ? 'A' : 'B';
        setPartnerWyrChoice(botChoice);
        sounds.playPop();
      } else if (currentDilemma.type === 'RANK4' && !partnerRankList) {
        const shuffled = [...currentDilemma.items.map((i) => i.id)].sort(() => Math.random() - 0.5);
        setPartnerRankList(shuffled);
        sounds.playPop();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [botMode, currentDilemma, deckIndex, partnerWyrChoice, partnerRankList]);

  const bothVotedWyr = myWyrChoice !== null && partnerWyrChoice !== null;
  const bothRanked = myRankSubmitted && partnerRankList !== null;

  // Calculate Rank similarity
  const calculateRankMatch = () => {
    if (!partnerRankList || currentDilemma.type !== 'RANK4') return 0;
    let score = 0;
    myRankList.forEach((id, idx) => {
      const partnerIdx = partnerRankList.indexOf(id);
      const diff = Math.abs(idx - partnerIdx);
      if (diff === 0) score += 25;
      else if (diff === 1) score += 15;
      else if (diff === 2) score += 5;
    });
    return Math.min(100, score);
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0B16] text-white p-3 sm:p-4 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-md">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold tracking-tight">
                Interactive Dilemma Deck
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Card #{deckIndex + 1}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              {currentDilemma.type === 'WYR'
                ? 'Vote in secret, then reveal and compare your answers!'
                : 'Rank items from #1 to #4 and test your compatibility!'}
            </p>
          </div>
        </div>

        <button
          onClick={handleNextCard}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1"
        >
          <span>Next Card</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Card Arena */}
      <div className="flex-1 flex flex-col justify-center my-3 max-w-xl mx-auto w-full">
        {/* CARD TYPE 1: WOULD YOU RATHER */}
        {currentDilemma.type === 'WYR' && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-[10px] uppercase font-mono tracking-widest text-purple-400 font-black">
                Would You Rather
              </span>
              <h2 className="text-base sm:text-lg font-black font-display text-white mt-0.5">
                {currentDilemma.title}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A */}
              <button
                type="button"
                disabled={bothVotedWyr}
                onClick={() => handleVoteWyr('A')}
                className={`p-4 rounded-3xl border-2 text-left transition-all relative overflow-hidden cursor-pointer ${
                  myWyrChoice === 'A'
                    ? 'bg-purple-950/60 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-2 ring-purple-400/50 scale-[1.02]'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="text-3xl mb-2">{currentDilemma.optionA.icon}</div>
                <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                  {currentDilemma.optionA.text}
                </div>

                {myWyrChoice === 'A' && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-purple-300">
                    <Check className="w-3.5 h-3.5" />
                    <span>Your Choice</span>
                  </div>
                )}

                {bothVotedWyr && partnerWyrChoice === 'A' && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-pink-300">
                    <Heart className="w-3.5 h-3.5 fill-pink-400" />
                    <span>{partnerPseudonym}'s Choice</span>
                  </div>
                )}
              </button>

              {/* Option B */}
              <button
                type="button"
                disabled={bothVotedWyr}
                onClick={() => handleVoteWyr('B')}
                className={`p-4 rounded-3xl border-2 text-left transition-all relative overflow-hidden cursor-pointer ${
                  myWyrChoice === 'B'
                    ? 'bg-pink-950/60 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.3)] ring-2 ring-pink-400/50 scale-[1.02]'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="text-3xl mb-2">{currentDilemma.optionB.icon}</div>
                <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                  {currentDilemma.optionB.text}
                </div>

                {myWyrChoice === 'B' && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-purple-300">
                    <Check className="w-3.5 h-3.5" />
                    <span>Your Choice</span>
                  </div>
                )}

                {bothVotedWyr && partnerWyrChoice === 'B' && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-pink-300">
                    <Heart className="w-3.5 h-3.5 fill-pink-400" />
                    <span>{partnerPseudonym}'s Choice</span>
                  </div>
                )}
              </button>
            </div>

            {/* Waiting or Reveal Bar */}
            {!bothVotedWyr ? (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>
                  {myWyrChoice
                    ? `Locked in! Waiting for ${partnerPseudonym} to choose...`
                    : 'Click an option to cast your vote!'}
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500/40 text-center space-y-1 animate-fade-in shadow-xl">
                <div className="text-sm font-black font-display text-white flex items-center justify-center gap-2">
                  {myWyrChoice === partnerWyrChoice ? (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>100% Vibe Match! You two think alike!</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4 text-rose-400" />
                      <span>Chaotic Contrast! Opposites attract!</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-purple-200">
                  {myWyrChoice === partnerWyrChoice
                    ? 'Both players picked the exact same scenario (+100 PTS)'
                    : `You picked ${myWyrChoice}, while ${partnerPseudonym} picked ${partnerWyrChoice} (+50 PTS)`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* CARD TYPE 2: RANK THESE 4 THINGS */}
        {currentDilemma.type === 'RANK4' && (
          <div className="space-y-3">
            <div className="text-center">
              <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-black">
                Rank These 4 Things
              </span>
              <h2 className="text-base sm:text-lg font-black font-display text-white mt-0.5">
                {currentDilemma.title}
              </h2>
            </div>

            {/* Rank List */}
            <div className="space-y-2">
              {myRankList.map((itemId, idx) => {
                const item = currentDilemma.items.find((i) => i.id === itemId);
                if (!item) return null;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono font-bold flex items-center justify-center border border-indigo-500/30">
                        #{idx + 1}
                      </span>
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-bold text-white">{item.label}</span>
                    </div>

                    {!myRankSubmitted && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveRankItem(idx, idx - 1)}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-20 text-[10px] font-bold text-gray-300"
                        >
                          ▲ Up
                        </button>
                        <button
                          type="button"
                          disabled={idx === myRankList.length - 1}
                          onClick={() => moveRankItem(idx, idx + 1)}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-20 text-[10px] font-bold text-gray-300"
                        >
                          ▼ Down
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit / Match Status */}
            {!bothRanked ? (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400">
                  {myRankSubmitted
                    ? `Waiting for ${partnerPseudonym} to submit...`
                    : 'Reorder items using ▲ and ▼ then lock in.'}
                </span>

                <button
                  type="button"
                  disabled={myRankSubmitted}
                  onClick={handleSubmitRank}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {myRankSubmitted ? 'Locked In ✓' : 'Lock In Ranking 🔒'}
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 text-center space-y-2 animate-fade-in shadow-xl">
                <div className="flex items-center justify-center gap-2 text-base font-black font-display text-white">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>Rank Compatibility: {calculateRankMatch()}% Match!</span>
                </div>
                <p className="text-xs text-indigo-200">
                  You and {partnerPseudonym} have submitted rankings. Talk about your #1 picks in chat!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
