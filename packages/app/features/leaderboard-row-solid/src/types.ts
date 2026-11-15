/**
 * Types for the Solid leaderboard row.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link LeaderboardRow} component. */
export interface LeaderboardRowProps {
  /** 1-based rank. */
  rank: number
  /** Display name. */
  name: JSX.Element
  /** Optional avatar URL. */
  avatarSrc?: string
  /** Score / metric. */
  score: JSX.Element
  /** Optional change indicator (positive = climbed). */
  rankDelta?: number
  /** Optional secondary line (team, level, country). */
  subtitle?: JSX.Element
  /** Whether this row represents the current user (highlighted). */
  isMe?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
