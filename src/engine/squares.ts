import type { Square } from './types';

export const BOARD_SIZE = 8;

export function sq(file: number, rank: number): Square {
  return rank * BOARD_SIZE + file;
}

export function fileOf(square: Square): number {
  return square % BOARD_SIZE;
}

export function rankOf(square: Square): number {
  return Math.floor(square / BOARD_SIZE);
}

export function inBounds(file: number, rank: number): boolean {
  return file >= 0 && file < BOARD_SIZE && rank >= 0 && rank < BOARD_SIZE;
}

/** "e4" -> square index. Throws on invalid input. */
export function parseSquare(name: string): Square {
  if (!/^[a-h][1-8]$/.test(name)) throw new Error(`Invalid square: ${name}`);
  return sq(name.charCodeAt(0) - 97, Number(name[1]) - 1);
}

export function squareName(square: Square): string {
  return String.fromCharCode(97 + fileOf(square)) + (rankOf(square) + 1);
}
