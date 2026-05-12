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
  setupProviders: () => void
  registerPWA?: () => void
}): void {
  opts.setupProviders()
  opts.authClient.initialize().catch(() => {})
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <opts.App />
    </StrictMode>,
  )
  opts.registerPWA?.()
}
