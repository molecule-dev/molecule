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

Config options for an AI RAG bond (TODO: tighten schema).

```typescript
interface AIRagConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIRagProvider`

Live AI RAG integration contract (TODO: expand methods).

```typescript
interface AIRagProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

Returns the bonded AI RAG provider, or `null` if none is registered.

```typescript
function getProvider(): AIRagProvider | null
```

**Returns:** The active provider, or `null`.

#### `hasProvider()`

Returns whether an AI RAG provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is bonded.

#### `requireProvider()`

Returns the bonded AI RAG provider, throwing if none is configured.

```typescript
function requireProvider(): AIRagProvider
```

**Returns:** The active provider.

#### `setProvider(provider)`

Registers the AI RAG provider singleton.

```typescript
function setProvider(provider: AIRagProvider): void
```

- `provider` — The AI RAG provider implementation to register.
