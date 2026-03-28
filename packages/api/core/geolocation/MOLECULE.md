# @molecule/api-geolocation

Provider-agnostic geolocation interface for molecule.dev.

Defines the `GeolocationProvider` interface for geocoding addresses, reverse geocoding
coordinates, calculating distances, autocomplete suggestions, and timezone lookups.
Bond packages (Google Maps, Mapbox, Nominatim, etc.) implement this interface. Application
code uses the convenience functions (`geocode`, `reverseGeocode`, `distance`, `autocomplete`,
`getTimezone`) which delegate to the bonded provider.

## Type
`core`

## Installation
```bash
npm install @molecule/api-geolocation
```

## Usage

```typescript
import { setProvider, geocode, reverseGeocode, distance } from '@molecule/api-geolocation'
import { provider as google } from '@molecule/api-geolocation-google'

setProvider(google)
const results = await geocode('1600 Amphitheatre Parkway, Mountain View, CA')
const addresses = await reverseGeocode(37.4224764, -122.0842499)
const km = distance({ lat: 40.7128, lng: -74.006 }, { lat: 34.0522, lng: -118.2437 })
```

## API

### Interfaces

#### `AddressComponents`

Structured address components returned from geocoding operations.

```typescript
interface AddressComponents {
  /** Street number (e.g., `'123'`). */
  streetNumber?: string

  /** Street name (e.g., `'Main St'`). */
  street?: string

  /** City or locality name. */
  city?: string

  /** State or region name. */
  state?: string

  /** State or region abbreviation. */
  stateCode?: string

  /** Country name. */
  country?: string

  /** ISO 3166-1 alpha-2 country code (e.g., `'US'`). */
  countryCode?: string

  /** Postal/ZIP code. */
  postalCode?: string

  /** County or district. */
  county?: string

  /** Neighborhood or suburb. */
  neighborhood?: string
}
```

#### `AutocompleteOptions`

Options for autocomplete/place suggestion queries.

```typescript
interface AutocompleteOptions {
  /** Bias results toward this location. */
  location?: LatLng

  /** Radius in meters to bias results within. */
  radius?: number

  /** ISO 3166-1 alpha-2 country codes to restrict results to. */
  countries?: string[]

  /** Maximum number of results to return. */
  limit?: number

  /** BCP 47 language code for results (e.g., `'en'`, `'fr'`). */
  language?: string

  /** Session token for grouping related autocomplete requests (billing optimization). */
  sessionToken?: string
}
```

#### `GeolocationConfig`

Configuration options for geolocation providers.

```typescript
interface GeolocationConfig {
  /** API key for the geolocation service. */
  apiKey?: string

  /** Base URL override for self-hosted or proxied services. */
  baseUrl?: string

  /** BCP 47 language code for results (e.g., `'en'`, `'fr'`). */
  language?: string

  /** ISO 3166-1 alpha-2 region code to bias results (e.g., `'US'`). */
  region?: string

  /** Request timeout in milliseconds. */
  timeout?: number
}
```

#### `GeolocationProvider`

Geolocation provider interface.

All geolocation providers must implement this interface.
Bond packages (Google Maps, Mapbox, Nominatim, etc.) provide concrete implementations.

```typescript
interface GeolocationProvider {
  /**
   * Converts a street address or place name to geographic coordinates.
   *
   * @param address - The address or place name to geocode.
   * @returns An array of matching results, ordered by relevance.
   */
  geocode(address: string): Promise<GeoResult[]>

  /**
   * Converts geographic coordinates to a human-readable address.
   *
   * @param lat - Latitude in decimal degrees.
   * @param lng - Longitude in decimal degrees.
   * @returns An array of matching address results, ordered by specificity.
   */
  reverseGeocode(lat: number, lng: number): Promise<GeoResult[]>

  /**
   * Calculates the great-circle distance between two points using the Haversine formula.
   *
   * This is a pure calculation and does not require an API call.
   *
   * @param from - The starting coordinate.
   * @param to - The ending coordinate.
   * @param unit - The unit of measurement. Defaults to `'km'`.
   * @returns The distance between the two points.
   */
  distance(from: LatLng, to: LatLng, unit?: DistanceUnit): number

  /**
   * Returns place suggestions for a partial query string (typeahead).
   *
   * Not all providers support autocomplete. If unsupported, this method
   * should return an empty array or throw with a descriptive message.
   *
   * @param query - The partial query string.
   * @param options - Options to bias or restrict results.
   * @returns An array of place suggestions.
   */
  autocomplete?(query: string, options?: AutocompleteOptions): Promise<PlaceSuggestion[]>

  /**
   * Returns timezone information for a geographic coordinate.
   *
   * Not all providers support timezone lookups. If unsupported, this method
   * should throw with a descriptive message.
   *
   * @param lat - Latitude in decimal degrees.
   * @param lng - Longitude in decimal degrees.
   * @returns Timezone information for the location.
   */
  getTimezone?(lat: number, lng: number): Promise<TimezoneInfo>
}
```

#### `GeoResult`

A geocoding result, mapping an address to coordinates.

```typescript
interface GeoResult {
  /** Latitude in decimal degrees. */
  lat: number

  /** Longitude in decimal degrees. */
  lng: number

  /** Full formatted address string. */
  formattedAddress: string

  /** Structured address components. */
  components: AddressComponents

  /** Provider-specific place identifier. */
  placeId?: string

  /** Bounding box of the result, if available. */
  bounds?: {
    /** Northeast corner. */
    northeast: LatLng
    /** Southwest corner. */
    southwest: LatLng
  }
}
```

#### `LatLng`

A latitude/longitude coordinate pair.

```typescript
interface LatLng {
  /** Latitude in decimal degrees. */
  lat: number

  /** Longitude in decimal degrees. */
  lng: number
}
```

#### `PlaceSuggestion`

A place suggestion returned by autocomplete.

```typescript
interface PlaceSuggestion {
  /** Provider-specific place identifier. */
  placeId: string

  /** Primary text describing the place (e.g., street name). */
  mainText: string

  /** Secondary text describing the place (e.g., city, state). */
  secondaryText: string

  /** Full description of the place. */
  description: string

  /** Location coordinates, if available without an additional API call. */
  location?: LatLng
}
```

#### `TimezoneInfo`

Timezone information for a location.

```typescript
interface TimezoneInfo {
  /** IANA timezone identifier (e.g., `'America/New_York'`). */
  timeZoneId: string

  /** Display name of the timezone (e.g., `'Eastern Standard Time'`). */
  timeZoneName: string

  /** UTC offset in seconds for standard time. */
  rawOffset: number

  /** Additional DST offset in seconds (0 if not in DST). */
  dstOffset: number
}
```

### Types

#### `DistanceUnit`

Distance unit for calculations.

```typescript
type DistanceUnit = 'km' | 'mi'
```

### Functions

#### `autocomplete(query, options)`

Returns place suggestions for a partial query string (typeahead).

```typescript
function autocomplete(query: string, options?: AutocompleteOptions): Promise<PlaceSuggestion[]>
```

- `query` — The partial query string.
- `options` — Options to bias or restrict results.

**Returns:** An array of place suggestions.

#### `distance(from, to, unit)`

Calculates the great-circle distance between two points using the Haversine formula.

```typescript
function distance(from: LatLng, to: LatLng, unit?: DistanceUnit): number
```

- `from` — The starting coordinate.
- `to` — The ending coordinate.
- `unit` — The unit of measurement. Defaults to `'km'`.

**Returns:** The distance between the two points.

#### `geocode(address)`

Converts a street address or place name to geographic coordinates.

```typescript
function geocode(address: string): Promise<GeoResult[]>
```

- `address` — The address or place name to geocode.

**Returns:** An array of matching results, ordered by relevance.

#### `getProvider()`

Retrieves the bonded geolocation provider, throwing if none is configured.

```typescript
function getProvider(): GeolocationProvider
```

**Returns:** The bonded geolocation provider.

#### `getTimezone(lat, lng)`

Returns timezone information for a geographic coordinate.

```typescript
function getTimezone(lat: number, lng: number): Promise<TimezoneInfo>
```

- `lat` — Latitude in decimal degrees.
- `lng` — Longitude in decimal degrees.

**Returns:** Timezone information for the location.

#### `hasProvider()`

Checks whether a geolocation provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a geolocation provider is bonded.

#### `reverseGeocode(lat, lng)`

Converts geographic coordinates to a human-readable address.

```typescript
function reverseGeocode(lat: number, lng: number): Promise<GeoResult[]>
```

- `lat` — Latitude in decimal degrees.
- `lng` — Longitude in decimal degrees.

**Returns:** An array of matching address results, ordered by specificity.

#### `setProvider(provider)`

Registers a geolocation provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: GeolocationProvider): void
```

- `provider` — The geolocation provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
