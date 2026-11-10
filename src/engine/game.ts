import { applyMoveToBoard, isInCheck, legalMoves, legalMovesFrom } from './movegen';
import { opposite, type Board, type GameStatus, type Move, type Position, type Square } from './types';

export function applyMove(position: Position, move: Move): Position {
  return { board: applyMoveToBoard(position.board, move), turn: opposite(position.turn) };
}

/** Only kings, or kings plus a single minor piece in total: no side can force mate. */
function insufficientMaterial(board: Board): boolean {
  const others = board.filter((p) => p !== null && p.type !== 'king');
  if (others.length === 0) return true;
  return others.length === 1 && (others[0]!.type === 'bishop' || others[0]!.type === 'knight');
}

export function getStatus(position: Position): GameStatus {
  const check = isInCheck(position.board, position.turn);
  const hasMoves = legalMoves(position).length > 0;
  if (!hasMoves) return check ? 'checkmate' : 'stalemate';
  if (insufficientMaterial(position.board)) return 'insufficient';
  return check ? 'check' : 'ongoing';
}

export function isGameOver(status: GameStatus): boolean {
  return status === 'checkmate' || status === 'stalemate' || status === 'insufficient';
}

export class IllegalMoveError extends Error {}

/** Mutable wrapper around immutable positions: history, undo, legality-checked moves. */
export class Game {
  private history: Position[];

  constructor(initial: Position) {
    this.history = [initial];
  }

  get position(): Position {
    return this.history[this.history.length - 1]!;
  }

  get board(): Board {
    return this.position.board;
  }

  get turn() {
    return this.position.turn;
  }

  get status(): GameStatus {
    return getStatus(this.position);
  }

  get isOver(): boolean {
    return isGameOver(this.status);
  }

  /** Winner color if checkmate, otherwise null. */
  get winner() {
    return this.status === 'checkmate' ? opposite(this.turn) : null;
  }

  legalMoves(): Move[] {
    return legalMoves(this.position);
  }

  legalMovesFrom(from: Square): Move[] {
    return legalMovesFrom(this.position, from);
  }

  /** Plays from->to (promotion defaults to queen when the move is a promotion). */
  move(from: Square, to: Square, promotion?: Move['promotion']): Move {
    const candidates = this.legalMovesFrom(from).filter((m) => m.to === to);
    const chosen = candidates.find((m) => m.promotion === promotion) ??
      (promotion === undefined ? candidates.find((m) => m.promotion === 'queen') ?? candidates[0] : undefined);
    if (!chosen) throw new IllegalMoveError(`Illegal move ${from}->${to}`);
    this.history.push(applyMove(this.position, chosen));
    return chosen;
  }

  undo(): boolean {
    if (this.history.length <= 1) return false;
    this.history.pop();
    return true;
  }
}
