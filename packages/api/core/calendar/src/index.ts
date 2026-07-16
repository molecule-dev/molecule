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
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
