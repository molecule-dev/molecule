/**
 * PostHog analytics provider for molecule.dev frontend.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-analytics'
 * import { createProvider } from '@molecule/app-analytics-posthog'
 *
 * // Canonical wiring: read the browser-side key from Vite client env and pass
 * // it through options. `importMetaEnv` stands for Vite's `import.meta.env` —
 * // in your app write `import.meta.env?.VITE_POSTHOG_KEY` directly. Without a
 * // key, skip bonding — analytics calls no-op.
 * const apiKey = importMetaEnv?.VITE_POSTHOG_KEY as string | undefined
 * const host = importMetaEnv?.VITE_POSTHOG_HOST as string | undefined
 * if (apiKey) {
 *   setProvider(createProvider({ apiKey, ...(host ? { host } : {}) }))
 * }
 * ```
 *
 * @remarks
 * The provider does NOT read env itself — configuration flows in through
 * `createProvider(options)`. The canonical env names are `VITE_POSTHOG_KEY`
 * and `VITE_POSTHOG_HOST` (the `VITE_` prefix is required: Vite only embeds
 * `VITE_`-prefixed vars into the client bundle, and molecule's scaffolded app
 * `.env` only includes `VITE_*` secrets). Do NOT use the API-side twin names
 * (`POSTHOG_API_KEY`/`POSTHOG_HOST`) in frontend code — those belong to
 * `@molecule/api-analytics-posthog` and never reach the browser. The PostHog
 * project API key (`phc_...`) is a public browser-side credential, safe to
 * embed client-side.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
