/**
 * Sendmail nodemailer transport configuration.
 *
 * @module
 */

import nodemailer from 'nodemailer'

/**
 * The underlying nodemailer transport.
 *
 * The sendmail binary path defaults to `/usr/sbin/sendmail` and can be
 * overridden with the `SENDMAIL_PATH` environment variable (e.g.
 * `/usr/lib/sendmail`, or an msmtp/mhsendmail shim in containers and tests).
 * The path is read once at module load; if the binary is missing, sends fail
 * with a `spawn ... ENOENT` error at send time — install sendmail or point
 * `SENDMAIL_PATH` at a compatible binary.
 *
 * @see https://www.npmjs.com/package/nodemailer
 */
export const nodemailerTransport = nodemailer.createTransport({
  sendmail: true,
  newline: `unix`,
  path: process.env.SENDMAIL_PATH || `/usr/sbin/sendmail`,
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
