/**
 * Oura Cloud API v2 bond for `@molecule/api-wearable`.
 *
 * Implements daily activity, sleep, and heart-rate ingestion against the
 * Oura Cloud API v2 using OAuth 2.0 with refresh-token rotation. Wires
 * under the `wearable` named-multi-provider category as `'oura'`.
 *
 * Oura does not track body weight, so {@link createProvider} returns
 * `[]` from `getWeight()` — pair Oura with another wearable bond
 * (e.g. `@molecule/api-wearable-fitbit` or `-withings`) when weight
 * data is required.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-wearable'
 * import { createProvider, PROVIDER_NAME } from '@molecule/api-wearable-oura'
 *
 * const oura = createProvider({
 *   redirectUri: 'https://app.example.com/auth/oura/callback',
 *   credentialsStore: myCredentialsStore,
 * })
 *
 * setProvider(PROVIDER_NAME, oura)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
