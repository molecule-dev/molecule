/**
 * Solid leaderboard list container.
 *
 * Exports `LeaderboardList` — header row (title + actions) above a vertical
 * stack of rows. Props: `children` (pre-rendered rows), `title?`, `actions?`
 * (period selector, filters), `emptyState?`, `className?`. Pair with a row
 * component (`@molecule/app-leaderboard-row-react` in React apps; your own
 * Solid rows otherwise) — this container adds no rank/podium logic of its
 * own. It is the Solid counterpart of `@molecule/app-leaderboard-list-react`:
 * same props and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { LeaderboardList } from '@molecule/app-leaderboard-list-solid'
 *
 * const entries = [
 *   { id: 'u1', rank: 1, name: 'Alice Chen', score: 4820 },
 *   { id: 'u2', rank: 2, name: 'Bo Diaz', score: 4515 },
 * ]
 *
 * export function TopContributors() {
 *   return (
 *     <LeaderboardList title="Top Contributors">
 *       {entries.map((e) => (
 *         <div class="flex justify-between">
 *           <span>{`${e.rank}. ${e.name}`}</span>
 *           <strong>{e.score}</strong>
 *         </div>
 *       ))}
 *     </LeaderboardList>
 *   )
 * }
 * ```
 *
 * @remarks
 * - `emptyState` renders only when `children` is empty or absent; if you pass
 *   a fragment or a single element the list always renders. Map your entries
 *   directly (as in the example) so the empty case is detectable.
 * - No `data-mol-id` prop; styling resolves through `getClassMap()`.
 *
 * @module
 */

export * from './LeaderboardList.jsx'
export * from './types.js'
