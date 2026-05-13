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

```typescript
function createReply(threadId: string, authorId: string, data: { body: string; parent_reply_id?: string | null; }): Promise<ForumReplyRow | null>
```

#### `createThread(authorId, data)`

```typescript
function createThread(authorId: string, data: { title: string; body: string; category_id?: string | null; }): Promise<ForumThreadRow>
```

#### `deleteReply(replyId, userId, isModerator)`

```typescript
function deleteReply(replyId: string, userId: string, isModerator: boolean): Promise<boolean>
```

#### `deleteThread(threadId, userId, isModerator)`

```typescript
function deleteThread(threadId: string, userId: string, isModerator: boolean): Promise<boolean>
```

#### `getThread(threadId)`

```typescript
function getThread(threadId: string): Promise<ForumThreadRow | null>
```

#### `incrementViewCount(threadId)`

```typescript
function incrementViewCount(threadId: string): Promise<void>
```

#### `listReplies(threadId)`

```typescript
function listReplies(threadId: string): Promise<ForumReplyRow[]>
```

#### `listThreads(opts)`

```typescript
function listThreads(opts: { category_id?: string; status?: ThreadStatus; sort?: "recent" | "top" | "pinned"; page?: number; limit?: number; }): Promise<{ data: ForumThreadRow[]; total: number; }>
```

#### `updateThread(threadId, userId, isModerator, patch)`

```typescript
function updateThread(threadId: string, userId: string, isModerator: boolean, patch: Partial<{ title: string; body: string; category_id: string | null; status: ThreadStatus; is_pinned: boolean; }>): Promise<ForumThreadRow | null>
```

### Constants

#### `replyCreateSchema`

```typescript
const replyCreateSchema: z.ZodObject<{ body: z.ZodString; parent_reply_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, "strip", z.ZodTypeAny, { body: string; parent_reply_id?: string | null | undefined; }, { body: string; parent_reply_id?: string | null | undefined; }>
```

#### `THREAD_STATUSES`

```typescript
const THREAD_STATUSES: readonly ["open", "closed", "locked", "archived"]
```

#### `threadCreateSchema`

```typescript
const threadCreateSchema: z.ZodObject<{ title: z.ZodString; body: z.ZodString; category_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, "strip", z.ZodTypeAny, { title: string; body: string; category_id?: string | null | undefined; }, { title: string; body: string; category_id?: string | null | undefined; }>
```

#### `threadListQuerySchema`

```typescript
const threadListQuerySchema: z.ZodObject<{ category_id: z.ZodOptional<z.ZodString>; status: z.ZodOptional<z.ZodEnum<["open", "closed", "locked", "archived"]>>; sort: z.ZodOptional<z.ZodEnum<["recent", "top", "pinned"]>>; page: z.ZodDefault<z.ZodNumber>; limit: z.ZodDefault<z.ZodNumber>; }, "strip", z.ZodTypeAny, { page: number; limit: number; category_id?: string | undefined; sort?: "recent" | "top" | "pinned" | undefined; status?: "open" | "closed" | "locked" | "archived" | undefined; }, { category_id?: string | undefined; sort?: "recent" | "top" | "pinned" | undefined; status?: "open" | "closed" | "locked" | "archived" | undefined; page?: number | undefined; limit?: number | undefined; }>
```

#### `threadUpdateSchema`

```typescript
const threadUpdateSchema: z.ZodObject<{ title: z.ZodOptional<z.ZodString>; body: z.ZodOptional<z.ZodString>; category_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; status: z.ZodOptional<z.ZodEnum<["open", "closed", "locked", "archived"]>>; is_pinned: z.ZodOptional<z.ZodBoolean>; }, "strip", z.ZodTypeAny, { title?: string | undefined; body?: string | undefined; category_id?: string | null | undefined; status?: "open" | "closed" | "locked" | "archived" | undefined; is_pinned?: boolean | undefined; }, { title?: string | undefined; body?: string | undefined; category_id?: string | null | undefined; status?: "open" | "closed" | "locked" | "archived" | undefined; is_pinned?: boolean | undefined; }>
```

#### `voteSchema`

```typescript
const voteSchema: z.ZodObject<{ value: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<-1>]>; }, "strip", z.ZodTypeAny, { value: 1 | -1; }, { value: 1 | -1; }>
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
