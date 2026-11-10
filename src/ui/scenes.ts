import { roguelikeTestPosition, standardPosition, type Position } from '../engine';

export interface Scene {
  id: string;
  label: string;
  create: () => Position;
}

export const SCENES: Scene[] = [
  { id: 'roguelike', label: 'Roguelike: rey + peón vs piezas', create: roguelikeTestPosition },
  { id: 'standard', label: 'Partida estándar', create: standardPosition },
];
