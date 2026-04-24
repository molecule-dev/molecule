# @molecule/app-ai-assistant

ai-assistant core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-assistant
```

## API

### Interfaces

#### `AIAssistantConfig`

Configuration for the AI assistant provider.

```typescript
interface AIAssistantConfig {
  /** API endpoint for sending messages. */
  endpoint: string
  /** Panel position. Defaults to 'right'. */
  position?: AssistantPanelPosition
  /** System-level context string prepended to conversations. */
  systemContext?: string
  /** Initial suggestions to display before the first message. */
  suggestions?: AssistantSuggestion[]
  /** Maximum number of messages to retain in the conversation. */
  maxMessages?: number
  /** Whether to persist the session across page reloads. Defaults to true. */
  persistSession?: boolean
  /** Session key for storage. Defaults to 'mol-assistant'. */
  sessionKey?: string
  /** Custom HTTP headers for API requests. */
  headers?: Record<string, string>
}
```

#### `AIAssistantProvider`

AI assistant provider interface.

Implementations manage panel lifecycle, messaging, context, and state.
Bond packages implement this interface and register via
`setProvider()` during app initialization.

```typescript
interface AIAssistantProvider {
  /** Provider name identifier. */
  readonly name: string

  /** Open the assistant panel. */
  open(config: AIAssistantConfig): void

  /** Close the assistant panel. */
  close(): void

  /** Toggle the assistant panel open/closed. */
  toggle(config: AIAssistantConfig): void

  /**
   * Send a message and stream the response.
   *
   * @param message - The user's message text
   * @param config - Assistant configuration
   * @param onEvent - Callback for stream events
   * @returns Promise that resolves when the stream completes
   */
  sendMessage(
    message: string,
    config: AIAssistantConfig,
    onEvent: AssistantEventHandler,
  ): Promise<void>

  /** Abort the current streaming response. */
  abort(): void

  /**
   * Set the current context items.
   * Context is included in subsequent messages to provide relevance.
   *
   * @param context - Array of context items
   */
  setContext(context: AssistantContext[]): void

  /** Clear all context items. */
  clearContext(): void

  /**
   * Clear the conversation history.
   *
   * @param config - Assistant configuration
   */
  clearHistory(config: AIAssistantConfig): Promise<void>

  /**
   * Load the conversation history from the backend.
   *
   * @param config - Assistant configuration
   * @returns Array of past messages
   */
  loadHistory(config: AIAssistantConfig): Promise<AssistantMessage[]>

  /** Get the current panel state snapshot. */
  getState(): AssistantPanelState

  /**
   * Subscribe to panel state changes.
   *
   * @param listener - Callback invoked on every state change
   * @returns Unsubscribe function
   */
  subscribe(listener: AssistantStateListener): () => void
}
```

#### `AssistantContext`

A contextual item describing what the user is currently looking at.
Providers use context to enrich prompts with relevant information.

```typescript
interface AssistantContext {
  /** Context category (e.g. 'page', 'file', 'selection', 'error'). */
  type: string
  /** Human-readable label for the context item. */
  label: string
  /** The actual context value (path, code snippet, URL, etc.). */
  value: string
  /** Additional metadata for the context item. */
  metadata?: Record<string, unknown>
}
```

#### `AssistantMessage`

A single message in the assistant conversation.

```typescript
interface AssistantMessage {
  /** Unique message identifier. */
  id: string
  /** Who sent the message. */
  role: 'user' | 'assistant' | 'system'
  /** Text content of the message. */
  content: string
  /** Unix timestamp in milliseconds. */
  timestamp: number
  /** Whether the message is currently being streamed. */
  isStreaming?: boolean
  /** Whether the stream was aborted before completion. */
  aborted?: boolean
}
```

#### `AssistantPanelState`

Snapshot of the assistant panel state.

```typescript
interface AssistantPanelState {
  /** Whether the panel is currently visible. */
  isOpen: boolean
  /** Panel position. */
  position: AssistantPanelPosition
  /** Conversation messages. */
  messages: AssistantMessage[]
  /** Whether a response is currently streaming. */
  isLoading: boolean
  /** Current error message, if any. */
  error: string | null
  /** Current suggestions to display. */
  suggestions: AssistantSuggestion[]
  /** Active context items. */
  context: AssistantContext[]
}
```

#### `AssistantSuggestion`

A suggested action the user can take.
Displayed as quick-action chips in the assistant panel.

```typescript
interface AssistantSuggestion {
  /** Unique suggestion identifier. */
  id: string
  /** Short label displayed on the chip. */
  label: string
  /** Optional longer description shown on hover. */
  description?: string
  /** The message to send when the suggestion is activated. */
  action: string
  /** Optional icon identifier. */
  icon?: string
}
```

### Types

#### `AssistantEventHandler`

Callback for receiving stream events.

```typescript
type AssistantEventHandler = (event: AssistantStreamEvent) => void
```

#### `AssistantPanelPosition`

Position of the assistant panel relative to the viewport.

```typescript
type AssistantPanelPosition = 'right' | 'left' | 'bottom' | 'floating'
```

#### `AssistantStateListener`

Listener for panel state changes.

```typescript
type AssistantStateListener = (state: AssistantPanelState) => void
```

#### `AssistantStreamEvent`

Stream events emitted during an assistant response.

```typescript
type AssistantStreamEvent =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string }
  | { type: 'suggestion'; suggestions: AssistantSuggestion[] }
  | { type: 'done'; usage?: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string }
```

### Functions

#### `getProvider()`

Get the active AI assistant provider, or null if none is registered.

```typescript
function getProvider(): AIAssistantProvider | null
```

**Returns:** The current provider or null

#### `hasProvider()`

Check whether an AI assistant provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** True if a provider is available

#### `requireProvider()`

Get the active AI assistant provider, throwing if none is registered.

```typescript
function requireProvider(): AIAssistantProvider
```

**Returns:** The current provider

#### `setProvider(provider)`

Register the active AI assistant provider.

```typescript
function setProvider(provider: AIAssistantProvider): void
```

- `provider` — The provider instance to register
