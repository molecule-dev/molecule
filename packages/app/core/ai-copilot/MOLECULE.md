# @molecule/app-ai-copilot

Inline AI suggestion (copilot) core interface for molecule.dev.

Defines the `AICopilotProvider` contract for editor-style inline completions:
`getSuggestions(context, config, onEvent)` streams suggestions for a
prefix/suffix cursor context; `acceptSuggestion` / `rejectSuggestion` report
the user's choice back to your API; `abort()` cancels the in-flight request.
HEADLESS: your editor integration renders and inserts the suggestion text.

## Quick Start

```typescript
import { requireProvider, setProvider } from '@molecule/app-ai-copilot'
import { createProvider } from '@molecule/app-ai-copilot-default'

setProvider(createProvider()) // at startup

const copilot = requireProvider()
copilot.abort() // cancel any stale request before asking again
await copilot.getSuggestions(
  { prefix: textBeforeCursor, suffix: textAfterCursor, language: 'typescript' },
  { endpoint: '/api/copilot' },
  (event) => {
    if (event.type === 'suggestion') showGhostText(event.suggestion.text)
  },
)
```

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

## Available Providers

| Provider | Package |
|----------|---------|
| Ai Copilot | `@molecule/app-ai-copilot-default` |

## Injection Notes

- **Wire it with THIS package's `setProvider()` — NOT `bond('ai-copilot', …)`.**
  This core keeps its own local singleton and does not read the
  `@molecule/app-bond` registry; `requireProvider()` throws until
  `setProvider()` has run.
- **Suggestions come from YOUR backend** (`config.endpoint`), which calls the
  AI provider server-side (see `@molecule/api-ai`) — no vendor key in the
  browser.
- **Debounce keystrokes and `abort()` before every new request.** An
  un-aborted stale request races the fresh one and inserts outdated text at
  the wrong cursor position.
- Suggested text is MODEL OUTPUT — insert it as plain text; never execute or
  eval it, and validate anything it triggers server-side.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Typing in the editor fires `getSuggestions(context, config, onEvent)`
  and the returned `CopilotSuggestion.text` renders as ghost/inline text
  anchored to the suggestion's `range` (CopilotRange) — or the caret when
  `range` is omitted — never at a stale or wrong offset.
- [ ] Accepting the suggestion (e.g. Tab) inserts EXACTLY `suggestion.text`
  at that `range`/caret and nothing stale, and fires
  `acceptSuggestion(suggestion, config)`; the buffer holds only the accepted
  text with no leftover ghost preview.
- [ ] Continuing to type or explicitly dismissing removes the ghost cleanly
  and calls `abort()` so the in-flight request is cancelled before the next
  `getSuggestions` — a late-arriving stale suggestion never lands at the
  moved cursor, and `rejectSuggestion(suggestion, config)` reports the miss.
- [ ] The suggestion is context-aware, not generic: it reflects the real
  `CopilotContext` (`prefix`/`suffix`/`language` around the cursor), so
  editing the surrounding code visibly changes what gets proposed.
- [ ] With copilot disabled (no provider bonded, or the app's config/toggle
  off) no ghost text ever appears and typing stays completely unaffected.
- [ ] A provider error (an `onEvent` `{ type: 'error' }`) fails quietly — no
  ghost text, no thrown exception in the editor, the buffer is untouched, and
  the user can keep typing.
- [ ] Correctness/security: accepted text is inserted ONLY at the intended
  `CopilotRange` (it never overwrites unrelated lines), and `suggestion.text`
  is treated as plain model output — inserted as text, never eval'd or run as
  trusted code by the copilot itself.
