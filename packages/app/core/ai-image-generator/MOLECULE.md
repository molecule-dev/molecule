# @molecule/app-ai-image-generator

ai-image-generator core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-image-generator
```

## API

### Interfaces

#### `AIImageGeneratorConfig`

```typescript
interface AIImageGeneratorConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIImageGeneratorProvider`

```typescript
interface AIImageGeneratorProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AIImageGeneratorProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AIImageGeneratorProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AIImageGeneratorProvider): void
```
