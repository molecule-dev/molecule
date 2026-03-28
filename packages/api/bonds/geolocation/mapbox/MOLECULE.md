# @molecule/api-geolocation-mapbox

Mapbox geolocation-mapbox provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-geolocation-mapbox
```

## API

### Interfaces

#### `MapboxConfig`

```typescript
interface MapboxConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `MapboxGeolocationProvider`

### Functions

#### `createProvider(config)`

```typescript
function createProvider(config: MapboxConfig): MapboxGeolocationProvider
```
