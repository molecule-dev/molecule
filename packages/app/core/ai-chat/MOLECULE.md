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
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}
```

#### `ChatProvider`

AI chat provider interface that all chat bond packages must implement.
Provides streaming message sending, abort, and conversation history management.

```typescript
interface ChatProvider {
  readonly name: string

  /** Sends a message and streams the response via the event handler. */
  sendMessage(message: string, config: ChatConfig, onEvent: ChatEventHandler): Promise<void>

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
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; output: unknown }
  | { type: 'done'; usage?: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string }
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
