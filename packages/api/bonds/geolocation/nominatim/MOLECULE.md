# @molecule/api-geolocation-nominatim

Nominatim geolocation-nominatim provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-geolocation-nominatim
```

## API

### Interfaces

#### `NominatimConfig`

```typescript
interface NominatimConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `NominatimGeolocationProvider`

### Functions

#### `createProvider(config)`

```typescript
function createProvider(config: NominatimConfig): NominatimGeolocationProvider
```
