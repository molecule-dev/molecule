import type { JSX } from 'solid-js'

/** Props accepted by the {@link AchievementCard} component. */
export interface AchievementCardProps {
  /** Achievement name. */
  name: JSX.Element
  /** Description / what it took to earn. */
  description?: JSX.Element
  /** Icon / illustration slot. */
  icon: JSX.Element
  /** Whether the user has earned this achievement. */
  earned?: boolean
  /** Earned-at display. */
  earnedAt?: JSX.Element
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
  /** Optional rarity / tier label ("Legendary", "Common"). */
  tier?: JSX.Element
  /** Extra classes. */
  className?: string
}
