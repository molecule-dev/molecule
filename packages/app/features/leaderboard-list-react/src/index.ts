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
 * - No `data-mol-id` prop; styling resolves through `getClassMap()`.
 *
 * @example
 * ```tsx
 * import { LeaderboardList } from '@molecule/app-leaderboard-list-react'
 * import { LeaderboardRow } from '@molecule/app-leaderboard-row-react'
 *
 * const entries = [
 *   { id: 'u1', rank: 1, name: 'Alice Chen', score: 4820 },
 *   { id: 'u2', rank: 2, name: 'Bo Diaz', score: 4515 },
 * ]
 *
 * <LeaderboardList title="Top Contributors">
 *   {entries.map((e) => (
 *     <LeaderboardRow key={e.id} rank={e.rank} name={e.name} score={e.score} />
 *   ))}
 * </LeaderboardList>
 * ```
 * @module
 */

export * from './LeaderboardList.js'
