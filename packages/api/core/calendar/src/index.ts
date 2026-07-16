/**
 * Calendar core interface for molecule.dev (server-side).
 *
 * Defines a stack-neutral contract for OAuth-backed calendar bonds (Google,
 * Microsoft, iCloud, etc.) consumed by handlers and background jobs. Bond a
 * provider at startup, then call the convenience wrappers from anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, listEvents } from '@molecule/api-calendar'
 * import { provider } from '@molecule/api-calendar-google'
 *
 * setProvider(provider)
 *
 * const { data, credentials } = await listEvents(
 *   userCreds,
 *   'primary',
 *   { timeMin: '2026-05-01T00:00:00Z', timeMax: '2026-05-08T00:00:00Z' },
 * )
 *
 * if (credentials) {
 *   await persistRefreshedCredentials(userId, credentials)
 * }
 * ```
 *
 * @remarks
 * - **Always persist rotated credentials.** Every operation returns
 *   `CalendarOperationResult<T>` — `{ data, credentials? }`. When `credentials` is
 *   present the provider refreshed the user's OAuth tokens: SAVE them over the
 *   stored ones immediately, or the user's next call fails with an expired/revoked
 *   token.
 * - **Credentials are PER-USER OAuth tokens** (`accessToken`/`refreshToken`
 *   obtained by the app's OAuth flow with calendar scopes) — load the CALLING
 *   user's stored tokens for every call. Never share one user's credentials across
 *   users, and never send them to the client.
 * - **Calendar ids are provider-specific** (many providers accept a default id such
 *   as `'primary'`) — discover them via `listCalendars(credentials)` instead of
 *   hardcoding.
 * - All wrappers throw when no provider is bonded (`setProvider` at startup);
 *   times are ISO 8601 strings.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Creating an event through the UI (title + start/end) persists it and
 *   it appears on the calendar view / event list at the right date AND time —
 *   reload the page and it is still there.
 * - [ ] Editing or moving an event (new time, new title) reflects immediately
 *   in the view, and deleting one removes it from both the view and the list.
 * - [ ] Timezone is correct: an event created for a local time shows at THAT
 *   local time, not shifted by hours — events carry an IANA `timeZone` and
 *   ISO 8601 start/end, so a UTC/offset bug surfaces as a wrong displayed hour.
 * - [ ] If the app surfaces availability / free slots (findFreeSlots), a slot
 *   that overlaps an existing event no longer shows as free.
 * - [ ] External-OAuth caveat: bonds sync to a real Google/Microsoft/iCloud
 *   calendar via per-user OAuth, which the sandbox usually cannot drive —
 *   verify against the app's OWN stored events (its DB-backed calendar), not
 *   the live external provider.
 * - [ ] Authorization: a user sees and edits only their own events — no UI or
 *   endpoint returns or mutates another user's calendar/event by id, and the
 *   per-user OAuth credentials never reach the client.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
