/**
 * Minimal ambient type declarations for the native `bcrypt` module.
 *
 * `bcrypt` compiles an N-API binding and ships prebuilt binaries, but no
 * TypeScript definitions of its own — and the DefinitelyTyped package tracks the
 * runtime only loosely. Declaring the subset this provider actually calls keeps
 * the two honest: `hash` and `compare`, both promise-returning, which is the
 * whole of what the `PasswordProvider` contract needs from it.
 *
 * This mirrors the React Native bonds' own `*.d.ts` shims; the real module is
 * what runs.
 *
 * @module
 */

declare module 'bcrypt' {
  /** The subset of the native `bcrypt` module used by this package. */
  interface BcryptNative {
    /**
     * Hashes `password` with `rounds` cost and a fresh random salt.
     *
     * @param password - The plain-text password.
     * @param rounds - The bcrypt cost factor.
     * @returns The `$2b$`-prefixed hash.
     */
    hash(password: string, rounds: number): Promise<string>

    /**
     * Checks `password` against a stored bcrypt hash.
     *
     * @param password - The plain-text password.
     * @param hash - The stored hash to compare against.
     * @returns Whether the password matches.
     */
    compare(password: string, hash: string): Promise<boolean>
  }

  const bcrypt: BcryptNative
  export default bcrypt

  export function hash(password: string, rounds: number): Promise<string>
  export function compare(password: string, hash: string): Promise<boolean>
}
