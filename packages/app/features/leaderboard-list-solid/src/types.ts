/**
 * Types for the Solid leaderboard list container.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/**
 * Props accepted by the {@link LeaderboardList} component — the same props
 * `@molecule/app-leaderboard-list-react` accepts.
 */
export interface LeaderboardListProps {
  /** Pre-rendered leaderboard rows. Map your entries so the empty case is detectable. */
  children?: JSX.Element
  /** Optional title above the list. */
  title?: JSX.Element
  /** Optional period selector / actions row. */
  actions?: JSX.Element
  /** Optional empty state. Rendered only when there are no children. */
  emptyState?: JSX.Element
  /** Extra classes. */
  className?: string
}
