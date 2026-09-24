/**
 * Leaderboard list container.
 *
 * Exports `<LeaderboardList>` — header row (title + actions) above a vertical
 * stack of rows. Props: `children` (pre-rendered rows), `title?`, `actions?`
 * (period selector, filters), `emptyState?`, `className?`. Pair with
 * `<LeaderboardRow>` from `@molecule/app-leaderboard-row-react` — this container
 * adds no rank/podium logic of its own.
 *
 * @remarks
 * - `emptyState` renders only when `children` is an empty array or nullish; if you
 *   pass a fragment or a single element the list always renders. Map your entries
 *   directly (as in the example) so the empty case is detectable.
 * - No `data-mol-id` prop; styling resolves through `getClassMap()`, which throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 * - It does not sort, rank or paginate — pass entries already sorted with their `rank`.
 *
 * @example
 * ```tsx
 * import { LeaderboardList } from '@molecule/app-leaderboard-list-react'
 * import { LeaderboardRow } from '@molecule/app-leaderboard-row-react'
 *
 * export function TopContributors() {
 *   const entries = [
 *     { id: 'u1', rank: 1, name: 'Alice Chen', score: 4820 },
 *     { id: 'u2', rank: 2, name: 'Bo Diaz', score: 4515 },
 *     { id: 'u3', rank: 4, name: 'Cam Rivera', score: 3990 },
 *   ]
 *   return (
 *     <LeaderboardList title="Top Contributors" emptyState={<p>No scores yet.</p>}>
 *       {entries.map((e) => (
 *         <LeaderboardRow key={e.id} rank={e.rank} name={e.name} score={e.score.toLocaleString('en-US')} />
 *       ))}
 *     </LeaderboardList>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './LeaderboardList.js'
