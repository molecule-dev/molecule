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
 * - With `onClick` the row is promoted to a real button in the a11y tree —
 *   `role="button"`, `tabindex="0"`, the pointer cursor — and Enter / Space
 *   activate it (the click handler runs with no event), matching native
 *   button keyboard semantics. Without `onClick` the row renders none of
 *   that.
 * - Requires a wired ClassMap bond; `<Avatar>` comes from `@molecule/app-ui-react`.
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
