/**
 * The wrapper around the browser's speech recognition (design decisions D1, D3, D5).
 *
 * Two things this file guarantees, and they are the reason it exists:
 *
 *  - **It never touches audio.** The browser captures and transcribes; what
 *    arrives here are strings. There is nothing to store and nothing to discard.
 *  - **It degrades to nothing.** Where the interface is absent — Firefox — the
 *    caller is told so and offers no control at all, rather than a button that
 *    cannot work.
 *
 * The recogniser factory is injectable, like `IndexedDbBackend`'s `open`, so the
 * states can be exercised without speaking to anyone.
 */

import { STATE_MESSAGE, type DictationState, type Fragment } from './dictation';

/** The slice of the browser interface this app uses. */
export interface Recogniser {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }>;
}

export type RecogniserFactory = (() => Recogniser) | null;

/** The browser's constructor, whatever it is called here, or `null`. */
export function browserRecogniser(): RecogniserFactory {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    (new () => Recogniser) | undefined;
  return Ctor ? () => new Ctor() : null;
}

export class Dictation {
  state = $state<DictationState>('no-disponible');
  /** Final fragments, in the order they were spoken. */
  fragments = $state<Fragment[]>([]);
  /** What is being said right now, not yet final. */
  interim = $state<string>('');
  startedAt = $state<number | null>(null);

  private recogniser: Recogniser | null = null;
  /** True between `stop()` and the browser actually ending. */
  private stopping = false;

  constructor(private readonly factory: RecogniserFactory = browserRecogniser()) {
    this.state = factory === null ? 'no-disponible' : 'parado';
  }

  get available(): boolean {
    return this.factory !== null;
  }

  get message(): string {
    return STATE_MESSAGE[this.state];
  }

  start(lang = 'es-ES'): void {
    if (!this.factory || this.state === 'escuchando') return;

    const r = this.factory();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;

    r.onresult = (e) => this.absorb(e);
    r.onerror = (e) => {
      // Permission is its own state: "no me dejas" and "algo falló" lead the
      // user to different actions, so they must not read the same.
      this.state =
        e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denegado' : 'error';
      this.stopping = true;
    };
    r.onend = () => {
      // Some implementations cut the session off on their own after a pause.
      // While the user still means to be dictating, start again; what was
      // transcribed so far is already in `fragments`.
      if (!this.stopping && this.state === 'escuchando') {
        try {
          r.start();
          return;
        } catch {
          this.state = 'error';
        }
      }
      if (this.state === 'escuchando') this.state = 'parado';
      this.recogniser = null;
      this.startedAt = null;
    };

    this.recogniser = r;
    this.stopping = false;
    this.fragments = [];
    this.interim = '';
    this.startedAt = Date.now();
    this.state = 'escuchando';

    try {
      r.start();
    } catch {
      this.state = 'error';
      this.startedAt = null;
    }
  }

  /** Stop and keep what was transcribed. */
  stop(): void {
    this.stopping = true;
    this.interim = '';
    this.state = this.state === 'escuchando' ? 'parado' : this.state;
    this.startedAt = null;
    this.recogniser?.stop();
    this.recogniser = null;
  }

  /** Stop and throw away what was transcribed. */
  cancel(): void {
    this.stopping = true;
    this.recogniser?.abort();
    this.recogniser = null;
    this.fragments = [];
    this.interim = '';
    this.startedAt = null;
    if (this.state === 'escuchando') this.state = 'parado';
  }

  /** Forget the last session's text without touching the state. */
  reset(): void {
    this.fragments = [];
    this.interim = '';
  }

  /**
   * Take one batch of results.
   *
   * Only the finals are kept; the interim is held separately so the panel can
   * show what is being said without it ever reaching the stored text.
   */
  private absorb(e: SpeechRecognitionEventLike): void {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i];
      const best = result[0];
      if (!best) continue;
      if (result.isFinal) {
        this.fragments = [
          ...this.fragments,
          { text: best.transcript, confidence: best.confidence },
        ];
      } else {
        interim += best.transcript;
      }
    }
    this.interim = interim;
  }
}
