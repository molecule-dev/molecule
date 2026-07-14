/**
 * Sendmail email provider for molecule.dev.
 *
 * Uses the local sendmail command to send emails.
 *
 * Note: For this to work, your server must have `sendmail` installed and
 * configured. The binary path defaults to `/usr/sbin/sendmail`; set the
 * `SENDMAIL_PATH` environment variable to use a different binary (e.g.
 * `/usr/lib/sendmail`, or an msmtp/mhsendmail shim in containers). The path
 * is read once at module load.
 *
 * @remarks
 * On success, `sendMail()` resolves with `accepted` set to the envelope
 * recipients (sendmail queues the message for all of them once the binary
 * exits 0) and `response: 'Messages queued for delivery'`. Failures reject
 * with distinct errors: a missing binary is a `spawn ... ENOENT` error
 * (install sendmail or set `SENDMAIL_PATH`), a binary that exits non-zero is
 * `Sendmail exited with code <n>`, and an envelope address starting with `-`
 * is rejected up front with `Invalid envelope addresses.` (argument-injection
 * guard) — inspect the message/`code` to tell configuration problems apart
 * from delivery problems.
 *
 * The `accepted`-from-envelope mapping above exists because `@types/nodemailer`
 * declares `accepted`/`rejected`/`pending` on `SendmailTransport.SentMessageInfo`
 * (and `SESTransport.SentMessageInfo`), but nodemailer's actual sendmail (and
 * SES) transports never set them — only the SMTP transports do. Code written
 * against the typings type-checks cleanly and reads `undefined`/`[]` at
 * runtime. If you upgrade `nodemailer` or `@types/nodemailer`, re-verify this
 * against the transport implementations themselves
 * (`lib/sendmail-transport/index.js`), not the shipped `.d.ts` — the typings
 * are exactly what drifted last time.
 *
 * @see https://www.npmjs.com/package/nodemailer
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './sendMail.js'
export * from './transport.js'
export * from './types.js'
