/**
 * Password hashing interface for molecule.dev.
 *
 * Defines the standard interface for password hashing providers.
 *
 * @remarks
 * Use {@link hash} and {@link compare} from the bonded provider — NEVER roll your own
 * password hashing.
 *
 * - **Never store, log, or return a password OR its hash to the client.** Persist only the
 *   hash server-side; a login response returns a session/token, never the hash.
 * - **Compare with {@link compare}, never `===`.** It is a constant-time check via the bond
 *   (bcrypt); a plain string/hash equality is a timing oracle and won't even match a salted
 *   hash.
 * - Do not implement your own MD5/SHA/salt scheme, and never put a password in a URL, query
 *   string, or GET request (it lands in logs/history).
 * - `hash()` uses `SALT_ROUNDS` (default 12) from config — don't hardcode a weaker cost.
 *
 * @example
 * ```ts
 * import { hash, compare } from '@molecule/api-password'
 *
 * // Register: store ONLY the hash.
 * const passwordHash = await hash(req.body.password)
 * await createUser({ email, passwordHash })
 *
 * // Log in: constant-time compare; never `user.passwordHash === x`.
 * const ok = await compare(req.body.password, user.passwordHash)
 * if (!ok) return res.status(401).json({ error: 'Invalid credentials.' }) // don't reveal which field
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
