# @molecule/app-ai-copilot

ai-copilot core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-copilot
```

## API

### Interfaces

#### `AICopilotConfig`

Configuration passed to copilot provider methods.

```typescript
interface AICopilotConfig {
  /** Backend endpoint URL for suggestion requests. */
  endpoint: string
  /** Maximum number of suggestions to return per request. */
  maxSuggestions?: number
  /** AI model identifier to use for generation. */
  model?: string
  /** Project identifier for scoped context. */
  projectId?: string
}
```

#### `AICopilotProvider`

Provider interface for inline AI suggestions.

Bond packages implement this interface to supply completions
from different backends (HTTP, WebSocket, local model, etc.).

```typescript
interface AICopilotProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Requests inline suggestions for the given editor context.
   * Results are delivered via the `onEvent` callback as they arrive.
   *
   * @param context - Current editor state (prefix, suffix, language, etc.).
   * @param config - Endpoint, model, and other request-level configuration.
   * @param onEvent - Callback invoked for each suggestion or terminal event.
   * @returns Resolves when the suggestion stream completes.
   */
  getSuggestions(
    context: CopilotContext,
    config: AICopilotConfig,
    onEvent: CopilotEventHandler,
  ): Promise<void>

  /**
   * Notifies the backend that a suggestion was accepted by the user.
   * Used for analytics and model improvement.
   *
   * @param suggestion - The accepted suggestion.
   * @param config - Request-level configuration.
   */
  acceptSuggestion(suggestion: CopilotSuggestion, config: AICopilotConfig): Promise<void>

  /**
   * Notifies the backend that a suggestion was dismissed by the user.
   *
   * @param suggestion - The rejected suggestion.
   * @param config - Request-level configuration.
   */
  rejectSuggestion(suggestion: CopilotSuggestion, config: AICopilotConfig): Promise<void>

  /**
   * Cancels any in-flight suggestion request.
   */
  abort(): void
}
```

#### `CopilotContext`

Context sent to the copilot provider to generate suggestions.
Mirrors the information available in a typical code editor.

```typescript
interface CopilotContext {
  /** Document content before the cursor position. */
  prefix: string
  /** Document content after the cursor position. */
  suffix: string
  /** Language identifier (e.g., "typescript", "python"). */
  language?: string
  /** File path or name for additional context. */
  filePath?: string
  /** Cursor line (0-based). */
  cursorLine?: number
  /** Cursor column (0-based). */
  cursorColumn?: number
}
```

#### `CopilotRange`

A range within a document, using 0-based line and column numbers.

```typescript
interface CopilotRange {
  /** Start line (0-based). */
  startLine: number
  /** Start column (0-based). */
  startColumn: number
  /** End line (0-based). */
  endLine: number
  /** End column (0-based). */
  endColumn: number
}
```

#### `CopilotSuggestion`

A single inline suggestion returned by the copilot provider.

```typescript
interface CopilotSuggestion {
  /** Unique identifier for this suggestion. */
  id: string
  /** The suggested text to insert or replace. */
  text: string
  /** Document range to replace. When omitted, text is inserted at the cursor. */
  range?: CopilotRange
  /** Short display label (e.g., for a suggestion list UI). */
  label?: string
  /** Arbitrary provider-specific metadata. */
  metadata?: Record<string, unknown>
}
```

### Types

#### `CopilotEvent`

Discriminated union of events emitted during suggestion generation.

```typescript
type CopilotEvent =
  | { type: 'suggestion'; suggestion: CopilotSuggestion }
  | { type: 'suggestions'; suggestions: CopilotSuggestion[] }
  | { type: 'done' }
  | { type: 'error'; message: string }
```

#### `CopilotEventHandler`

Callback for receiving copilot events during streaming.

```typescript
type CopilotEventHandler = (event: CopilotEvent) => void
```

### Functions

#### `getProvider()`

Returns the current copilot provider, or `null` if none is registered.

```typescript
function getProvider(): AICopilotProvider | null
```

**Returns:** The registered provider or null.

#### `hasProvider()`

Checks whether a copilot provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is available.

#### `requireProvider()`

Returns the current copilot provider or throws if none is registered.

```typescript
function requireProvider(): AICopilotProvider
```

**Returns:** The registered provider.

#### `setProvider(provider)`

Registers the active copilot provider.

```typescript
function setProvider(provider: AICopilotProvider): void
```

- `provider` — The provider instance to register.
