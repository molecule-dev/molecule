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

```typescript
interface AIClassificationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIClassificationProvider`

```typescript
interface AIClassificationProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AIClassificationProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AIClassificationProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AIClassificationProvider): void
```
