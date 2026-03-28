# @molecule/app-ai-copilot

ai-copilot core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-copilot
```

## API

### Interfaces

#### `AICopilotConfig`

```typescript
interface AICopilotConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AICopilotProvider`

```typescript
interface AICopilotProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AICopilotProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AICopilotProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AICopilotProvider): void
```
