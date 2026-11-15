/**
 * Types for the Vue badge / achievement unlock card — `@molecule/app-achievement-card-react`'s
 * prop shapes with Vue's node type.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link AchievementCard} component. */
export interface AchievementCardProps {
  /**
   * Achievement name (a node, also accepted as the same-named slot). Required
   * by the component: one of the prop and the slot must carry it.
   */
  name?: VNodeChild
  /** Description / what it took to earn (a node, or its same-named slot). */
  description?: VNodeChild
  /**
   * Icon / illustration slot (a node, or its same-named slot). Required by the
   * component: one of the prop and the slot must carry it.
   */
  icon?: VNodeChild
  /** Whether the user has earned this achievement. */
  earned?: boolean
  /** Earned-at display (a node, or its same-named slot). */
  earnedAt?: VNodeChild
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
  /** Optional rarity / tier label ("Legendary", "Common"), a node or its same-named slot. */
  tier?: VNodeChild
  /** Extra classes. */
  className?: string
}
