/**
 * The one heading-id rule every markdown provider uses, so a table of contents
 * anchor resolves whichever renderer produced the document.
 *
 * @module
 */

/**
 * Characters removed from heading text before it becomes a slug: everything but letters, the
 * combining marks that complete them (a Devanagari vowel sign, a decomposed accent), digits,
 * whitespace, underscores and hyphens.
 */
const SLUG_REMOVALS = /[^\p{L}\p{M}\p{N}\s_-]/gu

/** A slug must contain at least one letter or digit; anything else is `section`. */
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u

/**
 * Applies marked's slug rule to one heading's visible text: lowercase, keep
 * letters, combining marks, digits, whitespace, underscores and hyphens, turn
 * whitespace and underscores into one hyphen, and collapse repeated hyphens.
 * Unicode letters and digits are kept (`日本語` stays `日本語`, `नमस्ते` keeps its
 * vowel signs).
 *
 * @param text - The heading's visible text.
 * @returns The base slug, or `section` when the heading has no letters or digits.
 */
function baseSlug(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(SLUG_REMOVALS, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
  return HAS_LETTER_OR_DIGIT.test(slug) ? slug : 'section'
}

/**
 * Creates a heading slugger for one rendered document.
 *
 * Call the returned function once per heading, in document order. It applies
 * marked's rule (lowercase, hyphenated, Unicode letters and digits kept),
 * returns `section` for a heading with no letters or digits, and makes ids
 * unique: a repeat of `a` becomes `a-2`, then `a-3`, and a suffixed slug never
 * collides with a later heading whose own text slugs to it (`a`, `a`, `a-2`
 * gives `a`, `a-2`, `a-2-2`). Start a new slugger for each rendered document so
 * a new document begins again at no suffix.
 *
 * @param slugBase - Turns heading text into the base slug instead of the rule above (a
 * provider's own `slugify` option). The ids it returns get the same `-2`, `-3` suffixes, and an
 * empty one becomes `section`.
 * @returns A function that slugs one heading's text into a unique id.
 */
export function createHeadingSlugger(
  slugBase?: (text: string) => string,
): (text: string) => string {
  const used = new Set<string>()
  return (text: string): string => {
    const base = slugBase ? slugBase(text) || 'section' : baseSlug(text)
    if (!used.has(base)) {
      used.add(base)
      return base
    }
    let suffix = 2
    while (used.has(`${base}-${suffix}`)) suffix += 1
    const unique = `${base}-${suffix}`
    used.add(unique)
    return unique
  }
}
