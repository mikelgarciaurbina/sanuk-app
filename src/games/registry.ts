import type { ComponentType } from 'react';

import { color } from '@/brand/tokens';
import type { GameId } from '@/content/types';

import Cena from './Cena';
import Cestas from './Cestas';
import Cuentos from './Cuentos';
import Cueva from './Cueva';
import Curvas from './Curvas';
import Eco from './Eco';
import Farolillos from './Farolillos';
import Hueco from './Hueco';
import Memoria from './Memoria';
import Mercado from './Mercado';
import Monzon from './Monzon';
import NoiDice from './NoiDice';
import Oido from './Oido';
import Parejas from './Parejas';
import Puente from './Puente';
import SiONo from './SiONo';
import Silabas from './Silabas';
import Tigre from './Tigre';
import Tonos from './Tonos';
import Traza from './Traza';
import type { GameMeta, GameProps } from './types';

export const GAME_COMPONENTS: Record<GameId, ComponentType<GameProps>> = {
  parejas: Parejas,
  memoria: Memoria,
  monzon: Monzon,
  siono: SiONo,
  farolillos: Farolillos,
  oido: Oido,
  tonos: Tonos,
  tigre: Tigre,
  eco: Eco,
  puente: Puente,
  hueco: Hueco,
  cestas: Cestas,
  noidice: NoiDice,
  mercado: Mercado,
  cena: Cena,
  curvas: Curvas,
  cueva: Cueva,
  traza: Traza,
  silabas: Silabas,
  cuentos: Cuentos,
};

export const GAMES: GameMeta[] = [
  { id: 'parejas', name: 'Parejas', short: 'Une thai y español antes de que se consuma la mecha.', trains: 'Vocabulario', cat: 'Palabras', emoji: '🧩', tint: color.azafran, unlock: 1, rounds: { leccion: 1, feria: 1 } },
  { id: 'memoria', name: 'Memoria del templo', short: 'Voltea cartas Lanna y encuentra las parejas.', trains: 'Vocabulario y memoria', cat: 'Palabras', emoji: '🃏', tint: color.mohom, unlock: 1, rounds: { leccion: 1, feria: 1 } },
  { id: 'monzon', name: 'Monzón', short: 'Toca la gota correcta antes de que caiga al arrozal.', trains: 'Velocidad de lectura', cat: 'Palabras', emoji: '🌧️', tint: color.cielo, unlock: 2, rounds: { leccion: 8, feria: 40 } },
  { id: 'siono', name: '¿Sí o บ่?', short: 'Desliza: ¿la traducción es correcta?', trains: 'Reconocimiento rápido', cat: 'Palabras', emoji: '👆', tint: color.arrozalVivo, unlock: 1, rounds: { leccion: 6, feria: 30 } },
  { id: 'farolillos', name: 'Noche de farolillos', short: 'Suelta al cielo los farolillos de una categoría.', trains: 'Campos de vocabulario', cat: 'Palabras', emoji: '🏮', tint: color.farol, unlock: 2, rounds: { leccion: 1, feria: 4 } },
  { id: 'oido', name: 'Oído de elefante', short: 'Escucha y elige lo que has oído.', trains: 'Comprensión auditiva', cat: 'Oído y tonos', emoji: '👂', tint: color.cielo, unlock: 1, rounds: { leccion: 3, feria: 10 } },
  { id: 'tonos', name: 'Trompa de tonos', short: 'Reconoce el tono de cada sílaba.', trains: 'Los 5 tonos', cat: 'Oído y tonos', emoji: '〰️', tint: color.laca, unlock: 3, rounds: { leccion: 4, feria: 12 } },
  { id: 'tigre', name: '¿Tigre o camisa?', short: 'Mismo sonido, distinto tono: elige bien.', trains: 'Pares mínimos de tono', cat: 'Oído y tonos', emoji: '🐯', tint: color.buatong, unlock: 3, rounds: { leccion: 3, feria: 10 } },
  { id: 'eco', name: 'Eco', short: 'Escucha, graba tu voz y compárala.', trains: 'Pronunciación', cat: 'Oído y tonos', emoji: '🎙️', tint: color.farol, unlock: 1, rounds: { leccion: 2, feria: 6 } },
  { id: 'puente', name: 'Puente de bambú', short: 'Ordena las palabras: cada una es una tabla del puente.', trains: 'Orden de la frase', cat: 'Frases', emoji: '🎋', tint: color.teca, unlock: 1, rounds: { leccion: 2, feria: 8 } },
  { id: 'hueco', name: 'La palabra perdida', short: 'Completa la frase con la palabra que falta.', trains: 'Gramática y partículas', cat: 'Frases', emoji: '🔍', tint: color.arrozal, unlock: 1, rounds: { leccion: 2, feria: 10 } },
  { id: 'cestas', name: 'Cestas del mercado', short: 'Cada cosa con su clasificador: ตัว, คน, ใบ, ลูก…', trains: 'Clasificadores', cat: 'Frases', emoji: '🧺', tint: color.teca, unlock: 3, rounds: { leccion: 5, feria: 14 } },
  { id: 'noidice', name: 'Noi dice', short: 'Toca la parte de Noi que te piden en thai.', trains: 'Cuerpo y comprensión', cat: 'Frases', emoji: '🐘', tint: color.noi, unlock: 3, rounds: { leccion: 5, feria: 15 } },
  { id: 'mercado', name: 'Paga justo', short: 'Paga en el mercado con baht de verdad.', trains: 'Números y dinero', cat: 'Vida real', emoji: '💵', tint: color.arrozalVivo, unlock: 2, rounds: { leccion: 3, feria: 8 } },
  { id: 'cena', name: 'Cena familiar', short: 'Conversa con la familia y elige qué decir.', trains: 'Conversación', cat: 'Vida real', emoji: '🍲', tint: color.teca, unlock: 1, rounds: { leccion: 1, feria: 1 } },
  { id: 'curvas', name: '1.864 curvas', short: 'Toca la señal correcta para tomar cada curva.', trains: 'Velocidad y tonos', cat: 'Vida real', emoji: '🛻', tint: color.laca, unlock: 1, rounds: { leccion: 8, feria: 60 } },
  { id: 'cueva', name: 'Cueva de las letras', short: 'Explora con la linterna y encuentra la letra.', trains: 'Alfabeto', cat: 'Letras', emoji: '🔦', tint: color.noche2, unlock: 6, rounds: { leccion: 5, feria: 12 } },
  { id: 'traza', name: 'Une los puntos', short: 'Traza letras empezando por el bucle.', trains: 'Escritura', cat: 'Letras', emoji: '✍️', tint: color.azafran, unlock: 6, rounds: { leccion: 2, feria: 6 } },
  { id: 'silabas', name: 'Bloques de sílabas', short: 'Consonante + vocal + tono: construye lo que oyes.', trains: 'Lectura y tonos', cat: 'Letras', emoji: '🧱', tint: color.cielo, unlock: 6, rounds: { leccion: 3, feria: 10 } },
  { id: 'cuentos', name: 'Cuentos de Yai', short: 'Lee historias con audio y toca para traducir.', trains: 'Lectura', cat: 'Letras', emoji: '📖', tint: color.teca, unlock: 6, rounds: { leccion: 1, feria: 1 } },
];

export const gameMeta = (id: GameId) => GAMES.find((g) => g.id === id)!;

/** Fondo de pantalla para los juegos de noche o de lluvia (la cabecera se funde con el juego). */
export const GAME_BG: Partial<Record<GameId, string>> = { farolillos: color.noche, cueva: '#0E1124', monzon: '#CBD7E5', curvas: '#8FC28A' };
export const GAME_DARK: Partial<Record<GameId, boolean>> = { farolillos: true, cueva: true };
