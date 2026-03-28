# @molecule/api-ai-embeddings

ai-embeddings core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-embeddings
```

## API

### Interfaces

#### `AIEmbeddingsConfig`

```typescript
interface AIEmbeddingsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIEmbeddingsProvider`

```typescript
interface AIEmbeddingsProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AIEmbeddingsProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AIEmbeddingsProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AIEmbeddingsProvider): void
```
