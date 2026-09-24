/**
 * PostHog analytics provider for molecule.dev frontend.
 *
 * @example
 * ```typescript
 * import { group, hasProvider, identify, page, reset, setProvider, track } from '@molecule/app-analytics'
 * import { createProvider } from '@molecule/app-analytics-posthog'
 *
 * // Startup (your app's bond-setup file): the bond never reads env — pass key + host in.
 * // In a Vite app: `import.meta.env.VITE_POSTHOG_KEY` / `import.meta.env.VITE_POSTHOG_HOST`.
 * const apiKey: string | undefined = 'phc_your_project_key'
 * const host: string | undefined = 'https://eu.i.posthog.com' // EU projects MUST set this
 * if (apiKey) {
 *   setProvider(createProvider({ apiKey, ...(host ? { host } : {}) }))
 * }
 *
 * // Anywhere: call the core helpers (they no-op when nothing is bonded).
 * await identify({ userId: 'u_123', email: 'ada@example.com', name: 'Ada' }) // on login
 * await group('org_42', { name: 'Acme' }) // PostHog group type "company"
 * await page({ path: '/checkout', name: 'Checkout' }) // captured as `$pageview`
 * await track({ name: 'order_placed', properties: { total: 42.5, currency: 'USD' } })
 * await reset() // on logout
 * console.log(hasProvider()) // false = no key, every call above was dropped
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
 * Bonding without a key is failure-safe: `createProvider()` (and the lazy
 * `provider` export, which cannot receive options) logs ONE console warning
 * naming VITE_POSTHOG_KEY and returns a no-op provider instead of initializing
 * the SDK with an empty key. If events never appear in PostHog, check the
 * browser console for that warning FIRST. When no `host` is passed, the SDK's
 * own default (PostHog Cloud US, `https://us.i.posthog.com`) applies — EU
 * projects MUST set `VITE_POSTHOG_HOST=https://eu.i.posthog.com` or events are
 * sent to the US region and silently never appear in the EU project.
 *
 * `createProvider()` called a second time (e.g. Vite HMR re-running a
 * bonds.ts setup function) does NOT re-configure PostHog: `posthog-js`'s
 * underlying client is a module-level singleton, so the second call's
 * `host`/`autocapture`/etc. are silently ignored by the SDK — the FIRST
 * configuration always wins. This logs one actionable console warning naming
 * the ignored call before the SDK's own generic "already initialized"
 * warning fires.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
