/**
 * Password hashing interface for molecule.dev.
 *
 * Defines the standard interface for password hashing providers.
 *
 * @remarks
 * Use {@link hash} and {@link compare} from the bonded provider — NEVER roll your own
 * password hashing.
 *
 * - **Bond first:** `setProvider(provider)` from `@molecule/api-password-bcrypt` at startup —
 *   `hash`/`compare` throw until a provider is bonded.
 * - Both are ASYNC — `await` them; a forgotten `await` makes `compare` a truthy Promise that
 *   lets every password in.
 *
 * - **Never store, log, or return a password OR its hash to the client.** Persist only the
 *   hash server-side; a login response returns a session/token, never the hash.
 * - **Compare with {@link compare}, never `===`.** It is a constant-time check via the bond
 *   (bcrypt); a plain string/hash equality is a timing oracle and won't even match a salted
 *   hash.
 * - Do not implement your own MD5/SHA/salt scheme, and never put a password in a URL, query
 *   string, or GET request (it lands in logs/history).
 * - `hash()` uses `SALT_ROUNDS` (default 12, env value clamped to 10–16) from config —
 *   don't hardcode a weaker cost. The cost is EXPONENTIAL (each +1 doubles the work), so
 *   an unclamped 32 would hang every signup for hours.
 * - **bcrypt only reads the first 72 BYTES of a password** — two passwords sharing the
 *   same first 72 bytes compare equal. Don't prepend a long app-controlled prefix (pepper,
 *   username) to the password before hashing, and don't reject long passphrases thinking
 *   extra length past ~72 bytes (fewer with multi-byte UTF-8) adds strength.
 *
 * @example
 * ```typescript
 * import { compare, hash, setProvider } from '@molecule/api-password'
 * import { provider as bcrypt } from '@molecule/api-password-bcrypt'
 *
 * // Startup: bond the hasher once (cost = SALT_ROUNDS env, default 12, clamped 10–16).
 * setProvider(bcrypt)
 *
 * // Sign-up: store ONLY the hash — never the password, never return the hash to a client.
 * const signupPassword = 'correct horse battery staple'
 * const passwordHash = await hash(signupPassword) // '$2b$12$…'
 *
 * // Log in: constant-time compare against the stored hash; never `===`.
 * const loginPassword = 'correct horse battery staple'
 * const ok = await compare(loginPassword, passwordHash) // true
 * // On false, answer a generic 401 "Invalid credentials." — don't reveal which field was wrong.
 * ```
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
