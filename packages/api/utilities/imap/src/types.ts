/**
 * Public types for the `@molecule/api-imap` utility — config shape, opaque
 * client interface, and the normalized message / attachment / address shapes
 * returned by the client. Implementation-specific fields from the underlying
 * `imapflow` driver are NOT exposed.
 *
 * @module
 */

/**
 * Authentication strategies for an IMAP connection.
 *
 * Either a username + password pair (most common — IMAP servers, app
 * passwords, etc.) or a username + OAuth2 access token (XOAUTH2 — used by
 * Gmail, Outlook 365, and other major providers when basic auth is disabled).
 */
export type ImapAuth = { user: string; pass: string } | { user: string; accessToken: string }

/**
 * Configuration for {@link connectImap}. All TLS and host details are passed
 * straight through to the underlying `imapflow` driver — callers should set
 * `secure: true` for implicit-TLS ports (993) and `secure: false` for
 * STARTTLS-on-143.
 */
export interface ImapConfig {
  /** IMAP server hostname (e.g. `imap.gmail.com`). */
  host: string
  /** IMAP server port (993 implicit-TLS, 143 STARTTLS, etc.). */
  port: number
  /** When `true` (default for 993), use implicit TLS from the first byte. */
  secure?: boolean
  /** Authentication credentials — password or OAuth2 access token. */
  auth: ImapAuth
  /** Optional TLS overrides — e.g. `{ rejectUnauthorized: false }` for self-signed dev servers. */
  tls?: {
    rejectUnauthorized?: boolean
  }
}

/**
 * A normalized IMAP folder / mailbox entry returned by
 * {@link ImapClient.listFolders}.
 */
export interface ImapFolder {
  /** Server-supplied path (delimiter-separated, e.g. `INBOX/Travel`). */
  path: string
  /** Last segment of `path` for display. */
  name: string
  /** Hierarchy delimiter the server uses (typically `/` or `.`). */
  delimiter: string
  /**
   * Special-use attribute if the server reports one (`\Inbox`, `\Sent`,
   * `\Drafts`, `\Trash`, `\Junk`, `\Archive`, `\All`, `\Flagged`).
   */
  specialUse?: string
  /** `true` if this folder can be selected with {@link ImapClient.selectFolder}. */
  subscribed: boolean
}

/**
 * A parsed IMAP envelope address — display name + RFC 5322 mailbox.
 */
export interface ImapAddress {
  /** Display name (e.g. `"Jane Doe"`) or `undefined` if absent. */
  name?: string
  /** Mailbox in `local@domain` form. */
  address: string
}

/**
 * Compact summary of a message, returned by {@link ImapClient.listMessages}.
 * Does NOT include body / html / attachments — call
 * {@link ImapClient.fetchMessage} for those.
 */
export interface MessageSummary {
  /** Server-assigned UID (stable within a folder). */
  uid: number
  /** From: addresses (envelope). */
  from: ImapAddress[]
  /** To: addresses (envelope). */
  to: ImapAddress[]
  /** Subject — empty string if the server returned none. */
  subject: string
  /** Internal date the server stamped the message with. */
  date: Date
  /** `true` if BODYSTRUCTURE indicates at least one non-inline attachment. */
  hasAttachments: boolean
  /**
   * IMAP flags currently set on the message (e.g. `\Seen`, `\Flagged`,
   * `\Answered`). Backslash prefixes are preserved verbatim.
   */
  flags: string[]
}

/**
 * A single attachment on a {@link FullMessage}. The body is exposed as a
 * `Uint8Array` so callers can stream it to S3 / disk / SSE without depending
 * on Node's `Buffer` type.
 */
export interface Attachment {
  /** Content-ID (used to inline reference attachments from HTML), if present. */
  contentId?: string
  /** Filename from the Content-Disposition header, if present. */
  filename?: string
  /** MIME type (e.g. `image/png`, `application/pdf`). */
  contentType: string
  /** Decoded content body. */
  content: Uint8Array
  /** Decoded content size in bytes. */
  size: number
  /** `true` if the attachment is inline (referenced by `cid:`), not a separate file. */
  inline: boolean
}

/**
 * Full message returned by {@link ImapClient.fetchMessage}. Body parts are
 * decoded into UTF-8 strings; attachments retain their raw decoded bytes.
 */
export interface FullMessage {
  /** Server-assigned UID. */
  uid: number
  /** From: addresses (envelope). */
  from: ImapAddress[]
  /** To: addresses (envelope). */
  to: ImapAddress[]
  /** Cc: addresses (envelope), if present. */
  cc?: ImapAddress[]
  /** Subject. */
  subject: string
  /** Internal date stamp. */
  date: Date
  /** Plaintext body (decoded), if the message has a `text/plain` part. */
  text?: string
  /** HTML body (decoded), if the message has a `text/html` part. */
  html?: string
  /** All non-inline-text attachments, in encounter order. */
  attachments: Attachment[]
  /**
   * Full RFC 822 header lines, lower-cased and folded. Useful for inspecting
   * `dkim-signature`, `received`, `list-unsubscribe`, etc. without re-parsing.
   */
  headers: Record<string, string | string[]>
}

/**
 * Filter options for {@link ImapClient.listMessages}.
 */
export interface ListMessagesOptions {
  /** Folder path to list. Required. */
  folder: string
  /** Maximum number of messages to return (default `50`). */
  limit?: number
  /** Number of messages to skip from the most-recent end (default `0`). */
  offset?: number
  /** Only return messages with internal-date >= this value. */
  since?: Date
  /** Free-text search applied across `From`, `To`, `Subject`, and body. */
  search?: string
}

/**
 * The handle returned by {@link connectImap}. All methods are async; calling
 * any after {@link disconnect} throws.
 *
 * Designed to be composable: `ImapClient` is an opaque interface so the
 * underlying driver can be swapped if needed (e.g. for a server-side mock).
 */
export interface ImapClient {
  /** List all folders (subscribed + unsubscribed) the user can see. */
  listFolders(): Promise<ImapFolder[]>
  /**
   * Select a folder. Subsequent UID-scoped operations
   * ({@link fetchMessage}, {@link markRead}, …) operate on the most-recently
   * selected folder.
   *
   * @param name - Folder path (e.g. `INBOX`, `INBOX/Travel`).
   */
  selectFolder(name: string): Promise<void>
  /** List message summaries in a folder. */
  listMessages(options: ListMessagesOptions): Promise<MessageSummary[]>
  /** Fetch a full message by UID (within the currently-selected folder). */
  fetchMessage(uid: number): Promise<FullMessage>
  /** Set the `\Seen` flag. */
  markRead(uid: number): Promise<void>
  /** Clear the `\Seen` flag. */
  markUnread(uid: number): Promise<void>
  /** Move a message to another folder. */
  moveMessage(uid: number, toFolder: string): Promise<void>
  /** Permanently delete a message (UID EXPUNGE). */
  deleteMessage(uid: number): Promise<void>
  /** Close the IMAP connection cleanly (LOGOUT). Idempotent. */
  disconnect(): Promise<void>
}

/**
 * Error code surfaced by {@link ImapError}. Map these to translated
 * user-facing strings in the calling handler — this utility is intentionally
 * locale-bond-free (handler-error pattern).
 */
export type ImapErrorCode =
  | 'auth-failed'
  | 'connection-failed'
  | 'folder-not-found'
  | 'message-not-found'
  | 'not-connected'
  | 'no-folder-selected'
  | 'protocol-error'

/**
 * Strongly-typed error thrown by {@link connectImap} and any
 * {@link ImapClient} method.
 */
export class ImapError extends Error {
  /** Stable machine-readable error code — switch on this in handlers. */
  readonly code: ImapErrorCode

  constructor(code: ImapErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ImapError'
    this.code = code
  }
}
