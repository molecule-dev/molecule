/**
 * Leaderboard row.
 *
 * Exports `<LeaderboardRow>` — rank + avatar + name + score with optional
 * rank-delta indicator, subtitle, and current-user highlight. Props: `rank`,
 * `name`, `score`, `avatarSrc?`, `rankDelta?`, `subtitle?`, `isMe?`, `onClick?`,
 * `className?`.
 *
 * @remarks
 * - Ranks 1–3 render medal emoji (gold/silver/bronze) INSTEAD of the rank number;
 *   rank 4+ renders `#n`. There is no prop to disable the medals.
 * - `rankDelta` arrows use hardcoded green/red hex colors and `isMe` uses a fixed
 *   light-blue translucent background — neither follows the app theme, and the
 *   `isMe` tint is tuned for light backgrounds. Override via `className` where
 *   that clashes with a dark theme.
 * - When `name` is not a plain string the avatar's accessible name falls back to
 *   the hardcoded English string 'Player' — pass a string `name` in localized apps.
 * - `onClick` gives the row a pointer cursor but no keyboard/role semantics.
 * - `rankDelta` of `0` (or omitted) renders no arrow; positive means the player CLIMBED.
 * - It renders ONE row and does not sort or rank — wrap rows in
 *   `@molecule/app-leaderboard-list-react` (or your own list) and pass `rank` yourself.
 * - Requires a wired ClassMap bond (`setClassMap(classMap)` from `@molecule/app-ui` at startup,
 *   or `getClassMap()` throws); `<Avatar>` comes from `@molecule/app-ui-react` (peer dependency).
 *
 * @example
 * ```tsx
 * import { LeaderboardRow } from '@molecule/app-leaderboard-row-react'
 *
 * export function WeeklyStandings() {
 *   const currentUserId = 'u2'
 *   const standings = [
 *     { id: 'u1', rank: 1, name: 'Alice Chen', team: 'Team Phoenix', points: 4820, delta: 2 },
 *     { id: 'u2', rank: 2, name: 'Bo Diaz', team: 'Team Orion', points: 4515, delta: -1 },
 *     { id: 'u3', rank: 5, name: 'Cam Rivera', team: 'Team Phoenix', points: 3990, delta: 0 },
 *   ]
 *   return (
 *     <div>
 *       {standings.map((s) => (
 *         <LeaderboardRow
 *           key={s.id}
 *           rank={s.rank}
 *           name={s.name}
 *           subtitle={s.team}
 *           score={`${s.points.toLocaleString('en-US')} pts`}
 *           rankDelta={s.delta}
 *           isMe={s.id === currentUserId}
 *         />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './LeaderboardRow.js'
