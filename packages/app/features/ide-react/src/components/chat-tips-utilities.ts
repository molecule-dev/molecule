/**
 * Auto-tip selection + idle-gating for the dismissable chat tip cards.
 *
 * Two complementary surfaces, so a typical session reliably surfaces a tip
 * (the previous idle-only gate was so conservative new users saw ZERO):
 *
 * 1. **Entry tip** ({@link ENTRY_TIP}) — one high-value onboarding hint shown
 *    once on a *fresh* conversation (before the first prompt), so a brand-new
 *    user always learns how to drive the agent. The caller shows it directly;
 *    no gate.
 * 2. **Idle rotation** ({@link CHAT_TIPS}) — additional tips that MAY surface
 *    after the conversation has sat idle for a while, gated by a random roll and
 *    a cooldown so the timeline never fills with tips.
 *
 * {@link shouldShowIdleTip} and {@link pickIdleTip} are pure (the random roll is
 * injected) so the behavior is unit-testable; {@link selectTip} remains a
 * deterministic by-index helper.
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
 * The single highest-value onboarding tip, shown once on a fresh conversation
 * (see the module overview). It points at the two interactions that unlock
 * everything else — the `/` command menu and `@`-mentioning a file — so a brand-
 * new user is never left staring at an empty chat with no idea how to begin.
 * Its `id` is also a locale key (`ide.chat.tip.getStarted`), like every entry in
 * {@link CHAT_TIPS}.
 */
export const ENTRY_TIP: TipDef = {
  id: 'getStarted',
  text: 'Tip: type / to see every command, or @ a filename to give {{agentName}} a file to work from.',
}

/**
 * The idle-rotation tip pool. Each covers a real, shipped slash command or
 * affordance — file mentions, the command menu, plan vs execute, `/undo`,
 * `/compact`, `/commit`, and `/report`. Surfaced occasionally
 * while idle (in no fixed order — {@link pickIdleTip} chooses an unseen one at
 * random), so a longer session keeps learning new features without the timeline
 * filling with hints. The {@link ENTRY_TIP} (`getStarted`) is shown separately at
 * onboarding and is intentionally NOT part of this rotation.
 */
export const CHAT_TIPS: readonly TipDef[] = [
  {
    id: 'mention',
    text: 'Tip: type @filename to attach a project file as context — {{agentName}} reads it directly.',
  },
  {
    id: 'slash',
    text: 'Tip: type / to browse every command (commit, model, and more).',
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
  {
    id: 'commit',
    text: 'Tip: use /commit to save your changes as a git commit you can always return to.',
  },
  {
    id: 'report',
    text: 'Tip: something off? /report sends a bug or feedback to the team with your recent chat attached.',
  },
] as const

/**
 * How long the conversation must sit idle before a rotation tip may surface
 * ("idle for a while"). Kept short enough that a typical pause in a real session
 * reaches it.
 */
export const TIP_IDLE_MS = 45_000
/**
 * Don't surface an *idle-rotation* tip until the conversation has at least this
 * many messages (one real back-and-forth). The {@link ENTRY_TIP} is exempt — it
 * is the onboarding hint shown before the first prompt.
 */
export const TIP_MIN_MESSAGES = 2
/** Minimum gap between two idle tips, so the timeline never fills with them. */
export const TIP_COOLDOWN_MS = 150_000
/**
 * Chance to surface a rotation tip once idle + cooldown allow it — high enough
 * that an active session reliably sees one, but not every idle period.
 */
export const TIP_IDLE_PROBABILITY = 0.7

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
