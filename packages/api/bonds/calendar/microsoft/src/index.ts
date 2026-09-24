/**
 * Microsoft Calendar bond for molecule.dev.
 *
 * Implements the {@link CalendarProvider} contract from
 * `@molecule/api-calendar` against the Microsoft Graph v1.0 REST API
 * (Outlook / Office 365 calendars).
 *
 * ## Setup
 *
 * 1. Register an app in
 *    [Microsoft Entra ID](https://entra.microsoft.com/) with delegated
 *    Microsoft Graph permissions: at minimum `Calendars.ReadWrite`,
 *    `Schedule.Read` (or `Calendars.Read.Shared` for the
 *    `getSchedule` call), and `offline_access` so refresh tokens are
 *    issued.
 * 2. Set `OAUTH_MICROSOFT_CLIENT_ID` and `OAUTH_MICROSOFT_CLIENT_SECRET`
 *    in the API environment (or pass `clientId` / `clientSecret` to
 *    {@link createProvider}).
 * 3. Persist each user's `accessToken` + `refreshToken` after OAuth
 *    completion. Pass them to every `@molecule/api-calendar` call.
 * 4. Persist the {@link CalendarOperationResult.credentials} returned by
 *    each call when present — Microsoft may rotate both the access AND
 *    refresh tokens.
 *
 * @example
 * ```typescript
 * import type { CalendarUserCredentials } from '@molecule/api-calendar'
 * import { createEvent, findFreeSlots, listCalendars, setProvider } from '@molecule/api-calendar'
 * import { createProvider } from '@molecule/api-calendar-microsoft'
 *
 * // Startup: bond once. The client id/secret are only used to REFRESH user tokens.
 * setProvider(
 *   createProvider({
 *     clientId: process.env.OAUTH_MICROSOFT_CLIENT_ID,
 *     clientSecret: process.env.OAUTH_MICROSOFT_CLIENT_SECRET,
 *   }),
 * )
 *
 * // The user's tokens, stored when they connected Microsoft (with offline_access).
 * let credentials: CalendarUserCredentials = {
 *   accessToken: 'stored-access-token',
 *   refreshToken: 'stored-refresh-token',
 * }
 *
 * // Graph has no 'primary' alias — look up the default calendar's real id.
 * const calendars = await listCalendars(credentials)
 * if (calendars.credentials) credentials = calendars.credentials // rotated — persist it
 * const calendar = calendars.data.find((c) => c.primary)
 *
 * // findFreeSlots takes SCHEDULE ids = mailbox email addresses, not calendar ids.
 * const free = await findFreeSlots(credentials, ['ada@example.com'], {
 *   timeMin: '2026-10-01T09:00:00Z',
 *   timeMax: '2026-10-01T17:00:00Z',
 *   durationMinutes: 30,
 * })
 * if (free.credentials) credentials = free.credentials
 *
 * const slot = free.data.freeSlots[0] // the WHOLE gap — cut the 30 minutes out yourself
 * if (calendar && slot) {
 *   const created = await createEvent(credentials, calendar.id, {
 *     summary: 'Intro call',
 *     start: slot.start,
 *     end: new Date(Date.parse(slot.start) + 30 * 60_000).toISOString(),
 *     attendees: [{ email: 'grace@example.com' }],
 *   })
 *   console.log('booked', created.data.id)
 * }
 * ```
 *
 * @remarks
 * - **Wire it through the core** (`setProvider(...)` from `@molecule/api-calendar`), not
 *   `bond('calendar-microsoft', ...)`. EVERY call takes the user's
 *   `{ accessToken, refreshToken }` as its first argument — there is no server-side user.
 * - **Persist `result.credentials` whenever it is set** — after a refresh Microsoft may rotate
 *   BOTH tokens, and the old refresh token stops working. `expiresAt` is epoch MILLISECONDS.
 * - **Calendar ids are Graph ids**, not `'primary'`: get them from `listCalendars()`
 *   (`primary: true` marks the default). `findFreeSlots()` calls Graph `getSchedule`, so its ids
 *   are mailbox EMAIL ADDRESSES.
 * - `freeSlots` are whole gaps between busy blocks (each at least `durationMinutes` long), not
 *   pre-cut slots. Errors are sanitized (`Microsoft Calendar <op> failed status=…`) — no tokens.
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
 * The Microsoft Calendar provider. Lazily initialized on first use so that
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
