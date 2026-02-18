# @molecule/app-motion

`@molecule/app-motion`
Accelerometer and gyroscope interface for molecule.dev

Provides a unified API for motion sensors across platforms.
Supports accelerometer, gyroscope, and device orientation.

## Type
`native`

## Installation
```bash
npm install @molecule/app-motion
```

## API

### Interfaces

#### `AccelerometerData`

Accelerometer data

```typescript
interface AccelerometerData extends Vector3D {
  /** Timestamp */
  timestamp: number
  /** Whether gravity is included */
  includesGravity: boolean
}
```

#### `GyroscopeData`

Gyroscope rotation rate reading (x/y/z radians per second with timestamp).

```typescript
interface GyroscopeData extends Vector3D {
  /** Timestamp */
  timestamp: number
}
```

#### `MagnetometerData`

Magnetometer data

```typescript
interface MagnetometerData extends Vector3D {
  /** Timestamp */
  timestamp: number
}
```

#### `MotionCapabilities`

Motion capabilities

```typescript
interface MotionCapabilities {
  /** Whether motion sensors are supported */
  supported: boolean
  /** Whether accelerometer is available */
  hasAccelerometer: boolean
  /** Whether gyroscope is available */
  hasGyroscope: boolean
  /** Whether magnetometer is available */
  hasMagnetometer: boolean
  /** Whether device orientation is available */
  hasOrientation: boolean
  /** Whether permission is required */
  requiresPermission: boolean
}
```

#### `MotionData`

Combined motion data

```typescript
interface MotionData {
  /** Accelerometer with gravity */
  accelerationIncludingGravity?: AccelerometerData
  /** Accelerometer without gravity (linear) */
  acceleration?: AccelerometerData
  /** Gyroscope rotation rate */
  rotationRate?: GyroscopeData
  /** Device orientation */
  orientation?: OrientationData
  /** Interval in milliseconds */
  interval: number
  /** Timestamp */
  timestamp: number
}
```

#### `MotionProvider`

Motion provider interface

```typescript
interface MotionProvider {
  /**
   * Start accelerometer updates
   * @param callback - Called with accelerometer data
   * @param options - Sensor options
   * @returns Stop function
   */
  startAccelerometer(
    callback: (data: AccelerometerData) => void,
    options?: SensorOptions,
  ): () => void

  /**
   * Start gyroscope updates
   * @param callback - Called with gyroscope data
   * @param options - Sensor options
   * @returns Stop function
   */
  startGyroscope(callback: (data: GyroscopeData) => void, options?: SensorOptions): () => void

  /**
   * Start magnetometer updates
   * @param callback - Called with magnetometer data
   * @param options - Sensor options
   * @returns Stop function
   */
  startMagnetometer(callback: (data: MagnetometerData) => void, options?: SensorOptions): () => void

  /**
   * Start device orientation updates
   * @param callback - Called with orientation data
   * @param options - Sensor options
   * @returns Stop function
   */
  startOrientation(callback: (data: OrientationData) => void, options?: SensorOptions): () => void

  /**
   * Start combined motion updates
   * @param callback - Called with motion data
   * @param options - Sensor options
   * @returns Stop function
   */
  startMotion(callback: (data: MotionData) => void, options?: SensorOptions): () => void

  /**
   * Get the current accelerometer reading.
   * @returns The current accelerometer data with x, y, z values and timestamp.
   */
  getAccelerometer(): Promise<AccelerometerData>

  /**
   * Get the current gyroscope reading.
   * @returns The current gyroscope data with x, y, z rotation rates and timestamp.
   */
  getGyroscope(): Promise<GyroscopeData>

  /**
   * Get the current device orientation reading.
   * @returns The current orientation data with alpha, beta, gamma angles and timestamp.
   */
  getOrientation(): Promise<OrientationData>

  /**
   * Get the motion sensor permission status.
   * @returns The permission status: 'granted', 'denied', 'prompt', or 'unsupported'.
   */
  getPermissionStatus(): Promise<MotionPermissionStatus>

  /**
   * Request motion sensor permission (required on iOS 13+).
   * @returns The resulting permission status after the request.
   */
  requestPermission(): Promise<MotionPermissionStatus>

  /**
   * Get the platform's motion sensor capabilities.
   * @returns The capabilities indicating which sensors are available.
   */
  getCapabilities(): Promise<MotionCapabilities>
}
```

#### `OrientationData`

Device orientation data

```typescript
interface OrientationData {
  /** Alpha (rotation around Z-axis, 0-360) */
  alpha: number
  /** Beta (rotation around X-axis, -180 to 180) */
  beta: number
  /** Gamma (rotation around Y-axis, -90 to 90) */
  gamma: number
  /** Timestamp */
  timestamp: number
  /** Whether orientation is absolute */
  absolute: boolean
}
```

#### `SensorOptions`

Configuration for motion sensor listening (sampling frequency in Hz).

```typescript
interface SensorOptions {
  /** Sampling frequency in Hz (default: 60) */
  frequency?: number
}
```

#### `ShakeOptions`

Shake detection options

```typescript
interface ShakeOptions {
  /** Shake threshold acceleration (default: 15) */
  threshold?: number
  /** Minimum shakes to trigger (default: 3) */
  minShakes?: number
  /** Time window in ms (default: 1000) */
  timeWindow?: number
}
```

#### `Vector3D`

3D vector for sensor data

```typescript
interface Vector3D {
  /** X-axis value */
  x: number
  /** Y-axis value */
  y: number
  /** Z-axis value */
  z: number
}
```

### Types

#### `MotionPermissionStatus`

Motion permission status

```typescript
type MotionPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported'
```

### Functions

#### `createShakeDetector(onShake, options)`

Create a shake gesture detector that uses accelerometer data to detect device shaking.

```typescript
function createShakeDetector(onShake: () => void, options?: ShakeOptions): { start: () => void; stop: () => void; }
```

- `onShake` — Called when a shake gesture is detected.
- `options` — Shake detection options (threshold, minimum shakes, time window).

**Returns:** A controller with `start` and `stop` methods for the shake detector.

#### `createStepCounter(onStep)`

Create a basic step counter using accelerometer peak detection.

```typescript
function createStepCounter(onStep: (count: number) => void): { start: () => void; stop: () => void; getCount: () => number; reset: () => void; }
```

- `onStep` — Called with the cumulative step count each time a step is detected.

**Returns:** A controller with `start`, `stop`, `getCount`, and `reset` methods.

#### `createTiltDetector(onChange, options)`

Create a tilt detector that calculates pitch and roll angles from accelerometer data.

```typescript
function createTiltDetector(onChange: (tilt: { pitch: number; roll: number; }) => void, options?: SensorOptions): { start: () => void; stop: () => void; }
```

- `onChange` — Called with pitch (front-back tilt) and roll (left-right tilt) angles in degrees.
- `options` — Sensor options (sampling frequency).

**Returns:** A controller with `start` and `stop` methods for the tilt detector.

#### `cross(a, b)`

Calculate the cross product of two 3D vectors.

```typescript
function cross(a: Vector3D, b: Vector3D): Vector3D
```

- `a` — The first vector.
- `b` — The second vector.

**Returns:** A new Vector3D perpendicular to both input vectors.

#### `dot(a, b)`

Calculate the dot product of two 3D vectors.

```typescript
function dot(a: Vector3D, b: Vector3D): number
```

- `a` — The first vector.
- `b` — The second vector.

**Returns:** The scalar dot product (a.x*b.x + a.y*b.y + a.z*b.z).

#### `getAccelerometer()`

Get the current accelerometer reading.

```typescript
function getAccelerometer(): Promise<AccelerometerData>
```

**Returns:** The current accelerometer data with x, y, z values and timestamp.

#### `getCapabilities()`

Get the platform's motion sensor capabilities.

```typescript
function getCapabilities(): Promise<MotionCapabilities>
```

**Returns:** The capabilities indicating which sensors are available.

#### `getGyroscope()`

Get the current gyroscope reading.

```typescript
function getGyroscope(): Promise<GyroscopeData>
```

**Returns:** The current gyroscope data with x, y, z rotation rates and timestamp.

#### `getOrientation()`

Get the current device orientation reading.

```typescript
function getOrientation(): Promise<OrientationData>
```

**Returns:** The current orientation data with alpha, beta, gamma angles and timestamp.

#### `getPermissionStatus()`

Get the motion sensor permission status.

```typescript
function getPermissionStatus(): Promise<MotionPermissionStatus>
```

**Returns:** The permission status: 'granted', 'denied', 'prompt', or 'unsupported'.

#### `getProvider()`

Get the current motion provider.

```typescript
function getProvider(): MotionProvider
```

**Returns:** The active MotionProvider instance.

#### `hasProvider()`

Check if a motion provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a MotionProvider has been bonded.

#### `magnitude(v)`

Calculate the magnitude (length) of a 3D vector.

```typescript
function magnitude(v: Vector3D): number
```

- `v` — The 3D vector with x, y, z components.

**Returns:** The Euclidean magnitude of the vector.

#### `normalize(v)`

Normalize a 3D vector to unit length. Returns a zero vector if the input has zero magnitude.

```typescript
function normalize(v: Vector3D): Vector3D
```

- `v` — The 3D vector to normalize.

**Returns:** A new Vector3D with unit length pointing in the same direction.

#### `requestPermission()`

Request motion sensor permission (required on iOS 13+).

```typescript
function requestPermission(): Promise<MotionPermissionStatus>
```

**Returns:** The resulting permission status after the request.

#### `setProvider(provider)`

Set the motion provider.

```typescript
function setProvider(provider: MotionProvider): void
```

- `provider` — MotionProvider implementation to register.

#### `startAccelerometer(callback, options)`

Start receiving accelerometer data updates.

```typescript
function startAccelerometer(callback: (data: AccelerometerData) => void, options?: SensorOptions): () => void
```

- `callback` — Called with AccelerometerData on each sensor reading.
- `options` — Sensor options (sampling frequency).

**Returns:** A function that stops the accelerometer updates when called.

#### `startGyroscope(callback, options)`

Start receiving gyroscope data updates.

```typescript
function startGyroscope(callback: (data: GyroscopeData) => void, options?: SensorOptions): () => void
```

- `callback` — Called with GyroscopeData on each sensor reading.
- `options` — Sensor options (sampling frequency).

**Returns:** A function that stops the gyroscope updates when called.

#### `startMagnetometer(callback, options)`

Start receiving magnetometer data updates.

```typescript
function startMagnetometer(callback: (data: MagnetometerData) => void, options?: SensorOptions): () => void
```

- `callback` — Called with MagnetometerData on each sensor reading.
- `options` — Sensor options (sampling frequency).

**Returns:** A function that stops the magnetometer updates when called.

#### `startMotion(callback, options)`

Start receiving combined motion data (accelerometer, gyroscope, orientation).

```typescript
function startMotion(callback: (data: MotionData) => void, options?: SensorOptions): () => void
```

- `callback` — Called with combined MotionData on each reading.
- `options` — Sensor options (sampling frequency).

**Returns:** A function that stops the motion updates when called.

#### `startOrientation(callback, options)`

Start receiving device orientation updates.

```typescript
function startOrientation(callback: (data: OrientationData) => void, options?: SensorOptions): () => void
```

- `callback` — Called with OrientationData (alpha, beta, gamma angles) on each reading.
- `options` — Sensor options (sampling frequency).

**Returns:** A function that stops the orientation updates when called.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-motion`.
