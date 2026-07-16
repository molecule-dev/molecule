/**
 * IMAP client wrapper for molecule.dev — fetches folders, lists messages,
 * fetches message bodies, marks read/unread, moves, and deletes. Used by
 * the `email-client` flagship app to render per-user mailboxes.
 *
 * Wraps the `imapflow` driver — this package is intentionally a single
 * utility, not an abstract core, because there is only one IMAP protocol;
 * provider variation is per-server config (host/port/auth), not per-bond.
 *
 * @example
 * ```ts
 * import { connectImap } from '@molecule/api-imap'
 *
 * const client = await connectImap({
 *   host: 'imap.gmail.com',
 *   port: 993,
 *   secure: true,
 *   auth: { user: 'me@example.com', accessToken: googleAccessToken },
 * })
 *
 * const folders = await client.listFolders()
 * await client.selectFolder('INBOX')
 *
 * const recent = await client.listMessages({ folder: 'INBOX', limit: 25 })
 * for (const summary of recent) {
 *   console.log(summary.uid, summary.subject, summary.flags)
 * }
 *
 * const full = await client.fetchMessage(recent[0].uid)
 * console.log(full.subject, full.text ?? full.html, full.attachments.length)
 *
 * await client.markRead(full.uid)
 * await client.disconnect()
 * ```
 *
 * @remarks
 * Locale bonds are intentionally not used — error messages on the thrown
 * {@link ImapError} are developer-facing English (handler-error pattern).
 * Consumers should map `error.code` to translated user-facing strings in
 * the calling handler.
 *
 * The wrapper exposes a small, stable surface; advanced `imapflow` features
 * (IDLE, mailbox locks, raw search/fetch) are intentionally not surfaced —
 * if you need them, drop down to `imapflow` directly.
 *
 * Network reality: IMAP is raw TLS/TCP (typically port 993) from the API
 * process to the mail host — it does NOT traverse HTTP_PROXY-style egress
 * proxies. In deployments with default-deny egress (e.g. molecule.dev
 * sandboxes, where only HTTP(S) via the egress proxy is permitted),
 * `connectImap` fails at connect with a timeout; direct outbound TCP to the
 * IMAP host must be allowed. Credential reality: Gmail and Microsoft reject
 * plain account passwords for IMAP — use an OAuth2 access token
 * (`auth: { user, accessToken }`, sent as XOAUTH2) or a provider-issued app
 * password. Credentials are per-call config; nothing is read from env vars.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './bodyStructure.js'
export * from './client.js'
export * from './driverTypes.js'
export * from './headers.js'
export * from './normalize.js'
export * from './types.js'
