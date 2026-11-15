import { type Component, mount } from 'svelte'

/**
 * Boot the Svelte app: wire bonds, kick off auth initialization, mount the root
 * component on `#root`, and (optionally) register the PWA service worker.
 *
 * The Svelte counterpart of the React package's `bootstrapApp` — the same
 * contract, so switching framework means changing the package name in the
 * import:
 *
 * - `setupProviders()` is AWAITED before the first render, so components may
 *   use bonded providers from their very first effect (several optional setups
 *   like `setupAppRealtimeSocketio` are async, and mounting past them races the
 *   bond registration).
 * - `authClient.initialize()` is best-effort at boot — the app mounts
 *   logged-out and the user can sign in; a failure is logged, not thrown.
 * - The app is mounted with Svelte 5's `mount(App, { target: root })` on
 *   `#root` (the same host element the React, Vue, Solid and Angular
 *   counterparts mount on). A SvelteKit app hydrates through its own
 *   `+layout.svelte`/`hydrate` entry instead of calling this.
 * - `registerPWA()` runs after the mount.
 *
 * @example
 * ```ts
 * // src/main.ts
 * import './index.css'
 * import './theme.css'
 *
 * import { bootstrapApp } from '@molecule/app-bonds-default-svelte'
 *
 * import App from './App.svelte'
 * import { authClient, setupProviders } from './bonds/index.js'
 * import { registerPWA } from './pwa.js'
 *
 * bootstrapApp({ App, authClient, setupProviders, registerPWA })
 * ```
 */
export function bootstrapApp(opts: {
  App: Component
  authClient: { initialize: () => Promise<void> }
  setupProviders: () => void | Promise<void>
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
    mount(opts.App, { target: document.getElementById('root')! })
    opts.registerPWA?.()
  })().catch((error: unknown) => {
    // A provider setup failure means the app cannot mount — surface it
    // loudly instead of leaving a silent blank page.
    console.error('bootstrapApp: setupProviders() failed; app not mounted', error)
    throw error
  })
}
