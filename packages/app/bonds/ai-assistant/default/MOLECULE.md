# @molecule/app-ai-assistant-default

Default AI assistant provider for molecule.dev.

Uses HTTP/SSE to stream assistant replies from YOUR backend, with
built-in panel state management and context awareness.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-ai-assistant'
import { provider } from '@molecule/app-ai-assistant-default'

setProvider(provider) // at startup; same-origin base URL
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-assistant-default @molecule/app-ai-assistant
```

## API

### Interfaces

#### `DefaultAssistantConfig`

Configuration specific to the default HTTP/SSE assistant provider.

```typescript
interface DefaultAssistantConfig {
  /** Base URL for API requests. Defaults to '' (same origin). */
  baseUrl?: string
  /** Custom HTTP headers to include in all requests. */
  headers?: Record<string, string>
}
```

### Classes

#### `DefaultAssistantProvider`

Default AI assistant provider using HTTP/SSE for streaming.

Manages an internal panel state store with subscriber notifications,
streams assistant responses via SSE, and supports context-enriched
messaging.

### Functions

#### `createProvider(config)`

Create a new default assistant provider instance.

```typescript
function createProvider(config?: DefaultAssistantConfig): DefaultAssistantProvider
```

- `config` — Optional provider-specific configuration

**Returns:** A new DefaultAssistantProvider instance

### Constants

#### `provider`

Pre-instantiated provider singleton.

```typescript
const provider: DefaultAssistantProvider
```

## Core Interface
Implements `@molecule/app-ai-assistant` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-ai-assistant'
import { provider } from '@molecule/app-ai-assistant-default'

export function setupAiAssistantDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-assistant` ^1.0.0

### Runtime Dependencies

- `@molecule/app-ai-assistant`

HEADLESS — manages panel state + streaming only; your app renders the
panel from `getState()` / `subscribe()`. Talks to YOUR backend at
`config.endpoint` (relative path on `baseUrl`, default same-origin) — it
holds no AI key. Your API must implement, on that one endpoint:
- POST `{ message, systemContext?, context? }` → an SSE stream of
  `data: <AssistantStreamEvent JSON>` lines (`text` / `thinking` /
  `suggestion` / `done` / `error`),
- GET → `{ messages: [...] }` (loadHistory; fails open to `[]` on any
  error), and DELETE → clear history (best-effort; local state clears
  even if it fails).
The bare `provider` export is `createProvider()` with no options — to set
`baseUrl`/`headers`, wire `setProvider(createProvider({ ... }))` instead.
`sendMessage` aborts any previous in-flight stream automatically.
