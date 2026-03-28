# @molecule/app-ai-assistant

ai-assistant core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-assistant
```

## API

### Interfaces

#### `AIAssistantConfig`

```typescript
interface AIAssistantConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIAssistantProvider`

```typescript
interface AIAssistantProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AIAssistantProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AIAssistantProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AIAssistantProvider): void
```
