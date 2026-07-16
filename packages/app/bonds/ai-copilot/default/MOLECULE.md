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
