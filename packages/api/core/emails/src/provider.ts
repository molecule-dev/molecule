/**
 * Email transport bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-emails-nodemailer`) call `setTransport()`
 * during setup. Application code uses `sendMail()` from `email.ts` to send messages.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { EmailTransport } from './types.js'

const BOND_TYPE = 'email'

/**
 * Registers an email transport as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param transport - The email transport implementation to bond.
 */
export const setTransport = (transport: EmailTransport): void => {
  bond(BOND_TYPE, transport)
}

/**
 * Retrieves the bonded email transport, throwing if none is configured.
 *
 * @returns The bonded email transport.
 * @throws {Error} If no email transport has been bonded.
 */
export const getTransport = (): EmailTransport => {
  try {
    return bondRequire<EmailTransport>(BOND_TYPE)
  } catch {
    throw new Error(
      t('emails.error.noProvider', undefined, {
        defaultValue: 'Email transport not configured. Call setTransport() first.',
      }),
    )
  }
}

/**
 * Checks whether an email transport is currently bonded.
 *
 * @returns `true` if an email transport is bonded.
 */
export const hasTransport = (): boolean => {
  return isBonded(BOND_TYPE)
}
