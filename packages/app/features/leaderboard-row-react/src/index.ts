/**
 * Leaderboard row.
 *
 * Exports `<LeaderboardRow>` — rank + avatar + name + score + optional rank-delta.
 *
 * @example
 * ```tsx
 * import { LeaderboardRow } from '@molecule/app-leaderboard-row-react'
 *
 * <LeaderboardRow
 *   rank={1}
 *   name="Alice Chen"
 *   avatarSrc="/avatars/alice.png"
 *   score={4820}
 *   rankDelta={2}
 *   subtitle="Team Phoenix"
 *   isMe={false}
 *   onClick={() => openProfile('alice')}
 * />
 * ```
 *
 * @module
 */

export * from './LeaderboardRow.js'
