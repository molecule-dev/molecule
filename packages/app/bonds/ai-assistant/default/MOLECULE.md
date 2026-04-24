# @molecule/app-ai-assistant-default

Default AI assistant provider for molecule.dev.

Uses HTTP/SSE for streaming responses with built-in panel state
management, context awareness, and session persistence.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-assistant-default
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-assistant` ^1.0.0
