# @molecule/api-ai-rag

ai-rag core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-rag
```

## API

### Interfaces

#### `AIRagConfig`

```typescript
interface AIRagConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIRagProvider`

```typescript
interface AIRagProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AIRagProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AIRagProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AIRagProvider): void
```
