/**
 * Sendmail email provider for molecule.dev.
 *
 * Uses the local sendmail command to send emails.
 *
 * Note: For this to work, your server must have `sendmail` installed and configured.
 *
 * @see https://www.npmjs.com/package/nodemailer
 *
 * @module
 */

export * from './provider.js'
export * from './sendMail.js'
export * from './transport.js'
export * from './types.js'
