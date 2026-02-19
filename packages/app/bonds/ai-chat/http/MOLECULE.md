# @molecule/app-ai-chat-http

HTTP/SSE AI chat provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-chat-http
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-chat` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
