# @molecule/app-ai-copilot-default

Default ai-copilot provider for molecule.dev — HTTP/SSE inline AI
suggestions from YOUR backend.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-ai-copilot'
import { createProvider } from '@molecule/app-ai-copilot-default'

// There is NO pre-instantiated `provider` export in this package —
// wire the factory result:
setProvider(createProvider()) // at startup; same-origin base URL
// setProvider(createProvider({ baseUrl, headers })) to customize
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-copilot-default @molecule/app-ai-copilot @molecule/app-i18n
```

## API

### Interfaces

#### `DefaultCopilotConfig`

Configuration for the default HTTP-based copilot provider.

```typescript
interface DefaultCopilotConfig {
  /** Base URL for API requests. Defaults to `''` (same origin). */
  baseUrl?: string
  /** Custom headers to include in every request. */
  headers?: Record<string, string>
}
```

### Classes

#### `DefaultCopilotProvider`

HTTP/SSE-based copilot provider. Sends document context via POST and
reads SSE streams for real-time inline suggestions.

### Functions

#### `createProvider(config)`

Creates a DefaultCopilotProvider instance.

```typescript
function createProvider(config?: DefaultCopilotConfig): DefaultCopilotProvider
```

- `config` — Optional provider-level configuration (base URL, headers).

**Returns:** A new DefaultCopilotProvider.

## Core Interface
Implements `@molecule/app-ai-copilot` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-copilot` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/app-ai-copilot`
- `@molecule/app-i18n`

Server contract: `getSuggestions` POSTs `{ prefix, suffix, language,
filePath?, cursorLine?, cursorColumn?, model?, maxSuggestions?,
projectId? }` to `config.endpoint` and reads an SSE stream of
`data: <CopilotEvent JSON>` lines. `acceptSuggestion` /
`rejectSuggestion` POST `{ suggestionId, action: 'accept' | 'reject',
text?, metadata }` to `${config.endpoint}/feedback` — best-effort, errors
are swallowed, so implement the route (or expect silent no-ops).
`getSuggestions` auto-aborts the previous in-flight request; still call
`abort()` on keystrokes you debounce away (see `@molecule/app-ai-copilot`).

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
