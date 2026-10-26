'use client';

import * as React from 'react';
import {
  X,
  BookOpen,
  Paintbrush,
  Gamepad2,
  CircleDot,
  Zap,
  Layers,
  Brain,
  Smile,
  Clock,
  CheckCircle2,
  Trophy,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { JamGameType } from './CanvasTriviaJamPlayground';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGame?: JamGameType;
}

export const GAME_RULES_DATA: Record<
  JamGameType,
  {
    title: string;
    icon: any;
    color: string;
    summary: string;
    objective: string;
    controls: string[];
    scoring: string[];
    proTip: string;
  }
> = {
  DOODLE: {
    title: 'Speed Doodling / Guess-the-Sketch',
    icon: Paintbrush,
    color: 'from-pink-500 to-rose-600',
    summary: 'A fast-paced 60-second draw & guess round between two players.',
    objective: 'The artist draws the secret prompt while the guesser tries to deduce the word before the 60-second timer hits zero.',
    controls: [
      'Artist: Click color swatches, choose brush or eraser, and draw smoothly on the canvas.',
      'Guesser: Type guesses into the guess field and press Enter or click Guess.',
      'Swap: Click "Swap" in the top bar to trade roles anytime.',
    ],
    scoring: [
      '+100 PTS for correctly guessing the sketch.',
      'Automatic letter hints are revealed on the board at 40s and 20s remaining.',
    ],
    proTip: 'Keep sketches simple and iconic. Don’t worry about masterpiece art—speed and clear silhouettes win the round!',
  },
  PONG: {
    title: 'Neon Retro Pong (2-Player Duel)',
    icon: Gamepad2,
    color: 'from-cyan-500 to-blue-600',
    summary: 'A glowing synthwave arcade battle of agility and reflexes.',
    objective: 'Deflect the ball past your opponent’s paddle. The first player to score 5 points takes the champion crown.',
    controls: [
      'Player 1 (Left / Cyan): Move your mouse or drag finger up and down to position your paddle.',
      'Player 2 (Right / Rose): Move your mouse or drag finger up and down.',
      'Reset: Click the Reset button to restart the match at 0-0.',
    ],
    scoring: [
      '+100 PTS to the player who reaches 5 goals first.',
      'The ball accelerates with every successful paddle volley!',
    ],
    proTip: 'Hitting the ball with the edges of your paddle angles the trajectory sharply, making it harder for your opponent to return.',
  },
  CONNECT4: {
    title: 'Four-in-a-Row Clash (Connect-4)',
    icon: CircleDot,
    color: 'from-indigo-500 to-purple-600',
    summary: 'The legendary vertical strategy duel with glowing neon discs.',
    objective: 'Drop discs into the 7-column grid to connect 4 of your color horizontally, vertically, or diagonally before your rival.',
    controls: [
      'Hover over columns to see the drop preview indicator.',
      'Click a column to release your disc into the lowest available slot.',
      'Turns alternate automatically between Player 1 (Cyan) and Player 2 (Rose).',
    ],
    scoring: [
      '+100 PTS for completing any 4-in-a-row combination.',
      'Winning discs light up with a glowing championship halo.',
    ],
    proTip: 'Control the center column! The 4th column gives you the highest mathematical opportunities for diagonal and horizontal lines.',
  },
  WORD_CHAIN: {
    title: 'Word Chain Blitz (Word Association Duel)',
    icon: Zap,
    color: 'from-amber-500 to-rose-600',
    summary: 'A rapid-fire word association duel with a 12-second bomb timer.',
    objective: 'Type a word that begins with the exact last letter of the previous word before your turn timer expires.',
    controls: [
      'Look at the golden required letter banner at the top.',
      'Type your word and press Enter or click Submit.',
      'Words must be at least 3 letters long and cannot repeat earlier chain words.',
    ],
    scoring: [
      '+10 PTS per letter of your word length.',
      '+20 PTS speed bonus if answered within the first 4 seconds.',
      'Streak multiplier increases with every successful link!',
    ],
    proTip: 'Avoid ending your words in difficult letters like Q, X, or J unless you want to put your partner under intense pressure!',
  },
  DILEMMA: {
    title: 'Interactive Dilemma Deck',
    icon: Layers,
    color: 'from-purple-500 to-pink-600',
    summary: 'Swipeable cards with hilarious "Would You Rather" and "Rank 4 Things" scenarios.',
    objective: 'Discover how you and your partner think! Vote in secret, then reveal and compare your answers.',
    controls: [
      'Would You Rather: Click Option A or Option B. Once both players vote, the card flips with a 3D reveal.',
      'Rank 4: Use the ▲ and ▼ buttons to arrange items from #1 to #4, then click "Lock In Ranking".',
      'Next Card: Click "Next Card" to pull another hilarious dilemma from the deck.',
    ],
    scoring: [
      '+100 PTS for matching choices ("100% Vibe Match!").',
      '+50 PTS for hilarious contrasting choices.',
      'Compatibility gauge shows percentage match breakdown.',
    ],
    proTip: 'Use the live chat on the left to debate your choices—the best conversations always start from crazy food and superpower dilemmas!',
  },
  TRIVIA: {
    title: 'Trivia Blitz (Speed Duel)',
    icon: Brain,
    color: 'from-yellow-400 to-orange-500',
    summary: 'A 12-second buzzer multiple choice race with mind-bending facts.',
    objective: 'Lock in your answer choice before the countdown buzzer expires.',
    controls: [
      'Read the question and click one of the 4 answer cards (A, B, C, or D).',
      'Both players answer simultaneously.',
      'Click "Next" to advance to the next trivia round.',
    ],
    scoring: [
      '+100 PTS base score for a correct answer.',
      'Up to +50 PTS bonus for speed (the faster you buzz, the more points you get).',
    ],
    proTip: 'Read the "Fun Fact" box after each question—they make great conversation starters for live chat!',
  },
  EMOJI: {
    title: 'Emoji Riddle Jam (Pop Culture Decoder)',
    icon: Smile,
    color: 'from-emerald-400 to-teal-500',
    summary: 'Decipher popular movies, franchises, and songs from emoji strings.',
    objective: 'Decode the secret title from the emojis and type your solution into the guess bar.',
    controls: [
      'Study the emoji sequence and check the letter blanks.',
      'Click "Need a Hint?" if you need an additional clue.',
      'Type your answer in the solve box and click Solve.',
    ],
    scoring: [
      '+100 PTS for the first player to decode the riddle correctly.',
    ],
    proTip: 'Think about famous movie quotes, character outfits, and iconic plot twists represented by each emoji!',
  },
  REFLEX: {
    title: 'Reflex Tap Clash (Millisecond Duel)',
    icon: Clock,
    color: 'from-rose-500 to-red-600',
    summary: 'A high-stakes millisecond reaction time duel.',
    objective: 'Tap the screen as fast as humanly possible the instant the red screen flashes bright NEON GREEN.',
    controls: [
      'Click "Start Countdown!" to prime the arena.',
      'Do NOT tap while the screen is dark red ("WAIT FOR GREEN...").',
      'The millisecond the screen turns GREEN ("TAP NOW!"), click anywhere in the arena!',
    ],
    scoring: [
      '+100 PTS for the faster millisecond reaction time.',
      'Tapping during the red phase triggers a FALSE START penalty!',
      'Best of 5 rounds determines the ultimate reflex champion.',
    ],
    proTip: 'Keep your finger hovering 1 millimeter above the button or screen for sub-200ms reaction times!',
  },
};

export const GameRulesModal: React.FC<GameRulesModalProps> = ({
  isOpen,
  onClose,
  defaultGame = 'DOODLE',
}) => {
  const [selectedGame, setSelectedGame] = React.useState<JamGameType>(defaultGame);

  React.useEffect(() => {
    if (defaultGame) {
      setSelectedGame(defaultGame);
    }
  }, [defaultGame]);

  if (!isOpen) return null;

  const activeData = GAME_RULES_DATA[selectedGame];
  const Icon = activeData.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0C0F1E] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white relative">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-[#11162B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight font-display text-white">
                Game Rules &amp; How to Play
              </h2>
              <p className="text-xs text-gray-400">
                Master all 8 games in the Co-Op Canvas &amp; Trivia Jam Playground
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Game Navigation Pills */}
        <div className="px-3 py-2 bg-[#090C19] border-b border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {(Object.keys(GAME_RULES_DATA) as JamGameType[]).map((key) => {
            const item = GAME_RULES_DATA[key];
            const ItemIcon = item.icon;
            const isSel = selectedGame === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedGame(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSel
                    ? `bg-gradient-to-r ${item.color} text-white shadow-md scale-102`
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <ItemIcon className="w-3.5 h-3.5" />
                <span>{item.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Rules Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Active Game Hero */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${activeData.color} flex items-center justify-center text-white shadow-lg shrink-0`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white font-display">
                {activeData.title}
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">{activeData.summary}</p>
            </div>
          </div>

          {/* Objective */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-400 mb-1.5 flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              <span>Objective</span>
            </h4>
            <p className="text-xs text-gray-200 leading-relaxed bg-[#0E1224] p-3 rounded-xl border border-white/5">
              {activeData.objective}
            </p>
          </div>

          {/* Controls & How to Play */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4" />
              <span>How to Play &amp; Controls</span>
            </h4>
            <div className="space-y-1.5 bg-[#0E1224] p-3 rounded-xl border border-white/5">
              {activeData.controls.map((ctrl, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span>{ctrl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Points & Scoring */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>Scoring &amp; Rewards</span>
            </h4>
            <div className="space-y-1.5 bg-[#0E1224] p-3 rounded-xl border border-white/5">
              {activeData.scoring.map((sc, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{sc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tip */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
            <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 block font-bold">Pro-Tip for Strangers:</strong>
              <span>{activeData.proTip}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#0E1224] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-400">
            Click any game pill above to read its rules.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition-transform hover:scale-105"
          >
            Got It! Let's Jam
          </button>
        </div>
      </div>
    </div>
  );
};
