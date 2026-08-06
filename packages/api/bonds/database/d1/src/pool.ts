/**
 * A `DatabasePool` backed by a Cloudflare D1 binding.
 *
 * This is the ONLY part of the SQLite stack D1 needs to replace. The dialect —
 * query building, placeholder conversion, row normalisation, id generation —
 * lives in `@molecule/api-database-sqlite`'s driver-free modules and is reused
 * verbatim, because D1 *is* SQLite. What differs is purely how a statement gets
 * executed: `better-sqlite3` is a synchronous native binding, D1 is an async
 * platform binding.
 *
 * @module
 */

import type { DatabaseConnection, DatabasePool, QueryResult } from '@molecule/api-database'
import { coerceSqliteParam, convertPlaceholders } from '@molecule/api-database-sqlite/utilities.js'

import type { D1Config, D1DatabaseLike } from './types.js'

/**
 * Runs one statement against D1 and normalises the result.
 *
 * @param database - The D1 binding.
 * @param text - SQL with `$1`-style placeholders (converted to `?` for SQLite).
 * @param values - Ordinal parameter values.
 * @returns The rows and affected-row count.
 */
async function runQuery<T>(
  database: D1DatabaseLike,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  // Handles all three shapes the shared store emits: `$N` (reordering values to
  // match), bare `?` (values pass through 1:1), and no placeholders at all
  // (values dropped, so D1 does not reject the statement for extra params).
  const converted = convertPlaceholders(text, values)
  const bound = database.prepare(converted.text).bind(...converted.values.map(coerceSqliteParam))
  const result = await bound.all<T>()
  const rows = result.results ?? []
  return {
    rows,
    // D1 reports `changes` only for writes. Falling back to the row count keeps
    // `rowCount` meaningful for reads, matching what the other pools return.
    rowCount: result.meta?.changes ?? rows.length,
  }
}

/**
 * Creates a `DatabasePool` over a Cloudflare D1 binding.
 *
 * @param config - The D1 binding to use.
 * @returns A pool the shared SQLite store can run against.
 */
export const createPool = (config: D1Config): DatabasePool => {
  const { database } = config
  if (!database || typeof database.prepare !== 'function') {
    // Fail here, loudly, rather than at the first query. A missing binding is a
    // wrangler configuration mistake, and the error it would otherwise produce
    // ("cannot read properties of undefined") names nothing useful.
    throw new Error(
      'D1 provider: `database` must be a D1 binding (e.g. env.DB). ' +
        'Bindings arrive per-invocation on `env` — pass it in when wiring the bond.',
    )
  }

  const query = <T = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> => runQuery<T>(database, text, values)

  const connection: DatabaseConnection = {
    query,
    // D1 has no checked-out connections; a release is a no-op rather than an
    // error, so pooling-shaped calling code keeps working unchanged.
    release: () => undefined,
  }

  return {
    query,
    connect: async () => connection,
    // `transaction` is deliberately NOT implemented. D1 has no interactive
    // transactions — only `batch()`, which is a single atomic set of statements
    // decided up front. An implementation that pretended otherwise would report
    // success for a rollback that never happened, so the capability is absent
    // and callers can detect that (`pool.transaction === undefined`) instead of
    // being silently lied to.
    end: async () => undefined,
  }
}
