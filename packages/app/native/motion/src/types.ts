/**
 * Motion sensor types for molecule.dev.
 *
 * @module
 */

/**
 * 3D vector for sensor data
 */
export interface Vector3D {
  /** X-axis value */
  x: number
  /** Y-axis value */
  y: number
  /** Z-axis value */
  z: number
}

/**
 * Accelerometer data
 */
export interface AccelerometerData extends Vector3D {
  /** Timestamp */
  timestamp: number
  /** Whether gravity is included */
  includesGravity: boolean
}

/**
 * Gyroscope rotation rate reading (x/y/z radians per second with timestamp).
 */
export interface GyroscopeData extends Vector3D {
  /** Timestamp */
  timestamp: number
}

/**
 * Magnetometer data
 */
export interface MagnetometerData extends Vector3D {
  /** Timestamp */
  timestamp: number
}

/**
 * Device orientation data
 */
export interface OrientationData {
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

/**
 * Combined motion data
 */
export interface MotionData {
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

/**
 * Configuration for motion sensor listening (sampling frequency in Hz).
 */
export interface SensorOptions {
  /** Sampling frequency in Hz (default: 60) */
  frequency?: number
}

/**
 * Shake detection options
 */
export interface ShakeOptions {
  /** Shake threshold acceleration (default: 15) */
  threshold?: number
  /** Minimum shakes to trigger (default: 3) */
  minShakes?: number
  /** Time window in ms (default: 1000) */
  timeWindow?: number
}

/**
 * Motion capabilities
 */
export interface MotionCapabilities {
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

/**
 * Motion permission status
 */
export type MotionPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported'

/**
 * Motion provider interface
 */
export interface MotionProvider {
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
