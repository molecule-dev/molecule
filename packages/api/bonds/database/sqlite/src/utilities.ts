/**
 * Utility functions for SQLite operations.
 *
 * @module
 */

/** The `$N` placeholders a statement names, as numbers, in the order they appear. */
const namedPlaceholderIndexes = (text: string): number[] =>
  [...text.matchAll(/\$(\d+)/g)].map((match) => parseInt(match[1], 10))

/**
 * Convert PostgreSQL-style positional placeholders ($1, $2, ...) to SQLite-style (?) placeholders.
 * Also reorders values array to match the placeholder order.
 *
 * A statement whose placeholders and values disagree is REFUSED, with the same
 * contract PostgreSQL enforces at bind time (`bind message supplies 3 parameters,
 * but prepared statement "" requires 2`). This converter is the only place that
 * sees both the SQL text and the values, and without the check a `$N` numbering
 * slip — a list numbered from the loop index that restarts at `$1` and collides
 * with a `$1` already in the statement, leaving a supplied value with no
 * placeholder — returns WRONG ROWS with no error at all. Postgres rejects the
 * same call outright, so an app developed on this bond (every scaffold's default)
 * otherwise carries a class of bug only its production database would name.
 *
 * @param text - SQL query text with $N placeholders.
 * @param values - Parameter values ordered by $N index.
 * @returns The query text with ? placeholders and reordered values.
 * @throws {Error} When a `$N` has no value, or a supplied value has no `$N`.
 */
export const convertPlaceholders = (
  text: string,
  values?: unknown[],
): { text: string; values: unknown[] } => {
  if (!values || values.length === 0) {
    return { text: text.replace(/\$(\d+)/g, '?'), values: [] }
  }

  // SQL that has no $N but uses `?` placeholders (the store builds queries that
  // way) maps values 1:1 — pass them through. Without this, `?`-style queries
  // with values lost every value (the $N replace never fired), so `stmt.run()`
  // got zero params → "Too few parameter values were provided". SQL with neither
  // placeholder style drops the (unused) values to avoid "too many parameters".
  if (!/\$\d+/.test(text)) {
    return { text, values: text.includes('?') ? values : [] }
  }

  // The bound list used to be built from the placeholders the SQL NAMES and never
  // checked against the values it was GIVEN, so a value with no `$N` was dropped in
  // silence and a `$N` with no value bound `undefined` (→ NULL) in silence. X0
  // flash-m88 §+07:07 lost 2 min 54 s to exactly that: `ids.map((_, i) => `$${i + 1}`)`
  // restarted at `$1`, so `"resourceId" IN ($1)` collided with `"resourceType" = $1`
  // — three values, two placeholders, one value never read, and the query returned
  // the wrong rows without a word.

  // A `$N` no value can fill: `N > values.length` (no such entry was supplied)
  // or `N < 1` (placeholders are $1-based, so `values[-1]` is undefined). Both
  // used to bind NULL — `undefined` — in silence.
  const named = namedPlaceholderIndexes(text)
  const unbound = [...new Set(named.filter((index) => index < 1 || index > values.length))].sort(
    (a, b) => a - b,
  )
  if (unbound.length > 0) {
    const because =
      unbound[0] < 1 ? 'placeholders are $1-based' : 'every $N placeholder needs a matching value'
    throw new Error(
      `bind message supplies ${values.length} parameters, but the SQL names ${unbound
        .map((index) => `$${index}`)
        .join(', ')} with no value — ${because}. SQL: ${text}`,
    )
  }

  // Values the SQL names no placeholder for: they used to be dropped in silence.
  // `maxIndex` is the number of values the statement needs, which is what the
  // Postgres bind error reports as `requires`.
  const maxIndex = Math.max(...named)
  if (values.length > maxIndex) {
    const unused = Array.from({ length: values.length - maxIndex }, (_, i) => maxIndex + i + 1)
    const list = unused.map((position) => `value ${position}`).join(', ')
    throw new Error(
      `bind message supplies ${values.length} parameters, but the statement requires only ${maxIndex} — ${list} ${unused.length === 1 ? 'has' : 'have'} no $N placeholder. SQL: ${text}`,
    )
  }

  const reorderedValues: unknown[] = []
  const convertedText = text.replace(/\$(\d+)/g, (_, num) => {
    const index = parseInt(num, 10) - 1
    reorderedValues.push(values[index])
    return '?'
  })

  return { text: convertedText, values: reorderedValues }
}

/**
 * The SQLite expression for "the current instant, ISO-8601 UTC with milliseconds"
 * — `2026-10-16T01:22:21.416Z`, exactly the text `Date.prototype.toISOString()`
 * produces for the instant the postgres/mysql bonds hand back as a `Date`, so a
 * stored value round-trips through `new Date(value)` unchanged and two
 * timestamps compare as strings in time order (SQLite's own
 * `CURRENT_TIMESTAMP`/`datetime('now')` are UTC but space-separated,
 * un-suffixed and whole-second — see `translateDdlToSqlite`).
 */
const SQLITE_ISO_NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`

/**
 * Translate PostgreSQL-dialect DDL to SQLite-compatible DDL at migration time.
 *
 * Resource/template setup migrations are authored in PostgreSQL dialect, but a
 * SQLite project applies them raw via the migrator's `db.exec()`. SQLite
 * tolerates Postgres *type* names through affinity (`uuid`, `timestamptz`,
 * `jsonb`, `boolean`), but it rejects Postgres *function/cast/index* SYNTAX,
 * which raises `near "(": syntax error` and aborts the whole migration. This
 * rewrites the handful of constructs that actually appear across the resource
 * library so those migrations apply on SQLite:
 *
 * - `DEFAULT gen_random_uuid()` → `DEFAULT (lower(hex(randomblob(16))))`, the
 *   SQLite equivalent random-id default. Resource handlers set `id = id || uuid()`
 *   so they don't need it, but a custom handler using the bare `create('t', {…})`
 *   (no explicit id — the documented pattern) DOES rely on the column default;
 *   stripping it left `id … NOT NULL` with no default, so every such insert hit
 *   `NOT NULL constraint failed: t.id`. Translating (not stripping) keeps both
 *   paths working: resource handlers pass an id that overrides the default, custom
 *   handlers get one generated.
 * - `now()` / `NOW()`, and a literal `DEFAULT CURRENT_TIMESTAMP` (either case —
 *   the form 831 of the template migrations use), →
 *   `DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))`: ISO-8601, UTC, milliseconds.
 *   Those defaults previously became SQLite's `current_timestamp`, whose
 *   `YYYY-MM-DD HH:MM:SS` has no `T`/`Z` and only whole seconds. `new Date(value)`
 *   parses a space-separated string as LOCAL time (so every stored timestamp read
 *   back hours off), and two rows written in the same second were byte-identical
 *   strings, so "newest first" returned them in arbitrary order. `strftime` is
 *   evaluated per insert, and a column the caller writes explicitly is untouched.
 * - `::type` casts (e.g. `'{}'::jsonb`) → removed (Postgres-only syntax).
 * - `USING <method>` on an index (`gin`/`btree`/`hash`/`gist`) → removed
 *   (SQLite indexes have no access method).
 * - `ADD COLUMN IF NOT EXISTS` → `ADD COLUMN` (SQLite has no such clause, and the
 *   whole boot failed on it). The migrator honors the clause itself — it drops the
 *   statement when the column is already there (see `dropSatisfiedAddColumns`), so
 *   what reaches here is a column that is genuinely missing; the rewrite is what
 *   keeps that statement parseable.
 * - `DROP COLUMN IF EXISTS` → `DROP COLUMN` for the same reason, honored the same
 *   way: the migrator drops the statement when the table has no such column (the
 *   no-op Postgres sees — see `dropSatisfiedDropColumns`), so what reaches here is
 *   a column that genuinely exists and whose removal SQLite parses. SQLite has no
 *   `DROP COLUMN IF EXISTS` at all (`near "EXISTS": syntax error`), and a migration
 *   an agent wrote to repair its DEV database fails on the FRESH production one
 *   without this (X1 flash-m103).
 *
 * These are no-ops on already-SQLite DDL (the executor's own migrations don't use
 * them), so it is safe to run on every migration file.
 *
 * @param sql - Raw migration SQL, possibly in Postgres dialect.
 * @returns SQLite-compatible SQL.
 */
export const translateDdlToSqlite = (sql: string): string =>
  sql
    .replace(/DEFAULT\s+gen_random_uuid\(\)/gi, 'DEFAULT (lower(hex(randomblob(16))))')
    .replace(/\bnow\(\)/gi, SQLITE_ISO_NOW)
    .replace(/DEFAULT\s+current_timestamp\b/gi, `DEFAULT ${SQLITE_ISO_NOW}`)
    .replace(/::[a-z_]+/gi, '')
    .replace(/\s+USING\s+(gin|btree|hash|gist)\b/gi, '')
    .replace(/\bADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/gi, 'ADD COLUMN')
    .replace(/\bDROP\s+COLUMN\s+IF\s+EXISTS\b/gi, 'DROP COLUMN')

/**
 * Coerce a JS value into something better-sqlite3 can bind. better-sqlite3 only
 * accepts numbers, strings, bigints, buffers, and null — a JS boolean, plain
 * object, array, `undefined`, or `Date` throws at bind time, which would crash
 * every `create()`/`update()` that passes a `boolean` or `jsonb` value (e.g.
 * `users.twoFactorEnabled`, `projects.packages`). Mirrors what the Postgres
 * driver accepts: booleans → 0/1, objects/arrays → JSON text, Date → ISO string,
 * `undefined` → null.
 *
 * @param value - The value to bind.
 * @returns A better-sqlite3-bindable primitive.
 */
export const coerceSqliteParam = (value: unknown): unknown => {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'string')
    return value
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Uint8Array) return value // covers Buffer
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

/** Minimal shape of better-sqlite3's `Statement.columns()` entries we use. */
export interface SqliteColumnMeta {
  name: string
  type: string | null
}

/**
 * Normalize a SQLite result set back to JS types using the declared column types,
 * so values round-trip like the Postgres bond instead of leaking SQLite's storage
 * form: a `BOOLEAN` column's 0/1 → boolean, a `JSON`/`JSONB` column's text →
 * parsed value. Columns with an unknown/expression type (null) and values that
 * aren't in storage form pass through untouched. Mutates rows in place for speed.
 *
 * @param rows - Raw rows from `stmt.all()`.
 * @param columns - `stmt.columns()` metadata for the result set.
 * @returns The normalized rows.
 */
export const normalizeSqliteRows = <T>(
  rows: Record<string, unknown>[],
  columns: SqliteColumnMeta[],
): T[] => {
  const boolCols: string[] = []
  const jsonCols: string[] = []
  for (const c of columns) {
    const t = (c.type ?? '').toUpperCase()
    if (t === 'BOOLEAN' || t === 'BOOL') boolCols.push(c.name)
    else if (t === 'JSON' || t === 'JSONB') jsonCols.push(c.name)
  }
  if (boolCols.length === 0 && jsonCols.length === 0) return rows as T[]
  for (const row of rows) {
    for (const name of boolCols) {
      if (typeof row[name] === 'number') row[name] = row[name] !== 0
    }
    for (const name of jsonCols) {
      if (typeof row[name] === 'string') {
        try {
          row[name] = JSON.parse(row[name] as string)
        } catch (_error) {
          // leave the raw string if it isn't valid JSON
        }
      }
    }
  }
  return rows as T[]
}
