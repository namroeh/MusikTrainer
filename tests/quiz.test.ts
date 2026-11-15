import { describe, expect, it } from 'vitest';
import { INTERVALS } from '../src/intervals';
import { ROOTS, findRoot } from '../src/notes';
import {
  MAX_SCORE,
  nextQuestion,
  pickWeighted,
  recordAnswer,
  statFor,
  troubleIntervals,
  type Question,
  type QuizStats,
} from '../src/quiz';

/** reproduzierbarer Zufallsgenerator für Tests */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const C = findRoot('C')!;

function count(questions: Question[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const q of questions) m.set(q.semitones, (m.get(q.semitones) ?? 0) + 1);
  return m;
}

function run(n: number, stats: QuizStats, fixedRoot = C, seed = 1): Question[] {
  const rng = seeded(seed);
  const out: Question[] = [];
  let prev: Question | null = null;
  for (let i = 0; i < n; i++) {
    prev = nextQuestion({ stats, fixedRoot, previous: prev, rng });
    out.push(prev);
  }
  return out;
}

describe('Statistik', () => {
  it('falsch erhöht den Übungsbedarf um 3, richtig senkt um 1, mit Grenzen', () => {
    let s: QuizStats = {};
    s = recordAnswer(s, 8, false);
    expect(statFor(s, 8)).toEqual({ asked: 1, wrong: 1, score: 3 });
    s = recordAnswer(s, 8, true);
    expect(statFor(s, 8)).toEqual({ asked: 2, wrong: 1, score: 2 });
    for (let i = 0; i < 10; i++) s = recordAnswer(s, 8, false);
    expect(statFor(s, 8).score).toBe(MAX_SCORE);
    for (let i = 0; i < 20; i++) s = recordAnswer(s, 8, true);
    expect(statFor(s, 8).score).toBe(0);
  });

  it('verändert die alte Statistik nicht', () => {
    const before: QuizStats = {};
    recordAnswer(before, 3, false);
    expect(before).toEqual({});
  });

  it('nennt die Intervalle mit dem größten Übungsbedarf', () => {
    let s: QuizStats = {};
    s = recordAnswer(s, 8, false);
    s = recordAnswer(s, 8, false);
    s = recordAnswer(s, 6, false);
    s = recordAnswer(s, 4, true);
    expect(troubleIntervals(s)).toEqual(['kl6', 'ü4']);
    expect(troubleIntervals({})).toEqual([]);
  });
});

describe('Fragen', () => {
  it('ohne Statistik kommen alle 13 Intervalle etwa gleich oft', () => {
    const c = count(run(13000, {}));
    expect(c.size).toBe(13);
    for (const i of INTERVALS) {
      expect(c.get(i.semitones)!).toBeGreaterThan(800);
      expect(c.get(i.semitones)!).toBeLessThan(1200);
    }
  });

  it('häufig falsch beantwortete Intervalle kommen öfter dran', () => {
    let stats: QuizStats = {};
    stats = recordAnswer(stats, 8, false); // kl6 einmal falsch → Gewicht 4
    const c = count(run(13000, stats));
    const others = INTERVALS.filter((i) => i.semitones !== 8).map((i) => c.get(i.semitones)!);
    const avgOthers = others.reduce((a, b) => a + b, 0) / others.length;
    const ratio = c.get(8)! / avgOthers;
    expect(ratio).toBeGreaterThan(2.8); // erwartet ≈ 3,2 (4× Gewicht, aber nie zweimal hintereinander)
    expect(ratio).toBeLessThan(3.6);
  });

  it('dieselbe Frage kommt nie zweimal hintereinander', () => {
    const qs = run(3000, {});
    for (let i = 1; i < qs.length; i++) {
      const same = qs[i].root.name === qs[i - 1].root.name && qs[i].semitones === qs[i - 1].semitones;
      expect(same).toBe(false);
    }
  });

  it('Grundton fest: immer der gewählte', () => {
    const d = findRoot('Des')!;
    expect(run(200, {}, d).every((q) => q.root.name === 'Des')).toBe(true);
  });

  it('Grundton zufällig: alle 13 Grundtöne kommen vor', () => {
    const rng = seeded(7);
    const roots = new Set<string>();
    let prev: Question | null = null;
    for (let i = 0; i < 1000; i++) {
      prev = nextQuestion({ stats: {}, fixedRoot: null, previous: prev, rng });
      roots.add(prev.root.name);
    }
    expect([...roots].sort()).toEqual(ROOTS.map((r) => r.name).sort());
  });

  it('gewichtete Auswahl respektiert die Gewichte', () => {
    const rng = seeded(3);
    let a = 0;
    for (let i = 0; i < 10000; i++) if (pickWeighted(['a', 'b'], (x) => (x === 'a' ? 3 : 1), rng) === 'a') a++;
    expect(a / 10000).toBeGreaterThan(0.72);
    expect(a / 10000).toBeLessThan(0.78);
  });
});
