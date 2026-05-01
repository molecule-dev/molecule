/**
 * Read-only SQL keyword sniff used by {@link RemoteDb.runQuery} when the
 * connection was opened with `readonly: true`.
 *
 * This is a defence-in-depth check, NOT a substitute for the database
 * engine's own permissions. Production deployments should ALSO connect
 * with a read-only DB role; the sniff catches accidental mutations from
 * trusted callers and rejects them at the application layer with a
 * machine-readable error.
 *
 * @module
 */

/**
 * SQL leading verbs that mutate state — checked at the start of the
 * (whitespace-stripped, comment-stripped) query string. The list covers
 * the standard DML verbs plus the common DDL / privilege verbs across
 * Postgres, MySQL, and SQLite.
 *
 * If the query starts with anything in this set, {@link isMutating}
 * returns `true`.
 */
const MUTATING_VERBS = new Set<string>([
  'INSERT',
  'UPDATE',
  'DELETE',
  'REPLACE',
  'MERGE',
  'TRUNCATE',
  'CREATE',
  'DROP',
  'ALTER',
  'RENAME',
  'GRANT',
  'REVOKE',
  'CALL',
  'EXEC',
  'EXECUTE',
  'COPY',
  'LOAD',
  'IMPORT',
  'ATTACH',
  'DETACH',
  'VACUUM',
  'REINDEX',
  'CLUSTER',
  'COMMENT',
  'LOCK',
  'NOTIFY',
])

/**
 * Strip leading SQL block comments and line comments (`-- …`) so that
 * callers can't smuggle a mutating verb past the sniff with a comment
 * prefix.
 *
 * @param sql - Raw SQL text supplied to `runQuery`.
 * @returns The SQL with leading comments + whitespace removed.
 * @internal
 */
function stripLeadingCommentsAndWhitespace(sql: string): string {
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1
      continue
    }
    if (ch === '-' && sql[i + 1] === '-') {
      const newline = sql.indexOf('\n', i + 2)
      if (newline === -1) return ''
      i = newline + 1
      continue
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      if (end === -1) return ''
      i = end + 2
      continue
    }
    break
  }
  return sql.slice(i)
}

/**
 * Returns `true` if the supplied SQL string mutates state under the
 * read-only sniff. Whitespace and SQL comments are stripped before the
 * leading verb is matched.
 *
 * The sniff is conservative — anything that isn't a recognized read-only
 * verb (`SELECT`, `WITH`, `EXPLAIN`, `SHOW`, `DESCRIBE`, `DESC`, `PRAGMA`)
 * starting the query is treated as mutating.
 *
 * @param sql - Raw SQL text supplied to `runQuery`.
 * @returns `true` if the query is rejected in `readonly` mode.
 */
export function isMutating(sql: string): boolean {
  const stripped = stripLeadingCommentsAndWhitespace(sql)
  if (stripped.length === 0) return false
  const match = /^[A-Za-z_]+/.exec(stripped)
  if (!match) return false
  const verb = match[0].toUpperCase()
  if (MUTATING_VERBS.has(verb)) return true
  // Anything that isn't an explicitly-allowed read verb is treated as
  // mutating. Keeping this list small is safer than enumerating mutators.
  const READ_VERBS = new Set([
    'SELECT',
    'WITH',
    'EXPLAIN',
    'SHOW',
    'DESCRIBE',
    'DESC',
    'PRAGMA',
    'VALUES',
    'TABLE',
  ])
  return !READ_VERBS.has(verb)
}
