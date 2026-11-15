/**
 * Types of `@molecule/app-leaderboard-list-angular` — the Angular counterpart
 * of `@molecule/app-leaderboard-list-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link LeaderboardList} — the same props
 * `@molecule/app-leaderboard-list-react` accepts. Node props (`children`,
 * `title`, `actions`, `emptyState`) are projected content in Angular (an
 * input cannot carry a node), so they are typed `unknown`: pass them in the
 * host template, not as values.
 */
export interface LeaderboardListProps {
  /** Pre-rendered leaderboard rows, projected as the element's default content. */
  children?: unknown
  /** Optional title above the list, projected as `[slot=title]` content. */
  title?: unknown
  /** Optional period selector / actions row, projected as `[slot=actions]` content. */
  actions?: unknown
  /** Optional empty state, projected as `[slot=emptyState]` content. Rendered only when the list is empty. */
  emptyState?: unknown
  /** Extra classes. */
  className?: string
}
