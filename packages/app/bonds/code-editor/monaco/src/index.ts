/**
 * Monaco code editor provider for molecule.dev — the VS Code editor core
 * wired to the `@molecule/app-code-editor` interface (mount, models, themes,
 * diff view, LSP client).
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-code-editor'
 * import { createProvider } from '@molecule/app-code-editor-monaco'
 *
 * // Startup: bond once. `monaco-editor` is a peer dependency your app installs.
 * setProvider(createProvider({ fontSize: 14, tabSize: 2, minimap: false }))
 *
 * // Editor component: mount into a SIZED element (Monaco renders nothing in a 0px box).
 * const container = document.getElementById('editor')
 * if (!container) throw new Error('Missing #editor element')
 *
 * const editor = requireProvider()
 * await editor.mount(container, { wordWrap: true }) // async: loads Monaco on first use
 * editor.openFile({
 *   path: '/src/greet.ts', // absolute path — becomes the model URI file:///src/greet.ts
 *   content: 'export const greet = (name: string) => `Hi ${name}`\n',
 *   language: 'typescript',
 * })
 *
 * const unsubscribe = editor.onChange(({ path, content }) => console.log('edited', path, content))
 * console.log(editor.getContent()) // the active file's current text
 *
 * // On unmount:
 * unsubscribe()
 * editor.dispose()
 * ```
 *
 * @remarks
 * - The core has no top-level `mount()`/`openFile()` — call them on `requireProvider()`
 *   after `setProvider(...)`. `mount()` returns a Promise — `await` it before relying on the
 *   editor (only the file active at that point is shown once mount completes). The bare
 *   `provider` export is `createProvider()` with default options.
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
