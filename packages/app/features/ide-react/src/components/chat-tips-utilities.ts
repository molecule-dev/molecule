/**
 * Deterministic tip selection for the auto-tip cards.
 *
 * Tips are surfaced on a fresh conversation and then every N messages. Which
 * tip shows for a given "slot" is a pure function of the slot index — there is
 * NO randomness — so the behavior is reproducible and unit-testable, and the
 * user sees a predictable rotation rather than repeats.
 *
 * @module
 */

/** A single onboarding tip. */
export interface TipDef {
  /** Stable id (also used as the i18n key suffix). */
  id: string
  /** English default text, rendered via `t('ide.chat.tip.<id>', …, { defaultValue })`. */
  text: string
}

/**
 * The tip rotation. Order matters: index 0 is shown first (on a fresh
 * conversation), then subsequent slots cycle through the rest. Covers the core
 * efficiency features: file mentions, the command menu, plan vs execute,
 * `/undo`, and `/compact`.
 */
export const CHAT_TIPS: readonly TipDef[] = [
  {
    id: 'mention',
    text: 'Tip: type @filename to attach a project file as context — Synthase reads it directly.',
  },
  {
    id: 'slash',
    text: 'Tip: type / to browse every command (commit, diff, model, and more).',
  },
  {
    id: 'plan',
    text: 'Tip: use /plan to have Synthase research and propose a plan before it edits any files.',
  },
  {
    id: 'undo',
    text: "Tip: use /undo to instantly revert the last AI turn's file changes if it went the wrong way.",
  },
  {
    id: 'compact',
    text: 'Tip: long conversation? /compact compresses the context so you keep room to work.',
  },
] as const

/** Number of messages between auto-tips (after the first, fresh-conversation tip). */
export const TIP_INTERVAL = 8

/**
 * Selects the tip for a given slot index. Deterministic: the same index always
 * returns the same tip, cycling through {@link CHAT_TIPS} via modulo. Negative
 * indices are clamped to slot 0.
 *
 * @param index - The tip slot index (0 = fresh conversation, 1 = after N messages, …).
 * @returns The tip definition for that slot.
 */
export function selectTip(index: number): TipDef {
  const len = CHAT_TIPS.length
  const safe = Number.isFinite(index) && index > 0 ? Math.floor(index) : 0
  return CHAT_TIPS[safe % len]
}
