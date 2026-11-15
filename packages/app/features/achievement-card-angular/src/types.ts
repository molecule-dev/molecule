/**
 * Types of `@molecule/app-achievement-card-angular` — the Angular counterpart
 * of `@molecule/app-achievement-card-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link AchievementCard} — the same props
 * `@molecule/app-achievement-card-react` accepts. Node props (`name`,
 * `description`, `icon`, `earnedAt`, `tier`) are typed `unknown`: pass a plain
 * string as the input, or project content as `[slot=<name>]` children of the
 * host element.
 */
export interface AchievementCardProps {
  /** Achievement name — a string input, or `[slot=name]` projected content. */
  name?: unknown
  /** Description / what it took to earn — a string input, or `[slot=description]` content. */
  description?: unknown
  /** Icon / illustration slot — `[slot=icon]` projected content (or a string input). */
  icon?: unknown
  /** Whether the user has earned this achievement. */
  earned?: boolean
  /** Earned-at display — a string input, or `[slot=earnedAt]` projected content. */
  earnedAt?: unknown
  /**
   * Label shown before `earnedAt` on earned achievements. Overrides the
   * translated / `defaultValue` `'Earned'` (prop > `t()` > default).
   */
  earnedLabel?: string
  /**
   * Label shown on locked achievements (not earned, no progress). Overrides
   * the translated / `defaultValue` `'Locked'` (prop > `t()` > default).
   */
  lockedLabel?: string
  /** Optional progress data (for in-progress achievements): the earned count out of a maximum. */
  progress?: { value: number; max: number }
  /** Optional rarity / tier label ("Legendary", "Common") — a string input or `[slot=tier]` content. */
  tier?: unknown
  /** Extra classes. */
  className?: string
}
