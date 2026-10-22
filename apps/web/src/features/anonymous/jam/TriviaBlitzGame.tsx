'use client';

import * as React from 'react';
import { Brain, Clock, Zap, CheckCircle2, XCircle, Trophy, ArrowRight, RotateCcw } from 'lucide-react';
import { sounds } from './soundEffects';

interface TriviaBlitzGameProps {
  sessionId: string;
  myPseudonym: string;
  partnerPseudonym: string;
  onScoreUpdate: (points: number, isSelf: boolean) => void;
  sendAction: (action: string, payload: any) => void;
  lastAction: { action: string; payload: any; timestamp: number } | null;
  botMode: boolean;
}

interface Question {
  id: string;
  question: string;
  category: string;
  options: string[];
  correctIndex: number;
  funFact: string;
}

const TRIVIA_QUESTIONS: Question[] = [
  {
    id: 't-1',
    category: 'Internet & Tech 💻',
    question: 'What was the very first video uploaded to YouTube in 2005?',
    options: ['Charlie bit my finger', 'Me at the zoo', 'Gangnam Style', 'Evolution of Dance'],
    correctIndex: 1,
    funFact: 'Uploaded by co-founder Jawed Karim at the San Diego Zoo elephants exhibit!',
  },
  {
    id: 't-2',
    category: 'Absurd Science 🧪',
    question: 'How many hearts does an octopus have?',
    options: ['1 Heart', '2 Hearts', '3 Hearts', '9 Hearts'],
    correctIndex: 2,
    funFact: 'Two hearts pump blood to the gills, while a third circulates it to the rest of the body!',
  },
  {
    id: 't-3',
    category: 'Gaming Lore 🎮',
    question: 'What was Mario originally called in his 1981 debut game Donkey Kong?',
    options: ['Jumpman', 'Plumber Boy', 'Luigi Prototype', 'Mr. Mustache'],
    correctIndex: 0,
    funFact: 'Shigeru Miyamoto originally named him Jumpman before renaming him Mario after Nintendo of America warehouse landlord Mario Segale!',
  },
  {
    id: 't-4',
    category: 'Space & Cosmos 🌌',
    question: 'One day on Venus is longer than one year on Venus. True or False?',
    options: ['True (Venus rotates very slowly)', 'False (Nonsense physics)', 'Only during summer', 'Nobody knows yet'],
    correctIndex: 0,
    funFact: 'Venus takes 243 Earth days to rotate on its axis, but only 225 Earth days to orbit the Sun!',
  },
  {
    id: 't-5',
    category: 'Pop Culture & Food 🍕',
    question: 'Which country eats the most pizza per capita in the world?',
    options: ['Italy', 'United States', 'Norway', 'Canada'],
    correctIndex: 2,
    funFact: 'Norwegians consume about 11 pounds of frozen pizza per person annually, ranking #1 per capita!',
  },
  {
    id: 't-6',
    category: 'Weird Animals 🦩',
    question: 'Why are flamingos pink?',
    options: ['Genetic pigmentation', 'Their diet of shrimp and algae', 'Sunburn from salt lakes', 'Courtship feathers'],
    correctIndex: 1,
    funFact: 'They are born dull grey, turning pink from carotenoid pigments in their diet!',
  },
];

export const TriviaBlitzGame: React.FC<TriviaBlitzGameProps> = ({
  sessionId,
  myPseudonym,
  partnerPseudonym,
  onScoreUpdate,
  sendAction,
  lastAction,
  botMode,
}) => {
  const [qIndex, setQIndex] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(12);
  const [myAnswer, setMyAnswer] = React.useState<number | null>(null);
  const [partnerAnswer, setPartnerAnswer] = React.useState<number | null>(null);
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [myStreak, setMyStreak] = React.useState(0);

  const currentQ = TRIVIA_QUESTIONS[qIndex % TRIVIA_QUESTIONS.length];

  // Timer countdown tick
  React.useEffect(() => {
    if (showAnswer || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 3 && next > 0) sounds.playTick();
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showAnswer, timeLeft]);

  // Handle timeout outside render
  React.useEffect(() => {
    if (timeLeft === 0 && !showAnswer) {
      setShowAnswer(true);
      sounds.playBounce();
    }
  }, [timeLeft, showAnswer]);

  // Sync remote actions
  React.useEffect(() => {
    if (!lastAction) return;
    const { action, payload } = lastAction;

    if (action === 'TRIVIA_ANSWER') {
      setPartnerAnswer(payload.choiceIndex);
      sounds.playPop();
    } else if (action === 'TRIVIA_NEXT') {
      setQIndex(payload.nextIndex);
      setMyAnswer(null);
      setPartnerAnswer(null);
      setShowAnswer(false);
      setTimeLeft(12);
      sounds.playPop();
    }
  }, [lastAction]);

  // When both answer, reveal
  React.useEffect(() => {
    if (myAnswer !== null && partnerAnswer !== null && !showAnswer) {
      setShowAnswer(true);
      if (myAnswer === currentQ.correctIndex) {
        sounds.playCorrect();
        const pts = 100 + timeLeft * 5;
        onScoreUpdate(pts, true);
        setMyStreak((s) => s + 1);
      } else {
        sounds.playBounce();
        setMyStreak(0);
      }
    }
  }, [myAnswer, partnerAnswer, showAnswer, currentQ.correctIndex, timeLeft]);

  // Handle local choice
  const handleSelectOption = (idx: number) => {
    if (myAnswer !== null || showAnswer) return;
    setMyAnswer(idx);
    sounds.playPop();
    sendAction('TRIVIA_ANSWER', { choiceIndex: idx });
  };

  // Next Question
  const handleNextQuestion = () => {
    const nextIdx = qIndex + 1;
    setQIndex(nextIdx);
    setMyAnswer(null);
    setPartnerAnswer(null);
    setShowAnswer(false);
    setTimeLeft(12);
    sendAction('TRIVIA_NEXT', { nextIndex: nextIdx });
    sounds.playPop();
  };

  // Bot simulation
  React.useEffect(() => {
    if (!botMode || partnerAnswer !== null || showAnswer) return;

    const botTimer = setTimeout(() => {
      // 70% chance bot chooses correctly
      const isCorrect = Math.random() < 0.75;
      const botPick = isCorrect
        ? currentQ.correctIndex
        : (currentQ.correctIndex + 1) % currentQ.options.length;
      setPartnerAnswer(botPick);
      sounds.playPop();
    }, 2000 + Math.random() * 2000);

    return () => clearTimeout(botTimer);
  }, [botMode, currentQ, partnerAnswer, showAnswer]);

  return (
    <div className="flex flex-col h-full bg-[#080B15] text-white p-3 sm:p-4 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold tracking-tight">
                Trivia Blitz Speed Duel
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {currentQ.category}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Lock in your answer before the 12-second buzzer!
            </p>
          </div>
        </div>

        {/* Timer & Next */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-xs ${
              timeLeft <= 4
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-white/5 border-white/10 text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>

          <button
            onClick={handleNextQuestion}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="Next Question"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Next</span>
          </button>
        </div>
      </div>

      {/* Question Card */}
      <div className="my-3 p-4 rounded-3xl bg-gradient-to-r from-amber-950/40 to-orange-950/40 border border-amber-500/30 text-center shrink-0">
        <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-extrabold">
          Question #{qIndex + 1}
        </span>
        <h2 className="text-sm sm:text-base font-extrabold text-white mt-1 leading-snug">
          {currentQ.question}
        </h2>
      </div>

      {/* 4 Answer Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
        {currentQ.options.map((opt, idx) => {
          const isSelectedByMe = myAnswer === idx;
          const isSelectedByPartner = partnerAnswer === idx;
          const isCorrect = idx === currentQ.correctIndex;

          let btnClass = 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10';

          if (showAnswer) {
            if (isCorrect) {
              btnClass = 'bg-emerald-950/70 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] text-emerald-200';
            } else if (isSelectedByMe) {
              btnClass = 'bg-rose-950/60 border-rose-400 text-rose-200';
            }
          } else if (isSelectedByMe) {
            btnClass = 'bg-amber-950/60 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] ring-2 ring-amber-400/50';
          }

          const labels = ['A', 'B', 'C', 'D'];

          return (
            <button
              key={idx}
              type="button"
              disabled={myAnswer !== null || showAnswer}
              onClick={() => handleSelectOption(idx)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex items-center justify-between gap-3 cursor-pointer ${btnClass} disabled:cursor-not-allowed`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-white/10 text-gray-300 font-mono font-bold flex items-center justify-center text-xs shrink-0">
                  {labels[idx]}
                </span>
                <span className="text-xs font-bold leading-tight truncate">{opt}</span>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isSelectedByMe && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    You
                  </span>
                )}
                {showAnswer && isSelectedByPartner && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {partnerPseudonym}
                  </span>
                )}
                {showAnswer && isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Result / Fun Fact Callout */}
      {showAnswer && (
        <div className="mt-3 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 animate-fade-in shrink-0">
          <div className="text-xs text-gray-300">
            <span className="text-amber-400 font-bold">💡 Fun Fact: </span>
            <span>{currentQ.funFact}</span>
          </div>
          <button
            onClick={handleNextQuestion}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
          >
            Next 🚀
          </button>
        </div>
      )}
    </div>
  );
};
