/**
 * Klaviertastatur c' bis c''' (25 Tasten: 15 weiße, 10 schwarze).
 * Kümmert sich um Aufbau, Größe, Scrollen und Hervorhebung – nicht um Intervalle.
 */

import { KEYBOARD_HIGH_MIDI, KEYBOARD_LOW_MIDI } from './pitch';
import { LETTERS, LETTER_PITCH_CLASSES } from './notes';

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);
/** Breite der schwarzen Tasten relativ zu den weißen */
const BLACK_RATIO = 0.64;
const MIN_KEY_WIDTH = 44;

export interface KeyState {
  inRange: boolean;
  isRoot: boolean;
  isOctave: boolean;
  /** SVG-Code des Symbols oder null */
  symbol: string | null;
  ariaLabel: string;
}

interface Key {
  midi: number;
  black: boolean;
  /** weiße Taste: ihr Index; schwarze Taste: Index der Fuge, auf der sie sitzt */
  position: number;
  el: HTMLButtonElement;
  symbolEl: HTMLSpanElement;
}

export class Keyboard {
  private readonly keys: Key[] = [];
  private readonly whiteCount: number;
  private readonly rangeEl: HTMLDivElement;
  private pointerPlayed: { midi: number; time: number } | null = null;

  constructor(
    private readonly scroller: HTMLElement,
    private readonly inner: HTMLElement,
    private readonly onPress: (midi: number) => void,
  ) {
    this.rangeEl = document.createElement('div');
    this.rangeEl.className = 'range-bar';
    this.rangeEl.setAttribute('aria-hidden', 'true');
    this.inner.append(this.rangeEl);

    let whiteIndex = 0;
    for (let midi = KEYBOARD_LOW_MIDI; midi <= KEYBOARD_HIGH_MIDI; midi++) {
      const pc = midi % 12;
      const black = BLACK_PITCH_CLASSES.has(pc);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `key ${black ? 'black' : 'white'}`;
      el.dataset.midi = String(midi);
      const position = black ? whiteIndex : whiteIndex++;
      el.style.setProperty('--pos', String(position));

      const symbolEl = document.createElement('span');
      symbolEl.className = 'key-symbol';
      symbolEl.setAttribute('aria-hidden', 'true');
      el.append(symbolEl);

      if (!black) {
        const label = document.createElement('span');
        label.className = 'key-label';
        label.setAttribute('aria-hidden', 'true');
        label.textContent = LETTERS[(LETTER_PITCH_CLASSES as readonly number[]).indexOf(pc)];
        el.append(label);
      }

      el.addEventListener('pointerdown', (e) => this.handlePointerDown(e, midi));
      el.addEventListener('click', () => this.handleClick(midi));
      this.inner.append(el);
      this.keys.push({ midi, black, position, el, symbolEl });
    }
    this.whiteCount = whiteIndex;
    this.inner.style.setProperty('--whites', String(this.whiteCount));
  }

  /**
   * Ohne Scrollen (Querformat) spielt die Taste sofort beim Berühren.
   * Beim Scrollen (Hochformat) erst beim Loslassen, damit Wischen keine Töne auslöst.
   */
  private handlePointerDown(e: PointerEvent, midi: number): void {
    if (e.button !== 0 || this.isScrollable()) return;
    this.pointerPlayed = { midi, time: performance.now() };
    this.onPress(midi);
  }

  private handleClick(midi: number): void {
    const p = this.pointerPlayed;
    this.pointerPlayed = null;
    if (p && p.midi === midi && performance.now() - p.time < 1500) return; // schon gespielt
    this.onPress(midi);
  }

  private isScrollable(): boolean {
    return this.scroller.scrollWidth > this.scroller.clientWidth + 1;
  }

  /** Tastenbreite an Bildschirm und Ausrichtung anpassen. */
  layout(): void {
    const width = this.scroller.clientWidth;
    const height = this.scroller.clientHeight;
    const landscape = window.matchMedia('(orientation: landscape)').matches;
    const fillWidth = width / this.whiteCount;
    let keyWidth: number;
    if (landscape ? fillWidth >= MIN_KEY_WIDTH : fillWidth >= 50) {
      keyWidth = fillWidth; // ganze Tastatur sichtbar
    } else if (landscape) {
      keyWidth = MIN_KEY_WIDTH; // sehr kleines Querformat: so viele Tasten wie möglich
    } else {
      // Hochformat: eine Oktave (8 weiße Tasten) passt auf den Schirm, Rest per Wischen
      keyWidth = Math.max(MIN_KEY_WIDTH, width / 8);
    }
    keyWidth = Math.floor(keyWidth * 100) / 100;
    this.inner.style.setProperty('--w', `${keyWidth}px`);
    this.inner.style.setProperty('--bw', `${(keyWidth * BLACK_RATIO).toFixed(2)}px`);
    this.inner.style.setProperty('--kh', `${height}px`);
    this.inner.style.width = `${keyWidth * this.whiteCount}px`;
  }

  /** Zustand aller Tasten setzen (Bereich, Symbole, Beschriftung für Screenreader). */
  update(stateFor: (midi: number) => KeyState): void {
    let rangeStart = Infinity;
    let rangeEnd = -Infinity;
    for (const key of this.keys) {
      const s = stateFor(key.midi);
      key.el.classList.toggle('in-range', s.inRange);
      key.el.classList.toggle('out-of-range', !s.inRange);
      key.el.classList.toggle('is-root', s.isRoot);
      key.el.classList.toggle('is-octave', s.isOctave);
      key.el.setAttribute('aria-label', s.ariaLabel);
      key.symbolEl.innerHTML = s.symbol ?? '';
      key.symbolEl.hidden = !s.symbol;
      if (s.inRange) {
        const [left, right] = this.edges(key);
        rangeStart = Math.min(rangeStart, left);
        rangeEnd = Math.max(rangeEnd, right);
      }
    }
    if (Number.isFinite(rangeStart)) {
      this.rangeEl.hidden = false;
      this.rangeEl.style.setProperty('--range-start', rangeStart.toFixed(3));
      this.rangeEl.style.setProperty('--range-end', rangeEnd.toFixed(3));
    } else {
      this.rangeEl.hidden = true;
    }
  }

  /** linke und rechte Kante einer Taste in Einheiten der weißen Tastenbreite */
  private edges(key: Key): [number, number] {
    if (!key.black) return [key.position, key.position + 1];
    return [key.position - BLACK_RATIO / 2, key.position + BLACK_RATIO / 2];
  }

  /** Diese Tasten leuchten (Grund- und Zielton); alle anderen nicht. */
  highlight(midis: readonly number[]): void {
    for (const key of this.keys) key.el.classList.toggle('lit', midis.includes(key.midi));
  }

  /** Falsch angetippte Taste rot markieren (null = keine). */
  markWrong(midi: number | null): void {
    for (const key of this.keys) key.el.classList.toggle('wrong', key.midi === midi);
  }

  /** Kurzes Aufblinken (Einzelton außerhalb des Bereichs). */
  flash(midi: number): void {
    const key = this.keys.find((k) => k.midi === midi);
    if (!key) return;
    key.el.classList.remove('flash');
    void key.el.offsetWidth; // Animation neu starten
    key.el.classList.add('flash');
  }

  /** Scrollt so, dass der Bereich Grundton–Oktave mittig sichtbar ist. */
  scrollToRange(fromMidi: number, toMidi: number, smooth: boolean): void {
    const from = this.keys.find((k) => k.midi === fromMidi);
    const to = this.keys.find((k) => k.midi === toMidi);
    if (!from || !to) return;
    const keyWidth = parseFloat(this.inner.style.getPropertyValue('--w')) || MIN_KEY_WIDTH;
    const left = this.edges(from)[0] * keyWidth;
    const right = this.edges(to)[1] * keyWidth;
    const view = this.scroller.clientWidth;
    const target = right - left <= view ? left - (view - (right - left)) / 2 : left - 4;
    const max = this.scroller.scrollWidth - view;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scroller.scrollTo({
      left: Math.max(0, Math.min(max, target)),
      behavior: smooth && !reduceMotion ? 'smooth' : 'auto',
    });
  }
}
