import { type ComponentType, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/**
 * Boot the React app: wire bonds, kick off auth initialization, mount
 * `<App />` inside `<StrictMode>` to `#root`, and (optionally) register
 * the PWA service worker.
 *
 * Replaces the 20-line per-app `src/main.tsx` that 97 fleet apps shipped
 * byte-identically.
 *
 * @example
 * ```tsx
 * // src/main.tsx
 * import './index.css'
 * import './theme.css'
 *
 * import { bootstrapApp } from '@molecule/app-bonds-default-react'
 *
 * import { App } from './App.js'
 * import { authClient, setupProviders } from './bonds/index.js'
 * import { registerPWA } from './pwa.js'
 *
 * bootstrapApp({ App, authClient, setupProviders, registerPWA })
 * ```
 */
export function bootstrapApp(opts: {
  App: ComponentType
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
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <opts.App />
      </StrictMode>,
    )
    opts.registerPWA?.()
  })().catch((error: unknown) => {
    // A provider setup failure means the app cannot mount — surface it
    // loudly instead of leaving a silent blank page.
    console.error('bootstrapApp: setupProviders() failed; app not mounted', error)
    throw error
  })
}
