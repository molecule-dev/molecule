# @molecule/app-ai-chat-http

HTTP/SSE AI chat provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-chat-http @molecule/app-ai-chat @molecule/app-i18n
```

## API

### Interfaces

#### `HttpChatConfig`

Configuration for http chat.

```typescript
interface HttpChatConfig {
  /** Base URL for API requests. Defaults to '' (same origin). */
  baseUrl?: string
  /** Custom headers to include in requests. */
  headers?: Record<string, string>
}
```

### Classes

#### `HttpChatProvider`

HTTP/SSE-based implementation of `ChatProvider`. Sends messages via POST to a backend
endpoint and reads SSE (Server-Sent Events) streams for real-time AI responses.

### Functions

#### `createProvider(config)`

Creates an `HttpChatProvider` instance with optional base URL and custom headers.

```typescript
function createProvider(config?: HttpChatConfig): HttpChatProvider
```

- `config` — HTTP-specific chat configuration (base URL, headers).

**Returns:** An `HttpChatProvider` that communicates with the backend via HTTP/SSE.

### Constants

#### `provider`

Pre-instantiated provider singleton.

```typescript
const provider: HttpChatProvider
```

## Core Interface
Implements `@molecule/app-ai-chat` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-ai-chat'
import { provider } from '@molecule/app-ai-chat-http'

export function setupAiChatHttp(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-chat` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/app-ai-chat`
- `@molecule/app-i18n`

POSTs each message to YOUR backend chat endpoint (`config.endpoint`, a RELATIVE path like
`/api/ai/chat` on the app's `baseUrl`) and reads the reply as an SSE stream — it does NOT talk
to an AI provider directly and holds NO AI key. Point `endpoint` at your own API, where the
provider key + `@molecule/api-ai` live; auth rides the session via the HTTP client
(cookie/bearer), so never attach a provider key or an absolute AI-provider URL here. See
`@molecule/app-ai-chat` for the safe-render rules.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Sending a message renders it in the thread and a streamed assistant
  reply appears incrementally (visible tokens while generating — not a
  frozen UI that dumps one blob).
- [ ] The reply flows through the app's OWN backend: the browser's network
  log shows no direct calls to an AI provider and no provider key anywhere
  client-side.
- [ ] Model output renders as sanitized markdown — a reply containing HTML
  or `<script>` displays as text and never executes.
- [ ] If the app claims conversation persistence, reloading restores the
  thread history.
- [ ] A backend failure (endpoint down, missing API key) surfaces a readable,
  actionable error — not an infinite spinner.
- [ ] Sending again while a reply streams is handled sanely (queued, blocked,
  or parallel — never corrupted/interleaved text).
