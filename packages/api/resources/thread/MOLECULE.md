# @molecule/api-resource-thread

Threaded discussion resource for molecule.dev.

Conversation threads with messages, read-tracking, and unread counts.
Threads can optionally attach to any resource via `resourceType`/`resourceId`.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-thread
```

## Usage

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-thread'

// Wire routes into your Express app via mlcl inject
// POST   /threads
// GET    /threads
// GET    /threads/unread
// GET    /threads/:threadId
// PATCH  /threads/:threadId
// DELETE /threads/:threadId
// GET    /threads/:threadId/messages
// POST   /threads/:threadId/messages
// PUT    /threads/messages/:messageId
// DELETE /threads/messages/:messageId
// POST   /threads/:threadId/read
```

## API

### Interfaces

#### `CreateMessageInput`

Input for creating a new message in a thread.

```typescript
interface CreateMessageInput {
  /** The message body text. */
  body: string
}
```

#### `CreateThreadInput`

Input for creating a new thread.

```typescript
interface CreateThreadInput {
  /** Display title for the thread. */
  title: string
  /** Optional resource type to attach the thread to. */
  resourceType?: string
  /** Optional resource ID to attach the thread to. */
  resourceId?: string
}
```

#### `PaginatedResult`

A paginated result set.

```typescript
interface PaginatedResult<T> {
  /** The result items for the current page. */
  data: T[]
  /** Total number of matching items across all pages. */
  total: number
  /** Maximum number of results per page. */
  limit: number
  /** Number of results skipped. */
  offset: number
}
```

#### `PaginationOptions`

Options for paginated queries.

```typescript
interface PaginationOptions {
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
}
```

#### `Thread`

A discussion thread containing messages between participants.

```typescript
interface Thread {
  /** Unique thread identifier. */
  id: string
  /** Display title for the thread. */
  title: string
  /** The ID of the user who created the thread. */
  creatorId: string
  /** Optional resource type this thread is attached to (e.g. 'project', 'order'). */
  resourceType: string | null
  /** Optional resource ID this thread is attached to. */
  resourceId: string | null
  /** Whether the thread is closed for new messages. */
  closed: boolean
  /** When the thread was created (ISO 8601). */
  createdAt: string
  /** When the thread was last updated (ISO 8601). */
  updatedAt: string
}
```

#### `ThreadMessage`

A message within a thread.

```typescript
interface ThreadMessage {
  /** Unique message identifier. */
  id: string
  /** The ID of the thread this message belongs to. */
  threadId: string
  /** The ID of the user who sent the message. */
  userId: string
  /** The message body text. */
  body: string
  /** When the message was last edited, or `null` if never edited. */
  editedAt: string | null
  /** When the message was created (ISO 8601). */
  createdAt: string
  /** When the message was last updated (ISO 8601). */
  updatedAt: string
}
```

#### `ThreadQuery`

Options for querying threads.

```typescript
interface ThreadQuery extends PaginationOptions {
  /** Filter to only threads attached to this resource type. */
  resourceType?: string
  /** Filter to only threads attached to this resource ID. */
  resourceId?: string
  /** Filter to only open or closed threads. */
  closed?: boolean
}
```

#### `ThreadReadStatus`

Tracks the last-read position for a user in a thread.

```typescript
interface ThreadReadStatus {
  /** The thread ID. */
  threadId: string
  /** The user ID. */
  userId: string
  /** The ID of the last message read by this user. */
  lastReadMessageId: string
  /** When this read status was last updated (ISO 8601). */
  updatedAt: string
}
```

#### `UpdateMessageInput`

Input for updating an existing message.

```typescript
interface UpdateMessageInput {
  /** The updated message body text. */
  body: string
}
```

#### `UpdateThreadInput`

Input for updating an existing thread.

```typescript
interface UpdateThreadInput {
  /** Updated title for the thread. */
  title?: string
  /** Whether to close or reopen the thread. */
  closed?: boolean
}
```

### Functions

#### `addMessage(threadId, userId, data)`

Adds a message to a thread.

```typescript
function addMessage(threadId: string, userId: string, data: CreateMessageInput): Promise<ThreadMessage | null>
```

- `threadId` — The thread ID to add the message to.
- `userId` — The ID of the user sending the message.
- `data` — The message creation input.

**Returns:** The created message, or `null` if the thread is closed or not found.

#### `create(req, res)`

Creates a new discussion thread.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with thread creation body.
- `res` — The response object.

#### `createMessage(req, res)`

Adds a new message to a thread.

```typescript
function createMessage(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `threadId` param and message body.
- `res` — The response object.

#### `createThread(creatorId, data)`

Creates a new thread.

```typescript
function createThread(creatorId: string, data: CreateThreadInput): Promise<Thread>
```

- `creatorId` — The ID of the user creating the thread.
- `data` — The thread creation input.

**Returns:** The created thread.

#### `del(req, res)`

Deletes a thread. Only the thread creator can delete.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `threadId` param.
- `res` — The response object.

#### `deleteMessage(messageId, userId)`

Deletes a message. Only the message author can delete.

```typescript
function deleteMessage(messageId: string, userId: string): Promise<boolean>
```

- `messageId` — The message ID to delete.
- `userId` — The requesting user's ID (must match message author).

**Returns:** `true` if deleted, `false` if not found or unauthorized.

#### `deleteMsg(req, res)`

Deletes a message. Only the message author can delete.

```typescript
function deleteMsg(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `messageId` param.
- `res` — The response object.

#### `deleteThread(threadId, userId)`

Deletes a thread. Only the thread creator can delete.

```typescript
function deleteThread(threadId: string, userId: string): Promise<boolean>
```

- `threadId` — The thread ID to delete.
- `userId` — The requesting user's ID (must match thread creator).

**Returns:** `true` if deleted, `false` if not found or unauthorized.

#### `getMessages(threadId, options)`

Retrieves paginated messages for a thread, ordered by creation date ascending.

```typescript
function getMessages(threadId: string, options?: PaginationOptions): Promise<PaginatedResult<ThreadMessage>>
```

- `threadId` — The thread ID to get messages for.
- `options` — Pagination options.

**Returns:** A paginated result of messages.

#### `getThreadById(threadId)`

Retrieves a single thread by ID.

```typescript
function getThreadById(threadId: string): Promise<Thread | null>
```

- `threadId` — The thread ID to look up.

**Returns:** The thread or `null` if not found.

#### `getThreads(userId, options)`

Retrieves paginated threads for a user (threads where the user has posted messages).

```typescript
function getThreads(userId: string, options?: ThreadQuery): Promise<PaginatedResult<Thread>>
```

- `userId` — The user ID to find threads for.
- `options` — Query and pagination options.

**Returns:** A paginated result of threads.

#### `getUnreadCount(userId)`

Returns the number of unread threads for a user.
A thread is unread if it has messages newer than the user's last-read position,
or if the user has never read it and it contains messages.

```typescript
function getUnreadCount(userId: string): Promise<number>
```

- `userId` — The user ID.

**Returns:** The count of threads with unread messages.

#### `list(req, res)`

Lists paginated threads for the authenticated user.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with optional query params for filtering and pagination.
- `res` — The response object.

#### `listMessages(req, res)`

Lists paginated messages in a thread.

```typescript
function listMessages(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `threadId` param.
- `res` — The response object.

#### `markRead(threadId, userId, lastReadMessageId)`

Marks a thread as read up to a specific message for a user.

```typescript
function markRead(threadId: string, userId: string, lastReadMessageId: string): Promise<void>
```

- `threadId` — The thread ID.
- `userId` — The user marking the thread as read.
- `lastReadMessageId` — The ID of the last message read.

#### `markThreadRead(req, res)`

Marks a thread as read up to a specific message for the authenticated user.

```typescript
function markThreadRead(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `threadId` param and `lastReadMessageId` in body.
- `res` — The response object.

#### `read(req, res)`

Retrieves a single thread by ID.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `threadId` param.
- `res` — The response object.

#### `unread(_req, res)`

Returns the number of threads with unread messages for the authenticated user.

```typescript
function unread(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request object (unused).
- `res` — The response object.

#### `update(req, res)`

Updates an existing thread. Only the thread creator can update.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `threadId` param and update body.
- `res` — The response object.

#### `updateMessage(messageId, userId, data)`

Updates a message. Only the message author can update.

```typescript
function updateMessage(messageId: string, userId: string, data: UpdateMessageInput): Promise<ThreadMessage | null>
```

- `messageId` — The message ID to update.
- `userId` — The requesting user's ID (must match message author).
- `data` — The update input.

**Returns:** The updated message or `null` if not found or unauthorized.

#### `updateMsg(req, res)`

Updates an existing message. Only the message author can update.

```typescript
function updateMsg(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `messageId` param and update body.
- `res` — The response object.

#### `updateThread(threadId, userId, data)`

Updates a thread. Only the thread creator can update.

```typescript
function updateThread(threadId: string, userId: string, data: UpdateThreadInput): Promise<Thread | null>
```

- `threadId` — The thread ID to update.
- `userId` — The requesting user's ID (must match thread creator).
- `data` — The update input.

**Returns:** The updated thread or `null` if not found or unauthorized.

### Constants

#### `createMessageSchema`

Schema for validating message creation input.

```typescript
const createMessageSchema: z.ZodObject<{ body: z.ZodString; }, z.core.$strip>
```

#### `createThreadSchema`

Schema for validating thread creation input.

```typescript
const createThreadSchema: z.ZodObject<{ title: z.ZodString; resourceType: z.ZodOptional<z.ZodString>; resourceId: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `requestHandlerMap`

Handler map for thread routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; readonly listMessages: typeof listMessages; readonly createMessage: typeof createMessage; readonly updateMsg: typeof updateMsg; readonly deleteMsg: typeof deleteMsg; readonly markThreadRead: typeof markThreadRead; readonly unread: typeof unread; }
```

#### `routes`

Routes for thread CRUD, messages, and read-tracking.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/threads"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/threads"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/threads/unread"; readonly handler: "unread"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/threads/:threadId"; readonly handler: "read"; }, { readonly method: "patch"; readonly path: "/threads/:threadId"; readonly handler: "update"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/threads/:threadId"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/threads/:threadId/messages"; readonly handler: "listMessages"; }, { readonly method: "post"; readonly path: "/threads/:threadId/messages"; readonly handler: "createMessage"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "put"; readonly path: "/threads/messages/:messageId"; readonly handler: "updateMsg"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/threads/messages/:messageId"; readonly handler: "deleteMsg"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/threads/:threadId/read"; readonly handler: "markThreadRead"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `updateMessageSchema`

Schema for validating message update input.

```typescript
const updateMessageSchema: z.ZodObject<{ body: z.ZodString; }, z.core.$strip>
```

#### `updateThreadSchema`

Schema for validating thread update input.

```typescript
const updateThreadSchema: z.ZodObject<{ title: z.ZodOptional<z.ZodString>; closed: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `zod` ^4.0.0
