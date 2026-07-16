/**
 * Device filesystem access interface for molecule.dev.
 *
 * Framework-agnostic core for app-scoped file storage through a swappable
 * `FilesystemProvider`: read/write/append (text or Blob), directories
 * (mkdir/rmdir/readdir), stat/exists, copy/move, URIs for native viewers,
 * and free-space checks — all addressed relative to well-known base
 * directories (`'documents' | 'data' | 'cache' | 'external' | 'library' |
 * 'temp'`). Pure path/format helpers (`joinPath`, `getExtension`,
 * `getBasename`, `getDirname`, `getMimeType`, `formatFileSize`) work
 * without a provider.
 *
 * @example
 * ```typescript
 * import {
 *   exists,
 *   hasProvider,
 *   joinPath,
 *   readFile,
 *   writeFile,
 * } from '@molecule/app-filesystem'
 *
 * async function saveDraft(text: string): Promise<void> {
 *   if (!hasProvider()) return // no provider wired — use app-storage instead
 *   const path = joinPath('drafts', 'note.txt')
 *   await writeFile(path, text, { directory: 'data', recursive: true })
 * }
 *
 * async function loadDraft(): Promise<string | null> {
 *   const path = joinPath('drafts', 'note.txt')
 *   if (!(await exists(path, { directory: 'data' }))) return null
 *   return readFile(path, { directory: 'data' })
 * }
 * ```
 *
 * @remarks
 * - **Every file operation THROWS until `setProvider()` is called** — there
 *   is no web fallback and **no prebuilt provider package ships with
 *   molecule**; supply a `FilesystemProvider` from your native runtime.
 * - **This is NOT general key-value persistence.** For settings/state on any
 *   platform use `@molecule/app-storage`; reach for app-filesystem only when
 *   you genuinely need files (large blobs, exports, media handed to other
 *   apps via `getUri`).
 * - On web there is no path-addressed filesystem; a provider could be built
 *   on OPFS (origin-private, invisible to the user's file manager), but
 *   `'external'`/`'library'` semantics and `getUri` for OS viewers do not
 *   translate — feature-gate on `getCapabilities()`.
 * - Paths are RELATIVE to the `directory` base option (default varies by
 *   provider — pass it explicitly). Use `joinPath`, never string-concat
 *   with `/`.
 * - Write ops fail on missing parent directories unless
 *   `{ recursive: true }`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
