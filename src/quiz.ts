/**
 * Quiz-Logik (ohne Oberfläche, daher gut testbar).
 *
 * Gewichtung: Jedes Intervall hat einen „Übungsbedarf" (score).
 * - falsche Antwort: +3 (höchstens 9)
 * - richtige Antwort: −1 (mindestens 0)
 * Ziehgewicht = 1 + score. Ein gerade falsch beantwortetes Intervall kommt also
 * etwa viermal so oft dran wie ein sicheres, bis es dreimal richtig war.
 */

import { INTERVALS, intervalBySemitones } from './intervals';
import { ROOTS, type RootNote } from './notes';

export type AnswerMode = 'key' | 'list';

export function isAnswerMode(value: unknown): value is AnswerMode {
  return value === 'key' || value === 'list';
}

export interface IntervalStat {
  /** wie oft gefragt */
  asked: number;
  /** wie oft falsch beantwortet */
  wrong: number;
  /** aktueller Übungsbedarf 0 … MAX_SCORE */
  score: number;
}

/** Statistik je Intervall, Schlüssel = Halbtöne (0–12) */
export type QuizStats = Partial<Record<number, IntervalStat>>;

export const MAX_SCORE = 9;
const WRONG_PENALTY = 3;
const RIGHT_RELIEF = 1;

export function statFor(stats: QuizStats, semitones: number): IntervalStat {
  return stats[semitones] ?? { asked: 0, wrong: 0, score: 0 };
}

/** Neue Statistik nach einer Antwort (die alte bleibt unverändert). */
export function recordAnswer(stats: QuizStats, semitones: number, correct: boolean): QuizStats {
  const s = statFor(stats, semitones);
  return {
    ...stats,
    [semitones]: {
      asked: s.asked + 1,
      wrong: s.wrong + (correct ? 0 : 1),
      score: correct ? Math.max(0, s.score - RIGHT_RELIEF) : Math.min(MAX_SCORE, s.score + WRONG_PENALTY),
    },
  };
}

export function weightOf(stat: IntervalStat): number {
  return 1 + stat.score;
}

/** Zufallsauswahl mit Gewichten. `rng` liefert Zahlen in [0, 1). */
export function pickWeighted<T>(items: readonly T[], weight: (item: T) => number, rng: () => number): T {
  if (items.length === 0) throw new Error('Keine Auswahl möglich');
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

export interface Question {
  root: RootNote;
  /** Halbtöne über dem Grundton (0–12) */
  semitones: number;
}

export interface NextQuestionOptions {
  stats: QuizStats;
  /** fester Grundton – oder null für „zufällig" */
  fixedRoot: RootNote | null;
  /** vorige Frage: dieselbe Frage kommt nie zweimal hintereinander */
  previous: Question | null;
  rng?: () => number;
}

export function nextQuestion({ stats, fixedRoot, previous, rng = Math.random }: NextQuestionOptions): Question {
  const root = fixedRoot ?? ROOTS[Math.floor(rng() * ROOTS.length)];
  let candidates = INTERVALS.map((i) => i.semitones);
  if (previous && previous.root.name === root.name) {
    candidates = candidates.filter((s) => s !== previous.semitones);
  }
  const semitones = pickWeighted(candidates, (s) => weightOf(statFor(stats, s)), rng);
  return { root, semitones };
}

/** Kürzel der Intervalle mit dem größten Übungsbedarf (z. B. ["kl6", "ü4"]). */
export function troubleIntervals(stats: QuizStats, count = 3): string[] {
  return INTERVALS.map((i) => ({ short: i.short, score: statFor(stats, i.semitones).score }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.short);
}

// ---------- Speichern ----------

const STATS_KEY = 'intervall-trainer:quiz-statistik';

/** Ereignis: Lernstand wurde (z. B. im Info-Fenster) gelöscht */
export const QUIZ_RESET_EVENT = 'intervall:quiz-lernstand-geloescht';

export function loadStats(): QuizStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, Partial<IntervalStat>>;
    const result: QuizStats = {};
    for (const [key, value] of Object.entries(data)) {
      const s = Number(key);
      if (!intervalBySemitones(s) || typeof value !== 'object' || value === null) continue;
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
      result[s] = { asked: num(value.asked), wrong: num(value.wrong), score: Math.min(MAX_SCORE, num(value.score)) };
    }
    return result;
  } catch {
    return {};
  }
}

export function saveStats(stats: QuizStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* ohne Speichern weiter */
  }
}

export function clearStats(): void {
  try {
    localStorage.removeItem(STATS_KEY);
  } catch {
    /* egal */
  }
}
