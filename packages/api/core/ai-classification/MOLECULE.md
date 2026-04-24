# @molecule/api-ai-classification

ai-classification core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-classification
```

## API

### Interfaces

#### `AIClassificationConfig`

Config options for an AI classification bond (TODO: tighten schema).

```typescript
interface AIClassificationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIClassificationProvider`

Live AI classification integration contract (TODO: expand methods).

```typescript
interface AIClassificationProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

Returns the bonded AI classification provider, or `null` if none is registered.

```typescript
function getProvider(): AIClassificationProvider | null
```

**Returns:** The active provider, or `null`.

#### `hasProvider()`

Returns whether an AI classification provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is bonded.

#### `requireProvider()`

Returns the bonded AI classification provider, throwing if none is configured.

```typescript
function requireProvider(): AIClassificationProvider
```

**Returns:** The active provider.

#### `setProvider(provider)`

Registers the AI classification provider singleton.

```typescript
function setProvider(provider: AIClassificationProvider): void
```

- `provider` — The AI classification provider implementation to register.
