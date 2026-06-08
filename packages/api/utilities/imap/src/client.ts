/**
 * Top-level {@link connectImap} entry point and concrete {@link ImapClient}
 * implementation that wraps a single `imapflow.ImapFlow` connection.
 *
 * @module
 */

import { classifyTextPart, flattenBodyStructure, isAttachmentPart } from './bodyStructure.js'
import type {
  ImapDownloadManyEntry,
  ImapFetchMessage,
  ImapFlowFactory,
  ImapFlowLike,
  ImapSearchQuery,
} from './driverTypes.js'
import { parseHeaders } from './headers.js'
import {
  detectHasAttachments,
  normalizeEnvelope,
  normalizeFlags,
  normalizeFolder,
} from './normalize.js'
import {
  type Attachment,
  type FullMessage,
  type ImapClient,
  type ImapConfig,
  ImapError,
  type ImapFolder,
  type ListMessagesOptions,
  type MessageSummary,
} from './types.js'

/**
 * Hooks for testing — pass {@link connectImap} a `factory` to substitute a
 * custom driver constructor in place of the real `imapflow.ImapFlow`.
 */
export interface ConnectImapHooks {
  /** Driver constructor override — defaults to `imapflow.ImapFlow`. */
  factory?: ImapFlowFactory
}

/**
 * Connect to an IMAP server and return an {@link ImapClient} backed by
 * `imapflow`.
 *
 * Locale bonds are intentionally not used — error messages on the thrown
 * {@link ImapError} are developer-facing English (handler-error pattern).
 * Consumers should map `error.code` to translated user-facing strings in
 * the calling handler.
 *
 * @param config - Server + auth configuration.
 * @param hooks - Optional test hooks (driver factory).
 * @returns A connected {@link ImapClient}.
 * @throws {ImapError} `code === 'auth-failed'` on bad credentials, or
 *   `'connection-failed'` on transport / protocol errors during connect.
 */
export async function connectImap(
  config: ImapConfig,
  hooks: ConnectImapHooks = {},
): Promise<ImapClient> {
  const factory = hooks.factory ?? (await defaultFactory())
  const driver = factory({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: toDriverAuth(config),
    tls: config.tls,
    logger: false,
  })

  try {
    await driver.connect()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const code = isAuthError(error) ? 'auth-failed' : 'connection-failed'
    throw new ImapError(code, `IMAP ${code}: ${message}`, { cause: error })
  }

  return new ImapClientImpl(driver)
}

/**
 * Lazy-load the real `imapflow.ImapFlow` constructor. Kept lazy so that
 * unit tests using a `factory` hook never trigger the dynamic import.
 *
 * @internal
 */
async function defaultFactory(): Promise<ImapFlowFactory> {
  const mod = (await import('imapflow')) as unknown as {
    ImapFlow: new (options: Parameters<ImapFlowFactory>[0]) => ImapFlowLike
  }
  return (options) => new mod.ImapFlow(options)
}

/**
 * Convert an {@link ImapConfig} auth block into the shape expected by `imapflow`.
 */
function toDriverAuth(config: ImapConfig): { user: string; pass?: string; accessToken?: string } {
  if ('accessToken' in config.auth) {
    return { user: config.auth.user, accessToken: config.auth.accessToken }
  }
  return { user: config.auth.user, pass: config.auth.pass }
}

/**
 * Return `true` if the raw imapflow error indicates an authentication failure.
 */
function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { authenticationFailed?: boolean; code?: string }
  if (candidate.authenticationFailed === true) return true
  if (candidate.code === 'AUTHENTICATIONFAILED') return true
  return false
}

/**
 * Concrete {@link ImapClient} backed by a live `imapflow.ImapFlow` connection.
 */
class ImapClientImpl implements ImapClient {
  private readonly driver: ImapFlowLike
  private currentFolder: string | undefined
  private connected: boolean

  constructor(driver: ImapFlowLike) {
    this.driver = driver
    this.connected = true
  }

  /**
   * Throw an {@link ImapError} if the connection has already been closed.
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new ImapError('not-connected', 'IMAP client has been disconnected')
    }
  }

  /**
   * Assert that a folder has been selected and return its name, or throw if not.
   */
  private ensureFolder(): string {
    this.ensureConnected()
    if (!this.currentFolder) {
      throw new ImapError(
        'no-folder-selected',
        'No IMAP folder selected — call selectFolder() first',
      )
    }
    return this.currentFolder
  }

  /**
   * List all mailbox folders available on the server.
   */
  async listFolders(): Promise<ImapFolder[]> {
    this.ensureConnected()
    try {
      const raw = await this.driver.list()
      return raw.map(normalizeFolder)
    } catch (error) {
      throw wrapProtocolError('list folders', error)
    }
  }

  /**
   * Open the named mailbox folder so subsequent operations target it.
   */
  async selectFolder(name: string): Promise<void> {
    this.ensureConnected()
    try {
      await this.driver.mailboxOpen(name)
      this.currentFolder = name
    } catch (error) {
      if (isFolderNotFound(error)) {
        throw new ImapError('folder-not-found', `Folder not found: ${name}`, { cause: error })
      }
      throw wrapProtocolError(`open folder ${name}`, error)
    }
  }

  /**
   * Return a paginated, newest-first list of message summaries from the target folder.
   */
  async listMessages(options: ListMessagesOptions): Promise<MessageSummary[]> {
    this.ensureConnected()
    if (this.currentFolder !== options.folder) {
      await this.selectFolder(options.folder)
    }
    const limit = options.limit ?? 50
    const offset = options.offset ?? 0

    let uids: number[]
    try {
      const query: ImapSearchQuery = {}
      if (options.since) query.since = options.since
      if (options.search) query.text = options.search
      const result = await this.driver.search(query, { uid: true })
      uids = Array.isArray(result) ? result : []
    } catch (error) {
      throw wrapProtocolError('search messages', error)
    }

    if (uids.length === 0) return []

    // IMAP UIDs are not strictly chronological, but they are monotonically
    // increasing per-folder, so highest UID = newest. Take the most-recent
    // window applying offset+limit from the tail.
    uids.sort((a, b) => a - b)
    const tail = uids.slice(Math.max(0, uids.length - offset - limit), uids.length - offset)
    if (tail.length === 0) return []

    let messages: ImapFetchMessage[]
    try {
      messages = await this.driver.fetchAll(
        tail,
        { uid: true, envelope: true, flags: true, bodyStructure: true, internalDate: true },
        { uid: true },
      )
    } catch (error) {
      throw wrapProtocolError('fetch message summaries', error)
    }

    const summaries: MessageSummary[] = messages.map((msg) => {
      const env = normalizeEnvelope(msg.envelope)
      return {
        uid: msg.uid,
        from: env.from,
        to: env.to,
        subject: env.subject,
        date: env.date,
        hasAttachments: detectHasAttachments(msg.bodyStructure),
        flags: normalizeFlags(msg.flags),
      }
    })
    // Newest-first.
    summaries.sort((a, b) => b.uid - a.uid)
    return summaries
  }

  /**
   * Fetch the full content (headers, text, HTML, attachments) of a single message by UID.
   */
  async fetchMessage(uid: number): Promise<FullMessage> {
    this.ensureFolder()
    let raw: ImapFetchMessage | false
    try {
      raw = await this.driver.fetchOne(
        String(uid),
        {
          uid: true,
          envelope: true,
          flags: true,
          bodyStructure: true,
          internalDate: true,
          headers: true,
        },
        { uid: true },
      )
    } catch (error) {
      throw wrapProtocolError(`fetch message uid=${uid}`, error)
    }

    if (!raw) {
      throw new ImapError('message-not-found', `Message uid=${uid} not found`)
    }

    const env = normalizeEnvelope(raw.envelope)
    const parts = flattenBodyStructure(raw.bodyStructure)

    const textParts = parts.filter((part) => classifyTextPart(part) !== undefined)
    const attachmentParts = parts.filter((part) => isAttachmentPart(part))

    const partIds = [...new Set([...textParts, ...attachmentParts].map((p) => p.part))].filter(
      Boolean,
    )

    let downloaded: Record<string, ImapDownloadManyEntry> = {}
    if (partIds.length > 0) {
      try {
        downloaded = await this.driver.downloadMany(uid, partIds, { uid: true })
      } catch (error) {
        throw wrapProtocolError(`download parts for uid=${uid}`, error)
      }
    }

    let text: string | undefined
    let html: string | undefined
    for (const part of textParts) {
      const entry = downloaded[part.part]
      if (!entry?.content) continue
      const decoded = decodeText(entry.content, entry.meta.charset)
      const kind = classifyTextPart(part)
      if (kind === 'text' && text === undefined) text = decoded
      if (kind === 'html' && html === undefined) html = decoded
    }

    const attachments: Attachment[] = []
    for (const part of attachmentParts) {
      // Skip text parts that the consumer already gets via `text` / `html`.
      if (classifyTextPart(part) !== undefined) continue
      const entry = downloaded[part.part]
      const content = entry?.content ?? new Uint8Array(0)
      const att: Attachment = {
        contentType: entry?.meta.contentType ?? part.type,
        content,
        size: content.byteLength,
        inline: part.inline,
      }
      const filename = entry?.meta.filename ?? part.filename
      if (filename) att.filename = filename
      if (part.contentId) att.contentId = part.contentId
      attachments.push(att)
    }

    const message: FullMessage = {
      uid: raw.uid,
      from: env.from,
      to: env.to,
      subject: env.subject,
      date: env.date,
      attachments,
      headers: parseHeaders(raw.headers),
    }
    if (env.cc.length > 0) message.cc = env.cc
    if (text !== undefined) message.text = text
    if (html !== undefined) message.html = html
    return message
  }

  /**
   * Add the `\Seen` flag to the message identified by `uid`.
   */
  async markRead(uid: number): Promise<void> {
    this.ensureFolder()
    try {
      await this.driver.messageFlagsAdd([uid], ['\\Seen'], { uid: true })
    } catch (error) {
      throw wrapProtocolError(`mark read uid=${uid}`, error)
    }
  }

  /**
   * Remove the `\Seen` flag from the message identified by `uid`.
   */
  async markUnread(uid: number): Promise<void> {
    this.ensureFolder()
    try {
      await this.driver.messageFlagsRemove([uid], ['\\Seen'], { uid: true })
    } catch (error) {
      throw wrapProtocolError(`mark unread uid=${uid}`, error)
    }
  }

  /**
   * Move the message identified by `uid` to `toFolder` on the same server.
   */
  async moveMessage(uid: number, toFolder: string): Promise<void> {
    this.ensureFolder()
    try {
      await this.driver.messageMove([uid], toFolder, { uid: true })
    } catch (error) {
      if (isFolderNotFound(error)) {
        throw new ImapError('folder-not-found', `Folder not found: ${toFolder}`, { cause: error })
      }
      throw wrapProtocolError(`move uid=${uid} → ${toFolder}`, error)
    }
  }

  /**
   * Permanently delete the message identified by `uid` from the current folder.
   */
  async deleteMessage(uid: number): Promise<void> {
    this.ensureFolder()
    try {
      await this.driver.messageDelete([uid], { uid: true })
    } catch (error) {
      throw wrapProtocolError(`delete uid=${uid}`, error)
    }
  }

  /**
   * Gracefully log out and close the IMAP connection; safe to call multiple times.
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return
    this.connected = false
    this.currentFolder = undefined
    try {
      await this.driver.logout()
    } catch (_error) {
      // logout failure shouldn't surface — fall back to forced close.
      try {
        this.driver.close()
      } catch (_error) {
        // close() is a last-resort cleanup; ignoring is safe because the
        // connection is already being torn down unconditionally.
      }
    }
  }
}

/**
 * Wrap an unexpected driver error in a typed {@link ImapError} with a descriptive message.
 */
function wrapProtocolError(action: string, error: unknown): ImapError {
  const message = error instanceof Error ? error.message : String(error)
  return new ImapError('protocol-error', `IMAP ${action} failed: ${message}`, { cause: error })
}

/**
 * Return `true` if the raw imapflow error indicates the requested mailbox does not exist.
 */
function isFolderNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; serverResponseCode?: string; message?: string }
  if (candidate.code === 'NoSuchMailbox') return true
  if (candidate.serverResponseCode === 'NONEXISTENT') return true
  if (
    typeof candidate.message === 'string' &&
    /no such mailbox|nonexistent/i.test(candidate.message)
  ) {
    return true
  }
  return false
}

/**
 * Decode a raw byte buffer to a string using the given charset, falling back to UTF-8.
 */
function decodeText(buffer: Uint8Array, charset: string | undefined): string {
  const encoding = (charset ?? 'utf-8').toLowerCase()
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(buffer)
  } catch (_error) {
    // Unsupported/unknown charset label — fall back to UTF-8, which is always available.
    return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  }
}
