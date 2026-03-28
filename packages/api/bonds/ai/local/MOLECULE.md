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

```typescript
interface LocalConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `LocalAIProvider`

### Functions

#### `createProvider(config)`

```typescript
function createProvider(config: LocalConfig): LocalAIProvider
```
