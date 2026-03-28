# @molecule/api-ai-summarization

ai-summarization core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-summarization
```

## API

### Interfaces

#### `AISummarizationConfig`

```typescript
interface AISummarizationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AISummarizationProvider`

```typescript
interface AISummarizationProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AISummarizationProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AISummarizationProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AISummarizationProvider): void
```
