/**
 * Types for the Angular leaderboard row.
 *
 * @module
 */

/**
 * Props accepted by the {@link LeaderboardRow} component — the same props
 * `@molecule/app-leaderboard-row-react` accepts. Node-valued props render as
 * text or as projected `[slot=<name>]` content.
 */
export interface LeaderboardRowProps {
  /** 1-based rank. */
  rank: number
  /** Display name: text, or `[slot=name]` content. */
  name: unknown
  /** Optional avatar URL. */
  avatarSrc?: string
  /** Score / metric: text, or `[slot=score]` content. */
  score: unknown
  /** Optional change indicator (positive = climbed). */
  rankDelta?: number
  /** Optional secondary line (team, level, country): text, or `[slot=subtitle]` content. */
  subtitle?: unknown
  /** Whether this row represents the current user (highlighted). */
  isMe?: boolean
  /** Click handler (a native click on the row, with the DOM event; also runs, with no event, on Enter / Space). */
  onClick?: (event?: MouseEvent) => void
  /** Extra classes. */
  className?: string
}
