/**
 * Monaco code editor provider for molecule.dev — the VS Code editor core
 * wired to the `@molecule/app-code-editor` interface (mount, models, themes,
 * diff view, LSP client).
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-code-editor'
 * import { provider } from '@molecule/app-code-editor-monaco'
 *
 * setProvider(provider) // custom fonts/theme: setProvider(createProvider({...}))
 * ```
 *
 * @remarks
 * - Monaco is code-split: `mount()` does `await import('monaco-editor')`
 *   (~1 MB) on first use — call `preloadMonaco()` during idle time to
 *   prefetch. `monaco-editor` is a peer dependency your app must install.
 * - **TypeScript/JavaScript IntelliSense needs an LSP connection.** This
 *   bond deliberately does NOT load Monaco's TS worker (it would try to
 *   resolve imports in the browser and freeze the tab); TS/JS gets syntax
 *   highlighting out of the box, and completion/hover/diagnostics only
 *   after `provider.connectLsp(wsUrl)` — a WebSocket URL to a running LSP
 *   server. JSON/CSS/HTML language features work without LSP via their
 *   bundled workers.
 * - Default theme is the bundled `'molecule-dark'` (registered at mount),
 *   not Monaco's `'vs-dark'`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import { createProvider } from './provider.js'

/** Pre-instantiated provider singleton. */
export const provider = createProvider()
