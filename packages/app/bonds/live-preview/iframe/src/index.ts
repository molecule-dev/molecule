/**
 * Iframe-based live preview provider for molecule.dev — manages preview STATE
 * (load-target `url`, URL-bar `currentUrl`, Back/Forward history, device
 * frame, loading/error, `loadNonce`). A companion renderer (e.g.
 * `@molecule/app-ide-react`'s preview panel) renders the actual `<iframe>`
 * and feeds `notifyLoaded` / `notifyError` / `recordNavigation` back in.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-live-preview'
 * import { provider } from '@molecule/app-live-preview-iframe'
 *
 * setProvider(provider)   // once, at app startup (bonds.ts)
 * ```
 *
 * @remarks
 * - `setUrl(sameUrl)` is a deliberate no-op — renderers key reloads off
 *   `loadNonce`. See `@molecule/app-live-preview`'s remarks for the full
 *   renderer contract (`molecule:navigate` reporting, nav-command Back/Forward,
 *   `?_r` cache-buster stripping) — this bond implements all of it.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import { createProvider } from './provider.js'

/** Pre-instantiated provider singleton. */
export const provider = createProvider()
