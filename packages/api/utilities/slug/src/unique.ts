/**
 * Slugs that are not taken yet.
 *
 * @module
 */

import { findOne } from '@molecule/api-database'

import { slugify } from './slugify.js'
import type { UniqueSlugOptions } from './types.js'

/** A short random suffix, so a slug is never guessable from its siblings. */
const randomSuffix = (): string => Math.random().toString(36).slice(2, 8).padEnd(6, '0')

/**
 * A slug for `text` that `isTaken` says is free: the plain slug, then
 * `slug-2`, `slug-3` … up to `maxNumbered`, then `slug-<random>`.
 *
 * A check-then-insert can still race another writer: keep a UNIQUE index on
 * the column and retry the insert on a conflict (call this again).
 *
 * @param text - The title or name.
 * @param isTaken - Whether a slug is already used (your store's lookup).
 * @param options - Slug options, the numbered tries and a fallback for text with no letters.
 * @returns A slug `isTaken` reported free.
 * @throws {Error} When every candidate is reported taken (a lookup that always says yes).
 */
export async function uniqueSlug(
  text: string,
  isTaken: (slug: string) => Promise<boolean> | boolean,
  options: UniqueSlugOptions = {},
): Promise<string> {
  const separator = options.separator ?? '-'
  const base = slugify(text, options) || options.fallback || 'item'
  if (options.alwaysSuffix) {
    for (let i = 0; i < 5; i++) {
      const candidate = `${base}${separator}${randomSuffix()}`
      if (!(await isTaken(candidate))) return candidate
    }
  } else {
    if (!(await isTaken(base))) return base
    const maxNumbered = options.maxNumbered ?? 20
    for (let n = 2; n <= maxNumbered; n++) {
      const candidate = `${base}${separator}${n}`
      if (!(await isTaken(candidate))) return candidate
    }
  }
  // Twelve random characters are free on the first try unless the lookup is
  // broken (it says everything is taken): stop and say so instead of spinning.
  for (let i = 0; i < 10; i++) {
    const candidate = `${base}${separator}${randomSuffix()}${randomSuffix()}`
    if (!(await isTaken(candidate))) return candidate
  }
  throw new Error(`No free slug for "${base}": every candidate was reported taken`)
}

/**
 * {@link uniqueSlug} checked against a table column through the bonded
 * DataStore (`@molecule/api-database`).
 *
 * @param table - The table, e.g. `'articles'`.
 * @param column - The slug column, e.g. `'slug'`.
 * @param text - The title or name.
 * @param options - As for {@link uniqueSlug}; `excludeId` lets a row keep its own slug on update.
 * @returns A slug no other row of the table uses.
 */
export async function uniqueSlugInTable(
  table: string,
  column: string,
  text: string,
  options: UniqueSlugOptions & { excludeId?: string } = {},
): Promise<string> {
  return uniqueSlug(
    text,
    async (slug) => {
      const row = await findOne<{ id?: string }>(table, [
        { field: column, operator: '=', value: slug },
      ])
      // Not found is null from the bonds, undefined from some stores and stubs.
      return row != null && (options.excludeId === undefined || row.id !== options.excludeId)
    },
    options,
  )
}
