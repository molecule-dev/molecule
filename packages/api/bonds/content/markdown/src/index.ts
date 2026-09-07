/**
 * Content provider for `@molecule/api-content` backed by markdown files with
 * YAML front matter: `---`, a YAML mapping, `---`, then the body. Reads one
 * file or a whole directory into `ContentRecord`s, newest first, drafts
 * excluded, and fails loudly on anything malformed. The natural source for a
 * blog, a docs site or a changelog: files in the repo, no database.
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
 * for (const post of posts) console.log(post.slug, post.title, post.date)
 * ```
 *
 * A post file:
 *
 * ```markdown
 * ---
 * title: Hello
 * date: 2026-09-07
 * description: The first post.
 * tags: [intro]
 * ---
 *
 * The body, in markdown.
 * ```
 *
 * @remarks
 * - **Malformed input throws, never skips.** An opening `---` without a
 *   closing one, invalid YAML (with the YAML line), a front matter that is
 *   not a mapping, a missing or empty required field, a `draft` that is not
 *   a boolean, a `date` that does not parse, a slug that is not lowercase
 *   letters, digits and hyphens, or a slug another file already uses: each
 *   throws a `ContentValidationError` naming the file. The build that reads
 *   the content should let it fail.
 * - **Slug.** From the front matter's `slug` when present, else the file
 *   name without its extension, lowercased (`slugFrom: 'filename'` ignores
 *   the front matter). It is the URL, so it is validated.
 * - **Date.** `date` may be a YAML date or a string; it is normalized to an
 *   ISO-8601 string on the record (`record.date`), and the raw value stays in
 *   `frontMatter.date`. Records without a date sort last.
 * - **Drafts.** `draft: true` marks a draft; `readDirectory` drops drafts
 *   unless `includeDrafts` is set. `parse` returns them either way.
 * - **Body.** Everything after the closing fence, with one leading blank
 *   line removed. It is raw markdown: render it with `@molecule/app-markdown`
 *   and a provider such as `@molecule/app-markdown-marked`.
 * - **Files.** `.md` and `.markdown`, recursively, sorted by path before
 *   parsing so errors are reported in a stable order. Configure both with
 *   `createProvider({ extensions, recursive })`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
