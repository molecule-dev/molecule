# @molecule/app-ai-copilot-default

Default ai-copilot provider for molecule.dev.

HTTP/SSE-based inline AI suggestion provider.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-copilot-default
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-copilot` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
