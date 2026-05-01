/**
 * Minimal structural shape of the bits of `imapflow` that we depend on. We
 * keep this hand-rolled (instead of `import type { ImapFlow } from
 * 'imapflow'`) so:
 *
 * - The wrapper can be unit-tested with a plain JS mock matching this shape
 *   without dragging in `imapflow`'s real type baggage (Sets, bigints, etc.)
 *   in the test surface.
 * - We document the *exact* slice of the driver we rely on, making it
 *   trivial to swap to a different IMAP library if needed.
 *
 * The real `imapflow.ImapFlow` instance is structurally compatible with
 * {@link ImapFlowLike} for every field we read.
 *
 * @module
 */

/**
 * Structural shape of an IMAP envelope address as returned by `imapflow`.
 *
 * @internal
 */
export interface ImapEnvelopeAddress {
  name?: string
  address?: string
}

/**
 * Structural shape of an IMAP envelope as returned by `imapflow`.
 *
 * @internal
 */
export interface ImapEnvelope {
  date?: Date | string
  subject?: string
  from?: ImapEnvelopeAddress[]
  to?: ImapEnvelopeAddress[]
  cc?: ImapEnvelopeAddress[]
  bcc?: ImapEnvelopeAddress[]
  replyTo?: ImapEnvelopeAddress[]
  messageId?: string
  inReplyTo?: string
}

/**
 * Structural shape of an IMAP `BODYSTRUCTURE` node as returned by
 * `imapflow`. Represented recursively — multipart parts contain
 * `childNodes`, leaf parts do not.
 *
 * @internal
 */
export interface ImapBodyNode {
  part?: string
  type?: string
  parameters?: Record<string, string>
  id?: string
  encoding?: string
  size?: number
  disposition?: string
  dispositionParameters?: Record<string, string>
  childNodes?: ImapBodyNode[]
}

/**
 * Structural shape of one entry returned by {@link ImapFlowLike.list}.
 *
 * @internal
 */
export interface ImapListResponse {
  path: string
  name?: string
  delimiter?: string
  specialUse?: string
  subscribed?: boolean
}

/**
 * Structural shape of the message object returned by
 * {@link ImapFlowLike.fetchOne} / `fetchAll`.
 *
 * @internal
 */
export interface ImapFetchMessage {
  uid: number
  seq?: number
  flags?: Set<string> | string[]
  envelope?: ImapEnvelope
  internalDate?: Date | string
  bodyStructure?: ImapBodyNode
  bodyParts?: Map<string, Uint8Array> | Record<string, Uint8Array>
  headers?: Uint8Array | string
  size?: number
}

/**
 * Search query shape accepted by {@link ImapFlowLike.search}. Only the
 * fields used by this wrapper are listed.
 *
 * @internal
 */
export interface ImapSearchQuery {
  since?: Date
  text?: string
}

/**
 * Body-part identifier accepted by `downloadMany`.
 *
 * @internal
 */
export interface ImapDownloadManyEntry {
  meta: {
    contentType?: string
    charset?: string
    disposition?: string
    filename?: string
    encoding?: string
  }
  content: Uint8Array | null
}

/**
 * Hand-rolled structural slice of `imapflow.ImapFlow` covering exactly the
 * methods we call. Anything not on this interface MUST NOT be reached for
 * by the wrapper.
 *
 * @internal
 */
export interface ImapFlowLike {
  connect(): Promise<void>
  logout(): Promise<void>
  close(): void
  list(): Promise<ImapListResponse[]>
  mailboxOpen(path: string): Promise<unknown>
  search(query: ImapSearchQuery, options?: { uid?: boolean }): Promise<number[] | false>
  fetchOne(
    seq: string,
    query: Record<string, unknown>,
    options?: { uid?: boolean },
  ): Promise<ImapFetchMessage | false>
  fetchAll(
    range: number[] | string,
    query: Record<string, unknown>,
    options?: { uid?: boolean },
  ): Promise<ImapFetchMessage[]>
  messageFlagsAdd(range: number[], flags: string[], options?: { uid?: boolean }): Promise<boolean>
  messageFlagsRemove(
    range: number[],
    flags: string[],
    options?: { uid?: boolean },
  ): Promise<boolean>
  messageMove(range: number[], destination: string, options?: { uid?: boolean }): Promise<unknown>
  messageDelete(range: number[], options?: { uid?: boolean }): Promise<boolean>
  downloadMany(
    range: number,
    parts: string[],
    options?: { uid?: boolean },
  ): Promise<Record<string, ImapDownloadManyEntry>>
}

/**
 * Constructor signature used to build an {@link ImapFlowLike}. The
 * top-level entry point (`connectImap`) accepts an optional override of
 * this so tests can inject a mock without monkey-patching the module.
 *
 * @internal
 */
export type ImapFlowFactory = (options: {
  host: string
  port: number
  secure?: boolean
  auth: { user: string; pass?: string; accessToken?: string }
  tls?: { rejectUnauthorized?: boolean }
  logger?: false
}) => ImapFlowLike
