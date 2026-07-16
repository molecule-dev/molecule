# @molecule/api-resource-message

1:1 messaging resource for molecule.dev.

Direct-message threads between two participants with read-tracking,
unread counters, optional attachments, and realtime broadcast over
`@molecule/api-realtime` when bonded.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-message'

// Wire routes into your Express app via mlcl inject
// POST   /message-threads
// GET    /message-threads
// GET    /message-threads/unread-count
// GET    /message-threads/:threadId
// GET    /message-threads/:threadId/messages
// POST   /message-threads/:threadId/messages
// POST   /message-threads/:threadId/read
// PATCH  /message-threads/messages/:messageId
// DELETE /message-threads/messages/:messageId
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-message @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-realtime @molecule/api-resource zod
```

## API

### Interfaces

#### `ListMessagesOptions`

Options for paginating messages within a thread.

```typescript
interface ListMessagesOptions {
  /** Return messages strictly older than this timestamp (ISO 8601). */
  before?: string
  /** Maximum number of messages to return. Defaults to 50, max 200. */
  limit?: number
}
```

#### `Message`

A single message within a {@link Thread}.

`editedAt` and `deletedAt` are `null` until the message is mutated. A
soft-deleted message (`deletedAt !== null`) is preserved for audit /
thread continuity but should not be rendered as content.

```typescript
interface Message {
  /** Unique message identifier. */
  id: string
  /** Thread this message belongs to. */
  threadId: string
  /** ID of the user who sent the message. */
  senderId: string
  /** Message body text. */
  body: string
  /** Optional file/image attachments. */
  attachments: MessageAttachment[]
  /** When the message was created (ISO 8601). */
  createdAt: string
  /** When the message was last edited, or `null`. */
  editedAt: string | null
  /** When the message was soft-deleted, or `null`. */
  deletedAt: string | null
}
```

#### `MessageAttachment`

A message attachment reference.

```typescript
interface MessageAttachment {
  /** Public or signed URL to the attachment payload. */
  url: string
  /** MIME type of the attachment (e.g. `image/png`). */
  mime: string
}
```

#### `Thread`

A 1:1 messaging thread between two participants.

`participantAId` and `participantBId` are stored canonically — the
smaller value (lexicographically) is always `participantAId`. Use
{@link getOrCreateThread} to look up or create a thread between two
users without worrying about ordering.

```typescript
interface Thread {
  /** Unique thread identifier. */
  id: string
  /** Lexicographically-smaller participant ID. */
  participantAId: string
  /** Lexicographically-larger participant ID. */
  participantBId: string
  /** Timestamp of the most recent message, or `null` if no messages exist. */
  lastMessageAt: string | null
  /** Number of messages participant A has not yet read. */
  unreadCountA: number
  /** Number of messages participant B has not yet read. */
  unreadCountB: number
  /** When the thread was created (ISO 8601). */
  createdAt: string
  /** When the thread was last updated (ISO 8601). */
  updatedAt: string
}
```

### Types

#### `MessageRealtimeEvent`

Union of realtime event names.

```typescript
type MessageRealtimeEvent =
  (typeof MESSAGE_REALTIME_EVENTS)[keyof typeof MESSAGE_REALTIME_EVENTS]
```

### Functions

#### `canonicaliseParticipants(a, b)`

Canonicalises a (a, b) participant pair so that the lexicographically
smaller value is always returned first. This guarantees `(x, y)` and
`(y, x)` resolve to the same {@link Thread} row.

```typescript
function canonicaliseParticipants(a: string, b: string): [string, string]
```

- `a` — First participant ID.
- `b` — Second participant ID.

**Returns:** A tuple `[participantAId, participantBId]` in canonical order.

#### `countMessages(threadId)`

Counts the messages persisted in a thread (including soft-deleted).

```typescript
function countMessages(threadId: string): Promise<number>
```

- `threadId` — The thread ID.

**Returns:** Total stored message count.

#### `createThread(req, res)`

Resolves (or lazily creates) the canonical thread between the
authenticated user and a counter-participant.

```typescript
function createThread(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `participantId` in body.
- `res` — The response object.

#### `deleteMessage(messageId, senderId)`

Soft-deletes a message. Only the original sender may delete.

```typescript
function deleteMessage(messageId: string, senderId: string): Promise<boolean>
```

- `messageId` — The message ID.
- `senderId` — The user ID claiming to be the message author.

**Returns:** `true` if the message was soft-deleted, `false` if not found
 *   or not authorised.

#### `deleteMessageHandler(req, res)`

Soft-deletes a message. Only the original sender may delete.

```typescript
function deleteMessageHandler(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `messageId` URL param.
- `res` — The response object.

#### `editMessage(messageId, senderId, body)`

Edits an existing message body. Only the original sender may edit.

```typescript
function editMessage(messageId: string, senderId: string, body: string): Promise<Message | null>
```

- `messageId` — The message ID.
- `senderId` — The user ID claiming to be the message author.
- `body` — New non-empty message body.

**Returns:** The updated message, or `null` if not found / not authorised.

#### `editMessageHandler(req, res)`

Edits a message body. Only the original sender may edit.

```typescript
function editMessageHandler(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `messageId` URL param and `body` in body.
- `res` — The response object.

#### `getOrCreateThread(a, b)`

Looks up the canonical thread between two participants, creating it
lazily if none exists.

```typescript
function getOrCreateThread(a: string, b: string): Promise<Thread>
```

- `a` — First participant user ID.
- `b` — Second participant user ID.

**Returns:** The existing or newly-created thread.

#### `getThreadById(threadId)`

Retrieves a thread by ID.

```typescript
function getThreadById(threadId: string): Promise<Thread | null>
```

- `threadId` — The thread ID.

**Returns:** The thread, or `null` if not found.

#### `getTotalUnreadCount(participantId)`

Counts unread messages for a participant across all of their threads.

```typescript
function getTotalUnreadCount(participantId: string): Promise<number>
```

- `participantId` — The participant user ID.

**Returns:** Total unread message count across every thread.

#### `listMessages(threadId, options)`

Lists messages in a thread, newest first. Soft-deleted messages are
still returned (with `deletedAt` set) so clients can render
"this message was deleted" placeholders.

```typescript
function listMessages(threadId: string, options?: ListMessagesOptions): Promise<Message[]>
```

- `threadId` — The thread ID.
- `options` — Pagination options. `before` returns messages strictly

**Returns:** Array of messages, newest first.

#### `listMessagesHandler(req, res)`

Lists messages in a thread, newest first.

```typescript
function listMessagesHandler(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `threadId` URL param and optional
- `res` — The response object.

#### `listThreads(req, res)`

Returns paginated threads for the authenticated user, newest first.

```typescript
function listThreads(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with optional `limit` / `offset` query params.
- `res` — The response object.

#### `listThreadsForParticipant(participantId, options)`

Lists threads a participant is part of, ordered by most recent activity.

```typescript
function listThreadsForParticipant(participantId: string, options?: { limit?: number; offset?: number; }): Promise<Thread[]>
```

- `participantId` — The user ID to list threads for.
- `options` — Pagination options.

**Returns:** Array of threads in descending `lastMessageAt` order.

#### `markRead(threadId, readerId)`

Marks a thread as read for the given participant and resets their
unread counter to zero. Broadcasts a `message:read` event.

```typescript
function markRead(threadId: string, readerId: string): Promise<void>
```

- `threadId` — The thread ID.
- `readerId` — The participant user ID marking the thread as read.

#### `markReadHandler(req, res)`

Marks a thread as read and zeroes the authenticated user's unread
counter for that thread. Broadcasts a `message:read` event over the
bonded realtime provider.

```typescript
function markReadHandler(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `threadId` URL param.
- `res` — The response object.

#### `readThread(req, res)`

Returns the thread identified by `:threadId`. The authenticated user
must be a participant.

```typescript
function readThread(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `threadId` URL param.
- `res` — The response object.

#### `sendMessage(threadId, senderId, body, attachments)`

Sends a message in a thread. Updates `lastMessageAt` and bumps the
recipient's `unreadCount*` counter, then broadcasts the new message
over the bonded realtime provider (if any).

```typescript
function sendMessage(threadId: string, senderId: string, body: string, attachments?: MessageAttachment[]): Promise<Message>
```

- `threadId` — The target thread ID.
- `senderId` — The sending participant's user ID.
- `body` — Message body. Must be non-empty after trimming.
- `attachments` — Optional attachment list.

**Returns:** The persisted message.

#### `sendMessageHandler(req, res)`

Sends a new message in a thread. Authenticated user must be a
participant. Broadcasts a `message:sent` event when realtime is bonded.

```typescript
function sendMessageHandler(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `threadId` URL param and message body.
- `res` — The response object.

#### `threadRoomId(threadId)`

Returns the realtime room ID for a given thread.

```typescript
function threadRoomId(threadId: string): string
```

- `threadId` — The thread ID.

**Returns:** The room ID consumers should subscribe to for thread events.

#### `unreadCount(req, res)`

Returns the authenticated user's total unread message count.

```typescript
function unreadCount(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request.
- `res` — The response object.

### Constants

#### `editMessageSchema`

Schema for `editMessage` request input.

```typescript
const editMessageSchema: z.ZodObject<{ body: z.ZodString; }, z.core.$strip>
```

#### `getOrCreateThreadSchema`

Schema for `getOrCreateThread` request input.

```typescript
const getOrCreateThreadSchema: z.ZodObject<{ participantId: z.ZodString; }, z.core.$strip>
```

#### `MESSAGE_REALTIME_EVENTS`

Realtime event names emitted by this package.

Subscribers should listen on the room ID returned from
{@link threadRoomId} for the thread they care about.

```typescript
const MESSAGE_REALTIME_EVENTS: { readonly messageSent: "message:sent"; readonly messageRead: "message:read"; }
```

#### `messageAttachmentSchema`

Schema for an individual message attachment.

```typescript
const messageAttachmentSchema: z.ZodObject<{ url: z.ZodString; mime: z.ZodString; }, z.core.$strip>
```

#### `requestHandlerMap`

Handler map for message resource routes.

```typescript
const requestHandlerMap: { readonly createThread: typeof createThread; readonly listThreads: typeof listThreads; readonly readThread: typeof readThread; readonly listMessages: typeof listMessagesHandler; readonly sendMessage: typeof sendMessageHandler; readonly markRead: typeof markReadHandler; readonly editMessage: typeof editMessageHandler; readonly deleteMessage: typeof deleteMessageHandler; readonly unreadCount: typeof unreadCount; }
```

#### `routes`

Routes for 1:1 message threads, messages, and read-tracking.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/message-threads"; readonly handler: "createThread"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/message-threads"; readonly handler: "listThreads"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/message-threads/unread-count"; readonly handler: "unreadCount"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/message-threads/:threadId"; readonly handler: "readThread"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/message-threads/:threadId/messages"; readonly handler: "listMessages"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/message-threads/:threadId/messages"; readonly handler: "sendMessage"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/message-threads/:threadId/read"; readonly handler: "markRead"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "patch"; readonly path: "/message-threads/messages/:messageId"; readonly handler: "editMessage"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/message-threads/messages/:messageId"; readonly handler: "deleteMessage"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `sendMessageSchema`

Schema for `sendMessage` request input.

```typescript
const sendMessageSchema: z.ZodObject<{ body: z.ZodString; attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{ url: z.ZodString; mime: z.ZodString; }, z.core.$strip>>>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-realtime` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-logger`
- `@molecule/api-realtime`
- `@molecule/api-resource`
- `zod`

Tables: `src/__setup__/messages.sql` creates `message_threads` + `messages`.
An mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
anywhere else run it once — nothing at runtime creates them.

Threads are strictly 1:1 — a canonicalised participant pair (creating a
thread with yourself throws) — and PARTICIPANT-SCOPED: every handler reads
the authenticated user from `res.locals.session` (401 without a session;
mount behind your global auth middleware) and rejects non-participants with
403/404. The sender is always the session user — never accept a sender id
from the request body.

Realtime delivery is best-effort — messages are persisted before any
broadcast attempt and a missing realtime bond is silently a no-op.
Subscribers should listen on `threadRoomId(threadId)` for
{@link MESSAGE_REALTIME_EVENTS} payloads.

User-facing strings go through `t(key, …, { defaultValue })`; translations
ship in the companion `@molecule/api-locales-resource-message` bond.

## E2E Tests

Integration checklist — drive the real messaging UI (live preview, no
mocks), adapt each item to this app's actual threads/screens, and check
every box off one by one. A box you can't check is an integration bug to
fix — not a skip. Messaging PRIVACY is the point here, so the last item is
not optional:
- [ ] Sending a message in a thread persists it and it appears in that
  thread for BOTH participants in chronological (`createdAt`) order, stamped
  with the sender and a timestamp. Send from each side and confirm both see
  the same ordered transcript.
- [ ] Read / unread works: a message you send is unread for the recipient —
  their thread badge and `GET /message-threads/unread-count` increment;
  opening the thread and marking it read (`POST /message-threads/:threadId/read`)
  clears that side's unread count to zero and the total badge drops to match.
- [ ] Editing a message shows an edited state (an "edited" marker /
  `editedAt`) and deleting it removes it or renders a "message was deleted"
  tombstone (`deletedAt`) — and ONLY the author can edit or delete their OWN
  message: the other participant gets no edit/delete affordance and a forged
  PATCH/DELETE on someone else's message is rejected, never applied.
- [ ] Delivery to the other participant: with `@molecule/api-realtime`
  bonded, a new message appears in their already-open thread WITHOUT a
  reload; with no realtime bond it appears on their next load/refresh.
- [ ] PRIVACY / AUTHORIZATION — a thread and its messages are visible ONLY
  to its two participants. Sign in as a THIRD user and confirm they cannot
  read the thread or any message by guessing its id (403/404), cannot post
  into a thread they are not part of (403), and cannot spoof the sender —
  the sender is always the session user, never a request-body field.

## Translations

Translation strings are provided by `@molecule/api-locales-resource-message`.
