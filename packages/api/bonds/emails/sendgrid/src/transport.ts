/**
 * SendGrid mail client configuration.
 *
 * @module
 */

import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

/**
 * The configured SendGrid mail client.
 *
 * @see https://www.npmjs.com/package/@sendgrid/mail
 */
export const sgClient = sgMail
