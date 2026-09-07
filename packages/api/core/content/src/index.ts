/**
 * Content core interface for molecule.dev: a directory of front-matter files
 * (markdown posts, docs pages, changelog entries) read into typed records.
 * Defines the `ContentProvider` contract and the record shape; bond packages
 * (e.g. `@molecule/api-content-markdown`) do the parsing. Application and
 * build code calls `readContentDirectory()` and never parses a file itself.
 *
 * @example
 * ```typescript
 * import { readContentDirectory, setProvider } from '@molecule/api-content'
 * import { provider as markdown } from '@molecule/api-content-markdown'
 *
 * setProvider(markdown) // once, at startup (bonds.ts) or in a build script
 *
 * const posts = await readContentDirectory('content/posts', {
 *   requiredFields: ['title', 'date', 'description'],
 * })
 * // → [{ slug, path, frontMatter, body, draft: false, date, title }, …] newest first
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
 * - **This package is server-side.** Read content in a build step or an API
 *   route; never import it from client components.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
