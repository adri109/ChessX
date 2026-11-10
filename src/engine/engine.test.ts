import { describe, expect, it } from 'vitest';
import {
  Game,
  IllegalMoveError,
  createPosition,
  fromFEN,
  getStatus,
  isInCheck,
  legalMoves,
  legalMovesFrom,
  parseSquare,
  roguelikeTestPosition,
  squareName,
  standardPosition,
  toFEN,
  applyMove,
  type Position,
} from './index';

const targets = (pos: Position, from: string): string[] =>
  legalMovesFrom(pos, parseSquare(from)).map((m) => squareName(m.to)).sort();

function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = legalMoves(pos);
  if (depth === 1) return moves.length;
  return moves.reduce((n, m) => n + perft(applyMove(pos, m), depth - 1), 0);
}

describe('squares & FEN', () => {
  it('round-trips square names', () => {
    expect(parseSquare('a1')).toBe(0);
    expect(parseSquare('h8')).toBe(63);
    expect(squareName(parseSquare('e4'))).toBe('e4');
    expect(() => parseSquare('i9')).toThrow();
  });
  it('round-trips FEN placement', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w';
    expect(toFEN(fromFEN(fen))).toBe(fen);
  });
  it('accepts arbitrary non-standard setups', () => {
    const pos = createPosition({ white: ['Ke1', 'Pe2'], black: ['Ke8', 'Rd8'] });
    expect(toFEN(pos)).toBe('3rk3/8/8/8/8/8/4P3/4K3 w');
  });
});

describe('piece movement', () => {
  it('knight moves in L shapes and jumps', () => {
    const pos = fromFEN('4k3/8/8/8/3N4/8/8/4K3 w');
    expect(targets(pos, 'd4')).toEqual(['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5']);
  });
  it('knight in corner has two moves', () => {
    expect(targets(fromFEN('4k3/8/8/8/8/8/8/N3K3 w'), 'a1')).toEqual(['b3', 'c2']);
  });
  it('bishop slides diagonally and stops at blockers / captures', () => {
    const pos = fromFEN('4k3/8/5p2/8/3B4/2P5/8/4K3 w');
    expect(targets(pos, 'd4')).toEqual(['a7', 'b6', 'c5', 'e3', 'e5', 'f2', 'f6', 'g1']);
  });
  it('rook slides orthogonally', () => {
    const pos = fromFEN('4k3/8/8/8/R2p4/8/8/4K3 w');
    expect(targets(pos, 'a4')).toEqual(
      ['a1', 'a2', 'a3', 'a5', 'a6', 'a7', 'a8', 'b4', 'c4', 'd4'].sort(),
    );
  });
  it('queen combines rook and bishop', () => {
    const pos = fromFEN('4k3/8/8/8/3Q4/8/8/7K w');
    expect(legalMovesFrom(pos, parseSquare('d4'))).toHaveLength(27);
  });
  it('king moves one step and cannot step into attack', () => {
    const pos = fromFEN('4k3/8/8/8/8/8/r7/4K3 w');
    expect(targets(pos, 'e1')).toEqual(['d1', 'f1']);
  });
  it('king cannot capture a protected piece', () => {
    const pos = fromFEN('4k3/8/8/8/8/1n6/3r4/4K3 w');
    expect(targets(pos, 'e1')).toEqual(['f1']);
  });
});

describe('pawns', () => {
  it('moves one or two squares from start rank', () => {
    expect(targets(standardPosition(), 'e2')).toEqual(['e3', 'e4']);
    expect(targets(standardPosition(), 'e7')).toEqual([]); // not black's turn
  });
  it('cannot double-step off start rank or through a blocker', () => {
    expect(targets(fromFEN('4k3/8/8/8/8/4P3/8/4K3 w'), 'e3')).toEqual(['e4']);
    expect(targets(fromFEN('4k3/8/8/8/8/4n3/4P3/4K3 w'), 'e2')).toEqual([]);
    expect(targets(fromFEN('4k3/8/8/8/4n3/8/4P3/4K3 w'), 'e2')).toEqual(['e3']);
  });
  it('captures diagonally only', () => {
    const pos = fromFEN('4k3/8/8/3p1p2/4P3/8/8/4K3 w');
    expect(targets(pos, 'e4')).toEqual(['d5', 'e5', 'f5']);
    const forward = fromFEN('4k3/8/8/4p3/4P3/8/8/4K3 w');
    expect(targets(forward, 'e4')).toEqual([]);
  });
  it('black pawns move down', () => {
    const pos = fromFEN('4k3/4p3/8/8/8/8/8/4K3 b');
    expect(targets(pos, 'e7')).toEqual(['e5', 'e6']);
  });
  it('promotes to four piece types', () => {
    const pos = fromFEN('4k3/P7/8/8/8/8/8/4K3 w');
    const moves = legalMovesFrom(pos, parseSquare('a7'));
    expect(moves.map((m) => m.promotion).sort()).toEqual(['bishop', 'knight', 'queen', 'rook']);
  });
  it('promotion by capture and Game.move applies chosen piece', () => {
    const game = new Game(fromFEN('1r2k3/P7/8/8/8/8/8/4K3 w'));
    const mv = game.move(parseSquare('a7'), parseSquare('b8'), 'knight');
    expect(mv.captured).toBe('rook');
    expect(game.board[parseSquare('b8')]).toEqual({ type: 'knight', color: 'white' });
  });
  it('promotion defaults to queen', () => {
    const game = new Game(fromFEN('4k3/P7/8/8/8/8/8/4K3 w'));
    game.move(parseSquare('a7'), parseSquare('a8'));
    expect(game.board[parseSquare('a8')]).toEqual({ type: 'queen', color: 'white' });
  });
});

describe('check, pins, status', () => {
  it('detects check', () => {
    const pos = fromFEN('4k3/8/8/8/8/8/4r3/4K3 w');
    expect(isInCheck(pos.board, 'white')).toBe(true);
    expect(getStatus(pos)).toBe('check');
  });
  it('must resolve check: only capture, block or move away', () => {
    const pos = fromFEN('4k3/8/8/8/8/8/4r3/R3K3 w');
    expect(targets(pos, 'a1')).toEqual([]);
    expect(targets(pos, 'e1')).toEqual(['d1', 'e2', 'f1']);
  });
  it('a check can be blocked by another piece', () => {
    const pos = fromFEN('4r1k1/8/8/8/8/2B5/8/4K3 w');
    expect(isInCheck(pos.board, 'white')).toBe(true);
    expect(targets(pos, 'c3')).toEqual(['e5']);
  });
  it('pinned piece cannot leave the pin line', () => {
    const pos = fromFEN('4r1k1/8/8/8/8/8/4R3/4K3 w');
    expect(targets(pos, 'e2')).toEqual(['e3', 'e4', 'e5', 'e6', 'e7', 'e8']);
    const pinnedKnight = fromFEN('4r1k1/8/8/8/8/8/4N3/4K3 w');
    expect(targets(pinnedKnight, 'e2')).toEqual([]);
  });
  it('back rank mate', () => {
    const pos = fromFEN('R5k1/5ppp/8/8/8/8/8/6K1 b');
    expect(getStatus(pos)).toBe('checkmate');
    expect(legalMoves(pos)).toHaveLength(0);
  });
  it('fool\'s mate via Game', () => {
    const game = new Game(standardPosition());
    game.move(parseSquare('f2'), parseSquare('f3'));
    game.move(parseSquare('e7'), parseSquare('e5'));
    game.move(parseSquare('g2'), parseSquare('g4'));
    game.move(parseSquare('d8'), parseSquare('h4'));
    expect(game.status).toBe('checkmate');
    expect(game.winner).toBe('black');
    expect(game.isOver).toBe(true);
  });
  it('queen + king mate in the corner', () => {
    const pos = fromFEN('7k/6Q1/6K1/8/8/8/8/8 b');
    expect(getStatus(pos)).toBe('checkmate');
  });
  it('stalemate', () => {
    const pos = fromFEN('7k/5Q2/6K1/8/8/8/8/8 b');
    expect(isInCheck(pos.board, 'black')).toBe(false);
    expect(getStatus(pos)).toBe('stalemate');
  });
  it('not mate when the checker can be captured', () => {
    const pos = fromFEN('R5k1/5ppp/8/8/4b3/8/8/6K1 b');
    expect(isInCheck(pos.board, 'black')).toBe(true);
    expect(getStatus(pos)).toBe('check');
    expect(targets(pos, 'e4')).toContain('a8');
  });
  it('insufficient material is a draw', () => {
    expect(getStatus(fromFEN('4k3/8/8/8/8/8/8/4K3 w'))).toBe('insufficient');
    expect(getStatus(fromFEN('4k3/8/8/8/8/8/8/3BK3 w'))).toBe('insufficient');
    expect(getStatus(fromFEN('4k3/8/8/8/8/8/4P3/4K3 w'))).toBe('ongoing');
  });
});

describe('Game', () => {
  it('alternates turns and rejects illegal moves', () => {
    const game = new Game(standardPosition());
    expect(game.turn).toBe('white');
    game.move(parseSquare('e2'), parseSquare('e4'));
    expect(game.turn).toBe('black');
    expect(() => game.move(parseSquare('e4'), parseSquare('e5'))).toThrow(IllegalMoveError);
    expect(() => game.move(parseSquare('e7'), parseSquare('e3'))).toThrow(IllegalMoveError);
  });
  it('records captures and supports undo', () => {
    const game = new Game(fromFEN('4k3/8/8/3p4/4P3/8/8/4K3 w'));
    const mv = game.move(parseSquare('e4'), parseSquare('d5'));
    expect(mv.captured).toBe('pawn');
    expect(game.undo()).toBe(true);
    expect(toFEN(game.position)).toBe('4k3/8/8/3p4/4P3/8/8/4K3 w');
    expect(game.undo()).toBe(false);
  });
});

describe('roguelike scenes', () => {
  it('test scene: lone king + pawn vs a few pieces', () => {
    const pos = roguelikeTestPosition();
    expect(pos.board.filter((p) => p?.color === 'white')).toHaveLength(2);
    expect(pos.board.filter((p) => p?.color === 'black')).toHaveLength(4);
    expect(legalMoves(pos).length).toBeGreaterThan(0);
  });
  it('supports sides without a pawn or with extra queens', () => {
    const pos = createPosition({ white: ['Ke1', 'Qd1', 'Qd2'], black: ['Ke8'] });
    expect(legalMoves(pos).length).toBeGreaterThan(0);
  });
});

describe('perft (no castling / en passant, valid up to depth 4 from the start)', () => {
  it('standard start position', () => {
    const pos = standardPosition();
    expect(perft(pos, 1)).toBe(20);
    expect(perft(pos, 2)).toBe(400);
    expect(perft(pos, 3)).toBe(8902);
    expect(perft(pos, 4)).toBe(197281);
  });
});
