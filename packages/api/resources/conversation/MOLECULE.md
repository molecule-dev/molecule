# @molecule/api-resource-conversation

Conversation resource for molecule.dev.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-conversation
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
}
```

### Functions

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

Map of request handler.

```typescript
const requestHandlerMap: { readonly chat: typeof chat; readonly history: typeof history; readonly read: typeof read; readonly update: typeof update; readonly clear: typeof clear; }
```

#### `routes`

Route array for conversation endpoints: POST chat (SSE streaming), GET history, DELETE clear.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/projects/:projectId/chat"; readonly handler: "chat"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/projects/:projectId/chat"; readonly handler: "history"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/projects/:projectId/chat"; readonly handler: "clear"; readonly middlewares: readonly ["authenticate"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-conversation` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
