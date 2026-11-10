import {
  Game,
  PROMOTION_TYPES,
  findKing,
  squareName,
  type Color,
  type GameStatus,
  type Move,
  type PieceType,
  type Square,
} from '../engine';
import { SCENES } from './scenes';

const GLYPHS: Record<PieceType, string> = {
  king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟',
};
const NAMES: Record<PieceType, string> = {
  king: 'rey', queen: 'dama', rook: 'torre', bishop: 'alfil', knight: 'caballo', pawn: 'peón',
};
const COLOR_NAMES: Record<Color, string> = { white: 'blancas', black: 'negras' };

/** Thin DOM layer: all rules live in ../engine; this only reads state and forwards clicks. */
export class ChessView {
  private game: Game;
  private sceneId: string;
  private selected: Square | null = null;
  private lastMove: Move | null = null;
  private pendingPromotion: { from: Square; to: Square } | null = null;
  private flipped = false;

  constructor(private root: HTMLElement) {
    this.sceneId = SCENES[0]!.id;
    this.game = new Game(SCENES[0]!.create());
    this.render();
  }

  private loadScene(id: string): void {
    const scene = SCENES.find((s) => s.id === id) ?? SCENES[0]!;
    this.sceneId = scene.id;
    this.game = new Game(scene.create());
    this.selected = null;
    this.lastMove = null;
    this.pendingPromotion = null;
    this.render();
  }

  private onSquareClick(square: Square): void {
    if (this.game.isOver || this.pendingPromotion) return;
    if (this.selected !== null) {
      const candidates = this.game.legalMovesFrom(this.selected).filter((m) => m.to === square);
      if (candidates.length > 0) {
        if (candidates.some((m) => m.promotion)) {
          this.pendingPromotion = { from: this.selected, to: square };
        } else {
          this.lastMove = this.game.move(this.selected, square);
          this.selected = null;
        }
        this.render();
        return;
      }
    }
    const piece = this.game.board[square];
    this.selected = piece && piece.color === this.game.turn && square !== this.selected ? square : null;
    this.render();
  }

  private choosePromotion(type: PieceType): void {
    if (!this.pendingPromotion) return;
    const { from, to } = this.pendingPromotion;
    this.lastMove = this.game.move(from, to, type);
    this.pendingPromotion = null;
    this.selected = null;
    this.render();
  }

  private statusText(status: GameStatus): { text: string; tone: 'info' | 'warn' | 'end' } {
    const turn = COLOR_NAMES[this.game.turn];
    switch (status) {
      case 'checkmate':
        return { text: `Jaque mate. Ganan las ${COLOR_NAMES[this.game.winner!]}.`, tone: 'end' };
      case 'stalemate':
        return { text: 'Tablas por ahogado.', tone: 'end' };
      case 'insufficient':
        return { text: 'Tablas por material insuficiente.', tone: 'end' };
      case 'check':
        return { text: `Jaque. Juegan las ${turn}.`, tone: 'warn' };
      default:
        return { text: `Juegan las ${turn}.`, tone: 'info' };
    }
  }

  private render(): void {
    const status = this.game.status;
    const { text, tone } = this.statusText(status);
    const legal = this.selected !== null ? this.game.legalMovesFrom(this.selected) : [];
    const legalTargets = new Map(legal.map((m) => [m.to, m]));
    const kingInCheck = status === 'check' || status === 'checkmate' ? findKing(this.game.board, this.game.turn) : -1;

    this.root.replaceChildren();
    const app = el('div', 'app');

    const header = el('header', 'header');
    header.append(el('h1', 'title', 'CHESS'), el('span', 'subtitle', 'prototipo del modelo de juego'));

    const boardWrap = el('div', 'board-wrap');
    const board = el('div', 'board');
    board.setAttribute('role', 'grid');
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const file = this.flipped ? 7 - col : col;
        const rank = this.flipped ? row : 7 - row;
        const square = rank * 8 + file;
        const piece = this.game.board[square];
        const cell = el('button', 'square');
        cell.type = 'button';
        cell.classList.add((file + rank) % 2 === 0 ? 'dark' : 'light');
        if (square === this.selected) cell.classList.add('selected');
        if (this.lastMove && (square === this.lastMove.from || square === this.lastMove.to)) cell.classList.add('last');
        if (square === kingInCheck) cell.classList.add('in-check');
        const move = legalTargets.get(square);
        if (move) cell.classList.add(move.captured ? 'capture' : 'target');
        cell.setAttribute(
          'aria-label',
          `${squareName(square)}${piece ? `, ${NAMES[piece.type]} ${COLOR_NAMES[piece.color]}` : ''}`,
        );
        if (piece) cell.append(el('span', `piece ${piece.color}`, GLYPHS[piece.type]));
        if (row === 7) cell.append(el('span', 'coord file', String.fromCharCode(97 + file)));
        if (col === 0) cell.append(el('span', 'coord rank', String(rank + 1)));
        cell.addEventListener('click', () => this.onSquareClick(square));
        board.append(cell);
      }
    }
    boardWrap.append(board);

    if (this.pendingPromotion) {
      const color = this.game.turn;
      const overlay = el('div', 'overlay');
      const dialog = el('div', 'dialog');
      dialog.append(el('p', 'dialog-title', 'Promocionar peón a…'));
      const options = el('div', 'promo-options');
      for (const type of PROMOTION_TYPES) {
        const b = el('button', 'promo-btn');
        b.type = 'button';
        b.setAttribute('aria-label', NAMES[type]);
        b.append(el('span', `piece ${color}`, GLYPHS[type]));
        b.addEventListener('click', () => this.choosePromotion(type));
        options.append(b);
      }
      dialog.append(options);
      overlay.append(dialog);
      boardWrap.append(overlay);
    }

    const panel = el('aside', 'panel');
    const statusEl = el('div', `status ${tone}`, text);
    statusEl.setAttribute('role', 'status');

    const sceneLabel = el('label', 'field');
    sceneLabel.append(el('span', 'field-label', 'Escena'));
    const select = el('select', 'select');
    for (const scene of SCENES) {
      const opt = el('option', '', scene.label);
      opt.value = scene.id;
      opt.selected = scene.id === this.sceneId;
      select.append(opt);
    }
    select.addEventListener('change', () => this.loadScene(select.value));
    sceneLabel.append(select);

    const actions = el('div', 'actions');
    actions.append(
      button('Reiniciar escena', () => this.loadScene(this.sceneId), 'primary'),
      button('Deshacer', () => {
        if (this.game.undo()) {
          this.selected = null;
          this.lastMove = null;
          this.render();
        }
      }),
      button('Girar tablero', () => {
        this.flipped = !this.flipped;
        this.render();
      }),
    );

    panel.append(statusEl, sceneLabel, actions);
    app.append(header, boardWrap, panel);
    this.root.append(app);
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, onClick: () => void, variant = ''): HTMLButtonElement {
  const b = el('button', `btn ${variant}`.trim(), label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

