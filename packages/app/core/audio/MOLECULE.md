# @molecule/app-audio

audio core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-audio
```

## API

### Interfaces

#### `AudioConfig`

```typescript
interface AudioConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AudioProvider`

```typescript
interface AudioProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AudioProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AudioProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AudioProvider): void
```
