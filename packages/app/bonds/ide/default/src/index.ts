/**
 * Default IDE workspace provider for molecule.dev — panel layout state
 * (chat / editor / preview), sizes, collapse/active state, with optional
 * persistence through an injectable storage adapter.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-ide'
 * import { provider } from '@molecule/app-ide-default'
 *
 * setProvider(provider)   // once, at app startup (bonds.ts)
 * ```
 *
 * @remarks
 * - **A persisted layout SHADOWS default-layout changes.** The `provider`
 *   singleton saves to `localStorage` key `'molecule-workspace-layout'`; once a
 *   user has a saved layout, changes to `defaultLayout` (or the built-in
 *   default) have no visible effect until `resetLayout()` runs or the key is
 *   cleared. If "my layout change doesn't show up", this is why.
 * - Default layout: `chat` (left, 25%) / `editor` (center, 50%) / `preview`
 *   (right, 25%). `PanelId` accepts custom strings — extend the layout rather
 *   than building a parallel one.
 * - State-only: pair with `@molecule/app-ide-react` (or your own renderer
 *   reading `getLayout()` + `subscribe()`).
 * - Need different persistence (custom adapter, key, or none)? Build your own
 *   instance with `createProvider({...})` instead of the singleton.
 *
 * @module
 */

export * from './browser-storage.js'
export * from './provider.js'
export * from './types.js'

import { getBrowserStorage } from './browser-storage.js'
import { createProvider } from './provider.js'

const browserStorage = getBrowserStorage()

/**
 * Pre-instantiated provider singleton. Persists the layout to the browser's
 * `localStorage` when available, so a panel resize survives a page reload;
 * falls back to a non-persistent in-memory provider where storage is missing
 * or blocked (SSR, tests). Consumers wanting different behavior (a custom
 * storage adapter, key, or opting out) should call {@link createProvider}.
 */
export const provider = browserStorage
  ? createProvider({ persistLayout: true, storage: browserStorage })
  : createProvider()
