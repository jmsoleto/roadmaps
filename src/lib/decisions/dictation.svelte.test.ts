import { describe, it, expect } from 'vitest';
import { Dictation, type Recogniser, type SpeechRecognitionEventLike } from './dictation.svelte';

/** A recogniser that speaks only when the test tells it to. */
class FakeRecogniser implements Recogniser {
  lang = '';
  continuous = false;
  interimResults = false;
  started = 0;
  stopped = 0;
  aborted = 0;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  start() {
    this.started += 1;
  }
  stop() {
    this.stopped += 1;
  }
  abort() {
    this.aborted += 1;
  }

  /** Feed one batch of results, as the browser would. */
  say(parts: { text: string; confidence?: number; final?: boolean }[]) {
    const results = parts.map((p) => {
      const alt = [{ transcript: p.text, confidence: p.confidence ?? 0.9 }];
      return Object.assign(alt, { isFinal: p.final ?? true });
    });
    this.onresult?.({ resultIndex: 0, results });
  }
}

function withFake() {
  const r = new FakeRecogniser();
  return { r, d: new Dictation(() => r) };
}

describe('availability', () => {
  /** Where the interface is absent, the caller offers no control at all. */
  it('reports unavailable when the browser has no recogniser', () => {
    const d = new Dictation(null);
    expect(d.available).toBe(false);
    expect(d.state).toBe('no-disponible');
  });

  it('starting does nothing when it is unavailable', () => {
    const d = new Dictation(null);
    d.start();
    expect(d.state).toBe('no-disponible');
    expect(d.fragments).toEqual([]);
  });

  it('is stopped and ready when the browser has one', () => {
    const { d } = withFake();
    expect(d.available).toBe(true);
    expect(d.state).toBe('parado');
  });
});

describe('listening', () => {
  it('starts the recogniser and says it is listening', () => {
    const { r, d } = withFake();
    d.start();
    expect(r.started).toBe(1);
    expect(r.continuous).toBe(true);
    expect(d.state).toBe('escuchando');
    expect(d.startedAt).not.toBe(null);
  });

  it('keeps the final fragments with their confidence', () => {
    const { r, d } = withFake();
    d.start();
    r.say([{ text: 'los reembolsos parciales', confidence: 0.94 }]);
    r.say([{ text: 'la ventana de settlement', confidence: 0.38 }]);

    expect(d.fragments).toEqual([
      { text: 'los reembolsos parciales', confidence: 0.94 },
      { text: 'la ventana de settlement', confidence: 0.38 },
    ]);
  });

  /** What is still being said must never reach the stored text. */
  it('holds what is not final apart from the fragments', () => {
    const { r, d } = withFake();
    d.start();
    r.say([{ text: 'esto todavía no', final: false }]);

    expect(d.fragments).toEqual([]);
    expect(d.interim).toBe('esto todavía no');
  });

  it('clears the interim when it becomes final', () => {
    const { r, d } = withFake();
    d.start();
    r.say([{ text: 'a medias', final: false }]);
    r.say([{ text: 'ya entero', final: true }]);

    expect(d.interim).toBe('');
    expect(d.fragments.map((f) => f.text)).toEqual(['ya entero']);
  });

  it('forgets the previous session when starting again', () => {
    const { r, d } = withFake();
    d.start();
    r.say([{ text: 'lo de antes' }]);
    d.stop();
    d.start();
    expect(d.fragments).toEqual([]);
  });
});

describe('stopping', () => {
  it('keeps what was transcribed', () => {
    const { r, d } = withFake();
    d.start();
    r.say([{ text: 'esto se queda' }]);
    d.stop();

    expect(r.stopped).toBe(1);
    expect(d.state).toBe('parado');
    expect(d.fragments.map((f) => f.text)).toEqual(['esto se queda']);
  });

  it('throws it away when cancelled', () => {
    const { r, d } = withFake();
    d.start();
    r.say([{ text: 'esto no' }]);
    d.cancel();

    expect(r.aborted).toBe(1);
    expect(d.fragments).toEqual([]);
    expect(d.state).toBe('parado');
  });

  /** Some implementations cut the session off after a pause. */
  it('starts again when the browser ends the session on its own', () => {
    const { r, d } = withFake();
    d.start();
    r.onend?.();

    expect(r.started).toBe(2);
    expect(d.state).toBe('escuchando');
  });

  it('does not start again once the user stopped', () => {
    const { r, d } = withFake();
    d.start();
    d.stop();
    r.onend?.();

    expect(r.started).toBe(1);
    expect(d.state).toBe('parado');
  });
});

describe('errors', () => {
  /** "You did not let me" and "something broke" lead to different actions. */
  it('reports a refused microphone as denied, not as a failure', () => {
    const { r, d } = withFake();
    d.start();
    r.onerror?.({ error: 'not-allowed' });

    expect(d.state).toBe('denegado');
    expect(d.message).toMatch(/micrófono/);
  });

  it('reports anything else as an error', () => {
    const { r, d } = withFake();
    d.start();
    r.onerror?.({ error: 'network' });

    expect(d.state).toBe('error');
    expect(d.message).not.toMatch(/micrófono/);
  });

  it('does not restart after an error', () => {
    const { r, d } = withFake();
    d.start();
    r.onerror?.({ error: 'network' });
    r.onend?.();

    expect(r.started).toBe(1);
  });

  it('keeps what was transcribed before the error', () => {
    const { r, d } = withFake();
    d.start();
    r.say([{ text: 'lo dicho antes de fallar' }]);
    r.onerror?.({ error: 'network' });

    expect(d.fragments.map((f) => f.text)).toEqual(['lo dicho antes de fallar']);
  });
});
