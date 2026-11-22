/**
 * Angular leaderboard row.
 *
 * Exports `<LeaderboardRow>` — rank + avatar + name + score with optional
 * rank-delta indicator, subtitle, and current-user highlight. Props: `rank`,
 * `name`, `score`, `avatarSrc?`, `rankDelta?`, `subtitle?`, `isMe?`,
 * `onClick?`, `className?`. It is the Angular counterpart of
 * `@molecule/app-leaderboard-row-react`: same props and the same DOM for the
 * same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { LeaderboardRow } from '@molecule/app-leaderboard-row-angular'
 *
 * @Component({
 *   selector: 'leaderboard-page',
 *   standalone: true,
 *   imports: [LeaderboardRow],
 *   template: `
 *     <div mol-leaderboard-row
 *       [rank]="1"
 *       name="Alice Chen"
 *       avatarSrc="/avatars/alice.png"
 *       [score]="4820"
 *       [rankDelta]="2"
 *       subtitle="Team Phoenix"
 *       (click)="openProfile('alice')">
 *     </div>
 *   `,
 * })
 * export class LeaderboardPage {
 *   readonly openProfile = (id: string): void => {
 *     console.log('open profile', id)
 *   }
 * }
 * ```
 *
 * @remarks
 * - Ranks 1–3 render medal emoji (gold/silver/bronze) INSTEAD of the rank
 *   number; rank 4+ renders `#n`. There is no prop to disable the medals.
 * - `rankDelta` arrows use hardcoded green/red hex colors and `isMe` uses a
 *   fixed light-blue translucent background — neither follows the app theme,
 *   and the `isMe` tint is tuned for light backgrounds. Override via
 *   `className` where that clashes with a dark theme.
 * - When `name` is not a plain string the avatar's accessible name falls back
 *   to the hardcoded English string 'Player' — pass a string `name` in
 *   localized apps.
 * - With `onClick` the row is promoted to a real button in the a11y tree —
 *   `role="button"`, `tabindex="0"`, the pointer cursor — and Enter / Space
 *   activate it (the click handler runs with no event), matching native
 *   button keyboard semantics; on a click it is called with the native click
 *   event. The host IS the row's root `<div>`, so a click anywhere on the row
 *   fires it.
 * - Requires a wired ClassMap bond; `<Avatar>` comes from
 *   `@molecule/app-ui-angular`. Node props are projected content: `name`,
 *   `score` and `subtitle` are selected by `[slot=<name>]`, everything else
 *   binds as inputs.
 *
 * @module
 */

export * from './leaderboard-row.component.js'
export * from './types.js'
