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
 * import { setProvider } from '@molecule/api-calendar'
 * import { provider } from '@molecule/api-calendar-microsoft'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

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
})
