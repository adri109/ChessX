import { BOARD_SIZE, fileOf, inBounds, rankOf, sq } from './squares';
import {
  PROMOTION_TYPES,
  opposite,
  type Board,
  type Color,
  type Move,
  type PieceType,
  type Position,
  type Square,
} from './types';

const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const ROOK_DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

function pawnDir(color: Color): number {
  return color === 'white' ? 1 : -1;
}
function pawnStartRank(color: Color): number {
  return color === 'white' ? 1 : BOARD_SIZE - 2;
}
function promotionRank(color: Color): number {
  return color === 'white' ? BOARD_SIZE - 1 : 0;
}

/** True if `target` is attacked by any piece of `by` (ignores pins; pure attack geometry). */
export function isSquareAttacked(board: Board, target: Square, by: Color): boolean {
  const tf = fileOf(target);
  const tr = rankOf(target);

  // Pawns attack diagonally forward, so a pawn of `by` sits one rank *behind* the target.
  const pr = tr - pawnDir(by);
  for (const df of [-1, 1]) {
    if (inBounds(tf + df, pr)) {
      const p = board[sq(tf + df, pr)];
      if (p && p.color === by && p.type === 'pawn') return true;
    }
  }

  for (const [df, dr] of KNIGHT_DELTAS) {
    if (!inBounds(tf + df, tr + dr)) continue;
    const p = board[sq(tf + df, tr + dr)];
    if (p && p.color === by && p.type === 'knight') return true;
  }

  for (const [df, dr] of KING_DELTAS) {
    if (!inBounds(tf + df, tr + dr)) continue;
    const p = board[sq(tf + df, tr + dr)];
    if (p && p.color === by && p.type === 'king') return true;
  }

  const slide = (dirs: ReadonlyArray<readonly [number, number]>, a: PieceType): boolean => {
    for (const [df, dr] of dirs) {
      let f = tf + df;
      let r = tr + dr;
      while (inBounds(f, r)) {
        const p = board[sq(f, r)];
        if (p) {
          if (p.color === by && (p.type === a || p.type === 'queen')) return true;
          break;
        }
        f += df;
        r += dr;
      }
    }
    return false;
  };
  return slide(ROOK_DIRS, 'rook') || slide(BISHOP_DIRS, 'bishop');
}

export function findKing(board: Board, color: Color): Square | -1 {
  return board.findIndex((p) => p !== null && p.type === 'king' && p.color === color);
}

/** A side without a king can never be "in check". */
export function isInCheck(board: Board, color: Color): boolean {
  const king = findKing(board, color);
  return king !== -1 && isSquareAttacked(board, king, opposite(color));
}

/** Pseudo-legal moves for the piece on `from` (may leave own king in check). */
export function pseudoLegalMovesFrom(board: Board, from: Square): Move[] {
  const piece = board[from];
  if (!piece) return [];
  const moves: Move[] = [];
  const ff = fileOf(from);
  const fr = rankOf(from);

  const push = (to: Square, extra: Partial<Move> = {}): void => {
    const target = board[to];
    moves.push({ from, to, piece: piece.type, ...(target ? { captured: target.type } : {}), ...extra });
  };

  switch (piece.type) {
    case 'pawn': {
      const dir = pawnDir(piece.color);
      const addPawnMove = (to: Square): void => {
        if (rankOf(to) === promotionRank(piece.color)) {
          for (const promotion of PROMOTION_TYPES) push(to, { promotion });
        } else {
          push(to);
        }
      };
      const oneRank = fr + dir;
      if (inBounds(ff, oneRank) && !board[sq(ff, oneRank)]) {
        addPawnMove(sq(ff, oneRank));
        const twoRank = fr + 2 * dir;
        if (fr === pawnStartRank(piece.color) && inBounds(ff, twoRank) && !board[sq(ff, twoRank)]) {
          push(sq(ff, twoRank));
        }
      }
      for (const df of [-1, 1]) {
        if (!inBounds(ff + df, oneRank)) continue;
        const to = sq(ff + df, oneRank);
        const target = board[to];
        if (target && target.color !== piece.color) addPawnMove(to);
      }
      break;
    }
    case 'knight':
    case 'king': {
      const deltas = piece.type === 'knight' ? KNIGHT_DELTAS : KING_DELTAS;
      for (const [df, dr] of deltas) {
        if (!inBounds(ff + df, fr + dr)) continue;
        const to = sq(ff + df, fr + dr);
        const target = board[to];
        if (!target || target.color !== piece.color) push(to);
      }
      break;
    }
    case 'bishop':
    case 'rook':
    case 'queen': {
      const dirs =
        piece.type === 'rook' ? ROOK_DIRS : piece.type === 'bishop' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
      for (const [df, dr] of dirs) {
        let f = ff + df;
        let r = fr + dr;
        while (inBounds(f, r)) {
          const to = sq(f, r);
          const target = board[to];
          if (!target) {
            push(to);
          } else {
            if (target.color !== piece.color) push(to);
            break;
          }
          f += df;
          r += dr;
        }
      }
      break;
    }
  }
  return moves;
}

/** Board after applying `move` (no legality checks). */
export function applyMoveToBoard(board: Board, move: Move): Board {
  const next = board.slice();
  const piece = board[move.from];
  if (!piece) throw new Error('No piece on origin square');
  next[move.from] = null;
  next[move.to] = move.promotion ? { type: move.promotion, color: piece.color } : piece;
  return next;
}

export function legalMovesFrom(position: Position, from: Square): Move[] {
  const piece = position.board[from];
  if (!piece || piece.color !== position.turn) return [];
  return pseudoLegalMovesFrom(position.board, from).filter(
    (m) => !isInCheck(applyMoveToBoard(position.board, m), piece.color),
  );
}

export function legalMoves(position: Position): Move[] {
  const moves: Move[] = [];
  for (let s = 0; s < position.board.length; s++) {
    if (position.board[s]?.color === position.turn) moves.push(...legalMovesFrom(position, s));
  }
  return moves;
}
