# @molecule/api-ai-local

Local ai-local provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-local
```

## API

### Interfaces

#### `LocalConfig`

Local provider configuration (TODO: expand required fields).

```typescript
interface LocalConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `LocalAIProvider`

Stub local AI provider scaffold (TODO: implement API wiring).

### Functions

#### `createProvider(config)`

Creates a local AI provider instance for bonding.

```typescript
function createProvider(config: LocalConfig): LocalAIProvider
```

- `config` — Local provider configuration.

**Returns:** A local-backed provider instance.
