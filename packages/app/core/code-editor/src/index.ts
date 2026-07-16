/**
 * Code editor core interface for molecule.dev.
 *
 * Framework-agnostic contract for an embeddable code editor (tabs, file
 * content, cursor, diagnostics, diff view, optional LSP). Bond a provider
 * (e.g. `@molecule/app-code-editor-monaco`) at startup, then drive the
 * editor through the provider anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/app-code-editor'
 * import { provider } from '@molecule/app-code-editor-monaco'
 *
 * setProvider(provider)                    // once, at app startup (bonds.ts)
 *
 * const editor = requireProvider()
 * await editor.mount(containerElement, { theme: 'dark', fontSize: 13 })
 * editor.openFile({ path: 'src/index.ts', content: source, language: 'typescript' })
 * const unsubscribe = editor.onChange((event) => save(event.path, event.content))
 * ```
 *
 * @remarks
 * - **Wire the bond BEFORE any editor call.** `setProvider(provider)` in the app's
 *   bond setup; `requireProvider()` throws if nothing is bonded.
 * - **`mount()` needs a real, attached DOM element and may be async** (providers can
 *   lazy-load their engine). In component frameworks, mount in the after-render
 *   lifecycle hook (a ref/effect), and call `dispose()` on unmount — never re-mount
 *   over a live instance.
 * - **Feature-detect optional capabilities.** `openDiff`, `connectLsp`,
 *   `setContentSilent`, `markSaved`, `onFixWithAI`, `getDiagnostics`, etc. are
 *   optional provider methods — check `editor.openDiff?.(…)` before relying on them.
 * - `onChange` returns an unsubscribe function — keep it and call it on teardown to
 *   avoid leaked listeners across route changes.
 * - The editor renders its own chrome; any surrounding UI you add (toolbars, tab
 *   labels) styles via `getClassMap()`/`cm.*` and localizes via
 *   `t('key', values, { defaultValue })`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
