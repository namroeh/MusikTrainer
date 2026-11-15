/**
 * Deutsche Tonnamen und richtige Buchstabierung des Zieltons.
 *
 * Regeln:
 * - Stammtöne: C D E F G A H (H ist der Ton unter C).
 * - Erhöhung: -is (Cis, Fis, His …), doppelt: -isis (Fisis …).
 * - Erniedrigung: -es (Ces, Des, Fes, Ges), Ausnahmen Es, As, B;
 *   doppelt: Ceses, Deses, Eses, Feses, Geses, Asas, Heses.
 * - Zielton: Stammton-Stufe aus der Intervallzahl (Terz = dritter Stammton
 *   ab dem Grundton usw.), Vorzeichen aus der Halbtonzahl.
 */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'] as const;

/** Halbtonlage der Stammtöne innerhalb der Oktave (C = 0). */
export const LETTER_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11] as const;

/** Ein buchstabierter Ton: Stammton (0 = C … 6 = H) plus Vorzeichen (−2 … +2). */
export interface SpelledNote {
  letter: number;
  accidental: number;
}

const FLAT_NAMES = ['Ces', 'Des', 'Es', 'Fes', 'Ges', 'As', 'B'];
const DOUBLE_FLAT_NAMES = ['Ceses', 'Deses', 'Eses', 'Feses', 'Geses', 'Asas', 'Heses'];

/** Deutscher Name eines buchstabierten Tons, z. B. {letter: 3, accidental: 1} → "Fis". */
export function noteName(note: SpelledNote): string {
  const base = LETTERS[note.letter];
  switch (note.accidental) {
    case 0:
      return base;
    case 1:
      return `${base}is`;
    case 2:
      return `${base}isis`;
    case -1:
      return FLAT_NAMES[note.letter];
    case -2:
      return DOUBLE_FLAT_NAMES[note.letter];
    default:
      throw new Error(`Unzulässiges Vorzeichen: ${note.accidental}`);
  }
}

/** Halbtonlage (0–11) eines buchstabierten Tons. */
export function pitchClassOf(note: SpelledNote): number {
  return mod12(LETTER_PITCH_CLASSES[note.letter] + note.accidental);
}

export interface RootNote extends SpelledNote {
  name: string;
  pitchClass: number;
}

function root(letter: number, accidental: number): RootNote {
  const note = { letter, accidental };
  return { ...note, name: noteName(note), pitchClass: pitchClassOf(note) };
}

/** Wählbare Grundtöne in der Reihenfolge der Auswahl-Leiste. */
export const ROOTS: readonly RootNote[] = [
  root(0, 0), // C
  root(0, 1), // Cis
  root(1, -1), // Des
  root(1, 0), // D
  root(2, -1), // Es
  root(2, 0), // E
  root(3, 0), // F
  root(3, 1), // Fis
  root(4, 0), // G
  root(5, -1), // As
  root(5, 0), // A
  root(6, -1), // B
  root(6, 0), // H
];

export const DEFAULT_ROOT_NAME = 'C';

export function findRoot(name: string): RootNote | undefined {
  return ROOTS.find((r) => r.name === name);
}

/** Was die Buchstabierung vom Intervall braucht. */
export interface IntervalSpec {
  /** Intervallzahl: Prim = 1, Sekunde = 2, … Oktave = 8 */
  degree: number;
  /** Halbtöne über dem Grundton */
  semitones: number;
}

/** Zielton eines Intervalls über einem Grundton, richtig buchstabiert. */
export function spellTarget(rootNote: SpelledNote, interval: IntervalSpec): SpelledNote {
  const letter = (rootNote.letter + interval.degree - 1) % 7;
  const targetPitchClass = mod12(pitchClassOf(rootNote) + interval.semitones);
  // Abstand zum Stammton auf −6 … +5 normieren
  let accidental = mod12(targetPitchClass - LETTER_PITCH_CLASSES[letter]);
  if (accidental > 5) accidental -= 12;
  if (accidental < -2 || accidental > 2) {
    throw new Error(
      `Kein sinnvoller Name: Stufe ${interval.degree}, ${interval.semitones} Halbtöne über ${noteName(rootNote)}`,
    );
  }
  return { letter, accidental };
}

const SHARP_KEY_NAMES = ['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'Ais', 'H'];
const FLAT_KEY_NAMES = ['C', 'Des', 'D', 'Es', 'E', 'F', 'Ges', 'G', 'As', 'A', 'B', 'H'];

/** Einfachster Name einer Taste (weiße Taste: Stammton; schwarze: mit # oder b je nach Wunsch). */
export function simpleKeyName(pitchClass: number, preferFlat: boolean): string {
  const pc = mod12(pitchClass);
  return (preferFlat ? FLAT_KEY_NAMES : SHARP_KEY_NAMES)[pc];
}

/** Beschriftung einer Taste ohne Intervallbezug, z. B. "Fis/Ges" oder "E". */
export function keyLabel(pitchClass: number): string {
  const sharp = simpleKeyName(pitchClass, false);
  const flat = simpleKeyName(pitchClass, true);
  return sharp === flat ? sharp : `${sharp}/${flat}`;
}

/** Anzeigename eines Zieltons; bei Doppelvorzeichen mit dem einfacheren Tastennamen in Klammern. */
export function displayName(note: SpelledNote): string {
  const name = noteName(note);
  if (Math.abs(note.accidental) < 2) return name;
  return `${name} (${simpleKeyName(pitchClassOf(note), note.accidental < 0)})`;
}

export interface IntervalNames {
  rootName: string;
  targetName: string;
  /** Zielton für die Anzeige, ggf. mit Klammer, z. B. "Eses (D)" */
  targetDisplay: string;
  /** z. B. "D – Fis" */
  text: string;
}

export function intervalNames(rootNote: SpelledNote, interval: IntervalSpec): IntervalNames {
  const target = spellTarget(rootNote, interval);
  const rootName = noteName(rootNote);
  const targetDisplay = displayName(target);
  return {
    rootName,
    targetName: noteName(target),
    targetDisplay,
    text: `${rootName} – ${targetDisplay}`,
  };
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}
