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

```typescript
interface AIAgentsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIAgentsProvider`

```typescript
interface AIAgentsProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AIAgentsProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AIAgentsProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AIAgentsProvider): void
```
