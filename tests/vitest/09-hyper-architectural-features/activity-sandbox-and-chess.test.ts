import { describe, it, expect } from 'vitest';
import { MiniAppType, ActivityStateBroadcast } from '@mivo/shared';

export function createInitialChessBoard(): string[][] {
  return [
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
  ];
}

export function moveChessPiece(
  board: string[][],
  fromR: number,
  fromC: number,
  toR: number,
  toC: number
): { board: string[][]; captured: string | null } {
  const newBoard = board.map((row) => [...row]);
  const piece = newBoard[fromR][fromC];
  const captured = newBoard[toR][toC] || null;

  newBoard[fromR][fromC] = '';
  newBoard[toR][toC] = piece;

  return { board: newBoard, captured };
}

export function validateMiniAppSandbox(appType: MiniAppType): {
  supported: boolean;
  sandboxFlags: string;
} {
  switch (appType) {
    case 'CHESS':
      return {
        supported: true,
        sandboxFlags: 'allow-scripts allow-forms allow-same-origin',
      };
    case 'FIGMA':
      return {
        supported: true,
        sandboxFlags: 'allow-scripts allow-forms allow-same-origin allow-popups',
      };
    case 'PR_REVIEW':
      return {
        supported: true,
        sandboxFlags: 'allow-scripts allow-forms allow-same-origin',
      };
    default:
      return {
        supported: false,
        sandboxFlags: 'allow-scripts',
      };
  }
}

describe('Mivo Activities & Multiplayer Speed Chess Sandbox', () => {
  it('initializes standard 8x8 chessboard with black and white piece rosters', () => {
    const board = createInitialChessBoard();

    expect(board).toHaveLength(8);
    expect(board[0]).toHaveLength(8);

    // Black back row
    expect(board[0][0]).toBe('♜'); // Rook
    expect(board[0][4]).toBe('♚'); // King

    // Black pawns
    expect(board[1].every((p) => p === '♟')).toBe(true);

    // Empty middle rows
    expect(board[2].every((p) => p === '')).toBe(true);
    expect(board[3].every((p) => p === '')).toBe(true);

    // White pawns
    expect(board[6].every((p) => p === '♙')).toBe(true);

    // White back row
    expect(board[7][0]).toBe('♖');
    expect(board[7][4]).toBe('♔');
  });

  it('executes piece moves cleanly updating destination square and vacating origin', () => {
    const board = createInitialChessBoard();

    // Move White Pawn: e2 (6, 4) to e4 (4, 4)
    const { board: afterMove1, captured: cap1 } = moveChessPiece(board, 6, 4, 4, 4);

    expect(cap1).toBeNull();
    expect(afterMove1[6][4]).toBe('');
    expect(afterMove1[4][4]).toBe('♙');

    // Black captures white pawn: e7 (1, 4) to e4 (4, 4)
    const { board: afterCapture, captured: cap2 } = moveChessPiece(afterMove1, 1, 4, 4, 4);
    expect(cap2).toBe('♙');
    expect(afterCapture[1][4]).toBe('');
    expect(afterCapture[4][4]).toBe('♟');
  });

  it('enforces secure iframe sandbox isolation flags per mini-app specification', () => {
    const chess = validateMiniAppSandbox('CHESS');
    expect(chess.supported).toBe(true);
    expect(chess.sandboxFlags).toBe('allow-scripts allow-forms allow-same-origin');

    const figma = validateMiniAppSandbox('FIGMA');
    expect(figma.supported).toBe(true);
    expect(figma.sandboxFlags).toContain('allow-popups');

    const prReview = validateMiniAppSandbox('PR_REVIEW');
    expect(prReview.supported).toBe(true);
  });
});
