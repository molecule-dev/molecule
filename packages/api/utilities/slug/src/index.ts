/**
 * URL slugs for titles and names.
 *
 * `slugify` folds accents and punctuation into a lowercase, hyphenated slug;
 * `uniqueSlug` finds one your store does not have yet; `uniqueSlugInTable`
 * does that against a table column through the bonded DataStore.
 *
 * @module
 * @example
 * ```typescript
 * import { slugify, uniqueSlugInTable } from '@molecule/api-slug'
 *
 * slugify('Café au lait: a how-to!') // 'cafe-au-lait-a-how-to'
 *
 * // In a create handler: the first "Hello World" gets hello-world, the next hello-world-2.
 * const slug = await uniqueSlugInTable('articles', 'slug', input.title)
 *
 * // On update, a row keeps its own slug:
 * const next = await uniqueSlugInTable('articles', 'slug', input.title, { excludeId: article.id })
 * ```
 *
 * @remarks
 * - **Keep a UNIQUE index on the slug column.** Checking and then inserting can
 *   race another request; the index makes the second insert fail, and calling
 *   `uniqueSlugInTable` again finds the next free slug.
 * - **`alwaysSuffix: true`** gives every row a random tail (`hello-world-k3x9q2`),
 *   for specs that expect slugs not to collide or not to be guessable.
 * - Text with no letters or digits (`'!!!'`) slugifies to `''`; the unique
 *   variants fall back to `fallback` (default `'item'`).
 * - `uniqueSlugInTable` needs a DataStore bond (`@molecule/api-database`);
 *   `slugify` and `uniqueSlug` need nothing.
 */

export * from './browser-guard.js'
export * from './slugify.js'
export * from './types.js'
export * from './unique.js'
