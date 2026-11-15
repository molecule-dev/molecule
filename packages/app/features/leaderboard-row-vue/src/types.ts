/**
 * Types for the Vue leaderboard row.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * Props accepted by the {@link LeaderboardRow} component — the same props
 * `@molecule/app-leaderboard-row-react` accepts.
 */
export interface LeaderboardRowProps {
  /** 1-based rank. */
  rank: number
  /** Display name. Passed as a prop or as the same-named slot — both work. */
  name: VNodeChild
  /** Optional avatar URL. */
  avatarSrc?: string
  /** Score / metric. Passed as a prop or as the same-named slot — both work. */
  score: VNodeChild
  /** Optional change indicator (positive = climbed). */
  rankDelta?: number
  /** Optional secondary line (team, level, country). */
  subtitle?: VNodeChild
  /** Whether this row represents the current user (highlighted). */
  isMe?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
