/**
 * `@molecule/app-version/build` — Node-only build helpers. Import from
 * `vite.config.ts`, never from app code.
 *
 * @example
 * ```ts
 * import { releaseNotesPlugin } from '@molecule/app-version/build'
 *
 * export default defineConfig({ plugins: [releaseNotesPlugin()] })
 * ```
 *
 * @module
 */

export * from './release-notes-plugin.js'
