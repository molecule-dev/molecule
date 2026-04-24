# @molecule/api-ai

Model-agnostic AI chat interface for molecule.dev.

Defines the `AIProvider` interface that bond packages (Anthropic, OpenAI, etc.)
implement, plus types for messages, streaming events, tool use, and token usage.

## Quick Start

```typescript
import { requireProvider } from '@molecule/api-ai'
import type { ChatParams } from '@molecule/api-ai'

const ai = requireProvider()
const params: ChatParams = {
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true,
}
for await (const event of ai.chat(params)) {
  if (event.type === 'text') process.stdout.write(event.content)
}
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai
```

## API

### Interfaces

#### `AIConfig`

AI provider configuration.

```typescript
interface AIConfig {
  /** Default model to use when not specified in ChatParams. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Default temperature. */
  temperature?: number
}
```

#### `AIProvider`

AI provider interface.

Each bond package (Anthropic, OpenAI, Gemini, etc.) implements
this interface to provide model-specific chat functionality.

```typescript
interface AIProvider {
  readonly name: string

  /**
   * Send a chat request and stream back events.
   *
   * Returns an async iterable of ChatEvent objects.
   * Always yields a final 'done' event with token usage.
   * @returns An async iterable that yields `ChatEvent` objects (text chunks, tool calls, done, or error).
   */
  chat(params: ChatParams): AsyncIterable<ChatEvent>
}
```

#### `AITool`

Tool definition that the AI model can invoke.

```typescript
interface AITool {
  name: string
  description: string
  parameters: JSONSchema
  execute: (input: unknown) => Promise<unknown>
}
```

#### `ChatMessage`

Chat message in a conversation.

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
}
```

#### `ChatParams`

Parameters for a chat call.

```typescript
interface ChatParams {
  messages: ChatMessage[]
  tools?: AITool[]
  /** Provider-native server tools (e.g. web search) — executed by the provider, not the caller. */
  serverTools?: ServerTool[]
  system?: string
  stream?: boolean
  maxTokens?: number
  temperature?: number
  model?: string
  /** Enable extended thinking. Only supported by Sonnet/Opus models. */
  thinking?: { type: 'enabled'; budgetTokens: number }
  /** Enable prompt caching. Providers that support it will cache system prompts and tools. */
  cacheControl?: { type: 'ephemeral' }
  /** Abort signal to cancel in-flight API requests when the client disconnects. */
  signal?: AbortSignal
}
```

#### `JSONSchema`

JSON Schema subset for tool parameter definitions.

```typescript
interface JSONSchema {
  type: string
  properties?: Record<string, JSONSchema>
  items?: JSONSchema
  required?: string[]
  description?: string
  enum?: unknown[]
  [key: string]: unknown
}
```

#### `ServerTool`

Provider-native tool handled server-side (e.g., Anthropic's `web_search`).

Unlike `AITool`, server tools are executed by the AI provider itself —
no client-side `execute` callback is needed. The provider passes them
through to the API alongside custom tools.

```typescript
interface ServerTool {
  /** Provider-specific tool type identifier (e.g. `"web_search_20250305"`). */
  type: string
  /** Tool name. */
  name: string
  /** Allow additional provider-specific fields (max_uses, etc.). */
  [key: string]: unknown
}
```

#### `TokenUsage`

Token usage from a chat completion.

```typescript
interface TokenUsage {
  inputTokens: number
  outputTokens: number
  /** Number of input tokens written to the prompt cache. */
  cacheCreationInputTokens?: number
  /** Number of input tokens read from the prompt cache. */
  cacheReadInputTokens?: number
}
```

### Types

#### `ChatEvent`

Streaming event from an AI chat call.

```typescript
type ChatEvent =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'done'; usage: TokenUsage }
  | { type: 'error'; message: string; errorKey?: string }
  | { type: 'keep_alive' }
```

#### `ContentBlock`

Rich content block within a message.

Includes text, tool interactions, and file attachments (images, documents,
audio, video). Provider bonds map these generic blocks to their native API
format (e.g., Anthropic base64 source, OpenAI image_url, etc.).

```typescript
type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: string; data: string }
  | { type: 'document'; mediaType: string; data: string; filename?: string }
  | { type: 'audio'; mediaType: string; data: string }
  | { type: 'video'; mediaType: string; data: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string | unknown }
```

### Functions

#### `getAllProviders()`

Retrieves all named AI providers as a Map keyed by provider name.

```typescript
function getAllProviders(): Map<string, AIProvider>
```

**Returns:** Map of provider name → AIProvider.

#### `getProvider()`

Retrieves the singleton AI provider, or `null` if none is bonded.

```typescript
function getProvider(): AIProvider | null
```

**Returns:** The bonded AI provider, or `null`.

#### `getProviderByName(name)`

Retrieves a named AI provider, or `null` if not bonded.

```typescript
function getProviderByName(name: string): AIProvider | null
```

- `name` — The provider name (e.g. `'anthropic'`, `'xai'`).

**Returns:** The named AI provider, or `null`.

#### `hasProvider(name)`

Checks whether an AI provider is currently bonded.

```typescript
function hasProvider(name?: string): boolean
```

- `name` — Optional provider name. If omitted, checks the singleton.

**Returns:** `true` if the provider is bonded.

#### `requireProvider()`

Retrieves the bonded AI provider, throwing if none is bonded.
Use this when AI functionality is required.

```typescript
function requireProvider(): AIProvider
```

**Returns:** The bonded AI provider.

#### `setProvider(provider)`

Registers an AI provider in singleton mode.

- **Singleton**: `setProvider(provider)` — bonds a single default provider.

```typescript
function setProvider(provider: AIProvider): void
```

- `provider` — The default provider implementation for this process.

## Available Providers

| Provider | Package |
|----------|---------|
| Anthropic | `@molecule/api-ai-anthropic` |
| xAI | `@molecule/api-ai-xai` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-ai`.
