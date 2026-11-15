/**
 * Types for the Vue leaderboard list container.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * Props accepted by the {@link LeaderboardList} component — the same props
 * `@molecule/app-leaderboard-list-react` accepts.
 */
export interface LeaderboardListProps {
  /**
   * Pre-rendered leaderboard rows — the DEFAULT slot. Map your entries (as in
   * the example) so the empty case is detectable; a fragment or single
   * element keeps the list rendered.
   */
  children?: VNodeChild
  /** Optional title above the list. Passed as a prop or as the same-named slot — both work. */
  title?: VNodeChild
  /** Optional period selector / actions row. Passed as a prop or as the same-named slot — both work. */
  actions?: VNodeChild
  /** Optional empty state. Rendered only when the default slot is empty. */
  emptyState?: VNodeChild
  /** Extra classes. */
  className?: string
}
