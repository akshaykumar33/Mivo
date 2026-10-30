'use client';

import * as React from 'react';
import { Trophy, RotateCcw, Zap, Gamepad2 } from 'lucide-react';
import { sounds } from './soundEffects';

interface RetroPongGameProps {
  sessionId: string;
  myPseudonym: string;
  partnerPseudonym: string;
  isHostPlayer: boolean;
  onScoreUpdate: (points: number, isSelf: boolean) => void;
  sendAction: (action: string, payload: any) => void;
  lastAction: { action: string; payload: any; timestamp: number } | null;
  subscribeToActions?: (listener: (action: string, payload: any) => void) => () => void;
  botMode: boolean;
}

export const RetroPongGame: React.FC<RetroPongGameProps> = ({
  sessionId,
  myPseudonym,
  partnerPseudonym,
  isHostPlayer,
  onScoreUpdate,
  sendAction,
  lastAction,
  subscribeToActions,
  botMode,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Game coordinates and dimensions
  const COURT_W = 640;
  const COURT_H = 360;
  const PADDLE_W = 12;
  const PADDLE_H = 70;
  const BALL_SIZE = 10;
  const WINNING_SCORE = 5;

  // Local state
  const [p1Score, setP1Score] = React.useState(0);
  const [p2Score, setP2Score] = React.useState(0);
  const [gameOver, setGameOver] = React.useState(false);
  const [winner, setWinner] = React.useState<string | null>(null);

  // Realtime physics and state refs to avoid closure stalls
  const p1ScoreRef = React.useRef(0);
  const p2ScoreRef = React.useRef(0);
  const gameOverRef = React.useRef(false);
  const winnerRef = React.useRef<string | null>(null);

  const p1YRef = React.useRef(COURT_H / 2 - PADDLE_H / 2);
  const p2YRef = React.useRef(COURT_H / 2 - PADDLE_H / 2);
  const ballRef = React.useRef({
    x: COURT_W / 2,
    y: COURT_H / 2,
    vx: 4.5 * (Math.random() > 0.5 ? 1 : -1),
    vy: 3 * (Math.random() > 0.5 ? 1 : -1),
    speed: 5.5,
  });
  const syncFrameRef = React.useRef(0);
  const lastMoveEmitRef = React.useRef(0);

  const isHost = isHostPlayer; // Player 1 is Host, authoritative physics

  const resetGame = () => {
    p1ScoreRef.current = 0;
    p2ScoreRef.current = 0;
    gameOverRef.current = false;
    winnerRef.current = null;
    setP1Score(0);
    setP2Score(0);
    setGameOver(false);
    setWinner(null);
    p1YRef.current = COURT_H / 2 - PADDLE_H / 2;
    p2YRef.current = COURT_H / 2 - PADDLE_H / 2;
    ballRef.current = {
      x: COURT_W / 2,
      y: COURT_H / 2,
      vx: 4.5 * (Math.random() > 0.5 ? 1 : -1),
      vy: 3 * (Math.random() > 0.5 ? 1 : -1),
      speed: 5.5,
    };
  };

  // Action handler (direct subscription or lastAction fallback)
  const handleAction = React.useCallback(
    (action: string, payload: any) => {
      if (action === 'PONG_MOVE') {
        if (isHost) {
          p2YRef.current = payload.y;
        } else {
          p1YRef.current = payload.y;
        }
      } else if (action === 'PONG_BALL_SYNC' && !isHost) {
        ballRef.current = payload.ball;
        p1ScoreRef.current = payload.p1Score;
        p2ScoreRef.current = payload.p2Score;
        setP1Score(payload.p1Score);
        setP2Score(payload.p2Score);
        if (payload.gameOver) {
          gameOverRef.current = true;
          winnerRef.current = payload.winner;
          setGameOver(true);
          setWinner(payload.winner);
        }
      } else if (action === 'PONG_RESET') {
        resetGame();
      }
    },
    [isHost]
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

  // Paddle movement dispatcher with ~25ms throttle
  const updatePaddlePosition = React.useCallback(
    (clampedY: number) => {
      if (isHost) {
        p1YRef.current = clampedY;
      } else {
        p2YRef.current = clampedY;
      }

      const now = Date.now();
      if (now - lastMoveEmitRef.current >= 25) {
        lastMoveEmitRef.current = now;
        sendAction('PONG_MOVE', { y: clampedY });
      }
    },
    [isHost, sendAction]
  );

  // Mouse / Touch controller for local paddle
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleY = COURT_H / rect.height;
    const clientY = (e.clientY - rect.top) * scaleY;
    const clampedY = Math.max(0, Math.min(COURT_H - PADDLE_H, clientY - PADDLE_H / 2));
    updatePaddlePosition(clampedY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    const scaleY = COURT_H / rect.height;
    const clientY = (e.touches[0].clientY - rect.top) * scaleY;
    const clampedY = Math.max(0, Math.min(COURT_H - PADDLE_H, clientY - PADDLE_H / 2));
    updatePaddlePosition(clampedY);
  };

  // Keyboard controls (Arrow keys or W/S)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOverRef.current) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        const currentY = isHost ? p1YRef.current : p2YRef.current;
        const newY = Math.max(0, currentY - 24);
        updatePaddlePosition(newY);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        const currentY = isHost ? p1YRef.current : p2YRef.current;
        const newY = Math.min(COURT_H - PADDLE_H, currentY + 24);
        updatePaddlePosition(newY);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHost, updatePaddlePosition]);

  // Main 60 FPS Game Loop
  React.useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = '#06070E';
      ctx.fillRect(0, 0, COURT_W, COURT_H);

      // Draw Center Net
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(COURT_W / 2, 0);
      ctx.lineTo(COURT_W / 2, COURT_H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Paddles
      // P1 (Cyan)
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#06B6D4';
      ctx.fillStyle = '#06B6D4';
      ctx.fillRect(20, p1YRef.current, PADDLE_W, PADDLE_H);

      // P2 (Magenta/Rose)
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#F43F5E';
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(COURT_W - 20 - PADDLE_W, p2YRef.current, PADDLE_W, PADDLE_H);
      ctx.shadowBlur = 0;

      // Host controls authoritative ball physics
      if (isHost && !gameOverRef.current) {
        const ball = ballRef.current;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Bot AI opponent logic if botMode or solo
        if (botMode || !partnerPseudonym) {
          const targetY = ball.y - PADDLE_H / 2;
          p2YRef.current += (targetY - p2YRef.current) * 0.12;
          p2YRef.current = Math.max(0, Math.min(COURT_H - PADDLE_H, p2YRef.current));
        }

        // Top/Bottom Wall Collisions
        if (ball.y <= BALL_SIZE / 2) {
          ball.y = BALL_SIZE / 2;
          ball.vy = Math.abs(ball.vy);
          sounds.playBounce();
        } else if (ball.y >= COURT_H - BALL_SIZE / 2) {
          ball.y = COURT_H - BALL_SIZE / 2;
          ball.vy = -Math.abs(ball.vy);
          sounds.playBounce();
        }

        // P1 Paddle Collision
        if (
          ball.x - BALL_SIZE / 2 <= 20 + PADDLE_W &&
          ball.x + BALL_SIZE / 2 >= 20 &&
          ball.y >= p1YRef.current &&
          ball.y <= p1YRef.current + PADDLE_H
        ) {
          ball.vx = Math.abs(ball.vx) * 1.05;
          const deltaY = ball.y - (p1YRef.current + PADDLE_H / 2);
          ball.vy = deltaY * 0.22;
          ball.x = 20 + PADDLE_W + BALL_SIZE / 2;
          sounds.playPop();
        }

        // P2 Paddle Collision
        if (
          ball.x + BALL_SIZE / 2 >= COURT_W - 20 - PADDLE_W &&
          ball.x - BALL_SIZE / 2 <= COURT_W - 20 &&
          ball.y >= p2YRef.current &&
          ball.y <= p2YRef.current + PADDLE_H
        ) {
          ball.vx = -Math.abs(ball.vx) * 1.05;
          const deltaY = ball.y - (p2YRef.current + PADDLE_H / 2);
          ball.vy = deltaY * 0.22;
          ball.x = COURT_W - 20 - PADDLE_W - BALL_SIZE / 2;
          sounds.playPop();
        }

        // Scoring
        if (ball.x < 0) {
          // P2 scores
          const nextP2 = p2ScoreRef.current + 1;
          p2ScoreRef.current = nextP2;
          setP2Score(nextP2);
          sounds.playBounce();
          if (nextP2 >= WINNING_SCORE) {
            gameOverRef.current = true;
            const wName = isHost ? partnerPseudonym : myPseudonym;
            winnerRef.current = wName;
            setGameOver(true);
            setWinner(wName);
            sounds.playFanfare();
            onScoreUpdate(100, !isHost);
          }
          ball.x = COURT_W / 2;
          ball.y = COURT_H / 2;
          ball.vx = 4.5;
          ball.vy = 2.5 * (Math.random() > 0.5 ? 1 : -1);
        } else if (ball.x > COURT_W) {
          // P1 scores
          const nextP1 = p1ScoreRef.current + 1;
          p1ScoreRef.current = nextP1;
          setP1Score(nextP1);
          sounds.playBounce();
          if (nextP1 >= WINNING_SCORE) {
            gameOverRef.current = true;
            const wName = isHost ? myPseudonym : partnerPseudonym;
            winnerRef.current = wName;
            setGameOver(true);
            setWinner(wName);
            sounds.playFanfare();
            onScoreUpdate(100, isHost);
          }
          ball.x = COURT_W / 2;
          ball.y = COURT_H / 2;
          ball.vx = -4.5;
          ball.vy = 2.5 * (Math.random() > 0.5 ? 1 : -1);
        }

        // Sync ball state to peer (throttled to ~20 fps to avoid saturation)
        syncFrameRef.current++;
        if (syncFrameRef.current % 3 === 0 || gameOverRef.current) {
          sendAction('PONG_BALL_SYNC', {
            ball,
            p1Score: p1ScoreRef.current,
            p2Score: p2ScoreRef.current,
            gameOver: gameOverRef.current,
            winner: winnerRef.current,
          });
        }
      } else if (!isHost && !gameOverRef.current) {
        // Guest client dead reckoning interpolation between sync frames
        const ball = ballRef.current;
        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.y <= BALL_SIZE / 2) {
          ball.y = BALL_SIZE / 2;
          ball.vy = Math.abs(ball.vy);
        } else if (ball.y >= COURT_H - BALL_SIZE / 2) {
          ball.y = COURT_H - BALL_SIZE / 2;
          ball.vy = -Math.abs(ball.vy);
        }
      }

      // Draw Ball
      const ball = ballRef.current;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#FBBF24';
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isHost, botMode, partnerPseudonym, myPseudonym, onScoreUpdate, sendAction]);

  return (
    <div className="flex flex-col h-full bg-[#070913] text-white p-3 sm:p-4 select-none">
      {/* Header & Scoreboard */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold tracking-tight">
              Neon Retro Pong
            </h3>
            <p className="text-[10px] text-gray-400">
              Drag mouse/touch to control your paddle. First to {WINNING_SCORE} wins!
            </p>
          </div>
        </div>

        {/* Live Score Display */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-1.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-gray-300 font-bold">{isHost ? 'You' : partnerPseudonym}:</span>
            <span className="text-cyan-400 font-black text-sm">{p1Score}</span>
          </div>

          <span className="text-gray-600 font-mono text-xs">VS</span>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-gray-300 font-bold">{!isHost ? 'You' : partnerPseudonym}:</span>
            <span className="text-rose-400 font-black text-sm">{p2Score}</span>
          </div>
        </div>

        <button
          onClick={() => {
            resetGame();
            sendAction('PONG_RESET', {});
            sounds.playPop();
          }}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
          title="Reset Match"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Court Area */}
      <div className="relative flex-1 min-h-[220px] rounded-2xl overflow-hidden bg-[#0A0C18] border border-cyan-500/20 flex items-center justify-center shadow-2xl my-2">
        <canvas
          ref={canvasRef}
          width={COURT_W}
          height={COURT_H}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="w-full h-full object-contain cursor-ns-resize"
        />

        {/* Victory Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center space-y-3 animate-fade-in z-20">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-primary,#6366f1)] text-white flex items-center justify-center shadow-lg">
              <Trophy className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <h4 className="text-xl font-bold font-display text-white">
                {winner} Triumphs!
              </h4>
              <p className="text-xs text-amber-300 font-mono mt-0.5">
                Final Score: {p1Score} - {p2Score} (+100 PTS)
              </p>
            </div>
            <button
              onClick={() => {
                resetGame();
                sendAction('PONG_RESET', {});
                sounds.playFanfare();
              }}
              className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary,#6366f1)] hover:opacity-90 active:scale-[0.98] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              Play Rematch
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 shrink-0">
        <div className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span>Move cursor or finger up/down on the court to shield your goal!</span>
        </div>
        <div className="font-mono text-[10px] text-gray-500">
          Role: {isHost ? 'Cyan Paddle (Left)' : 'Rose Paddle (Right)'}
        </div>
      </div>
    </div>
  );
};
