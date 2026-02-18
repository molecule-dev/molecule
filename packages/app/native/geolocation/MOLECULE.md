# @molecule/app-geolocation

Geolocation interface for molecule.dev.

Provides a unified API for GPS/location services that works across
different platforms (web, Capacitor, React Native, etc.).

## Type
`native`

## Installation
```bash
npm install @molecule/app-geolocation
```

## API

### Interfaces

#### `Coordinates`

Geographic coordinates (latitude, longitude, accuracy, altitude, heading, speed).

```typescript
interface Coordinates {
  /**
   * Latitude in decimal degrees.
   */
  latitude: number

  /**
   * Longitude in decimal degrees.
   */
  longitude: number

  /**
   * Accuracy in meters.
   */
  accuracy: number

  /**
   * Altitude in meters (if available).
   */
  altitude?: number

  /**
   * Altitude accuracy in meters (if available).
   */
  altitudeAccuracy?: number

  /**
   * Heading in degrees (0-360, if available).
   */
  heading?: number

  /**
   * Speed in m/s (if available).
   */
  speed?: number
}
```

#### `CreateWebGeolocationProviderOptions`

Options for creating a web geolocation provider.

```typescript
interface CreateWebGeolocationProviderOptions {
  /**
   * Optional translation function for i18n support.
   * When provided, error messages will be passed through this function.
   */
  t?: TranslateFn
}
```

#### `GeolocationError`

Geolocation error with code (permission_denied, position_unavailable, timeout) and message.

```typescript
interface GeolocationError {
  /**
   * Error code.
   */
  code: 'permission_denied' | 'position_unavailable' | 'timeout' | 'unknown'

  /**
   * Error message.
   */
  message: string
}
```

#### `GeolocationProvider`

Geolocation provider interface.

All geolocation providers must implement this interface.

```typescript
interface GeolocationProvider {
  /**
   * Checks the current permission status.
   * @returns The current location permission state.
   */
  checkPermission(): Promise<LocationPermission>

  /**
   * Requests location permission.
   */
  requestPermission(): Promise<LocationPermission>

  /**
   * Gets the current position.
   */
  getCurrentPosition(options?: PositionOptions): Promise<Position>

  /**
   * Watches position changes.
   * Returns an ID that can be used to stop watching.
   */
  watchPosition(
    onSuccess: PositionCallback,
    onError?: ErrorCallback,
    options?: WatchOptions,
  ): string

  /**
   * Stops watching position changes.
   */
  clearWatch(watchId: string): void

  /**
   * Calculates distance between two coordinates in meters.
   * @returns The distance in meters between the two coordinates.
   */
  calculateDistance(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
  ): number
}
```

#### `Position`

Geolocation position containing coordinates and a timestamp.

```typescript
interface Position {
  /**
   * Geographic coordinates.
   */
  coords: Coordinates

  /**
   * Timestamp of the position.
   */
  timestamp: number
}
```

#### `PositionOptions`

Options for position queries (high accuracy mode, max cached age, timeout).

```typescript
interface PositionOptions {
  /**
   * Enable high accuracy mode.
   */
  enableHighAccuracy?: boolean

  /**
   * Maximum age of cached position in ms.
   */
  maximumAge?: number

  /**
   * Timeout in ms.
   */
  timeout?: number
}
```

#### `WatchOptions`

Watch options (extends position options).

```typescript
interface WatchOptions extends PositionOptions {
  /**
   * Minimum distance change in meters before triggering update.
   */
  distanceFilter?: number
}
```

### Types

#### `ErrorCallback`

Callback invoked when a geolocation error occurs.

```typescript
type ErrorCallback = (error: GeolocationError) => void
```

#### `LocationPermission`

Location permission state: granted, denied, or prompt (not yet requested).

```typescript
type LocationPermission = 'granted' | 'denied' | 'prompt'
```

#### `PositionCallback`

Callback invoked with a resolved geographic position.

```typescript
type PositionCallback = (position: Position) => void
```

### Functions

#### `calculateDistance(from, from, from, to, to, to)`

Calculates the distance between two geographic coordinates.

```typescript
function calculateDistance(from: { latitude: number; longitude: number; }, to: { latitude: number; longitude: number; }): number
```

- `from` — The starting coordinate.
- `from` — .latitude - The starting latitude in decimal degrees.
- `from` — .longitude - The starting longitude in decimal degrees.
- `to` — The destination coordinate.
- `to` — .latitude - The destination latitude in decimal degrees.
- `to` — .longitude - The destination longitude in decimal degrees.

**Returns:** The distance in meters between the two coordinates.

#### `checkPermission()`

Checks the current location permission status.

```typescript
function checkPermission(): Promise<LocationPermission>
```

**Returns:** The current location permission state.

#### `clearWatch(watchId)`

Stops watching position changes for the given watch.

```typescript
function clearWatch(watchId: string): void
```

- `watchId` — The identifier returned by {@link watchPosition}.

**Returns:** void

#### `createWebGeolocationProvider(options)`

Creates a web-based geolocation provider using the browser Geolocation API.

```typescript
function createWebGeolocationProvider(options?: CreateWebGeolocationProviderOptions): GeolocationProvider
```

- `options` — Provider configuration including optional i18n translation function.

**Returns:** A {@link GeolocationProvider} backed by the browser Geolocation API.

#### `getCurrentPosition(options)`

Gets the device's current geographic position.

```typescript
function getCurrentPosition(options?: PositionOptions): Promise<Position>
```

- `options` — Configuration for accuracy, timeout, and caching behavior.

**Returns:** The current position with coordinates and timestamp.

#### `getProvider()`

Gets the current geolocation provider, falling back to the web implementation.

```typescript
function getProvider(): GeolocationProvider
```

**Returns:** The active geolocation provider instance.

#### `hasProvider()`

Checks if a geolocation provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a geolocation provider is currently registered.

#### `haversineDistance(from, from, from, to, to, to)`

Calculates the distance between two coordinates using the Haversine formula.

```typescript
function haversineDistance(from: { latitude: number; longitude: number; }, to: { latitude: number; longitude: number; }): number
```

- `from` — The starting coordinate.
- `from` — .latitude - The starting latitude in decimal degrees.
- `from` — .longitude - The starting longitude in decimal degrees.
- `to` — The destination coordinate.
- `to` — .latitude - The destination latitude in decimal degrees.
- `to` — .longitude - The destination longitude in decimal degrees.

**Returns:** The distance in meters between the two coordinates.

#### `requestPermission()`

Requests location permission from the user.

```typescript
function requestPermission(): Promise<LocationPermission>
```

**Returns:** The resulting permission state after the request.

#### `setProvider(provider)`

Sets the geolocation provider implementation.

```typescript
function setProvider(provider: GeolocationProvider): void
```

- `provider` — The provider implementation.

#### `toRadians(degrees)`

Converts degrees to radians.

```typescript
function toRadians(degrees: number): number
```

- `degrees` — The angle in degrees to convert.

**Returns:** The angle in radians.

#### `watchPosition(onSuccess, onError, options)`

Watches for continuous position changes.

```typescript
function watchPosition(onSuccess: PositionCallback, onError?: ErrorCallback, options?: WatchOptions): string
```

- `onSuccess` — Callback invoked with each new position update.
- `onError` — Callback invoked when a geolocation error occurs.
- `options` — Configuration for accuracy, distance filter, and timing.

**Returns:** A watch identifier that can be passed to {@link clearWatch} to stop watching.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-geolocation`.
