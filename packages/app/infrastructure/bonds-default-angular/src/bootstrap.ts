import type { EnvironmentProviders, Provider, Type } from '@angular/core'
import { createApplication } from '@angular/platform-browser'

/**
 * Boot the Angular app: wire bonds, kick off auth initialization, mount the
 * root component on `#root`, and (optionally) register the PWA service worker.
 *
 * The Angular counterpart of the React package's `bootstrapApp` — the same
 * contract, so switching framework means changing the package name in the
 * import:
 *
 * - `setupProviders()` is AWAITED before the first render, so components may
 *   use bonded providers from their very first effect (several optional setups
 *   like `setupAppRealtimeSocketio` are async, and mounting past them races the
 *   bond registration).
 * - `authClient.initialize()` is best-effort at boot — the app mounts
 *   logged-out and the user can sign in; a failure is logged, not thrown.
 * - The application is created with `createApplication({ providers })` — the
 *   same platform bootstrap `bootstrapApplication` runs internally — and the
 *   root component is mounted ON the `#root` host element (the same host the
 *   React, Vue, Solid and Svelte counterparts mount on). `bootstrapApplication`
 *   itself takes no host: it resolves the component's selector, so an app that
 *   prefers Angular's selector-host convention can call it directly instead.
 * - `registerPWA()` runs after the mount.
 *
 * @param opts - The root component, the auth client, the bond wiring, optional
 * Angular providers, and an optional PWA registration callback.
 *
 * @example
 * ```ts
 * // src/main.ts
 * import { provideRouter } from '@angular/router'
 * import { bootstrapApp } from '@molecule/app-bonds-default-angular'
 * import { provideMoleculeRouter } from '@molecule/app-routing-angular-router'
 *
 * import { App } from './app/app.js'
 * import { authClient, setupProviders } from './bonds/index.js'
 * import { registerPWA } from './pwa.js'
 * import { routes } from './app/routes.js'
 *
 * bootstrapApp({
 *   App,
 *   authClient,
 *   setupProviders,
 *   // Angular providers for the root injector — `provideRouter(routes)` with
 *   // `provideMoleculeRouter()` (molecule's router over it, and the routed view a
 *   // layout or guard without children renders), `provideMolecule({ ... })`,
 *   // `provideZonelessChangeDetection()`, …
 *   providers: [provideRouter(routes), provideMoleculeRouter()],
 *   registerPWA,
 * })
 * ```
 */
export function bootstrapApp(opts: {
  App: Type<unknown>
  authClient: { initialize: () => Promise<void> }
  setupProviders: () => void | Promise<void>
  /**
   * Angular root-injector providers — `provideRouter(routes)` with
   * `provideMoleculeRouter()`, `provideMolecule({ ... })`,
   * `provideZonelessChangeDetection()`, … Both the
   * `EnvironmentProviders` those functions return and plain `Provider` objects
   * are accepted, exactly as Angular's own `bootstrapApplication` does.
   */
  providers?: Array<Provider | EnvironmentProviders>
  registerPWA?: () => void
}): void {
  void (async () => {
    // Await provider wiring BEFORE the first render so components may use
    // bonded providers from their very first effect (e.g. realtime
    // `connect()` — several optional setups like setupAppRealtimeSocketio
    // are async, and mounting past them races the bond registration).
    await opts.setupProviders()
    opts.authClient.initialize().catch((error: unknown) => {
      // Auth session restore is best-effort at boot — the app mounts
      // logged-out and the user can sign in; log for debuggability.
      console.warn('bootstrapApp: authClient.initialize() failed', error)
    })
    const appRef = await createApplication({ providers: opts.providers ?? [] })
    appRef.bootstrap(opts.App, document.getElementById('root')!)
    opts.registerPWA?.()
  })().catch((error: unknown) => {
    // A provider setup failure means the app cannot mount — surface it
    // loudly instead of leaving a silent blank page.
    console.error('bootstrapApp: setupProviders() failed; app not mounted', error)
    throw error
  })
}
