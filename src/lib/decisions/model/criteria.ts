/**
 * The criteria an alternative is assessed against (design decision D3).
 *
 * Replaces the three qualitative axes of the previous model. Those said the
 * direction and not the magnitude, and a conversation with the business side is
 * not held over arrows — it is held over *"140 k€ and fourteen weeks against
 * 75 k€ and eight"*.
 *
 * Each assessment carries **text always and a value when there is one**. That
 * split is the whole design: the text is what gets read out loud in the room,
 * the value exists so a chart can draw it. An alternative nobody has quantified
 * still says what is known about it instead of vanishing from the panel.
 *
 * Fixed and short, for the same reason the axes were: comparing alternatives
 * requires that they share criteria, and an editable catalogue is a settings
 * screen nobody opens.
 */

/** How a criterion's value is typed, which decides its editor and its chart. */
export type ValueKind =
  /** Weeks of work, optionally with how many people. */
  | 'effort'
  /** An amount of money. */
  | 'money'
  /** The date value starts arriving. */
  | 'date'
  /** Qualitative severity. */
  | 'level'
  /** A declared appraisal, 1 to 5. */
  | 'appraisal'
  /** Nothing to quantify: the text is the whole answer. */
  | 'none';

export interface CriterionDef {
  id: string;
  label: string;
  kind: ValueKind;
  /** What the field is asking for, shown as placeholder help. */
  hint: string;
}

export const CRITERIA = [
  {
    id: 'esfuerzo',
    label: 'esfuerzo',
    kind: 'effort',
    hint: 'cuánto trabajo cuesta — p. ej. 14 semanas · 3 devs',
  },
  {
    id: 'coste',
    label: 'coste',
    kind: 'money',
    hint: 'lo que cuesta, y lo que sigue costando después',
  },
  {
    id: 'tiempo',
    label: 'tiempo hasta valor',
    kind: 'date',
    hint: 'cuándo lo tendría el cliente',
  },
  {
    id: 'riesgo',
    label: 'riesgo',
    kind: 'level',
    hint: 'qué puede salir mal, y cuánto duele',
  },
  {
    id: 'beneficio',
    label: 'beneficio',
    kind: 'appraisal',
    hint: 'qué se gana con esta alternativa',
  },
  {
    id: 'deuda',
    label: 'deuda que deja',
    kind: 'none',
    hint: 'con qué hay que cargar después',
  },
] as const satisfies readonly CriterionDef[];

export type CriterionId = (typeof CRITERIA)[number]['id'];

export const CRITERION_IDS: readonly CriterionId[] = CRITERIA.map((c) => c.id);

export function isCriterionId(v: unknown): v is CriterionId {
  return typeof v === 'string' && (CRITERION_IDS as readonly string[]).includes(v);
}

export function criterion(id: CriterionId): CriterionDef {
  return CRITERIA.find((c) => c.id === id)!;
}

/** Severity of the `riesgo` criterion. */
export type RiskLevel = 'alto' | 'medio' | 'bajo';

export const RISK_LEVELS: readonly RiskLevel[] = ['alto', 'medio', 'bajo'];

export function isRiskLevel(v: unknown): v is RiskLevel {
  return v === 'alto' || v === 'medio' || v === 'bajo';
}

/**
 * The benefit appraisal, 1 to 5.
 *
 * Coarse on purpose: a finer scale invites arguing over whether something is a
 * 63 or a 67, which is exactly the conversation this app exists to avoid. It is
 * the one criterion with no objective figure behind it, so it is recorded as
 * what it is — an appraisal by whoever prepared the decision, never deduced
 * from the other criteria.
 */
export const APPRAISAL_MIN = 1;
export const APPRAISAL_MAX = 5;

export function isAppraisal(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= APPRAISAL_MIN && v <= APPRAISAL_MAX;
}
