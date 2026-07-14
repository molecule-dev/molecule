/**
 * Password hashing provider using bcryptjs for molecule.dev.
 *
 * @remarks
 * bcrypt semantics a consumer must know (verified against the real bcryptjs):
 *
 * - **Only the first 72 BYTES of a password are read** — passwords sharing the same
 *   first 72 bytes compare equal (multi-byte UTF-8 hits the cap sooner). Don't prepend
 *   long app-controlled prefixes before hashing.
 * - `compare()` returns `false` (never throws) for a malformed/non-bcrypt stored hash —
 *   an empty or corrupted `passwordHash` column is indistinguishable from a wrong
 *   password by design (no user enumeration). It DOES throw `Illegal arguments` when
 *   passed `undefined`/`null` — that means a wiring bug (e.g. an OAuth-only account with
 *   no password hash), not a wrong password; guard those rows before calling.
 * - The default cost reads `SALT_ROUNDS`, clamped to 10–16: cost is EXPONENTIAL and
 *   bcryptjs accepts absurd values (32 = hours per hash, silently).
 *
 * @see https://www.npmjs.com/package/bcryptjs
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
