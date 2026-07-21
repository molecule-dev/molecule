/**
 * Utility functions for MySQL operations.
 *
 * @module
 */

/**
 * Convert PostgreSQL-style positional placeholders ($1, $2, ...) to MySQL-style (?) placeholders.
 * Also reorders the values array to match the placeholder order — `$N` is *positional*
 * (`$2 … $1` or a repeated `$1`) while `?` is strictly *sequential*, so a plain text
 * substitution alone silently binds the wrong values for out-of-order placeholders and
 * under-supplies parameters for repeated ones. Mirrors the sqlite bond's converter.
 *
 * @param text - SQL query text with $N placeholders.
 * @param values - Parameter values ordered by $N index.
 * @returns The query text with ? placeholders and the reordered values.
 */
export const convertPlaceholders = (
  text: string,
  values?: unknown[],
): { text: string; values: unknown[] } => {
  if (!values || values.length === 0) {
    return { text: text.replace(/\$(\d+)/g, '?'), values: [] }
  }

  // SQL that already uses `?` placeholders (the store builds queries that way)
  // maps values 1:1 — pass them through. SQL with neither placeholder style
  // drops the (unused) values to avoid "too many parameters".
  if (!/\$\d+/.test(text)) {
    return { text, values: text.includes('?') ? values : [] }
  }

  const reorderedValues: unknown[] = []
  const convertedText = text.replace(/\$(\d+)/g, (_, num) => {
    const index = parseInt(num, 10) - 1
    reorderedValues.push(values[index])
    return '?'
  })

  return { text: convertedText, values: reorderedValues }
}

/** Safe index-prefix length for utf8mb4 (191*4=764 bytes; ≤4 cols stay < the 3072-byte key limit). */
const IDX_PREFIX = 191

/** Does this (already MySQL-translated) column type need a prefix length when indexed? */
const colNeedsPrefix = (type: string | undefined): boolean => {
  const t = (type || '').toUpperCase()
  if (/\b(TINYTEXT|TEXT|MEDIUMTEXT|LONGTEXT|BLOB)\b/.test(t)) return true
  const m = t.match(/VARCHAR\s*\(\s*(\d+)\s*\)/)
  return !!(m && parseInt(m[1], 10) > IDX_PREFIX)
}
const colIsJson = (type: string | undefined): boolean => /\bJSON\b/i.test(type || '')
const prefixColRef = (ref: string, types: Record<string, string>): string => {
  const m = ref.match(/^\s*"?(\w+)"?/)
  if (m && colNeedsPrefix(types[m[1]])) return ref.replace(/("?\w+"?)/, `$1(${IDX_PREFIX})`)
  return ref
}

/**
 * Translate PostgreSQL-dialect DDL to MySQL-compatible DDL at migration time.
 *
 * Resource/template setup migrations are authored in PostgreSQL dialect and the
 * migrator applies them raw. Unlike SQLite (lenient affinity), MySQL is strict —
 * it rejects Postgres types, functions, partial/functional/JSON indexes, and
 * over-long index keys. Run alongside `SET sql_mode='...,ANSI_QUOTES'` (so
 * `"identifiers"` parse) and `SET FOREIGN_KEY_CHECKS=0` (cross-table FKs created
 * out of order). Verified: all 56 resource setup migrations + the base tables
 * execute on MySQL 8 after this. Transforms:
 * - types: `uuid`→`CHAR(36)`, `timestamptz`→`TIMESTAMP`, `jsonb`→`JSON`.
 * - functions/casts: `DEFAULT gen_random_uuid()`→`DEFAULT (UUID())` (so bare
 *   create() inserts without an id still get one), strip `::type` casts, index
 *   `USING <method>`; `DEFAULT CURRENT_DATE/TIME`→`DEFAULT (expr)`.
 * - defaults: literal `DEFAULT` on TEXT/BLOB/JSON columns → `DEFAULT (expr)`.
 * - indexes: drop unsupported `IF NOT EXISTS`; add prefix lengths to TEXT/long-
 *   varchar indexed columns (inline UNIQUE moved to a prefixed table-level one);
 *   drop indexes on JSON columns and functional/expression indexes (unsupported
 *   without generated columns) — the resource layer's uniqueness still holds at
 *   the app level.
 *
 * @param sql - Raw migration SQL, possibly in Postgres dialect.
 * @returns MySQL-compatible SQL.
 */
export const translateDdlToMysql = (sql: string): string => {
  let s = sql
    .replace(/::[a-z_]+/gi, '')
    .replace(
      /\bCREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\b/gi,
      (_m, u) => `CREATE ${u ? 'UNIQUE ' : ''}INDEX`,
    )
    .replace(/\s+USING\s+(gin|btree|hash|gist)\b/gi, '')
    .replace(/\bUUID\b/gi, 'CHAR(36)')
    // gen_random_uuid() → (UUID()) AFTER the UUID→CHAR(36) pass, so the introduced
    // UUID() isn't itself rewritten to CHAR(36)(). MySQL 8.0.13+ allows (UUID()) as
    // an expression default. Must TRANSLATE, not strip: a custom handler using the
    // bare create('t', {…}) (no explicit id — the documented pattern) relies on the
    // column default; stripping left `id … NOT NULL` with no default → every such
    // insert hit `Field 'id' doesn't have a default value` / NOT NULL. Resource
    // handlers pass an explicit id that overrides it, so they were unaffected.
    .replace(/DEFAULT\s+gen_random_uuid\(\)/gi, 'DEFAULT (UUID())')
    .replace(/\bTIMESTAMPTZ\b/gi, 'TIMESTAMP')
    .replace(/\bJSONB\b/gi, 'JSON')
    .replace(/\bDEFAULT\s+(CURRENT_DATE|CURRENT_TIME)\b/gi, 'DEFAULT ($1)')
    .replace(
      /(\b(?:JSON|TEXT|BLOB|LONGTEXT|MEDIUMTEXT)\b[^,\n]*?\bDEFAULT\s+)('(?:[^']|'')*')/gi,
      '$1($2)',
    )

  const tableTypes: Record<string, Record<string, string>> = {}
  s = s.replace(
    /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?([\w-]+)"?\s*\(([\s\S]*?)\n\)/gi,
    (_full, tname: string, body: string) => {
      const types: Record<string, string> = {}
      const extra: string[] = []
      const lines = body.split('\n').map((line) => {
        if (/^\s*(PRIMARY|UNIQUE|FOREIGN|CONSTRAINT|CHECK|KEY|INDEX)\b/i.test(line)) return line
        const cm = line.match(/^\s*"?(\w+)"?\s+([A-Za-z]+(?:\s*\(\s*\d+(?:\s*,\s*\d+)?\s*\))?)/)
        let outLine = line
        if (cm) {
          types[cm[1]] = cm[2]
          if (/\bUNIQUE\b/i.test(outLine) && colNeedsPrefix(cm[2])) {
            extra.push(`  UNIQUE ("${cm[1]}"(${IDX_PREFIX}))`)
            outLine = outLine.replace(/\s+UNIQUE\b/i, '')
          }
          // Inline (column-level) `REFERENCES t(c) [ON DELETE …]` — Postgres
          // dialect all resource migrations author. MySQL PARSES BUT IGNORES
          // inline REFERENCES, so without this rewrite every foreign key
          // silently vanishes (no enforcement, no cascades). Hoist to a real
          // table-level FOREIGN KEY constraint.
          const fk = outLine.match(
            /\s+REFERENCES\s+"?(\w+)"?\s*\(\s*"?(\w+)"?\s*\)(\s+ON\s+DELETE\s+(?:CASCADE|SET NULL|RESTRICT|NO ACTION|SET DEFAULT))?(\s+ON\s+UPDATE\s+(?:CASCADE|SET NULL|RESTRICT|NO ACTION|SET DEFAULT))?/i,
          )
          if (fk) {
            extra.push(
              `  FOREIGN KEY ("${cm[1]}") REFERENCES "${fk[1]}" ("${fk[2]}")${fk[3] ?? ''}${fk[4] ?? ''}`,
            )
            outLine = outLine.replace(fk[0], '')
          }
        }
        return outLine
      })
      tableTypes[tname] = types
      let bodyOut = lines.join('\n').replace(
        /\bUNIQUE\s*\(([^)]*)\)/gi,
        (_mm, cols: string) =>
          `UNIQUE (${cols
            .split(',')
            .map((c) => prefixColRef(c, types))
            .join(', ')})`,
      )
      if (extra.length) bodyOut = bodyOut.replace(/\s*$/, '') + ',\n' + extra.join(',\n')
      return `CREATE TABLE IF NOT EXISTS "${tname}" (${bodyOut}\n)`
    },
  )

  s = s.replace(
    /CREATE\s+(UNIQUE\s+)?INDEX\s+"?([\w-]+)"?\s+ON\s+"?([\w-]+)"?\s*([^;]*);/gi,
    (full, uniq: string, idx: string, tbl: string, rest: string) => {
      const m = rest.match(/^\s*\(([\s\S]*?)\)/)
      if (!m) return full
      const colsRaw = m[1]
      if (/[A-Za-z_]\w*\s*\(/.test(colsRaw)) return '' // functional/expression index — drop
      const types = tableTypes[tbl] || {}
      const names = colsRaw.split(',').map((c) => (c.match(/"?(\w+)"?/) || [])[1])
      if (names.some((n) => colIsJson(types[n]))) return '' // MySQL can't index JSON directly
      const fixed = colsRaw
        .split(',')
        .map((c) => prefixColRef(c, types))
        .join(', ')
      return `CREATE ${uniq ? 'UNIQUE ' : ''}INDEX "${idx}" ON "${tbl}" (${fixed});`
    },
  )
  return s
}

/**
 * Coerce a JS value for binding via mysql2. mysql2 handles booleans, Dates, and
 * primitives, but a plain object/array bound to a JSON column throws
 * "Invalid JSON text" — so serialize objects/arrays to JSON text, and map
 * `undefined` to null.
 *
 * @param value - The value to bind.
 * @returns A mysql2-bindable value.
 */
export const coerceMysqlParam = (value: unknown): unknown => {
  if (value === undefined) return null
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date || value instanceof Uint8Array) return value
  return JSON.stringify(value)
}

/** Minimal shape of a mysql2 field used for read normalization. */
export interface MysqlFieldMeta {
  name: string
  type?: number
  columnLength?: number
}

/**
 * Normalize a MySQL result set so values round-trip like the Postgres bond:
 * a `BOOLEAN` column (stored as TINYINT(1)) comes back as 0/1 — convert to a JS
 * boolean. Detected via mysql2 field metadata: type 1 (TINY) with columnLength 1
 * (a plain TINYINT has columnLength 4, so it's left alone). JSON columns are
 * already auto-parsed by mysql2. Mutates rows in place.
 *
 * @param rows - Raw rows from the query.
 * @param fields - mysql2 field metadata for the result set.
 * @returns The normalized rows.
 */
export const normalizeMysqlRows = <T>(
  rows: Record<string, unknown>[],
  fields: readonly MysqlFieldMeta[] | undefined,
): T[] => {
  const boolCols = (fields ?? [])
    .filter((f) => f.type === 1 && f.columnLength === 1)
    .map((f) => f.name)
  if (boolCols.length === 0) return rows as T[]
  for (const row of rows) {
    for (const name of boolCols) {
      if (typeof row[name] === 'number') row[name] = row[name] !== 0
    }
  }
  return rows as T[]
}
