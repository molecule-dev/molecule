# @molecule/api-ai-vector-store

ai-vector-store core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-vector-store
```

## API

### Interfaces

#### `AIVectorStoreConfig`

```typescript
interface AIVectorStoreConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIVectorStoreProvider`

```typescript
interface AIVectorStoreProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AIVectorStoreProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AIVectorStoreProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AIVectorStoreProvider): void
```
