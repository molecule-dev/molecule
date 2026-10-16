/**
 * Password provider implementation: the native `bcrypt` addon when it loads,
 * `bcryptjs` when it does not.
 *
 * @remarks
 * WHY BOTH, and why the cost factor is not the knob to turn.
 *
 * bcrypt's cost factor is what makes the hash expensive on purpose, so it is the
 * one thing that must not be lowered to buy speed — it is the defence, not the
 * overhead. What CAN change is where the work happens: bcryptjs is pure
 * JavaScript, so a cost-12 hash occupies the event loop for ~100 ms at a stretch
 * and every other request in the process waits behind it; the native addon runs
 * the same cost-12 computation on a libuv threadpool thread and leaves the loop
 * free. Measured at cost 12 on a pinned single CPU: bcryptjs stalls the loop
 * ~101 ms per hash (296 ms of accumulated delay for three concurrent signups)
 * against ~13 ms / 4 ms for the native addon — see this package's integration
 * suite.
 *
 * Loading is dynamic and cached. A native addon throws at import time when no
 * prebuild matches the platform, so a static import would make this bond
 * unloadable there; the dynamic import turns that into a fallback that keeps
 * hashing correct, and reports it on `console.warn` so the degradation is never
 * silent. Hashes are byte-compatible in both directions ($2b$, same cost), so a
 * process can switch between them without invalidating anything already stored.
 *
 * @see https://www.npmjs.com/package/bcrypt
 * @see https://www.npmjs.com/package/bcryptjs
 *
 * @module
 */

import bcryptjs from 'bcryptjs'

import type { PasswordProvider } from '@molecule/api-password'

/**
 * The subset of the native `bcrypt` module this provider delegates to.
 *
 * Declared structurally rather than taking the module's own types so that the
 * two implementations are interchangeable here by construction.
 */
export type NativeBcrypt = {
  /** Hashes a plain-text password at the given bcrypt cost. */
  hash(password: string, rounds: number): Promise<string>
  /** Checks a plain-text password against a stored bcrypt hash. */
  compare(password: string, passwordHash: string): Promise<boolean>
}

/**
 * The bcrypt cost factor for a call that passes none: the `SALT_ROUNDS`
 * environment variable, clamped to 10–16, defaulting to 12.
 *
 * The clamp is load-bearing: cost is EXPONENTIAL (each step doubles the work)
 * and bcrypt accepts absurd values without complaint, so a misread
 * `SALT_ROUNDS=32` would hang every signup for hours with no error output, and
 * `SALT_ROUNDS=4` would silently produce weak hashes.
 *
 * @returns The bcrypt cost factor to hash with.
 */
const envSaltRounds = (): number =>
  Math.min(Math.max(Number(process.env.SALT_ROUNDS) || 12, 10), 16)

let nativeLoad: Promise<NativeBcrypt | null> | undefined

/**
 * Resolves the native `bcrypt` module, or `null` when it cannot be loaded.
 *
 * Resolved once per process and cached, so the module load happens at most once
 * and every later call goes straight to the binding. A failure is reported on
 * `console.warn` exactly once, for the same reason: hashing silently dropping
 * from the threadpool back onto the event loop is a performance regression a
 * consumer must be able to see.
 *
 * @returns The native module to delegate to, or `null` to use bcryptjs.
 */
export const loadNativeBcrypt = (): Promise<NativeBcrypt | null> => {
  // try/catch rather than a rejection handler on the import: a missing prebuild
  // makes the module's own evaluation throw, and `node-gyp-build` reads the
  // binding through a getter, so the failure can surface either while resolving
  // the specifier or while touching the module object. Both are the same
  // condition — this platform has no usable addon — and both must fall back.
  nativeLoad ??= (async (): Promise<NativeBcrypt | null> => {
    try {
      const mod = await import('bcrypt')
      return mod.default ?? mod
    } catch (error) {
      // The error's MESSAGE, not the error object: this is a degradation notice
      // on a path that is expected on some platforms, and `console.warn(msg, err)`
      // prints a ten-frame Node-internals stack that reads as a crash in the
      // sandbox logs a coding agent is reading. The message is the diagnostic.
      console.warn(
        '@molecule/api-password-bcrypt: the native `bcrypt` addon did not load, so hashing fell ' +
          `back to bcryptjs (pure JS): ${error instanceof Error ? error.message : String(error)}. ` +
          'Hashes are identical ($2b$, same cost, same stored format), but each hash now blocks the ' +
          'event loop instead of running on a threadpool thread.',
      )
      return null
    }
  })()
  return nativeLoad
}

/**
 * Password provider backed by the native bcrypt addon, falling back to bcryptjs
 * when the addon cannot be loaded on this platform.
 */
export const provider: PasswordProvider = {
  async hash(password: string, saltRounds: number = envSaltRounds()): Promise<string> {
    const native = await loadNativeBcrypt()
    return native ? native.hash(password, saltRounds) : bcryptjs.hash(password, saltRounds)
  },

  async compare(password: string, passwordHash: string): Promise<boolean> {
    // Both implementations throw when the stored hash is missing — the caller
    // must be able to tell that apart from a wrong password — but they throw
    // their own library's message ('Illegal arguments' vs 'data and hash
    // arguments required'). Name the fault here so the error a consumer sees
    // does not depend on which implementation this process happened to load.
    if (typeof passwordHash !== 'string') {
      throw new TypeError(
        `compare() needs the stored hash as a string, received ${
          passwordHash === null ? 'null' : typeof passwordHash
        }. An account without a password (an OAuth-only row) has to be handled before calling ` +
          'compare() — this is a wiring bug, not a wrong password.',
      )
    }
    const native = await loadNativeBcrypt()
    return native
      ? native.compare(password, passwordHash)
      : bcryptjs.compare(password, passwordHash)
  },
}
