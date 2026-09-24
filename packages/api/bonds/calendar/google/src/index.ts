/**
 * Google Calendar bond for molecule.dev.
 *
 * Implements the {@link CalendarProvider} contract from
 * `@molecule/api-calendar` against the Google Calendar v3 REST API.
 *
 * ## Setup
 *
 * 1. Create OAuth credentials in the
 *    [Google API Console](https://console.developers.google.com/apis/credentials).
 *    The same OAuth client used for "Sign in with Google" can be reused
 *    here — request the additional `https://www.googleapis.com/auth/calendar`
 *    scope when consenting.
 * 2. Set `OAUTH_GOOGLE_CLIENT_ID` and `OAUTH_GOOGLE_CLIENT_SECRET` in the
 *    API environment (or pass `clientId` / `clientSecret` to
 *    {@link createProvider}).
 * 3. Persist each user's `accessToken` + `refreshToken` after OAuth
 *    completion. Pass them to every `@molecule/api-calendar` call.
 * 4. Persist the {@link CalendarOperationResult.credentials} returned by
 *    each call when present — Google may rotate the access token.
 *
 * @example
 * ```typescript
 * import type { CalendarUserCredentials } from '@molecule/api-calendar'
 * import { createEvent, findFreeSlots, setProvider } from '@molecule/api-calendar'
 * import { createProvider } from '@molecule/api-calendar-google'
 *
 * // Startup: bond once. The client id/secret are only used to REFRESH user tokens.
 * setProvider(
 *   createProvider({
 *     clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
 *     clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
 *   }),
 * )
 *
 * // The user's tokens, stored when they connected Google with the calendar scope.
 * let credentials: CalendarUserCredentials = {
 *   accessToken: 'stored-access-token',
 *   refreshToken: 'stored-refresh-token',
 * }
 *
 * const free = await findFreeSlots(credentials, ['primary'], {
 *   timeMin: '2026-10-01T09:00:00Z',
 *   timeMax: '2026-10-01T17:00:00Z',
 *   durationMinutes: 30,
 * })
 * if (free.credentials) credentials = free.credentials // token was refreshed — persist it
 *
 * // A free slot is the WHOLE gap (>= 30 min), so cut the meeting length out of it yourself.
 * const slot = free.data.freeSlots[0]
 * if (slot) {
 *   const created = await createEvent(credentials, 'primary', {
 *     summary: 'Intro call',
 *     start: slot.start,
 *     end: new Date(Date.parse(slot.start) + 30 * 60_000).toISOString(),
 *     attendees: [{ email: 'grace@example.com' }],
 *   })
 *   if (created.credentials) credentials = created.credentials
 *   console.log('booked', created.data.id)
 * }
 * ```
 *
 * @remarks
 * - **Wire it through the core** (`setProvider(...)` from `@molecule/api-calendar`), not
 *   `bond('calendar-google', ...)`. There is no server-side "current user": EVERY call takes the
 *   user's `{ accessToken, refreshToken }` as its first argument.
 * - **Persist `result.credentials` whenever it is set.** On a 401 (or a past `expiresAt`, epoch
 *   MILLISECONDS) the bond refreshes the token once and returns the new one there; ignoring it
 *   means refreshing on every call. `credentials` is `undefined` when nothing changed.
 * - The OAuth consent must include `https://www.googleapis.com/auth/calendar` and request offline
 *   access, or there is no `refreshToken` and calls fail once the access token expires.
 * - `OAUTH_GOOGLE_CLIENT_ID`/`OAUTH_GOOGLE_CLIENT_SECRET` are read lazily — a missing one only
 *   throws when a refresh is actually needed.
 * - `freeSlots` are whole gaps between busy blocks (each at least `durationMinutes` long), not
 *   pre-cut slots. Errors are sanitized (`Google Calendar <op> failed status=…`) — no tokens.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { CalendarProvider } from '@molecule/api-calendar'

import { createProvider } from './provider.js'

let _provider: CalendarProvider | null = null

/**
 * The Google Calendar provider. Lazily initialized on first use so that
 * environment variables are read at call time rather than import time.
 */
export const provider: CalendarProvider = new Proxy({} as CalendarProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
