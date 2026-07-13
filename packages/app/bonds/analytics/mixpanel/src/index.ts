/**
 * Mixpanel analytics provider for molecule.dev frontend.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-analytics'
 * import { createProvider } from '@molecule/app-analytics-mixpanel'
 *
 * // Canonical wiring: read the browser-side token from Vite env and pass it
 * // through options. Without a token, skip bonding — analytics calls no-op.
 * // VITE_MIXPANEL_TOKEN below stands for `import.meta.env.VITE_MIXPANEL_TOKEN`
 * // (write the `import.meta.env` read in your app's bond-setup file).
 * const token = VITE_MIXPANEL_TOKEN as string | undefined
 * if (token) {
 *   setProvider(createProvider({ token }))
 * }
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
 * @module
 */

export * from './provider.js'
export * from './types.js'
