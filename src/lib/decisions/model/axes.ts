/**
 * The axes an alternative moves (design decision D5).
 *
 * **Short and fixed**, not configurable: with one user, an editable catalogue of
 * axes is a settings screen nobody opens, and comparing alternatives requires
 * that they share axes. Adding a fourth the day it is needed is one line here.
 *
 * **Qualitative**, not scored: a criteria-and-weights matrix does not get filled
 * in ten seconds and, when it does, the conversation moves to arguing about the
 * number instead of the decision. The point is not for the app to compute the
 * answer — it is for the business side to *see what it is choosing* and
 * therefore own it.
 */

export const AXES = [
  { id: 'coste', label: 'coste' },
  { id: 'plazo', label: 'plazo' },
  { id: 'riesgo', label: 'riesgo' },
] as const;

export type AxisId = (typeof AXES)[number]['id'];

export const AXIS_IDS: readonly AxisId[] = AXES.map((a) => a.id);

/** Which way an alternative pushes an axis. */
export type EffectDirection = 'sube' | 'igual' | 'baja';

/**
 * The glyph shown in the comparison grid.
 *
 * Deliberately not coloured by direction: "coste sube" is bad and "riesgo baja"
 * is good, so the same arrow carries opposite weight depending on the axis, and
 * a green/red reading would be wrong half the time. The reader decides.
 */
export const DIRECTION_GLYPH: Record<EffectDirection, string> = {
  sube: '↑',
  igual: '→',
  baja: '↓',
};

export function isAxisId(value: unknown): value is AxisId {
  return typeof value === 'string' && (AXIS_IDS as readonly string[]).includes(value);
}

export function isDirection(value: unknown): value is EffectDirection {
  return value === 'sube' || value === 'igual' || value === 'baja';
}

export function axisLabel(id: AxisId): string {
  return AXES.find((a) => a.id === id)?.label ?? id;
}
