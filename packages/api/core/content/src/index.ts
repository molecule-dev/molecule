/**
 * Content core interface for molecule.dev: a directory of front-matter files
 * (markdown posts, docs pages, changelog entries) read into typed records.
 * Defines the `ContentProvider` contract and the record shape; bond packages
 * (e.g. `@molecule/api-content-markdown`) do the parsing. Application and
 * build code calls `readContentDirectory()` and never parses a file itself.
 *
 * @example
 * ```typescript
 * import {
 *   isContentValidationError,
 *   readContentDirectory,
 *   setProvider,
 * } from '@molecule/api-content'
 * import { provider as markdown } from '@molecule/api-content-markdown'
 *
 * setProvider(markdown) // once, at startup (bonds.ts) or in a build script
 *
 * try {
 *   // Relative dirs resolve against process.cwd(); drafts are excluded; newest first.
 *   const posts = await readContentDirectory('content/posts', {
 *     requiredFields: ['title', 'date', 'description'],
 *   })
 *   for (const post of posts) console.log(post.slug, post.title, post.date)
 * } catch (error) {
 *   // A malformed post FAILS the build — report which file, then rethrow.
 *   if (isContentValidationError(error)) console.error(`${error.path}: ${error.reason}`)
 *   throw error
 * }
 * ```
 *
 * @remarks
 * - **Validation fails loudly, never silently.** A file with an unclosed
 *   front-matter fence, invalid YAML, a front matter that is not a mapping, a
 *   missing required field, an invalid slug or date, or a slug another file
 *   already uses throws a `ContentValidationError` naming the file (and the
 *   line when known). A build that swallows that error ships a site with a
 *   post missing; catch it only to report it. Check the shape with
 *   `isContentValidationError(err)`, never `instanceof`, so every provider's
 *   error is caught the same way.
 * - **Drafts are excluded by default.** `readDirectory` drops records whose
 *   front matter says `draft: true` unless `includeDrafts` is set, so a
 *   production build cannot publish a draft by forgetting a filter.
 * - **Slugs are the URL.** `slug` comes from the front matter when present,
 *   else the file name without its extension, and must be lowercase letters,
 *   digits and hyphens. Two files with the same slug are an error, not a
 *   last-one-wins.
 * - **Order is newest first** by `date`, then by `slug`, so an index page can
 *   take the records as they come.
 * - `date` is normalized to a full ISO string (`'2026-09-07T00:00:00.000Z'`), and
 *   `readContentDirectory` resolves a relative `dir` against `process.cwd()` — pass an
 *   absolute path when the process may start elsewhere.
 * - **This package is server-side.** Read content in a build step or an API
 *   route; never import it from client components.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
