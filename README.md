# ChessX

## CHESS — prototipo del modelo de juego

Tablero de ajedrez 8x8 jugable en el navegador (TypeScript + Vite, sin frameworks). Base para un roguelike en el que cada bando empieza con un conjunto distinto de piezas.

## Ejecutar

```bash
npm install
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm test           # tests del motor (Vitest)
npm run build      # typecheck + build de producción en dist/
```

Requiere Node 18+.

## Estructura

```
src/
  engine/            Lógica pura, sin dependencias de UI/DOM
    types.ts         Color, Piece, Move, Position, GameStatus
    squares.ts       Índices de casilla (0..63), "e4" <-> índice
    movegen.ts       Ataques, jaque, movimientos pseudo-legales y legales
    game.ts          applyMove, getStatus, clase Game (historial, undo)
    setups.ts        fromFEN/toFEN, createPosition, escenas predefinidas
    engine.test.ts   Tests: movimientos, jaque, clavadas, mate, ahogado, promoción, perft
  ui/                Capa de render (DOM) — solo lee estado y reenvía clics
    view.ts, scenes.ts, styles.css, main.ts
```

## Modelo flexible

Una posición es solo `{ board, turn }`; no se asume la posición inicial estándar:

```ts
import { createPosition, Game, parseSquare } from './engine';

const pos = createPosition({
  white: ['Ke1', 'Pe2'],
  black: ['Ke8', 'Rd8', 'Nc6', 'Pf7'],
});
const game = new Game(pos);
game.legalMovesFrom(parseSquare('e2')); // movimientos legales
game.move(parseSquare('e2'), parseSquare('e4'));
game.status; // 'ongoing' | 'check' | 'checkmate' | 'stalemate' | 'insufficient'
```

También se puede cargar cualquier colocación con `fromFEN('4k3/8/8/8/8/8/4P3/4K3 w')`.

## Implementado

- Movimientos legales de peón (paso doble desde su fila inicial), caballo, alfil, torre, dama y rey, con captura, clavadas y restricción de jaque.
- Jaque, jaque mate, tablas por ahogado y por material insuficiente (K vs K, K+menor vs K).
- Promoción de peón (dama/torre/alfil/caballo, con selector en la UI).
- UI: seleccionar, resaltar casillas legales/capturas, último movimiento, jaque, turnos, deshacer, girar tablero, selector de escena (prueba roguelike / estándar). Responsive móvil, tablet y escritorio.

## Pendiente (a propósito)

Enroque, captura al paso, regla de 50 movimientos / repetición, bot rival, tienda y mejoras del roguelike, estilo visual.
