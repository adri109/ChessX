export type Color = 'white' | 'black';
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export interface Piece {
  type: PieceType;
  color: Color;
}

/**
 * Square index 0..63. index = rank * 8 + file.
 * file 0 = 'a', rank 0 = first rank (white's home side).
 */
export type Square = number;

export type Board = ReadonlyArray<Piece | null>;

export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PieceType;
}

/** Immutable position: pieces + side to move. */
export interface Position {
  board: Board;
  turn: Color;
}

export type GameStatus = 'ongoing' | 'check' | 'checkmate' | 'stalemate' | 'insufficient';

export const PROMOTION_TYPES: readonly PieceType[] = ['queen', 'rook', 'bishop', 'knight'];

export function opposite(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}
