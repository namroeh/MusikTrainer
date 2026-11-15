import { describe, expect, it } from 'vitest';
import {
  C1_FREQUENCY,
  KEYBOARD_HIGH_MIDI,
  KEYBOARD_LOW_MIDI,
  frequencyFromC1,
  frequencyFromMidi,
} from '../src/pitch';

describe('Frequenzberechnung (gleichstufig, c\' = 261,63 Hz)', () => {
  it('c\' hat genau 261,63 Hz', () => {
    expect(C1_FREQUENCY).toBe(261.63);
    expect(frequencyFromC1(0)).toBe(261.63);
    expect(frequencyFromMidi(60)).toBe(261.63);
  });

  it('folgt der Formel 261,63 × 2^(n/12) für alle Tasten der Tastatur', () => {
    for (let midi = KEYBOARD_LOW_MIDI; midi <= KEYBOARD_HIGH_MIDI; midi++) {
      const n = midi - 60;
      expect(frequencyFromMidi(midi)).toBeCloseTo(261.63 * Math.pow(2, n / 12), 10);
    }
  });

  it('bekannte Werte', () => {
    expect(frequencyFromC1(9)).toBeCloseTo(440.0, 1); // a'
    expect(frequencyFromC1(12)).toBeCloseTo(523.26, 2); // c''
    expect(frequencyFromC1(24)).toBeCloseTo(1046.52, 2); // c'''
    expect(frequencyFromC1(-12)).toBeCloseTo(130.815, 3); // c
    expect(frequencyFromC1(7)).toBeCloseTo(392.0, 2); // g'
  });

  it('Oktave = doppelte Frequenz, Halbton = Faktor 2^(1/12)', () => {
    for (let n = -12; n <= 24; n++) {
      expect(frequencyFromC1(n + 12) / frequencyFromC1(n)).toBeCloseTo(2, 12);
      expect(frequencyFromC1(n + 1) / frequencyFromC1(n)).toBeCloseTo(Math.pow(2, 1 / 12), 12);
    }
  });

  it('Tastatur reicht von c\' bis c\'\'\' (25 Tasten)', () => {
    expect(KEYBOARD_LOW_MIDI).toBe(60);
    expect(KEYBOARD_HIGH_MIDI - KEYBOARD_LOW_MIDI + 1).toBe(25);
  });
});
