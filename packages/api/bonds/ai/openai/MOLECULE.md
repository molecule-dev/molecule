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

```typescript
interface OpenaiConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `OpenaiAIProvider`

### Functions

#### `createProvider(config)`

```typescript
function createProvider(config: OpenaiConfig): OpenaiAIProvider
```
