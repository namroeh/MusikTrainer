import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { setupAbout } from './about-view';
import { AudioEngine } from './audio';
import { INTERVALS, intervalBySemitones } from './intervals';
import { setupInstallBanner } from './install';
import { Keyboard, type KeyState } from './keyboard';
import { ROOTS, findRoot, intervalNames, keyLabel, type RootNote } from './notes';
import { KEYBOARD_LOW_MIDI } from './pitch';
import { PLAY_MODES, planInterval, planSingle, type PlayMode } from './playback';
import { QuizController } from './quiz-view';
import { loadSettings, saveSettings, type Tab } from './settings';

// ---------- Zustand ----------

const settings = loadSettings();
/** zuletzt gewähltes Intervall (Halbtöne über dem Grundton) */
let lastSemitones: number | null = null;

const engine = new AudioEngine();

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const app = $('app');
const modesEl = $('modes');
const rootsEl = $('roots');
const tabsEl = $('tabs');
const againBtn = $<HTMLButtonElement>('again');
const symbolsSwitch = $<HTMLButtonElement>('toggle-symbols');
const titlesSwitch = $<HTMLButtonElement>('toggle-titles');
const info = {
  card: $('info-card'),
  symbol: $('info-symbol'),
  short: $('info-short'),
  name: $('info-name'),
  notes: $('info-notes'),
  song: $('info-song'),
  status: $('status'),
};

function currentRoot(): RootNote {
  return findRoot(settings.root) ?? ROOTS[0];
}

/** Grundton liegt immer in der unteren Oktave (c' bis h'). */
function rootMidi(): number {
  return KEYBOARD_LOW_MIDI + currentRoot().pitchClass;
}

/** Grundton, um den die Tastatur gerade beschriftet ist (im Quiz ggf. zufällig). */
function activeRoot(): RootNote {
  return settings.tab === 'quiz' ? quiz.activeRoot() : currentRoot();
}

function activeRootMidi(): number {
  return KEYBOARD_LOW_MIDI + activeRoot().pitchClass;
}

function persist(): void {
  saveSettings(settings);
}

// ---------- Audio freischalten (iOS: erst nach Berührung) ----------

for (const type of ['pointerdown', 'touchend', 'click', 'keydown'] as const) {
  document.addEventListener(type, () => engine.unlock(), { capture: true, passive: true });
}
// damit :active-Stile in iOS-Safari greifen
document.addEventListener('touchstart', () => undefined, { passive: true });

// ---------- Tastatur ----------

const keyboard = new Keyboard($('keyboard-scroll'), $('keyboard'), pressKey);

function keyState(midi: number): KeyState {
  const root = activeRootMidi();
  const semitones = midi - root;
  const interval = semitones >= 0 && semitones <= 12 ? intervalBySemitones(semitones) : undefined;
  if (!interval) {
    return {
      inRange: false,
      isRoot: false,
      isOctave: false,
      symbol: null,
      ariaLabel: `${keyLabel(midi % 12)} (Einzelton)`,
    };
  }
  const names = intervalNames(activeRoot(), interval);
  return {
    inRange: true,
    isRoot: semitones === 0,
    isOctave: semitones === 12,
    symbol: interval.symbol,
    ariaLabel: `${names.targetDisplay}: ${interval.name}`,
  };
}

function refreshKeyboard(): void {
  keyboard.update(keyState);
}

function pressKey(midi: number): void {
  if (settings.tab === 'quiz') {
    quiz.onKey(midi);
    return;
  }
  const semitones = midi - rootMidi();
  if (semitones >= 0 && semitones <= 12) {
    selectInterval(semitones);
  } else {
    engine.play(planSingle(midi));
    keyboard.flash(midi);
    info.status.textContent = `Einzelton: ${keyLabel(midi % 12)}`;
  }
}

function selectInterval(semitones: number): void {
  lastSemitones = semitones;
  playLast();
  renderInfo();
}

function playLast(): void {
  if (lastSemitones === null) return;
  const root = rootMidi();
  const target = root + lastSemitones;
  engine.play(planInterval(root, target, settings.mode));
  keyboard.highlight([root, target]);
  info.status.textContent = '';
}

// ---------- Info-Bereich ----------

function renderInfo(): void {
  const interval = lastSemitones === null ? undefined : intervalBySemitones(lastSemitones);
  againBtn.disabled = !interval;
  info.card.classList.toggle('empty', !interval);
  if (!interval) {
    info.symbol.innerHTML = '';
    info.short.textContent = '';
    info.name.textContent = 'Tippe eine Taste im hellen Bereich.';
    info.notes.textContent = `Grundton: ${currentRoot().name}`;
    info.song.textContent = '';
    return;
  }
  const names = intervalNames(currentRoot(), interval);
  info.symbol.innerHTML = interval.symbol;
  info.short.textContent = interval.short;
  info.name.textContent = interval.name;
  info.notes.textContent = names.text;
  info.song.textContent = `„${interval.song}“`;
}

// ---------- Bedienelemente ----------

function renderModes(): void {
  modesEl.replaceChildren(
    ...PLAY_MODES.map(({ mode, label, hint }) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mode';
      b.setAttribute('role', 'radio');
      b.dataset.mode = mode;
      b.title = hint;
      b.textContent = label;
      b.addEventListener('click', () => setMode(mode));
      return b;
    }),
  );
  updateModes();
}

function updateModes(): void {
  for (const b of modesEl.querySelectorAll<HTMLButtonElement>('button')) {
    const active = b.dataset.mode === settings.mode;
    b.setAttribute('aria-checked', String(active));
    b.tabIndex = active ? 0 : -1;
  }
}

function setMode(mode: PlayMode): void {
  settings.mode = mode;
  persist();
  updateModes();
}

function renderRoots(): void {
  rootsEl.replaceChildren(
    ...ROOTS.map((r) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'root';
      b.setAttribute('role', 'radio');
      b.dataset.root = r.name;
      b.textContent = r.name;
      b.addEventListener('click', () => setRoot(r.name));
      return b;
    }),
  );
  updateRoots();
}

function updateRoots(): void {
  for (const b of rootsEl.querySelectorAll<HTMLButtonElement>('button')) {
    const active = b.dataset.root === settings.root;
    b.setAttribute('aria-checked', String(active));
    b.tabIndex = active ? 0 : -1;
  }
}

function setRoot(name: string): void {
  if (settings.root === name) {
    keyboard.scrollToRange(rootMidi(), rootMidi() + 12, true);
    return;
  }
  settings.root = name;
  persist();
  lastSemitones = null;
  keyboard.highlight([]);
  info.status.textContent = '';
  updateRoots();
  quiz.rootChangedElsewhere();
  refreshKeyboard();
  renderInfo();
  keyboard.scrollToRange(rootMidi(), rootMidi() + 12, true);
}

// ---------- Bereiche: Lernen / Quiz ----------

function updateTabs(): void {
  for (const b of tabsEl.querySelectorAll<HTMLButtonElement>('button')) {
    const active = b.dataset.tab === settings.tab;
    b.setAttribute('aria-checked', String(active));
    b.tabIndex = active ? 0 : -1;
  }
  app.classList.toggle('tab-learn', settings.tab === 'learn');
  app.classList.toggle('tab-quiz', settings.tab === 'quiz');
}

function setTab(tab: Tab): void {
  if (settings.tab === tab) return;
  settings.tab = tab;
  persist();
  updateTabs();
  if (tab === 'quiz') {
    quiz.show();
  } else {
    quiz.hide();
    keyboard.highlight(lastSemitones === null ? [] : [rootMidi(), rootMidi() + lastSemitones]);
    renderInfo();
  }
  refreshKeyboard();
  relayout();
}

/** Pfeiltasten in Radiogruppen (Bedienung mit Tastatur/Screenreader) */
function arrowNavigation(group: HTMLElement, onSelect: (b: HTMLButtonElement) => void): void {
  group.addEventListener('keydown', (e) => {
    const buttons = [...group.querySelectorAll<HTMLButtonElement>('button')];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = buttons[(i + step + buttons.length) % buttons.length];
    next.focus();
    onSelect(next);
  });
}

function updateSwitches(): void {
  symbolsSwitch.setAttribute('aria-checked', String(settings.showSymbols));
  titlesSwitch.setAttribute('aria-checked', String(settings.showTitles));
  app.classList.toggle('hide-symbols', !settings.showSymbols);
  app.classList.toggle('hide-titles', !settings.showTitles);
}

symbolsSwitch.addEventListener('click', () => {
  settings.showSymbols = !settings.showSymbols;
  persist();
  updateSwitches();
});
titlesSwitch.addEventListener('click', () => {
  settings.showTitles = !settings.showTitles;
  persist();
  updateSwitches();
});
againBtn.addEventListener('click', playLast);

// ---------- Start ----------

const quiz = new QuizController({
  engine,
  keyboard,
  settings,
  persist,
  refreshKeyboard,
  relayout: (smooth) => relayout(smooth),
  onRootChosen: () => {
    lastSemitones = null;
    updateRoots();
    renderInfo();
  },
});

for (const b of tabsEl.querySelectorAll<HTMLButtonElement>('button')) {
  b.addEventListener('click', () => setTab(b.dataset.tab as Tab));
}

renderModes();
renderRoots();
arrowNavigation(modesEl, (b) => setMode(b.dataset.mode as PlayMode));
arrowNavigation(rootsEl, (b) => setRoot(b.dataset.root!));
arrowNavigation(tabsEl, (b) => setTab(b.dataset.tab as Tab));
updateTabs();
updateSwitches();
if (settings.tab === 'quiz') quiz.show();
refreshKeyboard();
renderInfo();

function relayout(smooth = false): void {
  keyboard.layout();
  keyboard.scrollToRange(activeRootMidi(), activeRootMidi() + 12, smooth);
}
relayout();
setupAbout();
setupInstallBanner(() => relayout());
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => relayout(), 120);
});
// Schriften/Safe-Area können das Layout nach dem ersten Bild noch verschieben
requestAnimationFrame(() => relayout());

// Plausibilitätsprüfung der Daten beim Start (fällt beim Bearbeiten von intervals.ts auf)
if (INTERVALS.length !== 13) console.warn('intervals.ts sollte genau 13 Einträge haben.');

// Service Worker: macht die App offline-fähig (nur im fertigen Build aktiv)
registerSW({ immediate: true });
