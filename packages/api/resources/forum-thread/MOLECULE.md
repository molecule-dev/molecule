# @molecule/api-resource-forum-thread

`@molecule/api-resource-forum-thread` — forum threads + nested replies +
voting + author/moderator authorization.

Extracted from the forum flagship. `createForumThreadRouter({ isModeratorFor })`
exposes public reads + authed writes. Voting is idempotent (changing vote
adjusts score correctly; voting again with same value is a noop).

## Quick Start

```ts
import { createForumThreadRouter } from '@molecule/api-resource-forum-thread'

app.use('/threads', createForumThreadRouter({
  isModeratorFor: async (userId) => userIsMod(userId),
}))
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-forum-thread
```

## API

### Interfaces

#### `ForumReplyRow`

Raw database row for a reply to a forum thread.

```typescript
interface ForumReplyRow {
  id: string
  thread_id: string
  parent_reply_id: string | null
  author_id: string
  body: string
  vote_score: number
  is_deleted: boolean
  created_at: string | Date
  updated_at: string | Date
}
```

#### `ForumThreadRow`

Raw database row for a forum thread record.

```typescript
interface ForumThreadRow {
  id: string
  author_id: string
  category_id: string | null
  title: string
  body: string
  slug: string
  status: ThreadStatus
  is_pinned: boolean
  vote_score: number
  reply_count: number
  view_count: number
  last_activity_at: string | Date
  created_at: string | Date
  updated_at: string | Date
}
```

#### `ForumVoteRow`

Raw database row for a vote cast on a thread or reply.

```typescript
interface ForumVoteRow {
  id: string
  user_id: string
  target_type: 'thread' | 'reply'
  target_id: string
  value: 1 | -1
  created_at: string | Date
}
```

### Types

#### `ThreadStatus`

Possible lifecycle states for a forum thread.

```typescript
type ThreadStatus = 'open' | 'closed' | 'locked' | 'archived'
```

### Functions

#### `castVote(userId, targetType, targetId, value)`

Cast a vote — idempotent. If user already voted, replaces value (or noop).

```typescript
function castVote(userId: string, targetType: "thread" | "reply", targetId: string, value: 1 | -1): Promise<{ score: number; } | null>
```

#### `createForumThreadRouter(opts?)`

Express router for forum threads. Pass `isModeratorFor(userId)` to
allow moderator-only operations (pinning, status changes, deleting
others' threads/replies).

```typescript
function createForumThreadRouter(opts?: { isModeratorFor?: (userId: string) => boolean | Promise<boolean>; }): Router
```

#### `createReply(threadId, authorId, data)`

Add a reply (or nested reply) to an open thread; bumps reply_count and last_activity_at.

```typescript
function createReply(threadId: string, authorId: string, data: { body: string; parent_reply_id?: string | null; }): Promise<ForumReplyRow | null>
```

#### `createThread(authorId, data)`

Create a new forum thread and return the persisted row.

```typescript
function createThread(authorId: string, data: { title: string; body: string; category_id?: string | null; }): Promise<ForumThreadRow>
```

#### `deleteReply(replyId, userId, isModerator)`

Soft-delete a reply (body → "[deleted]"); enforces author/moderator ownership.

```typescript
function deleteReply(replyId: string, userId: string, isModerator: boolean): Promise<boolean>
```

#### `deleteThread(threadId, userId, isModerator)`

Delete a thread; enforces author/moderator ownership and returns true on success.

```typescript
function deleteThread(threadId: string, userId: string, isModerator: boolean): Promise<boolean>
```

#### `getThread(threadId)`

Fetch a single forum thread by ID, or null if not found.

```typescript
function getThread(threadId: string): Promise<ForumThreadRow | null>
```

#### `incrementViewCount(threadId)`

Atomically increment the view_count of a thread.

```typescript
function incrementViewCount(threadId: string): Promise<void>
```

#### `listReplies(threadId)`

Return all replies for a thread in chronological order.

```typescript
function listReplies(threadId: string): Promise<ForumReplyRow[]>
```

#### `listThreads(opts)`

List forum threads with optional category/status filtering, sorting, and pagination.

```typescript
function listThreads(opts: { category_id?: string; status?: ThreadStatus; sort?: "recent" | "top" | "pinned"; page?: number; limit?: number; }): Promise<{ data: ForumThreadRow[]; total: number; }>
```

#### `updateThread(threadId, userId, isModerator, patch)`

Apply a partial patch to a thread; enforces author/moderator ownership and returns the updated row.

```typescript
function updateThread(threadId: string, userId: string, isModerator: boolean, patch: Partial<{ title: string; body: string; category_id: string | null; status: ThreadStatus; is_pinned: boolean; }>): Promise<ForumThreadRow | null>
```

### Constants

#### `replyCreateSchema`

Validates the request body for creating a reply on a forum thread.

```typescript
const replyCreateSchema: z.ZodObject<{ body: z.ZodString; parent_reply_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
```

#### `THREAD_STATUSES`

Allowed status values for a forum thread.

```typescript
const THREAD_STATUSES: readonly ["open", "closed", "locked", "archived"]
```

#### `threadCreateSchema`

Validates the request body for creating a new forum thread.

```typescript
const threadCreateSchema: z.ZodObject<{ title: z.ZodString; body: z.ZodString; category_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
```

#### `threadListQuerySchema`

Validates query parameters for listing forum threads with filtering, sorting, and pagination.

```typescript
const threadListQuerySchema: z.ZodObject<{ category_id: z.ZodOptional<z.ZodString>; status: z.ZodOptional<z.ZodEnum<{ open: "open"; closed: "closed"; locked: "locked"; archived: "archived"; }>>; sort: z.ZodOptional<z.ZodEnum<{ recent: "recent"; top: "top"; pinned: "pinned"; }>>; page: z.ZodDefault<z.ZodCoercedNumber<unknown>>; limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>; }, z.core.$strip>
```

#### `threadUpdateSchema`

Validates the request body for updating an existing forum thread.

```typescript
const threadUpdateSchema: z.ZodObject<{ title: z.ZodOptional<z.ZodString>; body: z.ZodOptional<z.ZodString>; category_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; status: z.ZodOptional<z.ZodEnum<{ open: "open"; closed: "closed"; locked: "locked"; archived: "archived"; }>>; is_pinned: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

#### `voteSchema`

Validates the request body for casting a vote (+1 or -1) on a thread or reply.

```typescript
const voteSchema: z.ZodObject<{ value: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<-1>]>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0
