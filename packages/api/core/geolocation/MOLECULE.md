# @molecule/api-geolocation

geolocation core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-geolocation
```

## API

### Interfaces

#### `GeolocationConfig`

```typescript
interface GeolocationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `GeolocationProvider`

```typescript
interface GeolocationProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): GeolocationProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): GeolocationProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: GeolocationProvider): void
```
