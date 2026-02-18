/**
 * Type definitions for password core interface.
 *
 * @module
 */

/**
 * Password provider interface.
 *
 * All password providers must implement this interface.
 */
export interface PasswordProvider {
  /**
   * Hashes a plain-text password.
   *
   * @param password - The plain-text password to hash
   * @param saltRounds - Number of salt rounds (cost factor)
   * @returns The hashed password string
   */
  hash(password: string, saltRounds?: number): Promise<string>

  /**
   * Compares a plain-text password against a hash.
   *
   * @param password - The plain-text password to check
   * @param passwordHash - The hash to compare against
   * @returns true if the password matches the hash
   */
  compare(password: string, passwordHash: string): Promise<boolean>
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /** Password hashing environment variables. */
    export interface ProcessEnv {
      SALT_ROUNDS?: string
    }
  }
}
