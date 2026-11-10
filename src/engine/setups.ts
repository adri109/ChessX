import { parseSquare } from './squares';
import { type Color, type Piece, type PieceType, type Position } from './types';

const LETTERS: Record<string, PieceType> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

export function pieceToLetter(piece: Piece): string {
  const letter = Object.entries(LETTERS).find(([, t]) => t === piece.type)![0];
  return piece.color === 'white' ? letter.toUpperCase() : letter;
}

/**
 * Parses the piece-placement field of FEN, plus optional side to move ("w"/"b").
 * Any placement is accepted (no standard-start assumptions), e.g. "4k3/8/8/8/8/8/4P3/4K3 w".
 */
export function fromFEN(fen: string): Position {
  const [placement, side = 'w'] = fen.trim().split(/\s+/);
  const rows = placement!.split('/');
  if (rows.length !== 8) throw new Error('FEN needs 8 ranks');
  const board: (Piece | null)[] = new Array(64).fill(null);
  rows.forEach((row, i) => {
    const rank = 7 - i;
    let file = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        file += Number(ch);
        continue;
      }
      const type = LETTERS[ch.toLowerCase()];
      if (!type || file > 7) throw new Error(`Bad FEN row: ${row}`);
      board[rank * 8 + file] = { type, color: ch === ch.toLowerCase() ? 'black' : 'white' };
      file++;
    }
    if (file !== 8) throw new Error(`Bad FEN row length: ${row}`);
  });
  return { board, turn: side === 'b' ? 'black' : 'white' };
}

export function toFEN(position: Position): string {
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const p = position.board[rank * 8 + file];
      if (!p) {
        empty++;
        continue;
      }
      if (empty) row += empty;
      empty = 0;
      row += pieceToLetter(p);
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} ${position.turn === 'white' ? 'w' : 'b'}`;
}

/**
 * Builds a position from arbitrary piece lists per side, e.g.
 * createPosition({ white: ['Ke1', 'Pe2'], black: ['Ke8', 'Rd8'] }).
 * Piece letters: K Q R B N P (case ignored); square in algebraic form.
 */
export function createPosition(
  sides: { white: string[]; black: string[] },
  turn: Color = 'white',
): Position {
  const board: (Piece | null)[] = new Array(64).fill(null);
  for (const color of ['white', 'black'] as const) {
    for (const spec of sides[color]) {
      const type = LETTERS[spec[0]!.toLowerCase()];
      if (!type) throw new Error(`Unknown piece in spec: ${spec}`);
      const square = parseSquare(spec.slice(1));
      if (board[square]) throw new Error(`Square occupied: ${spec}`);
      board[square] = { type, color };
    }
  }
  return { board, turn };
}

export function standardPosition(): Position {
  return fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w');
}

/** Roguelike-style opening: lone king + pawn against a handful of enemy pieces. */
export function roguelikeTestPosition(): Position {
  return createPosition({
    white: ['Ke1', 'Pe2'],
    black: ['Ke8', 'Rd8', 'Nc6', 'Pf7'],
  });
}

