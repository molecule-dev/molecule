# @molecule/app-timeline

timeline core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-timeline
```

## API

### Interfaces

#### `TimelineConfig`

```typescript
interface TimelineConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `TimelineProvider`

```typescript
interface TimelineProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): TimelineProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): TimelineProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: TimelineProvider): void
```
