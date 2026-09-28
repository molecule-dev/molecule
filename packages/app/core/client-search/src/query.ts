/**
 * The query grammar: what a person types → a {@link ClientSearchQuery}.
 *
 * Pure text handling, shared by every bond so `category:auth -deprecated
 * "sign in"` means the same thing whichever library indexes the documents.
 *
 * @module
 */

import type {
  ClientSearchDocument,
  ClientSearchFilter,
  ClientSearchIndexOptions,
  ParsedQuery,
} from './types.js'

/** Options for {@link parseQuery}. */
export interface ParseQueryOptions {
  /**
   * Fields that `field:value` may target. A `word:thing` whose `word` is not
   * listed is kept as ordinary text (so a search for `re:act` still works).
   * When omitted, every `word:value` is treated as a filter.
   */
  filterFields?: string[]
}

/**
 * Parses search text into terms, phrases, exclusions and field filters.
 *
 * Grammar (whitespace separates tokens):
 * - `word` — a term; bonds match it by prefix and with typo tolerance.
 * - `"two words"` — a phrase that must appear verbatim.
 * - `-word` / `-"two words"` — must not appear.
 * - `field:value` — only documents whose `field` is `value` (case-insensitive).
 * - `field:a,b` — `a` OR `b`. `field:"multi word"` quotes a value.
 * - `field:val*` — a value prefix.
 * - `-field:value` — everything EXCEPT those documents.
 *
 * @param raw - The text typed.
 * @param options - Which fields are filterable.
 * @returns The structured query.
 */
export function parseQuery(raw: string, options: ParseQueryOptions = {}): ParsedQuery {
  const known = options.filterFields ? new Set(options.filterFields) : null
  const terms: string[] = []
  const phrases: string[] = []
  const exclude: string[] = []
  const filters: ClientSearchFilter[] = []

  for (const token of tokenize(raw)) {
    let t = token
    let negate = false
    if (t.startsWith('-') && t.length > 1) {
      negate = true
      t = t.slice(1)
    }
    const colon = t.indexOf(':')
    if (colon > 0 && !t.startsWith('"')) {
      const field = t.slice(0, colon)
      const value = unquote(t.slice(colon + 1))
      if (!known || known.has(field)) {
        // A filterable field with no value yet (`category:`) is a filter being
        // typed, not a term: drop it rather than search for the field's name.
        if (!value) continue
        const values = value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
        if (values.length)
          filters.push(negate ? { field, values, negate: true } : { field, values })
        continue
      }
    }
    if (t.startsWith('"')) {
      const phrase = unquote(t)
      if (!phrase) continue
      if (negate) exclude.push(phrase)
      else phrases.push(phrase)
      continue
    }
    if (negate) exclude.push(t)
    else terms.push(t)
  }

  return { raw, text: terms.join(' '), phrases, exclude, filters }
}

/**
 * Splits text into tokens, keeping quoted runs together (`a "b c" d:"e f"` →
 * `a`, `"b c"`, `d:"e f"`).
 *
 * @param raw - The text.
 * @returns Its tokens, quotes still attached.
 */
export function tokenize(raw: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuote = false
  for (const ch of raw) {
    if (ch === '"') {
      inQuote = !inQuote
      cur += ch
    } else if (/\s/.test(ch) && !inQuote) {
      if (cur) out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur) out.push(cur)
  return out
}

/**
 * Strips one layer of double quotes, tolerating an unclosed quote.
 *
 * @param s - A token or value.
 * @returns The text without its quotes.
 */
export function unquote(s: string): string {
  let t = s
  if (t.startsWith('"')) t = t.slice(1)
  if (t.endsWith('"')) t = t.slice(0, -1)
  return t.trim()
}

/**
 * The fields a query may filter on for an index: `filterFields` when set,
 * otherwise the searched `fields`.
 *
 * @param options - The index options.
 * @returns The filterable field names.
 */
export function filterFieldsOf<T extends ClientSearchDocument>(
  options: ClientSearchIndexOptions<T>,
): string[] {
  return options.filterFields ?? options.fields
}

/**
 * The default field extractor: arrays join with spaces, everything else is
 * stringified, nothing becomes `''`.
 *
 * @param doc - The document.
 * @param field - The field name.
 * @returns Searchable text.
 */
export function extractFieldText(doc: ClientSearchDocument, field: string): string {
  const v = doc[field]
  if (v == null) return ''
  if (Array.isArray(v)) return v.map((x) => (x == null ? '' : String(x))).join(' ')
  return String(v)
}

/**
 * Whether a document passes a filter. Used by bonds so filter semantics are
 * identical everywhere: a field's string value, or any element of an array
 * value, equals one of the accepted values case-insensitively; a value ending
 * in `*` matches a prefix instead.
 *
 * @param doc - The document.
 * @param filter - The constraint.
 * @returns `true` when the document passes.
 */
export function matchesFilter(doc: ClientSearchDocument, filter: ClientSearchFilter): boolean {
  const raw = doc[filter.field]
  const candidates = (Array.isArray(raw) ? raw : [raw])
    .filter((x) => x != null)
    .map((x) => String(x).toLowerCase())
  const wanted = filter.values.map((v) => v.toLowerCase())
  const hit = candidates.some((c) =>
    wanted.some((w) => (w.endsWith('*') ? c.startsWith(w.slice(0, -1)) : c === w)),
  )
  return filter.negate ? !hit : hit
}

/**
 * Whether every filter accepts the document.
 *
 * @param doc - The document.
 * @param filters - The constraints (AND'd).
 * @returns `true` when all pass.
 */
export function matchesFilters(doc: ClientSearchDocument, filters: ClientSearchFilter[]): boolean {
  return filters.every((f) => matchesFilter(doc, f))
}

/**
 * Whether a document contains every phrase verbatim (case-insensitive) in at
 * least one of the given fields, and none of the excluded terms as a word
 * prefix in any of them.
 *
 * @param doc - The document.
 * @param fields - The searched fields.
 * @param phrases - Required phrases.
 * @param exclude - Forbidden terms or phrases.
 * @param extract - The field extractor.
 * @returns `true` when the document passes.
 */
export function matchesText(
  doc: ClientSearchDocument,
  fields: string[],
  phrases: string[],
  exclude: string[],
  extract: (doc: ClientSearchDocument, field: string) => string = extractFieldText,
): boolean {
  if (!phrases.length && !exclude.length) return true
  const texts = fields.map((f) => extract(doc, f).toLowerCase())
  for (const p of phrases) {
    const needle = p.toLowerCase()
    if (!texts.some((t) => t.includes(needle))) return false
  }
  for (const x of exclude) {
    const needle = x.toLowerCase()
    const asWord = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(needle)}`, 'u')
    if (texts.some((t) => asWord.test(t))) return false
  }
  return true
}

/**
 * Puts a parsed query back into text, for editing one part of it (removing a
 * filter chip). Terms and phrases keep their order; exclusions and filters follow.
 *
 * @param parsed - The structured query.
 * @returns Text that {@link parseQuery} reads back to the same structure.
 */
export function formatQuery(parsed: Omit<ParsedQuery, 'raw'>): string {
  const parts: string[] = []
  if (parsed.text.trim()) parts.push(parsed.text.trim())
  for (const p of parsed.phrases) parts.push(`"${p}"`)
  for (const x of parsed.exclude) parts.push(x.includes(' ') ? `-"${x}"` : `-${x}`)
  for (const f of parsed.filters) {
    const values = f.values.map((v) => (v.includes(' ') ? `"${v}"` : v)).join(',')
    parts.push(`${f.negate ? '-' : ''}${f.field}:${values}`)
  }
  return parts.join(' ')
}

/** A piece of text, marked when it matched a query term. */
export interface HighlightSegment {
  /** The text of this piece. */
  text: string
  /** Whether it matched. */
  hit: boolean
}

/**
 * Splits text into plain and matched segments so a UI can mark what matched:
 * each term matches at the start of a word, case-insensitively, longest terms
 * first. No terms yields one plain segment.
 *
 * @param text - The text to mark.
 * @param terms - The matched terms (a hit's `terms`).
 * @returns The segments, in order.
 */
export function highlightMatches(text: string, terms: string[]): HighlightSegment[] {
  const clean = terms.map((t) => t.trim()).filter((t) => t.length > 0)
  if (!text || !clean.length) return [{ text, hit: false }]
  const alternation = [...new Set(clean)]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${alternation})`, 'giu')
  const out: HighlightSegment[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    const start = (m.index ?? 0) + m[1].length
    if (start > last) out.push({ text: text.slice(last, start), hit: false })
    out.push({ text: m[2], hit: true })
    last = start + m[2].length
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false })
  return out
}

/**
 * Escapes a string for use inside a RegExp.
 *
 * @param s - Literal text.
 * @returns The text with metacharacters escaped.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
