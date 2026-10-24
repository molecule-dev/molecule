/**
 * The slice of SQL masking this bond needs to see a real `CREATE UNIQUE INDEX`
 * statement rather than the same words inside a comment or a string literal.
 *
 * It lives in the bond because refusing (or translating) a construct IS the
 * bond's responsibility: this provider has no partial indexes, and rebuilding a
 * UNIQUE partial index from its column list would enforce uniqueness on every
 * row. The general question — which constructs a selection needs and whether the
 * selected provider supports them — is compilation work shared by every harness
 * (`mlcl/src/lib/sql-requirements.ts`), not this module's job.
 *
 * @module
 */

/** One UNIQUE index this provider cannot reproduce as written. */
export interface UniquePartialIndex {
  /** The exact predicate, e.g. `WHERE "isDefault" = true`. */
  detail: string
  /** The whole statement, trimmed, for diagnostics. */
  statement: string
}

/** `CREATE [UNIQUE] INDEX [IF NOT EXISTS] <name> ON <table> <rest>;`. */
const CREATE_INDEX =
  /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w-]+)"?\s+ON\s+"?([\w-]+)"?\s*([^;]*);/gi

/**
 * Replace comment and string-literal CONTENT with spaces, keeping every offset
 * (and every double-quoted identifier) in place.
 *
 * Keyword scanning then cannot be fooled by text inside a comment or a literal,
 * while a slice taken from the mask still addresses the same characters in the
 * original.
 *
 * @param text - The SQL text to mask.
 * @returns A same-length string safe for keyword scanning.
 */
const maskSql = (text: string): string => {
  let masked = ''
  let index = 0
  const length = text.length
  while (index < length) {
    const char = text[index]
    if (char === '-' && text[index + 1] === '-') {
      while (index < length && text[index] !== '\n') {
        masked += ' '
        index++
      }
      continue
    }
    if (char === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2)
      const end = close < 0 ? length : close + 2
      masked += ' '.repeat(end - index)
      index = end
      continue
    }
    if (char === "'") {
      masked += ' '
      index++
      while (index < length) {
        if (text[index] === '\\') {
          masked += '  '
          index += 2
          continue
        }
        if (text[index] === "'" && text[index + 1] === "'") {
          masked += '  '
          index += 2
          continue
        }
        if (text[index] === "'") {
          masked += ' '
          index++
          break
        }
        masked += ' '
        index++
      }
      continue
    }
    if (char === '#' && text[index + 1] !== undefined) {
      // MySQL's other line-comment form.
      while (index < length && text[index] !== '\n') {
        masked += ' '
        index++
      }
      continue
    }
    masked += char
    index++
  }
  return masked
}

/**
 * Find the first UNIQUE index with a `WHERE` clause.
 *
 * A construct inside a comment or a string literal is ignored — it carries no
 * constraint — while the detail and statement are sliced from the ORIGINAL text,
 * so the author's casing and quoting survive into the refusal. A UNIQUE index
 * with no predicate is not returned: MySQL enforces it exactly as written.
 *
 * @param sql - The migration SQL.
 * @returns The refused index, or null when none is present.
 */
export const findUniquePartialIndex = (sql: string): UniquePartialIndex | null => {
  const masked = maskSql(sql)
  const pattern = new RegExp(CREATE_INDEX.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = pattern.exec(masked))) {
    if (!match[1]) continue
    const rest = match[4] ?? ''
    const where = /\bWHERE\b/i.exec(rest)
    if (!where) continue
    const restStart = match.index + match[0].length - 1 - rest.length
    const statementEnd = match.index + match[0].length
    const predicateStart = restStart + where.index + where[0].length
    const predicate = sql
      .slice(predicateStart, statementEnd - 1)
      .trim()
      .replace(/\s+/g, ' ')
    return {
      detail: `WHERE ${predicate}`,
      statement: sql.slice(match.index, statementEnd).trim(),
    }
  }
  return null
}
