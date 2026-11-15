/**
 * Klangerzeugung mit der Web Audio API – keine Audiodateien.
 *
 * Klang: Dreieck + Sinus (+ leise Obertöne) durch einen Tiefpass, der sich nach dem
 * Anschlag schließt (wird „weicher" wie beim Klavier).
 * Hüllkurve: startet bei 0, kurzer Anstieg (8 ms), Abklingen, längeres Ausklingen –
 * die Lautstärke springt nie, daher kein Knacksen am Anfang oder Ende.
 *
 * iOS:
 * - Der AudioContext wird erst bei der ersten Berührung erzeugt/fortgesetzt.
 * - `navigator.audioSession.type = "playback"` (Safari ab iOS 17) sorgt dafür, dass
 *   der Ton auch bei eingeschaltetem Stummschalter zu hören ist.
 * - Ältere iOS-Versionen ohne diese Schnittstelle: Ein im Speicher erzeugtes, stummes
 *   HTML-Audio-Element (keine Datei) schaltet auf die Medien-Wiedergabe um.
 * - Nach dem Hintergrund (App-Wechsel, Sperrbildschirm) wird der AudioContext bei der
 *   nächsten Berührung neu erzeugt, weil iOS den alten oft stumm lässt.
 */

import { frequencyFromMidi } from './pitch';
import { isIOS } from './platform';
import type { ScheduledNote } from './playback';

/** Ereignis, das bei jeder Wiedergabe ausgelöst wird (für die automatischen Tests). */
export const PLAY_EVENT = 'intervall:play';

export interface PlayEventDetail {
  notes: { midi: number; frequency: number; offset: number; hold: number }[];
}

const ATTACK = 0.008; // s
const DECAY_TIME_CONSTANT = 0.45; // s
const SUSTAIN_FACTOR = 0.3;
const RELEASE_TIME_CONSTANT = 0.09; // s
/** nach so vielen Zeitkonstanten ist der Ton unter −90 dB → Oszillator kann stoppen */
const RELEASE_TAIL = RELEASE_TIME_CONSTANT * 9;
const START_DELAY = 0.03; // s Vorlauf, damit der Anfang sauber geplant werden kann

/** Teiltöne: [Wellenform, Frequenz-Vielfaches, Lautstärke] */
const PARTIALS: readonly [OscillatorType, number, number][] = [
  ['triangle', 1, 0.55],
  ['sine', 1, 0.5],
  ['sine', 2, 0.12],
  ['sine', 3, 0.035],
];

export interface Voice {
  sources: OscillatorNode[];
  nodes: AudioNode[];
  kill: GainNode;
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly voices = new Set<Voice>();
  private silentAudio: HTMLAudioElement | null = null;
  /** true, sobald die App im Hintergrund war → AudioContext wird neu aufgebaut */
  private stale = false;

  constructor() {
    // iOS: Ein AudioContext, der im Hintergrund war, lässt sich oft nicht zuverlässig
    // wecken (bleibt „interrupted" oder meldet „running", ist aber stumm; offene
    // WebKit-Fehler 263627, 273511, 291892). Deshalb: beim Verlassen pausieren und
    // bei der nächsten Berührung einen frischen AudioContext erzeugen.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.goneToBackground();
    });
    window.addEventListener('pagehide', () => this.goneToBackground());
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) this.stale = true; // aus dem Seiten-Cache zurück
    });
  }

  private goneToBackground(): void {
    this.silentAudio?.pause();
    if (!this.ctx) return;
    this.stale = true;
    this.ctx.suspend().catch(() => undefined);
  }

  /** Alten AudioContext schließen (iOS erlaubt nur wenige gleichzeitig). */
  private discardContext(): void {
    const old = this.ctx;
    this.ctx = null;
    this.master = null;
    this.voices.clear();
    this.stale = false;
    old?.close().catch(() => undefined);
  }

  /**
   * Startet bzw. weckt den AudioContext. Muss aus einem Berührungs-, Klick- oder
   * Tastatur-Ereignis heraus aufgerufen werden (Vorgabe von iOS und Chrome).
   */
  unlock(): void {
    if (this.ctx && (this.stale || this.ctx.state === 'closed')) this.discardContext();
    if (!this.ctx) {
      setPlaybackAudioSession();
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor({ latencyHint: 'interactive' });

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 8;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(compressor);
      compressor.connect(ctx.destination);

      // winziger stummer Puffer – schaltet die Ausgabe auf älteren iOS-Versionen frei
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);

      this.ctx = ctx;
      this.master = master;
    }
    if (this.ctx.state !== 'running') {
      this.ctx.resume().catch(() => undefined);
    }
    this.ensureSilentAudioFallback();
  }

  /** Spielt geplante Töne; laufende Töne werden vorher kurz ausgeblendet. */
  play(notes: readonly ScheduledNote[]): void {
    const detail: PlayEventDetail = {
      notes: notes.map((n) => ({ ...n, frequency: frequencyFromMidi(n.midi) })),
    };
    window.dispatchEvent(new CustomEvent<PlayEventDetail>(PLAY_EVENT, { detail }));

    this.unlock();
    const ctx = this.ctx;
    if (!ctx || !this.master) return;

    const now = ctx.currentTime;
    this.fadeOutAll(now);
    const start = now + START_DELAY;
    const simultaneous = notes.filter((n) => n.offset === notes[0]?.offset).length;
    const level = simultaneous > 1 ? 0.34 : 0.48;
    for (const n of detail.notes) {
      this.startVoice(n.frequency, start + n.offset, n.hold, level);
    }
  }

  private startVoice(frequency: number, t: number, hold: number, level: number): void {
    const voice = scheduleVoice(this.ctx!, this.master!, frequency, t, hold, level, () => {
      this.voices.delete(voice);
    });
    this.voices.add(voice);
  }

  /** Blendet alle laufenden (und geplanten) Töne in ~50 ms knackfrei aus. */
  private fadeOutAll(now: number): void {
    for (const voice of this.voices) {
      voice.kill.gain.cancelScheduledValues(now);
      voice.kill.gain.setValueAtTime(1, now);
      voice.kill.gain.setTargetAtTime(0, now, 0.015);
      for (const s of voice.sources) {
        try {
          s.stop(now + 0.15);
        } catch {
          /* bereits gestoppt */
        }
      }
      this.voices.delete(voice);
    }
  }

  /** Nur für iOS < 17 (ohne Audio-Session-API): stummes HTML-Audio im Loop. */
  private ensureSilentAudioFallback(): void {
    if (!needsSilentAudioFallback()) return;
    if (!this.silentAudio) {
      const audio = document.createElement('audio');
      audio.setAttribute('x-webkit-airplay', 'deny');
      audio.preload = 'auto';
      audio.loop = true;
      audio.src = URL.createObjectURL(createSilentWav());
      this.silentAudio = audio;
    }
    if (this.silentAudio.paused && !document.hidden) {
      this.silentAudio.play().catch(() => undefined);
    }
  }
}

/**
 * Plant einen Ton (eigene Funktion, damit sie sich auch mit einem
 * OfflineAudioContext prüfen lässt).
 */
export function scheduleVoice(
  ctx: BaseAudioContext,
  destination: AudioNode,
  frequency: number,
  t: number,
  hold: number,
  level: number,
  onEnded?: () => void,
): Voice {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.4;
  filter.frequency.setValueAtTime(Math.min(frequency * 9, 14000), t);
  filter.frequency.setTargetAtTime(Math.min(frequency * 3.5, 9000), t, 0.3);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(level, t + ATTACK);
  env.gain.setTargetAtTime(level * SUSTAIN_FACTOR, t + ATTACK, DECAY_TIME_CONSTANT);
  env.gain.setTargetAtTime(0, t + hold, RELEASE_TIME_CONSTANT);

  const kill = ctx.createGain();
  kill.gain.value = 1;

  filter.connect(env);
  env.connect(kill);
  kill.connect(destination);

  const sources: OscillatorNode[] = [];
  const nodes: AudioNode[] = [filter, env, kill];
  const end = t + hold + RELEASE_TAIL;
  for (const [type, multiple, amp] of PARTIALS) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency * multiple;
    const g = ctx.createGain();
    g.gain.value = amp;
    osc.connect(g);
    g.connect(filter);
    osc.start(t);
    osc.stop(end);
    sources.push(osc);
    nodes.push(g);
  }

  sources[0].onended = () => {
    for (const s of sources) s.disconnect();
    for (const n of nodes) n.disconnect();
    onEnded?.();
  };
  return { sources, nodes, kill };
}

function setPlaybackAudioSession(): void {
  const nav = navigator as AudioSessionNavigator;
  try {
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    /* nicht unterstützt */
  }
}

function needsSilentAudioFallback(): boolean {
  return isIOS() && !('audioSession' in navigator);
}

/** Erzeugt eine halbe Sekunde Stille als WAV im Speicher (8 kHz, 8 Bit, mono). */
function createSilentWav(): Blob {
  const samples = 4000;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true); // Länge des fmt-Blocks
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true); // Abtastrate
  view.setUint32(28, 8000, true); // Bytes pro Sekunde
  view.setUint16(32, 1, true); // Blockgröße
  view.setUint16(34, 8, true); // Bits pro Abtastwert
  writeText(36, 'data');
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) view.setUint8(44 + i, 128); // 128 = Nulllinie bei 8 Bit
  return new Blob([buffer], { type: 'audio/wav' });
}
