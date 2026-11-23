/**
 * Types for the Svelte leaderboard list container.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * Props accepted by the {@link LeaderboardList} component — the same props
 * `@molecule/app-leaderboard-list-react` accepts, with the rows as data (React's
 * `children` array) and node props as snippets.
 */
export interface LeaderboardListProps<T = unknown> {
  /** The rows, one entry per row (React's `children` array); none renders `emptyState`. */
  items?: T[]
  /** Renders one entry of `items` as its row. */
  children?: Snippet<[item: T, index: number]>
  /** Optional title above the list. */
  title?: Snippet
  /** Optional period selector / actions row. */
  actions?: Snippet
  /** Optional empty state. Rendered only when `items` is empty or absent. */
  emptyState?: Snippet
  /** Extra classes. */
  className?: string
}
