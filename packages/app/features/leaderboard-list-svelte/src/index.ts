/**
 * Svelte leaderboard list container.
 *
 * Exports `LeaderboardList` — header row (title + actions) above a vertical
 * stack of rows. Props: `children` (pre-rendered rows), `title?`, `actions?`
 * (period selector, filters), `emptyState?`, `className?` — the node props
 * are snippets. Pair with a row component
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
 * <LeaderboardList title="Top Contributors">
 *   {#each entries as e (e.id)}
 *     <div class="flex justify-between">
 *       <span>{`${e.rank}. ${e.name}`}</span>
 *       <strong>{e.score}</strong>
 *     </div>
 *   {/each}
 * </LeaderboardList>
 * ```
 *
 * @remarks
 * - `emptyState` renders only when `children` is absent; if you pass content
 *   the list always renders. Map your entries directly (as in the example)
 *   so the empty case is detectable.
 * - No `data-mol-id` prop; styling resolves through `getClassMap()`.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
