/**
 * Password provider implementation using bcryptjs.
 *
 * @see https://www.npmjs.com/package/bcryptjs
 *
 * @module
 */

import bcrypt from 'bcryptjs'

import type { PasswordProvider } from '@molecule/api-password'

/**
 * Password provider backed by the bcryptjs library.
 */
export const provider: PasswordProvider = {
  async hash(
    password: string,
    saltRounds: number = Number(process.env.SALT_ROUNDS) || 10,
  ): Promise<string> {
    return bcrypt.hash(password, saltRounds)
  },

  async compare(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash)
  },
}
