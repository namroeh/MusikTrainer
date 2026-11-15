/**
 * Quiz-Bereich: spielt ein zufälliges Intervall, nimmt die Antwort entgegen
 * (Zieltaste oder Liste), zeigt die Auflösung und zählt mit.
 */

import type { AudioEngine } from './audio';
import { INTERVALS, intervalBySemitones } from './intervals';
import type { Keyboard } from './keyboard';
import { ROOTS, findRoot, intervalNames, type RootNote } from './notes';
import { KEYBOARD_LOW_MIDI } from './pitch';
import { planInterval, planSingle } from './playback';
import {
  QUIZ_RESET_EVENT,
  clearStats,
  loadStats,
  nextQuestion,
  recordAnswer,
  saveStats,
  troubleIntervals,
  type AnswerMode,
  type Question,
  type QuizStats,
} from './quiz';
import type { Settings } from './settings';

export interface QuizContext {
  engine: AudioEngine;
  keyboard: Keyboard;
  settings: Settings;
  persist(): void;
  refreshKeyboard(): void;
  /** Tastatur neu vermessen und zum Bereich des aktiven Grundtons scrollen */
  relayout(smooth: boolean): void;
  /** fester Grundton wurde im Quiz geändert (Lernen-Leiste nachziehen) */
  onRootChosen(name: string): void;
}

type Phase = 'idle' | 'asking' | 'answered';

const RANDOM = 'zufällig';

export class QuizController {
  private phase: Phase = 'idle';
  private question: Question | null = null;
  /** gegebene Antwort in Halbtönen; null = aufgelöst ohne Antwort */
  private given: number | null = null;
  /** angetippte Taste bei falscher Antwort (zum Markieren) */
  private givenMidi: number | null = null;
  private right = 0;
  private total = 0;
  private stats: QuizStats = loadStats();
  private readonly el;

  constructor(private readonly ctx: QuizContext) {
    const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
    this.el = {
      app: $('app'),
      rootSelect: $<HTMLSelectElement>('quiz-root'),
      answerModes: $('quiz-answer'),
      list: $('quiz-list'),
      status: $('quiz-status'),
      score: $('quiz-score'),
      reset: $<HTMLButtonElement>('quiz-reset'),
      result: $('quiz-result'),
      symbol: $('quiz-symbol'),
      short: $('quiz-short'),
      name: $('quiz-name'),
      notes: $('quiz-notes'),
      song: $('quiz-song'),
      hint: $('quiz-hint'),
      replay: $<HTMLButtonElement>('quiz-replay'),
      next: $<HTMLButtonElement>('quiz-next'),
      forget: $<HTMLButtonElement>('quiz-forget'),
    };

    // Grundton-Auswahl: „zufällig" oder ein fester Grundton
    this.el.rootSelect.replaceChildren(
      new Option('zufällig', RANDOM),
      ...ROOTS.map((r) => new Option(r.name, r.name)),
    );
    this.el.rootSelect.addEventListener('change', () => {
      const value = this.el.rootSelect.value;
      const s = this.ctx.settings;
      if (value === RANDOM) {
        s.quizRandomRoot = true;
      } else {
        s.quizRandomRoot = false;
        s.root = value;
        this.ctx.onRootChosen(value);
      }
      this.ctx.persist();
      this.settingsChanged();
    });

    // Antwort per Taste oder aus der Liste
    for (const b of this.el.answerModes.querySelectorAll<HTMLButtonElement>('button')) {
      b.addEventListener('click', () => {
        this.ctx.settings.quizAnswer = b.dataset.answer as AnswerMode;
        this.ctx.persist();
        this.applyAnswerMode();
        this.settingsChanged();
      });
    }

    // Intervall-Liste
    this.el.list.replaceChildren(
      ...INTERVALS.map((i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'qchip';
        b.dataset.semitones = String(i.semitones);
        b.textContent = i.short;
        b.setAttribute('aria-label', i.name);
        b.title = i.name;
        b.addEventListener('click', () => this.onListChoice(i.semitones));
        return b;
      }),
    );

    this.el.next.addEventListener('click', () => (this.phase === 'asking' ? this.answer(null, null) : this.next()));
    this.el.replay.addEventListener('click', () => this.playQuestion());
    this.el.reset.addEventListener('click', () => {
      this.right = 0;
      this.total = 0;
      this.render();
    });
    this.el.forget.addEventListener('click', () => {
      clearStats();
      this.stats = {};
      this.render();
    });
    window.addEventListener(QUIZ_RESET_EVENT, () => {
      this.stats = {};
      this.render();
    });

    this.syncSettings();
    this.applyAnswerMode();
    this.render();
  }

  /** Grundton, um den herum die Tastatur gerade beschriftet ist */
  activeRoot(): RootNote {
    return this.question?.root ?? findRoot(this.ctx.settings.root) ?? ROOTS[0];
  }

  private rootMidi(): number {
    return KEYBOARD_LOW_MIDI + this.activeRoot().pitchClass;
  }

  /** Auswahlfelder an die Einstellungen angleichen (z. B. nach Änderung im Lernen-Bereich) */
  syncSettings(): void {
    const s = this.ctx.settings;
    this.el.rootSelect.value = s.quizRandomRoot ? RANDOM : s.root;
    for (const b of this.el.answerModes.querySelectorAll<HTMLButtonElement>('button')) {
      b.setAttribute('aria-checked', String(b.dataset.answer === s.quizAnswer));
    }
  }

  /** fester Grundton wurde im Lernen-Bereich geändert */
  rootChangedElsewhere(): void {
    this.syncSettings();
    if (!this.ctx.settings.quizRandomRoot) this.reset();
  }

  private applyAnswerMode(): void {
    this.syncSettings();
    this.el.app.classList.toggle('answer-list', this.ctx.settings.quizAnswer === 'list');
  }

  /** Bereich wird angezeigt */
  show(): void {
    this.applyAnswerMode();
    this.applyMarks();
    this.render();
  }

  /** Bereich wird verlassen */
  hide(): void {
    this.ctx.keyboard.markWrong(null);
  }

  private reset(): void {
    this.phase = 'idle';
    this.question = null;
    this.given = null;
    this.givenMidi = null;
  }

  private settingsChanged(): void {
    this.reset();
    this.ctx.refreshKeyboard();
    this.applyMarks();
    this.render();
    this.ctx.relayout(true);
  }

  // ---------- Ablauf ----------

  next(): void {
    const s = this.ctx.settings;
    this.question = nextQuestion({
      stats: this.stats,
      fixedRoot: s.quizRandomRoot ? null : (findRoot(s.root) ?? ROOTS[0]),
      previous: this.question,
    });
    this.phase = 'asking';
    this.given = null;
    this.givenMidi = null;
    this.ctx.refreshKeyboard();
    this.applyMarks();
    this.render();
    this.ctx.relayout(true);
    this.playQuestion();
  }

  private playQuestion(): void {
    if (!this.question) return;
    const root = this.rootMidi();
    this.ctx.engine.play(planInterval(root, root + this.question.semitones, this.ctx.settings.mode));
  }

  private answer(semitones: number | null, midi: number | null): void {
    if (this.phase !== 'asking' || !this.question) return;
    const correct = semitones === this.question.semitones;
    this.stats = recordAnswer(this.stats, this.question.semitones, correct);
    saveStats(this.stats);
    this.total++;
    if (correct) this.right++;
    this.phase = 'answered';
    this.given = semitones;
    this.givenMidi = correct ? null : midi;
    this.applyMarks();
    this.render();
  }

  // ---------- Eingaben ----------

  onKey(midi: number): void {
    const rel = midi - this.rootMidi();
    const inRange = rel >= 0 && rel <= 12;
    const { engine, keyboard, settings } = this.ctx;

    if (this.phase === 'asking' && settings.quizAnswer === 'key') {
      if (inRange) {
        this.answer(rel, midi);
      } else {
        engine.play(planSingle(midi));
        keyboard.flash(midi);
        this.el.hint.textContent = 'Tippe eine Taste zwischen Grundton und Oktave.';
      }
      return;
    }
    if (this.phase === 'answered' && inRange) {
      // nach der Antwort: Tasten zum Vergleichen
      engine.play(planInterval(this.rootMidi(), midi, settings.mode));
      keyboard.flash(midi);
      return;
    }
    engine.play(planSingle(midi));
    keyboard.flash(midi);
  }

  private onListChoice(semitones: number): void {
    if (this.phase === 'asking') {
      this.answer(semitones, null);
      return;
    }
    // vor dem Start oder nach der Antwort: Intervall zum Vergleichen anhören
    const root = this.rootMidi();
    this.ctx.engine.play(planInterval(root, root + semitones, this.ctx.settings.mode));
    this.ctx.keyboard.flash(root + semitones);
  }

  // ---------- Anzeige ----------

  /** Tasten- und Listenmarkierungen passend zur Phase */
  private applyMarks(): void {
    const { keyboard } = this.ctx;
    const root = this.rootMidi();
    if (this.phase === 'idle' || !this.question) {
      keyboard.highlight([]);
      keyboard.markWrong(null);
    } else if (this.phase === 'asking') {
      keyboard.highlight([root]);
      keyboard.markWrong(null);
    } else {
      keyboard.highlight([root, root + this.question.semitones]);
      keyboard.markWrong(this.givenMidi);
    }
    const answered = this.phase === 'answered' && this.question;
    for (const chip of this.el.list.querySelectorAll<HTMLButtonElement>('.qchip')) {
      const s = Number(chip.dataset.semitones);
      chip.classList.toggle('correct', !!answered && s === this.question!.semitones);
      chip.classList.toggle('wrong', !!answered && s === this.given && s !== this.question!.semitones);
    }
  }

  private render(): void {
    const el = this.el;
    const mode = this.ctx.settings.quizAnswer;
    el.score.textContent = `Richtig: ${this.right} von ${this.total}`;
    el.reset.hidden = this.total === 0;
    el.status.className = 'quiz-status';
    el.replay.disabled = !this.question;
    const trouble = troubleIntervals(this.stats);
    el.forget.hidden = trouble.length === 0 || this.phase === 'asking';

    if (this.phase === 'idle' || !this.question) {
      el.result.hidden = true;
      el.status.textContent = 'Bereit?';
      el.hint.textContent =
        (mode === 'key'
          ? 'Du hörst ein Intervall – tippe dann die Zieltaste.'
          : 'Du hörst ein Intervall – wähle es dann aus der Liste.') +
        (trouble.length ? ` Kommt öfter dran: ${trouble.join(', ')}.` : '');
      el.next.textContent = this.total === 0 ? 'Start' : 'Weiter';
      return;
    }

    const root = this.question.root;
    if (this.phase === 'asking') {
      el.result.hidden = true;
      el.status.textContent = `Welches Intervall? Grundton: ${root.name}`;
      el.hint.textContent =
        mode === 'key' ? `Der Grundton ${root.name} leuchtet – tippe die Zieltaste.` : 'Wähle das Intervall aus der Liste.';
      el.next.textContent = 'Auflösen';
      return;
    }

    // beantwortet
    const interval = intervalBySemitones(this.question.semitones)!;
    const correct = this.given === this.question.semitones;
    el.status.textContent = correct ? 'Richtig!' : this.given === null ? 'Aufgelöst' : 'Leider falsch';
    el.status.classList.add(correct ? 'ok' : 'bad');
    el.result.hidden = false;
    el.symbol.innerHTML = interval.symbol;
    el.short.textContent = interval.short;
    el.name.textContent = interval.name;
    el.notes.textContent = intervalNames(root, interval).text;
    el.song.textContent = `„${interval.song}“`;
    let hint = '';
    if (!correct && this.given !== null) {
      const g = intervalBySemitones(this.given)!;
      hint = `Deine Antwort: ${g.short} (${g.name}). `;
    }
    el.hint.textContent = `${hint}Tipp: zum Vergleichen Tasten${mode === 'list' ? ' oder Liste' : ''} antippen.`;
    el.next.textContent = 'Weiter';
  }
}
