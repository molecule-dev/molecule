/**
 * Auto-tip selection + idle-gating for the dismissable chat tip cards.
 *
 * Tips are NEVER shown on a fresh conversation or the first prompt. Instead, after
 * the conversation has sat IDLE for a while, a tip MAY surface — gated by a random
 * roll and a cooldown so the timeline never fills with tips. {@link shouldShowIdleTip}
 * and {@link pickIdleTip} are pure (the random roll is injected) so the behavior is
 * unit-testable; {@link selectTip} remains a deterministic by-index helper.
 *
 * @module
 */

/** A single onboarding tip. */
export interface TipDef {
  /** Stable id (also used as the i18n key suffix). */
  id: string
  /**
   * English default text, rendered via `t('ide.chat.tip.<id>', { agentName }, { defaultValue })`.
   * May contain the `{{agentName}}` interpolation token, filled in by the caller
   * from the host's agent identity (neutral default: "the assistant").
   */
  text: string
}

/**
 * The tip pool. Covers the core efficiency features: file mentions, the command
 * menu, plan vs execute, `/undo`, and `/compact`. Surfaced occasionally while idle
 * (in no fixed order — {@link pickIdleTip} chooses an unseen one at random).
 */
export const CHAT_TIPS: readonly TipDef[] = [
  {
    id: 'mention',
    text: 'Tip: type @filename to attach a project file as context — {{agentName}} reads it directly.',
  },
  {
    id: 'slash',
    text: 'Tip: type / to browse every command (commit, diff, model, and more).',
  },
  {
    id: 'plan',
    text: 'Tip: use /plan to have {{agentName}} research and propose a plan before it edits any files.',
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

/** How long the conversation must sit idle before a tip may surface ("idle for a while"). */
export const TIP_IDLE_MS = 60_000
/**
 * Don't tip until the conversation has at least this many messages — so a tip is
 * NEVER shown on the first prompt / a fresh conversation.
 */
export const TIP_MIN_MESSAGES = 4
/** Minimum gap between two tips, so the timeline never fills with them. */
export const TIP_COOLDOWN_MS = 4 * 60_000
/** Chance to surface a tip once idle + cooldown allow it — so it is NOT every idle period. */
export const TIP_IDLE_PROBABILITY = 0.4

/** Inputs to the idle-tip gate. All durations in milliseconds. */
export interface IdleTipState {
  /** Total messages in the conversation. */
  messageCount: number
  /** Time since the last message activity (the idle duration). */
  msSinceLastActivity: number
  /** Time since the last tip was shown (`Infinity` if none yet). */
  msSinceLastTip: number
}

/**
 * Decide whether to surface an idle tip. Pure: pass `rand` (0–1, e.g. `Math.random()`)
 * so it is testable. Returns false unless the conversation has enough history (never
 * on the first prompt), has been idle long enough, the cooldown since the last tip has
 * elapsed, AND the random roll passes — so tips stay occasional and never pile up.
 *
 * @param state - Conversation idle state.
 * @param rand - A random value in [0, 1) (injected for testability).
 * @returns Whether a tip should be shown now.
 */
export function shouldShowIdleTip(state: IdleTipState, rand: number): boolean {
  if (state.messageCount < TIP_MIN_MESSAGES) return false
  if (state.msSinceLastActivity < TIP_IDLE_MS) return false
  if (state.msSinceLastTip < TIP_COOLDOWN_MS) return false
  return rand < TIP_IDLE_PROBABILITY
}

/**
 * Pick a tip the user hasn't seen yet (falling back to the full pool once all have
 * been shown). Pure: pass `rand` (0–1) for a testable random choice; out-of-range or
 * non-finite values are clamped.
 *
 * @param shownIds - Ids of tips already shown this conversation.
 * @param rand - A random value in [0, 1) (injected for testability).
 * @returns The chosen tip definition.
 */
export function pickIdleTip(shownIds: readonly string[], rand: number): TipDef {
  const fresh = CHAT_TIPS.filter((tip) => !shownIds.includes(tip.id))
  const pool = fresh.length ? fresh : CHAT_TIPS
  const safe = Number.isFinite(rand) ? Math.min(Math.max(rand, 0), 0.999999) : 0
  return pool[Math.floor(safe * pool.length)]
}

/**
 * Deterministic by-index tip pick, cycling through {@link CHAT_TIPS} via modulo.
 * Non-finite or negative indices clamp to slot 0.
 *
 * @param index - The tip index.
 * @returns The tip definition for that index.
 */
export function selectTip(index: number): TipDef {
  const len = CHAT_TIPS.length
  const safe = Number.isFinite(index) && index > 0 ? Math.floor(index) : 0
  return CHAT_TIPS[safe % len]
}
