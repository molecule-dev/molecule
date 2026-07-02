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
 * import { setProvider } from '@molecule/api-calendar'
 * import { provider } from '@molecule/api-calendar-google'
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
 * The Google Calendar provider. Lazily initialized on first use so that
 * environment variables are read at call time rather than import time.
 */
export const provider: CalendarProvider = new Proxy({} as CalendarProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
