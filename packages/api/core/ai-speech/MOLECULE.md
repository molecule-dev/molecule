# @molecule/api-ai-speech

ai-speech core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-speech
```

## API

### Interfaces

#### `AISpeechConfig`

```typescript
interface AISpeechConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AISpeechProvider`

```typescript
interface AISpeechProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AISpeechProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AISpeechProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AISpeechProvider): void
```
