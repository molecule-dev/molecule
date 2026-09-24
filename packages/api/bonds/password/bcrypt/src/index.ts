/**
 * Password hashing provider using bcryptjs for molecule.dev.
 *
 * @example
 * ```typescript
 * import { compare, hash, setProvider } from '@molecule/api-password'
 * import { provider as bcrypt } from '@molecule/api-password-bcrypt'
 *
 * // Startup: bond once. Optional env SALT_ROUNDS (cost factor, clamped to 10–16, default 12).
 * setProvider(bcrypt)
 *
 * // Sign-up: store ONLY the hash (a `$2…` string that embeds its own salt and cost).
 * const passwordHash = await hash('correct horse battery staple')
 *
 * // Log-in: compare the submitted password against the stored hash.
 * const ok = await compare('correct horse battery staple', passwordHash) // true
 * const wrong = await compare('Tr0ub4dor&3', passwordHash) // false
 * console.log(ok, wrong)
 * ```
 *
 * @remarks
 * - **Bond with `setProvider(provider)` and call the core's `hash` /
 *   `compare`** — there is no `verify()` and no separate salt to store.
 *   `hash()` is async and salts internally; never compare hashes with `===`.
 *
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
 *   bcryptjs accepts absurd values (32 = hours per hash, silently). An EXPLICIT
 *   `hash(password, saltRounds)` argument is NOT clamped.
 *
 * @see https://www.npmjs.com/package/bcryptjs
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
