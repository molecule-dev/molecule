# @molecule/api-ai-agents

ai-agents core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-agents
```

## API

### Interfaces

#### `AIAgentsConfig`

Config options for an AI agents bond (TODO: tighten schema).

```typescript
interface AIAgentsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIAgentsProvider`

Live AI agents integration contract (TODO: expand methods).

```typescript
interface AIAgentsProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

Returns the bonded AI agents provider, or `null` if none is registered.

```typescript
function getProvider(): AIAgentsProvider | null
```

**Returns:** The active provider, or `null`.

#### `hasProvider()`

Returns whether an AI agents provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is bonded.

#### `requireProvider()`

Returns the bonded AI agents provider, throwing if none is configured.

```typescript
function requireProvider(): AIAgentsProvider
```

**Returns:** The active provider.

#### `setProvider(provider)`

Registers the AI agents provider singleton.

```typescript
function setProvider(provider: AIAgentsProvider): void
```

- `provider` — The AI agents provider implementation to register.
