# @molecule/api-imap

IMAP client wrapper for molecule.dev — fetches folders, lists messages,
fetches message bodies, marks read/unread, moves, and deletes. Used by
the `email-client` flagship app to render per-user mailboxes.

Wraps the `imapflow` driver — this package is intentionally a single
utility, not an abstract core, because there is only one IMAP protocol;
provider variation is per-server config (host/port/auth), not per-bond.

## Quick Start

```ts
import { connectImap } from '@molecule/api-imap'

const client = await connectImap({
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: { user: 'me@example.com', accessToken: googleAccessToken },
})

const folders = await client.listFolders()
await client.selectFolder('INBOX')

const recent = await client.listMessages({ folder: 'INBOX', limit: 25 })
for (const summary of recent) {
  console.log(summary.uid, summary.subject, summary.flags)
}

const full = await client.fetchMessage(recent[0].uid)
console.log(full.subject, full.text ?? full.html, full.attachments.length)

await client.markRead(full.uid)
await client.disconnect()
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-imap
```

## API

### Interfaces

#### `Attachment`

A single attachment on a {@link FullMessage}. The body is exposed as a
`Uint8Array` so callers can stream it to S3 / disk / SSE without depending
on Node's `Buffer` type.

```typescript
interface Attachment {
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
```

#### `ConnectImapHooks`

Hooks for testing — pass {@link connectImap} a `factory` to substitute a
custom driver constructor in place of the real `imapflow.ImapFlow`.

```typescript
interface ConnectImapHooks {
  /** Driver constructor override — defaults to `imapflow.ImapFlow`. */
  factory?: ImapFlowFactory
}
```

#### `DiscoveredPart`

A single discovered body part with its IMAP part-number identifier and
decoded metadata.

```typescript
interface DiscoveredPart {
  part: string
  type: string
  encoding?: string
  filename?: string
  contentId?: string
  disposition?: string
  inline: boolean
  size: number
}
```

#### `FullMessage`

Full message returned by {@link ImapClient.fetchMessage}. Body parts are
decoded into UTF-8 strings; attachments retain their raw decoded bytes.

```typescript
interface FullMessage {
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
```

#### `ImapAddress`

A parsed IMAP envelope address — display name + RFC 5322 mailbox.

```typescript
interface ImapAddress {
  /** Display name (e.g. `"Jane Doe"`) or `undefined` if absent. */
  name?: string
  /** Mailbox in `local@domain` form. */
  address: string
}
```

#### `ImapBodyNode`

Structural shape of an IMAP `BODYSTRUCTURE` node as returned by
`imapflow`. Represented recursively — multipart parts contain
`childNodes`, leaf parts do not.

```typescript
interface ImapBodyNode {
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
```

#### `ImapClient`

The handle returned by {@link connectImap}. All methods are async; calling
any after {@link disconnect} throws.

Designed to be composable: `ImapClient` is an opaque interface so the
underlying driver can be swapped if needed (e.g. for a server-side mock).

```typescript
interface ImapClient {
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
```

#### `ImapConfig`

Configuration for {@link connectImap}. All TLS and host details are passed
straight through to the underlying `imapflow` driver — callers should set
`secure: true` for implicit-TLS ports (993) and `secure: false` for
STARTTLS-on-143.

```typescript
interface ImapConfig {
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
```

#### `ImapDownloadManyEntry`

Body-part identifier accepted by `downloadMany`.

```typescript
interface ImapDownloadManyEntry {
  meta: {
    contentType?: string
    charset?: string
    disposition?: string
    filename?: string
    encoding?: string
  }
  content: Uint8Array | null
}
```

#### `ImapEnvelope`

Structural shape of an IMAP envelope as returned by `imapflow`.

```typescript
interface ImapEnvelope {
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
```

#### `ImapEnvelopeAddress`

Structural shape of an IMAP envelope address as returned by `imapflow`.

```typescript
interface ImapEnvelopeAddress {
  name?: string
  address?: string
}
```

#### `ImapFetchMessage`

Structural shape of the message object returned by
{@link ImapFlowLike.fetchOne} / `fetchAll`.

```typescript
interface ImapFetchMessage {
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
```

#### `ImapFlowLike`

Hand-rolled structural slice of `imapflow.ImapFlow` covering exactly the
methods we call. Anything not on this interface MUST NOT be reached for
by the wrapper.

```typescript
interface ImapFlowLike {
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
```

#### `ImapFolder`

A normalized IMAP folder / mailbox entry returned by
{@link ImapClient.listFolders}.

```typescript
interface ImapFolder {
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
```

#### `ImapListResponse`

Structural shape of one entry returned by {@link ImapFlowLike.list}.

```typescript
interface ImapListResponse {
  path: string
  name?: string
  delimiter?: string
  specialUse?: string
  subscribed?: boolean
}
```

#### `ImapSearchQuery`

Search query shape accepted by {@link ImapFlowLike.search}. Only the
fields used by this wrapper are listed.

```typescript
interface ImapSearchQuery {
  since?: Date
  text?: string
}
```

#### `ListMessagesOptions`

Filter options for {@link ImapClient.listMessages}.

```typescript
interface ListMessagesOptions {
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
```

#### `MessageSummary`

Compact summary of a message, returned by {@link ImapClient.listMessages}.
Does NOT include body / html / attachments — call
{@link ImapClient.fetchMessage} for those.

```typescript
interface MessageSummary {
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
```

### Types

#### `ImapAuth`

Authentication strategies for an IMAP connection.

Either a username + password pair (most common — IMAP servers, app
passwords, etc.) or a username + OAuth2 access token (XOAUTH2 — used by
Gmail, Outlook 365, and other major providers when basic auth is disabled).

```typescript
type ImapAuth = { user: string; pass: string } | { user: string; accessToken: string }
```

#### `ImapErrorCode`

Error code surfaced by {@link ImapError}. Map these to translated
user-facing strings in the calling handler — this utility is intentionally
locale-bond-free (handler-error pattern).

```typescript
type ImapErrorCode =
  | 'auth-failed'
  | 'connection-failed'
  | 'folder-not-found'
  | 'message-not-found'
  | 'not-connected'
  | 'no-folder-selected'
  | 'protocol-error'
```

#### `ImapFlowFactory`

Constructor signature used to build an {@link ImapFlowLike}. The
top-level entry point (`connectImap`) accepts an optional override of
this so tests can inject a mock without monkey-patching the module.

```typescript
type ImapFlowFactory = (options: {
  host: string
  port: number
  secure?: boolean
  auth: { user: string; pass?: string; accessToken?: string }
  tls?: { rejectUnauthorized?: boolean }
  logger?: false
}) => ImapFlowLike
```

### Classes

#### `ImapError`

Strongly-typed error thrown by {@link connectImap} and any
{@link ImapClient} method.

### Functions

#### `classifyTextPart(part)`

Determine whether a {@link DiscoveredPart} is a text body part (plain or
HTML) — used to populate {@link import('./types.js').FullMessage}'s
`text` / `html` fields.

```typescript
function classifyTextPart(part: DiscoveredPart): "text" | "html" | undefined
```

- `part` — The discovered part.

**Returns:** `'text'`, `'html'`, or `undefined`.

#### `connectImap(config, hooks)`

Connect to an IMAP server and return an {@link ImapClient} backed by
`imapflow`.

Locale bonds are intentionally not used — error messages on the thrown
{@link ImapError} are developer-facing English (handler-error pattern).
Consumers should map `error.code` to translated user-facing strings in
the calling handler.

```typescript
function connectImap(config: ImapConfig, hooks?: ConnectImapHooks): Promise<ImapClient>
```

- `config` — Server + auth configuration.
- `hooks` — Optional test hooks (driver factory).

**Returns:** A connected {@link ImapClient}.

#### `detectHasAttachments(root)`

Walk a `BODYSTRUCTURE` tree and decide whether the message has at least
one non-inline attachment.

```typescript
function detectHasAttachments(root: ImapBodyNode | undefined): boolean
```

- `root` — Root body-structure node from a fetch response.

**Returns:** `true` if the message has any attachment-disposition part with a
 *   non-empty filename.

#### `flattenBodyStructure(root)`

Walk an IMAP `BODYSTRUCTURE` tree depth-first and yield each leaf part
with its IMAP part-number identifier (`1`, `1.1`, `2`, …).

Multipart container nodes are skipped — only leaf parts (text, html,
attachments) are returned.

```typescript
function flattenBodyStructure(root: ImapBodyNode | undefined): DiscoveredPart[]
```

- `root` — Root `BODYSTRUCTURE` node from a fetch response.

**Returns:** Flat array of discovered leaf parts in encounter order.

#### `isAttachmentPart(part)`

Determine whether a {@link DiscoveredPart} should be returned as a
structured attachment.

```typescript
function isAttachmentPart(part: DiscoveredPart): boolean
```

- `part` — The discovered part.

**Returns:** `true` if the part should be exposed as an attachment.

#### `normalizeAddresses(raw)`

Convert an `imapflow` envelope-address array into the normalized
{@link ImapAddress} shape, dropping entries that have no `address`.

```typescript
function normalizeAddresses(raw: ImapEnvelopeAddress[] | undefined): ImapAddress[]
```

- `raw` — Driver address list.

**Returns:** Normalized addresses (always an array, possibly empty).

#### `normalizeDate(raw)`

Coerce an envelope `date` field (which may be `Date | string | undefined`)
into a `Date`. Falls back to the unix epoch if parsing fails so callers
never have to handle `NaN`-dates.

```typescript
function normalizeDate(raw: string | Date | undefined): Date
```

- `raw` — Driver date value.

**Returns:** Parsed `Date` (epoch on parse failure).

#### `normalizeEnvelope(envelope)`

Normalize `imapflow`'s `envelope` shape into the trio of fields we expose
on a {@link import('./types.js').FullMessage}.

```typescript
function normalizeEnvelope(envelope: ImapEnvelope | undefined): { from: ImapAddress[]; to: ImapAddress[]; cc: ImapAddress[]; subject: string; date: Date; }
```

- `envelope` — Driver envelope (may be partially populated).

**Returns:** Normalized fields.

#### `normalizeFlags(raw)`

Coerce an `imapflow` flags representation (which may be a `Set<string>`,
an array, or undefined) into a stable string array.

```typescript
function normalizeFlags(raw: string[] | Set<string> | undefined): string[]
```

- `raw` — Driver flags container.

**Returns:** Flag list (possibly empty).

#### `normalizeFolder(raw)`

Convert an `imapflow` list-response into our normalized
{@link ImapFolder} shape.

```typescript
function normalizeFolder(raw: ImapListResponse): ImapFolder
```

- `raw` — Single driver list entry.

**Returns:** Normalized folder.

#### `normalizeSubject(raw)`

Normalize an envelope's subject — `imapflow` may report `undefined` when
the message has no Subject header. We always return a string so callers
can render uniformly.

```typescript
function normalizeSubject(raw: string | undefined): string
```

- `raw` — Envelope subject.

**Returns:** Subject string (empty when missing).

#### `parseHeaders(raw)`

Parse a raw RFC 822 header block (CRLF-separated) into a map of
lower-cased header names to their values. Folded lines (continuation
lines starting with whitespace) are unfolded. Headers that appear more
than once are aggregated into an array.

```typescript
function parseHeaders(raw: string | Uint8Array<ArrayBufferLike> | undefined): Record<string, string | string[]>
```

- `raw` — Raw header block as a string or `Uint8Array`. UTF-8 is

**Returns:** Header map keyed by lower-cased name.

## Injection Notes

Locale bonds are intentionally not used — error messages on the thrown
{@link ImapError} are developer-facing English (handler-error pattern).
Consumers should map `error.code` to translated user-facing strings in
the calling handler.

The wrapper exposes a small, stable surface; advanced `imapflow` features
(IDLE, mailbox locks, raw search/fetch) are intentionally not surfaced —
if you need them, drop down to `imapflow` directly.
