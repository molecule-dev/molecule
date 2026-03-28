# @molecule/app-realtime

realtime core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-realtime
```

## API

### Interfaces

#### `RealtimeConfig`

```typescript
interface RealtimeConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `RealtimeProvider`

```typescript
interface RealtimeProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): RealtimeProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): RealtimeProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: RealtimeProvider): void
```
