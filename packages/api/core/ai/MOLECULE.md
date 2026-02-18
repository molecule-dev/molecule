# @molecule/api-ai

Model-agnostic AI chat interface for molecule.dev.

Defines the `AIProvider` interface that bond packages (Anthropic, OpenAI, etc.)
implement, plus types for messages, streaming events, tool use, and token usage.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai
```

## Usage

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
  system?: string
  stream?: boolean
  maxTokens?: number
  temperature?: number
  model?: string
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

#### `TokenUsage`

Token usage from a chat completion.

```typescript
interface TokenUsage {
  inputTokens: number
  outputTokens: number
}
```

### Types

#### `ChatEvent`

Streaming event from an AI chat call.

```typescript
type ChatEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'done'; usage: TokenUsage }
  | { type: 'error'; message: string; errorKey?: string }
```

#### `ContentBlock`

Rich content block within a message.

```typescript
type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string | unknown }
```

### Functions

#### `getProvider()`

Retrieves the bonded AI provider, or `null` if none is bonded.

```typescript
function getProvider(): AIProvider | null
```

**Returns:** The bonded AI provider, or `null`.

#### `hasProvider()`

Checks whether an AI provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an AI provider is bonded.

#### `requireProvider()`

Retrieves the bonded AI provider, throwing if none is bonded.
Use this when AI functionality is required.

```typescript
function requireProvider(): AIProvider
```

**Returns:** The bonded AI provider.

#### `setProvider(provider)`

Registers an AI provider as the active singleton. Called by bond packages
during application startup.

```typescript
function setProvider(provider: AIProvider): void
```

- `provider` — The AI provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Anthropic | `@molecule/api-ai-anthropic` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-ai`.
