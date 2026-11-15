import { describe, expect, it } from 'vitest';
import { INTERVALS, intervalBySemitones } from '../src/intervals';

describe('Intervall-Daten', () => {
  it('genau 13 Einträge', () => {
    expect(INTERVALS).toHaveLength(13);
  });

  it('Halbtöne 0–12 lückenlos, aufsteigend, jeder genau einmal', () => {
    expect(INTERVALS.map((i) => i.semitones)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (let s = 0; s <= 12; s++) expect(intervalBySemitones(s)?.semitones).toBe(s);
  });

  it('Intervallzahl passt zum Kürzel (r1 → 1, kl3 → 3, ü4 → 4 …)', () => {
    expect(INTERVALS.map((i) => i.degree)).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 6, 6, 7, 7, 8]);
    for (const i of INTERVALS) {
      expect(i.short).toMatch(/^(r|kl|gr|ü)[1-8]$/);
      expect(Number(i.short.slice(-1))).toBe(i.degree);
    }
  });

  it('Kürzel und Namen wie vorgegeben', () => {
    expect(INTERVALS.map((i) => i.short)).toEqual([
      'r1', 'kl2', 'gr2', 'kl3', 'gr3', 'r4', 'ü4', 'r5', 'kl6', 'gr6', 'kl7', 'gr7', 'r8',
    ]);
    expect(INTERVALS.map((i) => i.name)).toEqual([
      'reine Prim', 'kleine Sekunde', 'große Sekunde', 'kleine Terz', 'große Terz', 'reine Quart',
      'übermäßige Quart (Tritonus)', 'reine Quint', 'kleine Sext', 'große Sext', 'kleine Septime',
      'große Septime', 'reine Oktave',
    ]);
  });

  it('jedes Intervall hat Liedtitel, Symbolname und ein Inline-SVG ohne externe Bezüge', () => {
    for (const i of INTERVALS) {
      expect(i.song.trim().length).toBeGreaterThan(0);
      expect(i.symbolName.trim().length).toBeGreaterThan(0);
      expect(i.symbol.trim().startsWith('<svg')).toBe(true);
      expect(i.symbol).toContain('viewBox="0 0 48 48"');
      expect(i.symbol.trim().endsWith('</svg>')).toBe(true);
      // keine Skripte, keine eingebetteten Bilder, keine Links ins Netz
      expect(i.symbol).not.toMatch(/<script|<image|<use|href=|url\(|@import/i);
      expect(i.symbol.replace('http://www.w3.org/2000/svg', '')).not.toMatch(/https?:/i);
    }
  });
});
