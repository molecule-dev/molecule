/**
 * Turning text into a URL slug.
 *
 * @module
 */

import type { SlugifyOptions } from './types.js'

/**
 * Letters NFKD does not decompose into a base letter plus a mark, folded by
 * hand so "Straße" and "Øresund" keep their letters.
 */
const FOLDS: Readonly<Record<string, string>> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ł: 'l',
  ı: 'i',
}

/**
 * Turn a title or name into a URL slug: accents folded ("Café" → "cafe"),
 * lowercase, every run of other characters one separator, no separator at
 * either end, cut to `maxLength` at a word boundary when one is near.
 *
 * @param text - The title or name.
 * @param options - Separator and maximum length.
 * @returns The slug; empty when the text has no letters or digits at all.
 */
export function slugify(text: string, options: SlugifyOptions = {}): string {
  const separator = options.separator ?? '-'
  const maxLength = options.maxLength ?? 80
  const folded = text
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[ßæœøđðþłı]/g, (c) => FOLDS[c] ?? c)
  const words = folded.split(/[^a-z0-9]+/).filter(Boolean)
  let slug = words.join(separator)
  if (slug.length > maxLength) {
    const cut = slug.slice(0, maxLength)
    const boundary = cut.lastIndexOf(separator)
    slug = boundary >= maxLength / 2 ? cut.slice(0, boundary) : cut
  }
  return slug.endsWith(separator) ? slug.slice(0, -separator.length) : slug
}
