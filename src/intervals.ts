/**
 * ALLE Intervall-Daten an einer Stelle.
 *
 * Hier kannst du Lieder und Symbole ändern:
 * - `song`: Titel des Merklieds (nur der Titel, kein Liedtext).
 * - `symbolName`: kurze Beschreibung des Symbols (wird Screenreadern vorgelesen).
 * - `symbol`: das Symbol als SVG. Zeichenfläche 48 × 48 (viewBox "0 0 48 48").
 *   Die App legt das Symbol auf ein helles, rundes Plättchen, damit es auf weißen
 *   UND schwarzen Tasten gut lesbar ist. Halte den Inhalt deshalb innerhalb eines
 *   Kreises mit Radius ~20 um die Mitte (24/24).
 *
 * Nicht ändern solltest du `semitones` und `degree` – davon hängen Klang und
 * Tonnamen ab (die Tests prüfen das).
 */

export interface Interval {
  /** Kürzel, z. B. "kl3" */
  short: string;
  /** voller Name, z. B. "kleine Terz" */
  name: string;
  /** Halbtöne über dem Grundton (0–12) */
  semitones: number;
  /** Intervallzahl: Prim = 1, Sekunde = 2 … Oktave = 8 (bestimmt den Stammton des Zieltons) */
  degree: number;
  /** Titel des Merklieds */
  song: string;
  /** Beschreibung des Symbols */
  symbolName: string;
  /** Symbol als SVG-Code */
  symbol: string;
}

/** Gemeinsame Linienfarbe der Symbole */
const INK = '#1f1d1a';

export const INTERVALS: readonly Interval[] = [
  {
    short: 'r1',
    name: 'reine Prim',
    semitones: 0,
    degree: 1,
    song: 'Wer will fleißige Handwerker seh’n',
    symbolName: 'Hammer',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <g transform="rotate(-38 24 24)">
    <rect x="21.5" y="17" width="5" height="24" rx="2" fill="#c0843f"/>
    <path d="M12 10.5h20l4 2.5v4l-4 2.5H12z" fill="#94a0ab"/>
    <path d="M12 10.5h5v9h-5z" fill="#6d7884"/>
  </g>
</svg>`,
  },
  {
    short: 'kl2',
    name: 'kleine Sekunde',
    semitones: 1,
    degree: 2,
    song: 'Kommt ein Vogel geflogen',
    symbolName: 'fliegender Vogel mit Brief',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <path d="M10 27l-5.5-5 1 9z" fill="#2f6fb5"/>
  <ellipse cx="19" cy="28" rx="10.5" ry="6.5" fill="#4a90d9"/>
  <circle cx="29" cy="22.5" r="5.5" fill="#4a90d9"/>
  <path d="M33.5 20.5l5 2-5 2.2z" fill="#f5a623"/>
  <circle cx="30.3" cy="21.3" r="1.1" fill="${INK}" stroke="none"/>
  <path d="M15 26c-3-6-3-12 1-16 3 5 7 10 9 16z" fill="#2f6fb5"/>
  <rect x="33" y="25" width="10" height="7" rx="1" fill="#fffdf6"/>
  <path d="M33 25.5l5 3.5 5-3.5" fill="none" stroke-width="1.5"/>
</svg>`,
  },
  {
    short: 'gr2',
    name: 'große Sekunde',
    semitones: 2,
    degree: 2,
    song: 'Alle meine Entchen',
    symbolName: 'Ente',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <path d="M7 37q3-2 6 0t6 0 6 0 6 0 6 0 6 0" fill="none" stroke="#3a86d8" stroke-width="2.5"/>
  <path d="M10 27l-3.5-6.5 9 3.5z" fill="#f8d33a"/>
  <ellipse cx="21" cy="29" rx="12.5" ry="7.5" fill="#f8d33a"/>
  <circle cx="29" cy="18" r="6.5" fill="#f8d33a"/>
  <path d="M35 16.5q6 .5 5 3.5-2 1.5-5.5 1z" fill="#f28c28"/>
  <circle cx="30.5" cy="16.5" r="1.2" fill="${INK}" stroke="none"/>
  <path d="M15 28.5q6-5 11 0-5 4-11 0z" fill="#e2b620" stroke-width="1.5"/>
</svg>`,
  },
  {
    short: 'kl3',
    name: 'kleine Terz',
    semitones: 3,
    degree: 3,
    song: 'Ein Vogel wollte Hochzeit machen',
    symbolName: 'zwei Eheringe',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">
  <circle cx="19" cy="27" r="9" stroke="${INK}" stroke-width="5.5"/>
  <circle cx="19" cy="27" r="9" stroke="#e3b23c" stroke-width="3"/>
  <circle cx="29" cy="27" r="9" stroke="${INK}" stroke-width="5.5"/>
  <circle cx="29" cy="27" r="9" stroke="#f2c94c" stroke-width="3"/>
  <path d="M27.457 30.078A9 9 0 0 1 17.437 35.863" stroke="#e3b23c" stroke-width="3"/>
  <path d="M25.46 29.351A6.875 6.875 0 0 1 17.806 33.771M29.454 30.805A11.125 11.125 0 0 1 17.068 37.956" stroke="${INK}" stroke-width="1.25"/>
  <path d="M19 11l3.2 3.2-3.2 3.8-3.2-3.8z" fill="#bfe6ff" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`,
  },
  {
    short: 'gr3',
    name: 'große Terz',
    semitones: 4,
    degree: 3,
    song: 'Donauwalzer',
    symbolName: 'Wellen',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round" stroke-width="4">
  <path d="M8 16q4-4.5 8 0t8 0 8 0 8 0" stroke="#5dade2"/>
  <path d="M8 25q4-4.5 8 0t8 0 8 0 8 0" stroke="#2e86de"/>
  <path d="M10 34q3.5-4.5 7 0t7 0 7 0 7 0" stroke="#1b5fa8"/>
</svg>`,
  },
  {
    short: 'r4',
    name: 'reine Quart',
    semitones: 5,
    degree: 4,
    song: 'Ich geh mit meiner Laterne',
    symbolName: 'Laterne',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <path d="M13 10.5L34 7" stroke="#8a5a2b" stroke-width="3"/>
  <path d="M24 9v5" fill="none"/>
  <ellipse cx="24" cy="27" rx="11.5" ry="12" fill="#f39c12"/>
  <ellipse cx="24" cy="27" rx="5" ry="6.5" fill="#ffe27a" stroke="none"/>
  <path d="M18 16.5q-4 10.5 0 21M30 16.5q4 10.5 0 21M24 15v24" fill="none" stroke="#c0670b" stroke-width="1.6"/>
  <rect x="17.5" y="13.5" width="13" height="3.5" rx="1" fill="#b03a2e"/>
  <rect x="17.5" y="37" width="13" height="3.5" rx="1" fill="#b03a2e"/>
</svg>`,
  },
  {
    short: 'ü4',
    name: 'übermäßige Quart (Tritonus)',
    semitones: 6,
    degree: 4,
    song: 'The Simpsons',
    symbolName: 'Saxofon',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13 11q5-1 7.5 4" stroke="${INK}" stroke-width="4.5"/>
  <path d="M13 11q5-1 7.5 4" stroke="#e0a526" stroke-width="2.2"/>
  <path d="M10.5 11.6l3-.8" stroke="${INK}" stroke-width="3.5"/>
  <path d="M20.5 15v16.5q0 6.5 6 6.5t6-6.5V24" stroke="${INK}" stroke-width="8.5"/>
  <path d="M20.5 15v16.5q0 6.5 6 6.5t6-6.5V24" stroke="#e8b030" stroke-width="5"/>
  <path d="M28.5 25l-1.8-8h11.6l-1.8 8z" fill="#e8b030" stroke="${INK}" stroke-width="2"/>
  <ellipse cx="32.5" cy="17" rx="5.8" ry="1.7" fill="#8a5a00" stroke="${INK}" stroke-width="1.5"/>
  <g fill="#fff3c4" stroke="${INK}" stroke-width="1.2">
    <circle cx="20.5" cy="20" r="1.7"/>
    <circle cx="20.5" cy="25" r="1.7"/>
    <circle cx="20.5" cy="30" r="1.7"/>
  </g>
</svg>`,
  },
  {
    short: 'r5',
    name: 'reine Quint',
    semitones: 7,
    degree: 5,
    song: 'Morgen kommt der Weihnachtsmann',
    symbolName: 'Weihnachtsmütze',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <path d="M12.5 31Q15 14 29 10.5q7.5-1.5 7 10.5-2.5-5.5-6-3.5 1 7.5 6.5 13.5z" fill="#d62828"/>
  <circle cx="36.3" cy="22" r="4.2" fill="#fffdf6"/>
  <rect x="10" y="29.5" width="28" height="8" rx="4" fill="#fffdf6"/>
</svg>`,
  },
  {
    short: 'kl6',
    name: 'kleine Sext',
    semitones: 8,
    degree: 6,
    song: 'Bei mir bist du schön',
    symbolName: 'Herz',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <path d="M24 39C12 31 7 24.5 7 18.5 7 13 11 9.5 15.5 9.5c4 0 7 2.5 8.5 5.5 1.5-3 4.5-5.5 8.5-5.5 4.5 0 8.5 3.5 8.5 9 0 6-5 12.5-17 20.5z" fill="#e63946"/>
  <path d="M12.5 17.5q.5-3.5 4-4" fill="none" stroke="#fff" stroke-width="2.2"/>
</svg>`,
  },
  {
    short: 'gr6',
    name: 'große Sext',
    semitones: 9,
    degree: 6,
    song: 'Ein Prosit',
    symbolName: 'Bierkrug',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <path d="M31 20h4.5q3.5 0 3.5 3.5v6q0 3.5-3.5 3.5H31" fill="none" stroke-width="5.5"/>
  <path d="M31 20h4.5q3.5 0 3.5 3.5v6q0 3.5-3.5 3.5H31" fill="none" stroke="#f4c86a" stroke-width="2"/>
  <rect x="12" y="15" width="19.5" height="24" rx="2.5" fill="#f4b53f"/>
  <path d="M17.5 20v14M22 20v14M26.5 20v14" stroke="#ffd98a" stroke-width="1.8"/>
  <path d="M11 17q-1.5-5.5 4-5.5 1.5-4 6.5-2.5 3-3 7 0 5.5-.5 4.5 5.5z" fill="#fffdf6"/>
</svg>`,
  },
  {
    short: 'kl7',
    name: 'kleine Septime',
    semitones: 10,
    degree: 7,
    song: 'The winner takes it all',
    symbolName: 'Pokal',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <path d="M14.5 13h-4q-1 8 6 10M33.5 13h4q1 8-6 10" fill="none" stroke-width="2.5"/>
  <path d="M14 10h20v7q0 11.5-10 12.5-10-1-10-12.5z" fill="#f2c94c"/>
  <path d="M18.5 13v4q0 5 3 7.5" fill="none" stroke="#fff4c2" stroke-width="2"/>
  <rect x="21.5" y="29.5" width="5" height="5" fill="#d9a520"/>
  <rect x="15.5" y="34.5" width="17" height="5" rx="1.2" fill="#8a5a2b"/>
</svg>`,
  },
  {
    short: 'gr7',
    name: 'große Septime',
    semitones: 11,
    degree: 7,
    song: 'Take on me (Refrain)',
    symbolName: 'ausgestreckte Hand',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">
  <g stroke="${INK}" stroke-width="7.5" fill="none">
    <path d="M19 24L17.5 11.5M23.5 23V9.5M28 24l1.8-12M31.5 27l4-10M17 31l-7.5-6.5"/>
  </g>
  <rect x="15" y="21.5" width="18.5" height="16" rx="6.5" fill="${INK}" stroke="${INK}" stroke-width="3"/>
  <g stroke="#f2c9a0" stroke-width="4.4" fill="none">
    <path d="M19 24L17.5 11.5M23.5 23V9.5M28 24l1.8-12M31.5 27l4-10M17 31l-7.5-6.5"/>
  </g>
  <rect x="15" y="21.5" width="18.5" height="16" rx="6.5" fill="#f2c9a0"/>
  <path d="M20 31q4 2.5 8 0" fill="none" stroke="#c98f62" stroke-width="1.5"/>
  <rect x="16.5" y="36" width="15.5" height="6" rx="1.5" fill="#3d5a80" stroke="${INK}" stroke-width="2"/>
</svg>`,
  },
  {
    short: 'r8',
    name: 'reine Oktave',
    semitones: 12,
    degree: 8,
    song: 'I’m singing in the rain',
    symbolName: 'Regenschirm',
    symbol: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <path d="M24 9v-3" fill="none"/>
  <path d="M24 24v12.5q0 4-3.5 4-3 0-3-3" fill="none" stroke-width="2.6"/>
  <path d="M7 24Q7.5 10 24 9q16.5 1 17 15-4-3.5-8.5 0-4-3.5-8.5 0-4-3.5-8.5 0-4-3.5-8.5 0z" fill="#3a86ff"/>
  <path d="M24 9q-6 5-7.5 15M24 9q6 5 7.5 15" fill="none" stroke="#1d4fa8" stroke-width="1.6"/>
  <path d="M11 29.5q-3.2 4.2 0 6.2 3.2-2 0-6.2zM37 29.5q-3.2 4.2 0 6.2 3.2-2 0-6.2z" fill="#8ec5ff" stroke-width="1.3"/>
</svg>`,
  },
];

/** Intervall zu einer Halbtonzahl 0–12. */
export function intervalBySemitones(semitones: number): Interval | undefined {
  return INTERVALS.find((i) => i.semitones === semitones);
}
