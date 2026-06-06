/**
 * Leaderboard list container.
 *
 * Exports `<LeaderboardList>` — wraps a stack of `<LeaderboardRow>`s with title and actions.
 *
 * @example
 * ```tsx
 * import { LeaderboardList } from '@molecule/app-leaderboard-list-react'
 * import { LeaderboardRow } from '@molecule/app-leaderboard-row-react'
 *
 * <LeaderboardList title="Top Contributors" actions={<PeriodSelect />}>
 *   {entries.map((e) => (
 *     <LeaderboardRow key={e.id} rank={e.rank} name={e.name} score={e.score} />
 *   ))}
 * </LeaderboardList>
 * ```
 * @module
 */

export * from './LeaderboardList.js'
