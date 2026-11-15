/**
 * Frequenzberechnung, gleichstufige Stimmung.
 * Bezugston: c' (eingestrichenes c) = 261,63 Hz.
 * Frequenz = 261,63 × 2^(Halbtöne über c' / 12)
 */

export const C1_FREQUENCY = 261.63;

/** MIDI-Nummer von c'. Intern zählen wir Tasten in MIDI-Nummern. */
export const C1_MIDI = 60;

/** Tastatur: c' bis c''' (zwei Oktaven, 25 Tasten). */
export const KEYBOARD_LOW_MIDI = C1_MIDI; // c'
export const KEYBOARD_HIGH_MIDI = C1_MIDI + 24; // c'''

/** Frequenz eines Tons, der `semitones` Halbtöne über c' liegt (negativ = darunter). */
export function frequencyFromC1(semitones: number): number {
  return C1_FREQUENCY * 2 ** (semitones / 12);
}

/** Frequenz zu einer MIDI-Nummer (60 = c'). */
export function frequencyFromMidi(midi: number): number {
  return frequencyFromC1(midi - C1_MIDI);
}
