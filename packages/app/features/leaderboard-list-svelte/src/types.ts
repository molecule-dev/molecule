/**
 * Types for the Svelte leaderboard list container.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * Props accepted by the {@link LeaderboardList} component — the same props
 * `@molecule/app-leaderboard-list-react` accepts. Node props are snippets.
 */
export interface LeaderboardListProps {
  /** Pre-rendered leaderboard rows. Map your entries so the empty case is detectable. */
  children?: Snippet
  /** Optional title above the list. */
  title?: Snippet
  /** Optional period selector / actions row. */
  actions?: Snippet
  /** Optional empty state. Rendered only when there are no children. */
  emptyState?: Snippet
  /** Extra classes. */
  className?: string
}
