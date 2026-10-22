'use client';

import * as React from 'react';
import { Trophy, RotateCcw, CircleDot, Sparkles, CheckCircle2 } from 'lucide-react';
import { sounds } from './soundEffects';

interface ConnectFourGameProps {
  sessionId: string;
  myPseudonym: string;
  partnerPseudonym: string;
  isPlayer1: boolean;
  onScoreUpdate: (points: number, isSelf: boolean) => void;
  sendAction: (action: string, payload: any) => void;
  lastAction: { action: string; payload: any; timestamp: number } | null;
  botMode: boolean;
}

const ROWS = 6;
const COLS = 7;

type CellValue = null | 1 | 2; // 1 = P1 (Cyan), 2 = P2 (Rose)

export const ConnectFourGame: React.FC<ConnectFourGameProps> = ({
  sessionId,
  myPseudonym,
  partnerPseudonym,
  isPlayer1,
  onScoreUpdate,
  sendAction,
  lastAction,
  botMode,
}) => {
  const [board, setBoard] = React.useState<CellValue[][]>(() =>
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null))
  );

  const [currentTurn, setCurrentTurn] = React.useState<1 | 2>(1); // P1 starts
  const [winner, setWinner] = React.useState<1 | 2 | 'DRAW' | null>(null);
  const [winningCells, setWinningCells] = React.useState<[number, number][]>([]);
  const [hoverCol, setHoverCol] = React.useState<number | null>(null);

  const myPlayerNum = isPlayer1 ? 1 : 2;
  const isMyTurn = currentTurn === myPlayerNum && !winner;

  // Check 4-in-a-row
  const checkWin = (grid: CellValue[][]): { winner: 1 | 2 | null; cells: [number, number][] } => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = grid[r][c];
        if (val && val === grid[r][c + 1] && val === grid[r][c + 2] && val === grid[r][c + 3]) {
          return {
            winner: val,
            cells: [
              [r, c],
              [r, c + 1],
              [r, c + 2],
              [r, c + 3],
            ],
          };
        }
      }
    }

    // Vertical
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = grid[r][c];
        if (val && val === grid[r + 1][c] && val === grid[r + 2][c] && val === grid[r + 3][c]) {
          return {
            winner: val,
            cells: [
              [r, c],
              [r + 1, c],
              [r + 2, c],
              [r + 3, c],
            ],
          };
        }
      }
    }

    // Diagonal Down-Right
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = grid[r][c];
        if (
          val &&
          val === grid[r + 1][c + 1] &&
          val === grid[r + 2][c + 2] &&
          val === grid[r + 3][c + 3]
        ) {
          return {
            winner: val,
            cells: [
              [r, c],
              [r + 1, c + 1],
              [r + 2, c + 2],
              [r + 3, c + 3],
            ],
          };
        }
      }
    }

    // Diagonal Up-Right
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = grid[r][c];
        if (
          val &&
          val === grid[r - 1][c + 1] &&
          val === grid[r - 2][c + 2] &&
          val === grid[r - 3][c + 3]
        ) {
          return {
            winner: val,
            cells: [
              [r, c],
              [r - 1, c + 1],
              [r - 2, c + 2],
              [r - 3, c + 3],
            ],
          };
        }
      }
    }

    return { winner: null, cells: [] };
  };

  // Drop disc into column
  const dropDisc = (col: number, player: 1 | 2, notify = true) => {
    if (winner) return;

    // Find lowest available row in column
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][col]) {
        targetRow = r;
        break;
      }
    }

    if (targetRow === -1) return; // Column full

    const newBoard = board.map((row) => [...row]);
    newBoard[targetRow][col] = player;
    setBoard(newBoard);
    sounds.playBounce();

    // Check Win
    const winResult = checkWin(newBoard);
    if (winResult.winner) {
      setWinner(winResult.winner);
      setWinningCells(winResult.cells);
      sounds.playCorrect();
      onScoreUpdate(100, winResult.winner === myPlayerNum);
    } else {
      // Check full board draw
      const isDraw = newBoard.every((row) => row.every((c) => c !== null));
      if (isDraw) {
        setWinner('DRAW');
      } else {
        setCurrentTurn(player === 1 ? 2 : 1);
      }
    }

    if (notify) {
      sendAction('CONNECT4_MOVE', { col, player });
    }
  };

  // Remote sync
  React.useEffect(() => {
    if (!lastAction) return;
    const { action, payload } = lastAction;

    if (action === 'CONNECT4_MOVE') {
      dropDisc(payload.col, payload.player, false);
    } else if (action === 'CONNECT4_RESET') {
      resetGame(false);
    }
  }, [lastAction]);

  const resetGame = (notify = true) => {
    setBoard(
      Array(ROWS)
        .fill(null)
        .map(() => Array(COLS).fill(null))
    );
    setCurrentTurn(1);
    setWinner(null);
    setWinningCells([]);
    if (notify) {
      sendAction('CONNECT4_RESET', {});
      sounds.playPop();
    }
  };

  // Bot move simulation
  React.useEffect(() => {
    if (!botMode || winner || isMyTurn) return;

    const timer = setTimeout(() => {
      // Pick random valid column
      const validCols: number[] = [];
      for (let c = 0; c < COLS; c++) {
        if (!board[0][c]) validCols.push(c);
      }
      if (validCols.length > 0) {
        const chosen = validCols[Math.floor(Math.random() * validCols.length)];
        dropDisc(chosen, myPlayerNum === 1 ? 2 : 1, false);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [botMode, currentTurn, winner, isMyTurn, board]);

  return (
    <div className="flex flex-col h-full bg-[#080A14] text-white p-3 sm:p-4 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <CircleDot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold tracking-tight">
              Four-in-a-Row Clash
            </h3>
            <p className="text-[10px] text-gray-400">
              Connect 4 discs horizontally, vertically, or diagonally!
            </p>
          </div>
        </div>

        {/* Turn indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
              isMyTurn
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 animate-pulse'
                : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                currentTurn === 1 ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
              }`}
            />
            <span>
              {winner
                ? 'Game Over'
                : isMyTurn
                ? 'Your Turn!'
                : `${partnerPseudonym}'s Turn...`}
            </span>
          </div>

          <button
            onClick={() => resetGame(true)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs"
            title="Reset Board"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-2 my-2">
        {/* Column Drop Indicators */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 w-full max-w-sm mb-1 px-2">
          {Array(COLS)
            .fill(null)
            .map((_, col) => (
              <button
                key={col}
                disabled={!isMyTurn || !!winner || board[0][col] !== null}
                onMouseEnter={() => setHoverCol(col)}
                onMouseLeave={() => setHoverCol(null)}
                onClick={() => dropDisc(col, myPlayerNum, true)}
                className={`h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  hoverCol === col && isMyTurn
                    ? 'bg-cyan-500/30 border border-cyan-400/50 scale-105'
                    : 'bg-transparent'
                } disabled:cursor-not-allowed`}
              >
                {hoverCol === col && isMyTurn && (
                  <span className="text-[10px] text-cyan-400 animate-bounce">▼</span>
                )}
              </button>
            ))}
        </div>

        {/* 7x6 Board Frame */}
        <div className="w-full max-w-sm p-3 bg-gradient-to-b from-[#11142A] to-[#0A0D1E] border-2 border-indigo-500/30 rounded-3xl shadow-[0_0_30px_rgba(99,102,241,0.2)]">
          <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isWinCell = winningCells.some(([wr, wc]) => wr === r && wc === c);
                return (
                  <button
                    key={`${r}-${c}`}
                    disabled={!isMyTurn || !!winner || board[0][c] !== null}
                    onClick={() => dropDisc(c, myPlayerNum, true)}
                    className="aspect-square rounded-full flex items-center justify-center bg-[#06070E] border border-white/10 relative overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer"
                  >
                    {cell === 1 && (
                      <div
                        className={`w-full h-full rounded-full bg-gradient-to-tr from-cyan-600 to-cyan-300 shadow-[0_0_12px_#06b6d4] ${
                          isWinCell ? 'ring-4 ring-white animate-bounce' : 'animate-drop-in'
                        }`}
                      />
                    )}
                    {cell === 2 && (
                      <div
                        className={`w-full h-full rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 shadow-[0_0_12px_#f43f5e] ${
                          isWinCell ? 'ring-4 ring-white animate-bounce' : 'animate-drop-in'
                        }`}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Victory Popup */}
        {winner && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center space-y-3 rounded-2xl animate-fade-in z-20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-500 text-white flex items-center justify-center shadow-xl">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xl font-black font-display text-white">
                {winner === 'DRAW'
                  ? "It's a Stalemate!"
                  : winner === myPlayerNum
                  ? 'Victory is Yours! 🏆'
                  : `${partnerPseudonym} Takes the Crown! 👑`}
              </h4>
              <p className="text-xs text-cyan-300 font-mono mt-0.5">
                {winner === myPlayerNum ? 'Master Strategist (+100 PTS)' : 'Spectacular 4-in-a-Row!'}
              </p>
            </div>
            <button
              onClick={() => resetGame(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              Play Again ⚡
            </button>
          </div>
        )}
      </div>

      {/* Legend footer */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 px-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          <span>You ({isPlayer1 ? 'P1' : 'P2'})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
          <span>{partnerPseudonym} ({isPlayer1 ? 'P2' : 'P1'})</span>
        </div>
      </div>
    </div>
  );
};
