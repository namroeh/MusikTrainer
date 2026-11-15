import { describe, expect, it } from 'vitest';
import { INTERVALS } from '../src/intervals';
import {
  LETTER_PITCH_CLASSES,
  ROOTS,
  displayName,
  findRoot,
  intervalNames,
  keyLabel,
  noteName,
  pitchClassOf,
  spellTarget,
} from '../src/notes';

const byShort = (short: string) => {
  const i = INTERVALS.find((x) => x.short === short);
  if (!i) throw new Error(short);
  return i;
};
const rootOf = (name: string) => {
  const r = findRoot(name);
  if (!r) throw new Error(name);
  return r;
};
const target = (interval: string, rootName: string) => intervalNames(rootOf(rootName), byShort(interval));

describe('Grundtöne', () => {
  it('13 Grundtöne in der vorgegebenen Reihenfolge mit richtiger Tonhöhe', () => {
    expect(ROOTS.map((r) => r.name)).toEqual([
      'C', 'Cis', 'Des', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'As', 'A', 'B', 'H',
    ]);
    expect(ROOTS.map((r) => r.pitchClass)).toEqual([0, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('H ist der Ton unter C, B ist das erniedrigte H', () => {
    expect(rootOf('H').pitchClass).toBe(11);
    expect(rootOf('B')).toMatchObject({ letter: 6, accidental: -1, pitchClass: 10 });
  });
});

describe('deutsche Tonnamen', () => {
  it('Erhöhung mit -is, Erniedrigung mit -es, Ausnahmen Es, As, B', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((letter) => noteName({ letter, accidental: 1 }))).toEqual([
      'Cis', 'Dis', 'Eis', 'Fis', 'Gis', 'Ais', 'His',
    ]);
    expect([0, 1, 2, 3, 4, 5, 6].map((letter) => noteName({ letter, accidental: -1 }))).toEqual([
      'Ces', 'Des', 'Es', 'Fes', 'Ges', 'As', 'B',
    ]);
  });

  it('Doppelvorzeichen', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((letter) => noteName({ letter, accidental: 2 }))).toEqual([
      'Cisis', 'Disis', 'Eisis', 'Fisis', 'Gisis', 'Aisis', 'Hisis',
    ]);
    expect([0, 1, 2, 3, 4, 5, 6].map((letter) => noteName({ letter, accidental: -2 }))).toEqual([
      'Ceses', 'Deses', 'Eses', 'Feses', 'Geses', 'Asas', 'Heses',
    ]);
  });

  it('Tastenbeschriftung', () => {
    expect(keyLabel(0)).toBe('C');
    expect(keyLabel(6)).toBe('Fis/Ges');
    expect(keyLabel(10)).toBe('Ais/B');
    expect(keyLabel(11)).toBe('H');
  });
});

describe('Buchstabierung des Zieltons – feste Prüffälle', () => {
  it.each([
    ['gr3', 'D', 'Fis'],
    ['kl3', 'C', 'Es'],
    ['ü4', 'F', 'H'],
    ['kl6', 'E', 'C'],
    ['gr7', 'Des', 'C'],
    ['kl2', 'H', 'C'],
    ['kl2', 'Des', 'Eses'],
  ])('%s über %s = %s', (interval, rootName, expected) => {
    expect(target(interval, rootName).targetName).toBe(expected);
  });

  it('Doppelvorzeichen zeigen zusätzlich den einfacheren Tastennamen', () => {
    expect(target('kl2', 'Des').targetDisplay).toBe('Eses (D)');
    expect(target('kl2', 'Des').text).toBe('Des – Eses (D)');
    expect(target('kl6', 'Des').targetDisplay).toBe('Heses (A)');
    expect(target('kl2', 'As').targetDisplay).toBe('Heses (A)');
    expect(target('ü4', 'Cis').targetDisplay).toBe('Fisis (G)');
  });

  it('einfache Vorzeichen ohne Klammer', () => {
    expect(target('gr3', 'D').text).toBe('D – Fis');
    expect(target('kl3', 'As').targetDisplay).toBe('Ces');
    expect(target('gr7', 'Cis').targetDisplay).toBe('His');
    expect(target('gr3', 'Cis').targetDisplay).toBe('Eis');
    expect(target('kl6', 'As').targetDisplay).toBe('Fes');
  });

  it('Prim und Oktave heißen wie der Grundton', () => {
    for (const r of ROOTS) {
      expect(target('r1', r.name).targetName).toBe(r.name);
      expect(target('r8', r.name).targetName).toBe(r.name);
    }
  });
});

describe('Buchstabierung – alle 13 Grundtöne × 13 Intervalle', () => {
  const cases = ROOTS.flatMap((r) => INTERVALS.map((i) => [r.name, i.short] as const));

  it('169 Kombinationen', () => {
    expect(cases).toHaveLength(169);
  });

  it.each(cases)('über %s: %s', (rootName, short) => {
    const r = rootOf(rootName);
    const i = byShort(short);
    const t = spellTarget(r, i);
    // Stammton-Stufe aus der Intervallzahl
    expect(t.letter).toBe((r.letter + i.degree - 1) % 7);
    // Tonhöhe aus der Halbtonzahl
    expect(pitchClassOf(t)).toBe((r.pitchClass + i.semitones) % 12);
    // höchstens Doppelvorzeichen
    expect(Math.abs(t.accidental)).toBeLessThanOrEqual(2);
    // Anzeige: Klammer genau dann, wenn Doppelvorzeichen
    const shown = displayName(t);
    if (Math.abs(t.accidental) === 2) {
      expect(shown).toMatch(/^\S+ \([A-H][a-z]*\)$/);
      const inner = shown.slice(shown.indexOf('(') + 1, -1);
      // Name in der Klammer ist die Taste mit derselben Tonhöhe
      const letterIdx = 'CDEFGAH'.indexOf(inner[0]);
      const acc = inner.length === 1 ? 0 : inner === 'B' ? -1 : inner.endsWith('is') ? 1 : -1;
      const pc = inner === 'B' ? 10 : (LETTER_PITCH_CLASSES[letterIdx] + acc + 12) % 12;
      expect(pc).toBe(pitchClassOf(t));
    } else {
      expect(shown).toBe(noteName(t));
    }
  });

  it('genau diese vier Fälle haben Doppelvorzeichen', () => {
    const doubles = cases
      .map(([rootName, short]) => ({ rootName, short, t: spellTarget(rootOf(rootName), byShort(short)) }))
      .filter((c) => Math.abs(c.t.accidental) === 2)
      .map((c) => `${c.short} über ${c.rootName} = ${noteName(c.t)}`);
    expect(doubles.sort()).toEqual(
      ['kl2 über Des = Eses', 'kl6 über Des = Heses', 'kl2 über As = Heses', 'ü4 über Cis = Fisis'].sort(),
    );
  });
});
