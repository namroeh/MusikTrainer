/** Gespeicherte Auswahl (bleibt nach dem Schließen der App erhalten). */

import { DEFAULT_ROOT_NAME, findRoot } from './notes';
import { DEFAULT_PLAY_MODE, isPlayMode, type PlayMode } from './playback';

export interface Settings {
  /** Name des Grundtons, z. B. "Des" */
  root: string;
  mode: PlayMode;
  showSymbols: boolean;
  showTitles: boolean;
}

const STORAGE_KEY = 'intervall-trainer:einstellungen';

export const DEFAULT_SETTINGS: Settings = {
  root: DEFAULT_ROOT_NAME,
  mode: DEFAULT_PLAY_MODE,
  showSymbols: true,
  showTitles: true,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const data = JSON.parse(raw) as Partial<Settings>;
    return {
      root: typeof data.root === 'string' && findRoot(data.root) ? data.root : DEFAULT_SETTINGS.root,
      mode: isPlayMode(data.mode) ? data.mode : DEFAULT_SETTINGS.mode,
      showSymbols: typeof data.showSymbols === 'boolean' ? data.showSymbols : true,
      showTitles: typeof data.showTitles === 'boolean' ? data.showTitles : true,
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
