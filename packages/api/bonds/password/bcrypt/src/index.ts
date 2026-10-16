/**
 * Password hashing provider for molecule.dev — the native `bcrypt` addon, with
 * `bcryptjs` as the fallback when the addon cannot be loaded.
 *
 * @remarks
 * Both implementations produce and verify the same `$2b$` hashes at the same
 * cost factor, so stored hashes do not care which one wrote them and a process
 * can switch between them freely.
 *
 * Which one runs matters for Latency, not for security. bcryptjs is pure
 * JavaScript, so a cost-12 hash holds the event loop for ~100 ms at a stretch
 * and every other request waits behind it; the native addon runs the identical
 * cost-12 computation on a libuv threadpool thread. Measured at cost 12 with the
 * CPU pinned to one core: ~101 ms of event-loop stall per bcryptjs hash, and
 * ~296 ms of accumulated delay across three concurrent signups, against ~13 ms
 * and ~4 ms for the native addon. The cost factor is deliberately identical —
 * lowering it would trade the protection for the speed.
 *
 * bcrypt semantics a consumer must know (identical in both implementations):
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
 *   bcrypt accepts absurd values (32 = hours per hash, silently).
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-password'
 * import { provider } from '@molecule/api-password-bcrypt'
 *
 * setProvider(provider) // cost reads SALT_ROUNDS (default 12, clamped 10-16)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
