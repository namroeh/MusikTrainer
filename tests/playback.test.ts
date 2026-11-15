import { describe, expect, it } from 'vitest';
import { MELODIC_GAP, planInterval, planSingle } from '../src/playback';

describe('Wiedergabe-Plan', () => {
  it('nacheinander: erst Grundton, dann Zielton', () => {
    const p = planInterval(62, 66, 'up');
    expect(p.map((n) => n.midi)).toEqual([62, 66]);
    expect(p.map((n) => n.offset)).toEqual([0, MELODIC_GAP]);
  });

  it('abwärts: erst Zielton (oben), dann Grundton', () => {
    const p = planInterval(62, 66, 'down');
    expect(p.map((n) => n.midi)).toEqual([66, 62]);
    expect(p.map((n) => n.offset)).toEqual([0, MELODIC_GAP]);
  });

  it('gleichzeitig: beide Töne zugleich', () => {
    const p = planInterval(62, 66, 'together');
    expect(p.map((n) => n.midi).sort()).toEqual([62, 66]);
    expect(p.every((n) => n.offset === 0)).toBe(true);
  });

  it('Prim: melodisch zweimal derselbe Ton, harmonisch ein Ton', () => {
    expect(planInterval(60, 60, 'up').map((n) => n.midi)).toEqual([60, 60]);
    expect(planInterval(60, 60, 'together').map((n) => n.midi)).toEqual([60]);
  });

  it('Einzelton', () => {
    expect(planSingle(70)).toEqual([{ midi: 70, offset: 0, hold: expect.any(Number) }]);
  });
});
