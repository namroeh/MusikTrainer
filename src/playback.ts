/**
 * Wiedergabe-Plan: welche Töne wann und wie lange erklingen.
 * Rein rechnerisch (ohne Audio), damit es sich testen lässt.
 */

export type PlayMode = 'up' | 'down' | 'together';

export const PLAY_MODES: readonly { mode: PlayMode; label: string; hint: string }[] = [
  { mode: 'up', label: 'nacheinander', hint: 'melodisch aufwärts' },
  { mode: 'down', label: 'abwärts', hint: 'melodisch abwärts' },
  { mode: 'together', label: 'gleichzeitig', hint: 'harmonisch' },
];

export const DEFAULT_PLAY_MODE: PlayMode = 'up';

export function isPlayMode(value: unknown): value is PlayMode {
  return value === 'up' || value === 'down' || value === 'together';
}

export interface ScheduledNote {
  /** MIDI-Nummer (60 = c') */
  midi: number;
  /** Start in Sekunden ab „jetzt" */
  offset: number;
  /** Haltedauer in Sekunden (danach klingt der Ton aus) */
  hold: number;
}

/** Abstand der Tonanfänge bei melodischer Wiedergabe */
export const MELODIC_GAP = 0.8;
const MELODIC_HOLD_FIRST = 0.72;
const MELODIC_HOLD_SECOND = 1.1;
const HARMONIC_HOLD = 1.6;
const SINGLE_HOLD = 0.9;

/** Plan für ein Intervall zwischen zwei Tasten. */
export function planInterval(rootMidi: number, targetMidi: number, mode: PlayMode): ScheduledNote[] {
  if (mode === 'together') {
    // Prim gleichzeitig = ein einziger Ton (zwei gleiche Töne würden nur lauter klingen)
    if (rootMidi === targetMidi) return [{ midi: rootMidi, offset: 0, hold: HARMONIC_HOLD }];
    return [
      { midi: rootMidi, offset: 0, hold: HARMONIC_HOLD },
      { midi: targetMidi, offset: 0, hold: HARMONIC_HOLD },
    ];
  }
  const [first, second] = mode === 'up' ? [rootMidi, targetMidi] : [targetMidi, rootMidi];
  return [
    { midi: first, offset: 0, hold: MELODIC_HOLD_FIRST },
    { midi: second, offset: MELODIC_GAP, hold: MELODIC_HOLD_SECOND },
  ];
}

/** Plan für einen Einzelton (Tasten außerhalb des Grundton-Bereichs). */
export function planSingle(midi: number): ScheduledNote[] {
  return [{ midi, offset: 0, hold: SINGLE_HOLD }];
}
