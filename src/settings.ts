/** Gespeicherte Auswahl (bleibt nach dem Schließen der App erhalten). */

import { DEFAULT_ROOT_NAME, findRoot } from './notes';
import { DEFAULT_PLAY_MODE, isPlayMode, type PlayMode } from './playback';
import { isAnswerMode, type AnswerMode } from './quiz';

export type Tab = 'learn' | 'quiz';

export interface Settings {
  /** Bereich: Lernen oder Quiz */
  tab: Tab;
  /** Name des Grundtons, z. B. "Des" (im Quiz: der feste Grundton) */
  root: string;
  mode: PlayMode;
  showSymbols: boolean;
  showTitles: boolean;
  /** Quiz: Grundton zufällig statt fest */
  quizRandomRoot: boolean;
  /** Quiz: Antwort per Taste oder aus der Liste */
  quizAnswer: AnswerMode;
}

const STORAGE_KEY = 'intervall-trainer:einstellungen';

export const DEFAULT_SETTINGS: Settings = {
  tab: 'learn',
  root: DEFAULT_ROOT_NAME,
  mode: DEFAULT_PLAY_MODE,
  showSymbols: true,
  showTitles: true,
  quizRandomRoot: false,
  quizAnswer: 'key',
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const data = JSON.parse(raw) as Partial<Settings>;
    const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
    return {
      tab: data.tab === 'quiz' ? 'quiz' : 'learn',
      root: typeof data.root === 'string' && findRoot(data.root) ? data.root : DEFAULT_SETTINGS.root,
      mode: isPlayMode(data.mode) ? data.mode : DEFAULT_SETTINGS.mode,
      showSymbols: bool(data.showSymbols, true),
      showTitles: bool(data.showTitles, true),
      quizRandomRoot: bool(data.quizRandomRoot, false),
      quizAnswer: isAnswerMode(data.quizAnswer) ? data.quizAnswer : DEFAULT_SETTINGS.quizAnswer,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* privater Modus o. Ä. – dann eben ohne Speichern */
  }
}
