# @molecule/api-ai-summarization

ai-summarization core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-summarization
```

## API

### Interfaces

#### `AISummarizationConfig`

Config options for an AI summarization bond (TODO: tighten schema).

```typescript
interface AISummarizationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AISummarizationProvider`

Live AI summarization integration contract (TODO: expand methods).

```typescript
interface AISummarizationProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

Returns the bonded AI summarization provider, or `null` if none is registered.

```typescript
function getProvider(): AISummarizationProvider | null
```

**Returns:** The active provider, or `null`.

#### `hasProvider()`

Returns whether an AI summarization provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is bonded.

#### `requireProvider()`

Returns the bonded AI summarization provider, throwing if none is configured.

```typescript
function requireProvider(): AISummarizationProvider
```

**Returns:** The active provider.

#### `setProvider(provider)`

Registers the AI summarization provider singleton.

```typescript
function setProvider(provider: AISummarizationProvider): void
```

- `provider` — The AI summarization provider implementation to register.
