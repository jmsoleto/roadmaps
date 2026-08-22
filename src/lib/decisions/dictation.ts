/**
 * The parts of dictation that are logic rather than browser (design decision D5).
 *
 * The recognition interface does not exist in Node, so what can be tested is
 * pulled out here: joining fragments, deciding which ones are doubtful, and
 * formatting elapsed time. The wrapper that talks to the browser lives in
 * `dictation.svelte.ts` and takes its recogniser factory as a parameter.
 */

/**
 * One stretch of speech as the browser reported it.
 *
 * `confidence` is per **fragment**, which is the only granularity the interface
 * offers. There is no per-word confidence, and splitting a fragment's number
 * across its words would fabricate a measurement (D2).
 */
export interface Fragment {
  text: string;
  confidence: number;
}

/**
 * Below this, a fragment is worth a second look before saving.
 *
 * Deliberately not strict: a technical term the recogniser has never heard
 * scores low even when the sentence around it is right, and flagging half the
 * capture would make the flag meaningless.
 */
export const LOW_CONFIDENCE = 0.7;

export function isDoubtful(f: Fragment): boolean {
  return f.confidence < LOW_CONFIDENCE;
}

export function doubtfulCount(fragments: Fragment[]): number {
  return fragments.filter(isDoubtful).length;
}

/**
 * Join what was dictated onto what was already in the field.
 *
 * Dictation is another way in, not a separate mode, so it adds to whatever was
 * typed instead of replacing it (D4). Spacing is normalised because fragments
 * arrive with inconsistent leading whitespace between implementations.
 */
export function joinTranscript(existing: string, fragments: Fragment[]): string {
  const dictated = fragments
    .map((f) => f.text.trim())
    .filter((t) => t !== '')
    .join(' ');

  const before = existing.trim();
  if (before === '') return dictated;
  if (dictated === '') return before;
  return `${before} ${dictated}`;
}

/** `mm:ss` for the recording indicator. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** How the dictation panel is doing. */
export type DictationState = 'no-disponible' | 'parado' | 'escuchando' | 'denegado' | 'error';

/**
 * What to tell the user for each state.
 *
 * The listening one carries the disclosure that matters: the audio leaves the
 * machine. Said here, at the moment of dictating, because a permanent notice
 * about something that only happens on a button press stops being read (D1).
 */
export const STATE_MESSAGE: Record<DictationState, string> = {
  'no-disponible': '',
  parado: '',
  escuchando: 'El navegador envía el audio a un servicio externo para transcribirlo.',
  denegado: 'Sin acceso al micrófono. Puedes escribir la duda igualmente.',
  error: 'La transcripción se ha interrumpido. Lo transcrito hasta ahora sigue en el campo.',
};
