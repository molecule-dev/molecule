/**
 * Lazy access to `@molecule/api-payments`, which is an OPTIONAL peer of this package.
 *
 * The payment handlers need two runtime helpers from the core package
 * (`isConfigNotConfiguredError` for the config-vs-failure split, and
 * `resolveBillingPortalReturnUrl` for the portal exit origin), but the peer is declared
 * `optional` in `peerDependenciesMeta` because an app that takes no payments must not be
 * forced to install it. A static `import … from '@molecule/api-payments'` contradicts that:
 * the package barrel exports every handler, so Node evaluates the import while loading
 * `@molecule/api-resource-user` itself, and a production install (which installs no optional
 * peer) dies at BOOT with `ERR_MODULE_NOT_FOUND … imported from
 * …/dist/handlers/updatePlan.js` — xr-flash-m354, two failed deploys on 2026-10-21.
 *
 * A dynamic `import()` is evaluated only when a payments feature is actually used, and its
 * absence means "this app has no payments", never a crash.
 *
 * @module
 */

import type * as paymentsModule from '@molecule/api-payments'

/**
 * The first load of the optional peer — the module, or `null` when it is not installed.
 * Memoised so absence is probed once per process instead of on every request.
 */
let paymentsModulePromise: Promise<typeof paymentsModule | null> | undefined

/**
 * Load `@molecule/api-payments` once, or `null` when the optional peer is not installed.
 *
 * Call it from a request path, never at module scope: the whole point is that importing
 * this package does not require the peer.
 *
 * @returns The payments core module, or `null` when the app has not installed it.
 */
export const loadPayments = (): Promise<typeof paymentsModule | null> => {
  paymentsModulePromise ??= import('@molecule/api-payments').catch((_error: unknown) => {
    // Optional peer, deliberately declared so: an app without payments has no helper to
    // call and nothing to serve here, so absence is the documented no-op rather than a
    // failure. A broken-but-present install surfaces through the bond that needs it.
    return null
  })
  return paymentsModulePromise
}
