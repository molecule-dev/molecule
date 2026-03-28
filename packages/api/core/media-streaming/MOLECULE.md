# @molecule/api-media-streaming

media-streaming core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-media-streaming
```

## API

### Interfaces

#### `MediaStreamingConfig`

```typescript
interface MediaStreamingConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `MediaStreamingProvider`

```typescript
interface MediaStreamingProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): MediaStreamingProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): MediaStreamingProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: MediaStreamingProvider): void
```
