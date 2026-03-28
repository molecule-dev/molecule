# @molecule/api-ai-translation

ai-translation core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-translation
```

## API

### Interfaces

#### `AITranslationConfig`

```typescript
interface AITranslationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AITranslationProvider`

```typescript
interface AITranslationProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AITranslationProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AITranslationProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AITranslationProvider): void
```
