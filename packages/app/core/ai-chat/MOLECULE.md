# @molecule/app-ai-chat

AI chat core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-chat
```

## API

### Interfaces

#### `AttachmentMeta`

Attachment metadata stored in message history (no base64 data).

```typescript
interface AttachmentMeta {
  /** Original filename. */
  filename: string
  /** MIME type. */
  mediaType: string
  /** File size in bytes. */
  size: number
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
  filename: string
  /** File size in bytes (for validation and display). */
  size: number
}
```

#### `ChatConfig`

Configuration for a chat session, including the API endpoint,
project context, and optional model/prompt overrides.

```typescript
interface ChatConfig {
  /** API endpoint for sending messages. */
  endpoint: string
  /** Project ID for context. */
  projectId?: string
  /** System prompt override. */
  systemPrompt?: string
  /** AI model to use. */
  model?: string
}
```

#### `ChatMessage`

A single message in a chat conversation, including role, content,
and optional tool-call metadata.

```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  /** Ordered sequence of text and tool-call blocks, preserving interleaved order. */
  blocks?: MessageBlock[]
  toolCalls?: ToolCall[]
  isStreaming?: boolean
  /** Set when the user aborted the response mid-stream. */
  aborted?: boolean
  /** Set when the agentic loop hit its iteration limit before finishing. */
  loopLimitReached?: number
  /** Persisted commit record for display in conversation history. */
  commitRecord?: { message: string; files: string[] }
  commitSuggestion?: CommitSuggestion
  /** File attachments sent with this message (metadata only — no base64 data in history). */
  attachments?: AttachmentMeta[]
}
```

#### `ChatProvider`

AI chat provider interface that all chat bond packages must implement.
Provides streaming message sending, abort, and conversation history management.

```typescript
interface ChatProvider {
  readonly name: string

  /** Sends a message and streams the response via the event handler. */
  sendMessage(
    message: string,
    config: ChatConfig,
    onEvent: ChatEventHandler,
    attachments?: ChatAttachment[],
  ): Promise<void>

  /** Aborts the current streaming response. */
  abort(): void

  /** Clears the conversation history on the server. */
  clearHistory(config: ChatConfig): Promise<void>

  /** Loads the conversation history from the server. */
  loadHistory(config: ChatConfig): Promise<ChatMessage[]>
}
```

#### `ChatState`

Reactive state for a chat session, including messages, loading state,
error state, and WebSocket connection status.

```typescript
interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
}
```

#### `CommitSuggestion`

A suggested git commit after file changes, shown to the user for one-click committing.

```typescript
interface CommitSuggestion {
  files: string[]
  message?: string
  status: 'pending' | 'committing' | 'committed' | 'error'
}
```

#### `ToolCall`

A tool invocation within an assistant message, tracking its lifecycle
from pending through completion or error.

```typescript
interface ToolCall {
  id: string
  name: string
  input: unknown
  output?: unknown
  status: 'pending' | 'running' | 'done' | 'error'
  /** Snapshot of original/modified file content captured at tool-call time (not sent to AI). */
  fileDiff?: { original: string; modified: string }
}
```

### Types

#### `ChatEventHandler`

Callback invoked for each event in a streaming chat response.

```typescript
type ChatEventHandler = (event: ChatStreamEvent) => void
```

#### `ChatStreamEvent`

Discriminated union of events emitted during a streaming chat response.
Events include text chunks, tool invocations, tool results, completion,
and errors.

```typescript
type ChatStreamEvent =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; output: unknown }
  | { type: 'file_diff'; path: string; oldContent: string | null; newContent: string }
  | { type: 'commit_suggestion'; files: string[] }
  | { type: 'mode'; mode: 'plan' | 'execute' }
  | { type: 'loop_limit_reached'; maxLoops: number }
  | { type: 'done'; usage?: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string }
```

#### `MessageBlock`

An ordered block within an assistant message, preserving the interleaved
sequence of text chunks and tool calls as they were received from the stream.

```typescript
type MessageBlock =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; id: string }
  | { type: 'thinking'; content: string }
```

### Functions

#### `getProvider()`

Retrieves the bonded AI chat provider, or `null` if none is bonded.

```typescript
function getProvider(): ChatProvider | null
```

**Returns:** The bonded chat provider, or `null`.

#### `hasProvider()`

Checks whether an AI chat provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an AI chat provider is bonded.

#### `requireProvider()`

Retrieves the bonded AI chat provider, throwing if none is configured.

```typescript
function requireProvider(): ChatProvider
```

**Returns:** The bonded chat provider.

#### `setProvider(provider)`

Registers an AI chat provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: ChatProvider): void
```

- `provider` — The chat provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| HTTP | `@molecule/app-ai-chat-http` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-ai-chat`.
