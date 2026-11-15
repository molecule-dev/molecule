/**
 * Types for the Svelte leaderboard row.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * Props accepted by the {@link LeaderboardRow} component — the same props
 * `@molecule/app-leaderboard-row-react` accepts. Node props are snippets.
 */
export interface LeaderboardRowProps {
  /** 1-based rank. */
  rank: number
  /** Display name (a string or a snippet). */
  name: Snippet | string
  /** Optional avatar URL. */
  avatarSrc?: string
  /** Score / metric (a string, a number, or a snippet). */
  score: Snippet | string | number
  /** Optional change indicator (positive = climbed). */
  rankDelta?: number
  /** Optional secondary line (team, level, country; a string or a snippet). */
  subtitle?: Snippet | string
  /** Whether this row represents the current user (highlighted). */
  isMe?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
