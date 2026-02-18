/**
 * Sendmail nodemailer transport configuration.
 *
 * @module
 */

import nodemailer from 'nodemailer'

/**
 * The underlying nodemailer transport.
 *
 * @see https://www.npmjs.com/package/nodemailer
 */
export const nodemailerTransport = nodemailer.createTransport({
  sendmail: true,
  newline: `unix`,
  path: `/usr/sbin/sendmail`,
})

/**
 * Legacy export - the raw nodemailer transport.
 * @deprecated Use sendMail() or provider instead.
 */
export const transport = nodemailerTransport

/**
 * Legacy export - the raw nodemailer transport.
 * @deprecated Use sendMail() or provider instead.
 */
export const email = nodemailerTransport
