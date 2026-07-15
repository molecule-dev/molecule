# @molecule/api-resource-ai-conversation

Conversation resource for molecule.dev.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-ai-conversation @molecule/api-ai @molecule/api-bond @molecule/api-database @molecule/api-i18n @molecule/api-locales-ai-conversation @molecule/api-logger @molecule/api-resource
```

## API

### Interfaces

#### `AIContext`

AI context carried across a conversation: system prompt, tool state, and model selection.

```typescript
interface AIContext {
  system?: string
  toolState?: Record<string, unknown>
  model?: string
}
```

#### `ChatAttachment`

A file attachment sent with a chat message.

```typescript
interface ChatAttachment {
  /** MIME type (e.g., 'image/jpeg', 'application/pdf'). */
  mediaType: string
  /** Base64-encoded file data (no data-URL prefix). */
  data: string
  /** Original filename for display. */
  filename?: string
}
```

#### `ChatMessage`

A single message in a conversation (user, assistant, or system) with optional tool call data.

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: Array<{
    id: string
    name: string
    input: unknown
    output?: unknown
  }>
  /** File attachment metadata (no base64 data — for display in history). */
  attachments?: Array<{ filename: string; mediaType: string; size: number }>
  timestamp: string
}
```

#### `Conversation`

A conversation record containing messages, AI context, and project association.

```typescript
interface Conversation {
  id: string
  projectId: string
  messages: ChatMessage[]
  aiContext: AIContext
  createdAt: string
  updatedAt: string
}
```

#### `SendMessageInput`

Input payload for sending a message to a conversation (message text and optional model override).

```typescript
interface SendMessageInput {
  message: string
  model?: string
  /** File attachments (images, PDFs, audio, video) to include with the message. */
  attachments?: ChatAttachment[]
}
```

### Functions

#### `authUser(req, res, next)`

Object-level authorization middleware for a project's conversation routes
(`/projects/:projectId/chat`).

Delegates to {@link ensureProjectAccess}: calls `next()` only when the caller
is authenticated and owns the project, otherwise the request is rejected with
`401`/`403`. This is the shipped default referenced by `routes.ts` for the
`chat`/`history`/`clear` routes, mirroring `@molecule/api-resource-project`'s
`authUser`, so generated apps do NOT expose other tenants' conversations (or
allow unauthenticated AI cost abuse) by default.

```typescript
function authUser(req: MoleculeRequest, res: MoleculeResponse, next: MoleculeNextFunction): Promise<void>
```

- `req` — The request object (uses `params.projectId`).
- `res` — The response object (reads `locals.session`, writes `locals.project`).
- `next` — Passes control to the next handler on success.

#### `chat(req, res)`

Sends a message to a conversation and streams the AI response via SSE.

```typescript
function chat(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object.
- `res` — The response object.

#### `clear(req, res)`

Deletes a conversation and all its messages for a given project.

```typescript
function clear(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object.
- `res` — The response object.

#### `ensureProjectAccess(req, res)`

Verifies the caller is authenticated AND owns the project named by
`req.params.projectId`, sending the appropriate failure response if not.

Fails closed: looks up the project scoped to BOTH the route's `projectId` and
the authenticated `session.userId`, so a row is returned only when the caller
owns it. On success the owned row is stashed in `res.locals.project` (avoiding a
second query downstream) and `true` is returned. Otherwise it writes `401` (no
session) or `403` (project missing or owned by someone else — deliberately
indistinguishable so existence is not leaked) and returns `false`.

This is the single source of truth shared by the {@link authUser} route
middleware and the in-handler defense-in-depth checks, so every entry point
fails closed identically even if a route middleware is dropped by codegen.

```typescript
function ensureProjectAccess(req: MoleculeRequest, res: MoleculeResponse): Promise<boolean>
```

- `req` — The request object (uses `params.projectId`).
- `res` — The response object (reads `locals.session`, writes `locals.project`).

**Returns:** `true` when authorized (response untouched); `false` when a 401/403 was sent.

#### `history(req, res)`

Returns the full message history for a project's conversation.

```typescript
function history(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object.
- `res` — The response object.

#### `read(req, res)`

Reads a single conversation by project ID, returning 404 if not found.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object.
- `res` — The response object.

#### `update(req, res)`

Updates a conversation's AI context (system prompt, model, tool state).

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object.
- `res` — The response object.

### Constants

#### `i18nRegistered`

The i18n registered.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Map of request handler names to implementations. `authUser` is the
object-level authorization middleware referenced by `routes.ts` for the
`chat`/`history`/`clear` routes — registering it here keeps the codegen
scanner from stripping it (it only keeps middlewares that are keys of this
map), so generated apps actually gate the routes.

```typescript
const requestHandlerMap: { readonly chat: typeof chat; readonly history: typeof history; readonly read: typeof read; readonly update: typeof update; readonly clear: typeof clear; readonly authUser: typeof authUser; }
```

#### `routes`

Route array for conversation endpoints: POST chat (SSE streaming), GET history, DELETE clear.

All three are gated by `authUser`, the object-level authorization middleware
(see `authorizers/authUser.ts`) that fails closed — it requires an authenticated
session AND verifies the caller owns `:projectId`, 401/403ing otherwise. It is a
key of `requestHandlerMap`, so the codegen scanner keeps it (a bare
`'authenticate'` token that isn't a handler key was being stripped, shipping
these routes UNGATED: unauthenticated AI cost abuse + cross-tenant IDOR). The
handlers also re-check ownership inline (`ensureProjectAccess`) so they stay
secure even if a middleware is dropped.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/projects/:projectId/chat"; readonly handler: "chat"; readonly middlewares: readonly ["authUser"]; }, { readonly method: "get"; readonly path: "/projects/:projectId/chat"; readonly handler: "history"; readonly middlewares: readonly ["authUser"]; }, { readonly method: "delete"; readonly path: "/projects/:projectId/chat"; readonly handler: "clear"; readonly middlewares: readonly ["authUser"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `@molecule/api-locales-ai-conversation` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bond`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-ai-conversation`
- `@molecule/api-logger`
- `@molecule/api-resource`
