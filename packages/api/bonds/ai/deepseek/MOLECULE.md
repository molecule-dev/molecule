# @molecule/api-ai-deepseek

Deepseek ai-deepseek provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-deepseek
```

## API

### Interfaces

#### `DeepseekConfig`

DeepSeek provider configuration (TODO: expand required fields).

```typescript
interface DeepseekConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `DeepseekAIProvider`

Stub DeepSeek AI provider scaffold (TODO: implement API wiring).

### Functions

#### `createProvider(config)`

Creates a DeepSeek AI provider instance for bonding.

```typescript
function createProvider(config: DeepseekConfig): DeepseekAIProvider
```

- `config` — DeepSeek provider configuration.

**Returns:** A DeepSeek-backed provider instance.
