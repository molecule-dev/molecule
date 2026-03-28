# @molecule/app-tour

tour core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-tour
```

## API

### Interfaces

#### `TourConfig`

```typescript
interface TourConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `TourProvider`

```typescript
interface TourProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): TourProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): TourProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: TourProvider): void
```
