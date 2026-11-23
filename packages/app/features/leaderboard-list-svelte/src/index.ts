/**
 * Svelte leaderboard list container.
 *
 * Exports `LeaderboardList` — header row (title + actions) above a vertical
 * stack of rows. Props: `items` (one entry per row) with a `children` snippet
 * that renders one entry, `title?`, `actions?` (period selector, filters),
 * `emptyState?`, `className?` — the node props are snippets. Pair with a row component
 * (`@molecule/app-leaderboard-row-react` in React apps; your own Svelte rows
 * otherwise) — this container adds no rank/podium logic of its own. It is the
 * Svelte counterpart of `@molecule/app-leaderboard-list-react`: same props
 * and the same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { LeaderboardList } from '@molecule/app-leaderboard-list-svelte'
 *
 *   const entries = [
 *     { id: 'u1', rank: 1, name: 'Alice Chen', score: 4820 },
 *     { id: 'u2', rank: 2, name: 'Bo Diaz', score: 4515 },
 *   ]
 * </script>
 *
 * <LeaderboardList items={entries}>
 *   {#snippet title()}Top Contributors{/snippet}
 *   {#snippet children(e)}
 *     <div>
 *       <span>{`${e.rank}. ${e.name}`}</span>
 *       <strong>{e.score}</strong>
 *     </div>
 *   {/snippet}
 * </LeaderboardList>
 * ```
 *
 * @remarks
 * - `emptyState` renders only when `items` is empty or absent, as React's
 *   renders when `children` is. A snippet cannot be counted, so the rows are
 *   data.
 * - No `data-mol-id` prop; styling resolves through `getClassMap()`.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
