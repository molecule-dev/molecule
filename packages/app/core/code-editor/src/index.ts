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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. Drive it through the preview: navigate_preview to the screen that
 * embeds the editor, read_preview_ui to read the rendered editor surface and
 * its file tabs/controls, and interact_preview to click and type — target the
 * app's own data-mol-id controls (file-tree entries, tab bar, save button),
 * since the editor engine renders its own inner chrome. A box you can't check
 * is an integration bug to fix — not a skip:
 * - [ ] Opening a file loads its content into the editor surface, and syntax
 *   highlighting matches the file's language — a `.ts` file colorizes as
 *   TypeScript (keywords, strings, comments tokenized in distinct colors), not
 *   flat plain text. Opening a second file of a different language re-highlights
 *   for that language.
 * - [ ] Typing into the editor edits the content and the surface reflects every
 *   keystroke: read_preview_ui shows the new text, and `getContent()` for that
 *   path returns it.
 * - [ ] Changing content marks the file dirty — its tab/label shows the unsaved
 *   indicator (dot/asterisk) — and saving clears it back to clean (`markSaved`).
 *   After save, reopening the file (close the tab, open it again) shows the
 *   SAVED text, not the pre-edit content — the change was persisted, not just
 *   held in the buffer.
 * - [ ] With multiple files open as tabs, switching tabs preserves each file's
 *   own content and cursor position: edit file A, switch to B, switch back, and
 *   A still has its edit with the caret where you left it (no bleed-over between
 *   files, no reset to the top).
 * - [ ] A file the app opens read-only (readOnly config) cannot be edited —
 *   typing or paste does not change its content and it never shows a dirty
 *   indicator.
 * - [ ] Change (and save) events fire so the app can react: whatever this app
 *   wires onto `onChange` (autosave, live validation/diagnostics, an unsaved
 *   guard on navigation) actually triggers when you edit and when you save.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
