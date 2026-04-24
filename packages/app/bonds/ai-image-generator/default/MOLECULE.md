# @molecule/app-ai-image-generator-default

Default HTTP image generator provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-image-generator-default
```

## API

### Interfaces

#### `HttpImageGeneratorConfig`

Configuration for the default HTTP image generator provider.

```typescript
interface HttpImageGeneratorConfig {
  /** Base URL for API requests. Defaults to `''` (same origin). */
  baseUrl?: string
  /** Custom headers to include in requests. */
  headers?: Record<string, string>
}
```

### Classes

#### `HttpImageGeneratorProvider`

HTTP-based implementation of `AIImageGeneratorProvider`.

Sends generation requests via POST, reads progress via SSE or JSON responses,
and supports history loading and image deletion.

### Functions

#### `createProvider(config)`

Creates an `HttpImageGeneratorProvider` instance.

```typescript
function createProvider(config?: HttpImageGeneratorConfig): HttpImageGeneratorProvider
```

- `config` — HTTP-specific configuration (base URL, headers).

**Returns:** A configured `HttpImageGeneratorProvider`.

### Constants

#### `provider`

Pre-instantiated provider singleton.

```typescript
const provider: HttpImageGeneratorProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-image-generator` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
