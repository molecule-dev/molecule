/**
 * Mixpanel analytics provider for molecule.dev frontend.
 *
 * @example
 * ```typescript
 * import { hasProvider, identify, page, setProvider, track } from '@molecule/app-analytics'
 * import { createProvider } from '@molecule/app-analytics-mixpanel'
 *
 * // Startup (your app's bond-setup file): the bond never reads env — pass the token in.
 * // In a Vite app: `const token = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined`
 * const token: string | undefined = 'your_mixpanel_project_token'
 * if (token) {
 *   setProvider(createProvider({ token }))
 * }
 *
 * // Anywhere: call the core helpers (they no-op when nothing is bonded).
 * await identify({ userId: 'u_123', email: 'ada@example.com', name: 'Ada' }) // on login
 * await page({ path: '/checkout', name: 'Checkout' }) // sent as a "Page View" event
 * await track({ name: 'order_placed', properties: { total: 42.5, currency: 'USD' } })
 * console.log(hasProvider()) // false = no token, every call above was dropped
 * ```
 *
 * @remarks
 * The provider does NOT read env itself — configuration flows in through
 * `createProvider(options)`. The canonical env name is `VITE_MIXPANEL_TOKEN`
 * (the `VITE_` prefix is required: Vite only embeds `VITE_`-prefixed vars
 * into the client bundle, and molecule's scaffolded app `.env` only includes
 * `VITE_*` secrets). Do NOT use the API-side twin name (`MIXPANEL_TOKEN`) in
 * frontend code — that belongs to `@molecule/api-analytics-mixpanel` and
 * never reaches the browser. The Mixpanel project token is a public
 * browser-side credential, safe to embed client-side.
 *
 * Bonding without a token is failure-safe: `createProvider()` (and the lazy
 * `provider` export, which cannot receive options) logs ONE console warning
 * naming VITE_MIXPANEL_TOKEN and returns a no-op provider — the raw SDK would
 * otherwise accept an empty token in total silence and every event would
 * vanish with no breadcrumb. If events never appear in Mixpanel, check the
 * browser console for that warning FIRST.
 *
 * `AnalyticsEvent.timestamp` is NOT honored: the Mixpanel browser SDK has no
 * supported client-set timestamp and always stamps the time of capture. For
 * historical timestamps use `@molecule/api-analytics-mixpanel` server-side.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
