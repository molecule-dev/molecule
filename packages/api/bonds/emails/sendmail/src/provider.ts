/**
 * Sendmail provider implementation.
 *
 * @module
 */

import type { EmailTransport } from '@molecule/api-emails'

import { sendMail } from './sendMail.js'

/**
 * The sendmail email provider implementing the standard interface.
 */
export const provider: EmailTransport = {
  sendMail,
}
