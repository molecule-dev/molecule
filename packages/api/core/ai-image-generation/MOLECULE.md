# @molecule/api-ai-image-generation

ai-image-generation core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-image-generation
```

## API

### Interfaces

#### `AIImageGenerationConfig`

```typescript
interface AIImageGenerationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIImageGenerationProvider`

```typescript
interface AIImageGenerationProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AIImageGenerationProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AIImageGenerationProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AIImageGenerationProvider): void
```
