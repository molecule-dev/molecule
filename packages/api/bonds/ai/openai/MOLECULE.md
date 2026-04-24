# @molecule/api-ai-openai

Openai ai-openai provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-openai
```

## API

### Interfaces

#### `OpenaiConfig`

OpenAI provider configuration (TODO: expand required fields).

```typescript
interface OpenaiConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `OpenaiAIProvider`

Stub OpenAI AI provider scaffold (TODO: implement API wiring).

### Functions

#### `createProvider(config)`

Creates an OpenAI AI provider instance for bonding.

```typescript
function createProvider(config: OpenaiConfig): OpenaiAIProvider
```

- `config` — OpenAI provider configuration.

**Returns:** An OpenAI-backed provider instance.
