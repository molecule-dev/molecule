/**
 * SSL configuration derivation for Postgres connections.
 *
 * This is the single source of truth for *how* every `pg` client/pool in the
 * fleet decides whether (and how) to verify the database server's TLS
 * certificate. The pool (`index.ts`), the migrator (`migrator.ts`), the
 * superuser setup script (`setup/setup.ts`), and the scaffolded
 * `scripts/migrate.ts` / seed scripts all import `deriveSsl` from here so the
 * **secure default — verify the server certificate — lives in exactly one
 * place** and cannot drift back to a blanket `rejectUnauthorized: false`.
 *
 * @module
 */

import { readFileSync } from 'node:fs'

import { getLogger } from '@molecule/api-bond'
import type pg from 'pg'

/**
 * Returns `true` when the connection URL points at a local / explicitly
 * no-SSL Postgres, where TLS verification is neither possible nor meaningful.
 *
 * Recognizes loopback hosts, unix-socket URLs, and an explicit
 * `sslmode=disable` — the standard libpq opt-out. The latter lets a caller
 * reach a no-SSL Postgres over a private/non-localhost address (e.g. a sandbox
 * reaching the host DB via the docker bridge gateway, or the sandbox Postgres
 * at `172.17.0.1` which doesn't speak SSL) without us having to guess from the
 * host. Production URLs without it still default to verified SSL.
 *
 * @param url - The PostgreSQL connection URL.
 * @returns `true` if the URL points to a local or explicitly no-SSL database.
 */
export function isLocalUrl(url: string): boolean {
  return (
    url.includes('sslmode=disable') ||
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.startsWith('postgres:///') ||
    url.startsWith('postgresql:///')
  )
}

/**
 * One-shot guard so the "verification disabled" warning is emitted at most
 * once per process instead of on every connection.
 */
let warnedRelaxed = false

/**
 * Derive the `ssl` option for a `pg` connection from a database URL, **secure
 * by default**. The three-way rule (identical everywhere a pg client/pool is
 * created so the behaviour cannot drift):
 *
 * 1. **Local / explicit no-SSL** (`isLocalUrl`) → `false` (no TLS).
 * 2. **Private-CA managed provider** (`PGSSLROOTCERT` set) → verify against
 *    that CA bundle (`{ ca, rejectUnauthorized: true }`). Verification stays ON.
 * 3. **Remote, no explicit opt-out** → `true`: negotiate TLS and **verify the
 *    server certificate against the system CA store**. This is the default and
 *    closes the MITM hole that a blanket `rejectUnauthorized: false` opened.
 *
 * Verification is relaxed to `{ rejectUnauthorized: false }` **only** when the
 * operator explicitly asks — `DATABASE_SSL_REJECT_UNAUTHORIZED=false` or
 * `sslmode=no-verify` in the URL — and a loud warning is logged once, because
 * that mode is vulnerable to man-in-the-middle interception of credentials and
 * data. Operators behind a private CA should set `PGSSLROOTCERT` instead.
 *
 * @param databaseUrl - The Postgres connection URL.
 * @returns The `ssl` value for `pg.ClientConfig` / `pg.PoolConfig`.
 */
export function deriveSsl(databaseUrl: string): pg.ConnectionConfig['ssl'] {
  // (1) Local / explicit no-SSL: no TLS at all.
  if (isLocalUrl(databaseUrl)) {
    return false
  }

  // (2) Private-CA managed provider: verify against the operator-provided CA
  // bundle (PGSSLROOTCERT — the standard libpq variable) rather than disabling
  // verification. Verification stays ON.
  const caPath = process.env.PGSSLROOTCERT
  if (caPath) {
    try {
      return { ca: readFileSync(caPath, 'utf8'), rejectUnauthorized: true }
    } catch (error) {
      getLogger().error(
        `Could not read PGSSLROOTCERT (${caPath}); falling back to system CA verification.`,
        { error },
      )
    }
  }

  // Explicit, operator-acknowledged opt-out — relax verification ONLY when
  // asked. This is the MITM-exposed mode, so warn loudly (once per process).
  const optedOut =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false' ||
    databaseUrl.includes('sslmode=no-verify')
  if (optedOut) {
    if (!warnedRelaxed) {
      warnedRelaxed = true
      getLogger().warn(
        'Database TLS certificate verification is DISABLED ' +
          '(DATABASE_SSL_REJECT_UNAUTHORIZED=false or sslmode=no-verify). The ' +
          'connection is vulnerable to man-in-the-middle interception of the ' +
          'connection-string credentials and all query data. For a private-CA ' +
          'managed provider set PGSSLROOTCERT to the CA bundle instead of ' +
          'disabling verification.',
      )
    }
    return { rejectUnauthorized: false }
  }

  // (3) Secure default: verify the server certificate against the system CA store.
  return true
}
