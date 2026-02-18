/**
 * `@molecule/app-screen-orientation`
 * Type definitions for screen orientation interface
 */

/**
 * Screen orientation type
 */
export type OrientationType =
  | 'portrait' // Portrait (any)
  | 'portrait-primary' // Portrait upright
  | 'portrait-secondary' // Portrait upside-down
  | 'landscape' // Landscape (any)
  | 'landscape-primary' // Landscape left
  | 'landscape-secondary' // Landscape right

/**
 * Orientation lock type
 */
export type OrientationLock =
  | 'any' // Allow any orientation
  | 'natural' // Device's natural orientation
  | 'portrait' // Portrait only (any)
  | 'portrait-primary' // Portrait upright only
  | 'portrait-secondary' // Portrait upside-down only
  | 'landscape' // Landscape only (any)
  | 'landscape-primary' // Landscape left only
  | 'landscape-secondary' // Landscape right only

/**
 * Orientation state
 */
export interface OrientationState {
  /** Current orientation type */
  type: OrientationType
  /** Rotation angle (0, 90, 180, 270) */
  angle: number
  /** Whether orientation is locked */
  isLocked: boolean
  /** Current lock type (if locked) */
  lockType?: OrientationLock
}

/**
 * Orientation change event
 */
export interface OrientationChangeEvent {
  /** Previous orientation */
  previous: OrientationType
  /** Current orientation */
  current: OrientationType
  /** Previous angle */
  previousAngle: number
  /** Current angle */
  currentAngle: number
}

/**
 * Screen dimensions
 */
export interface ScreenDimensions {
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
  /** Device pixel ratio */
  pixelRatio: number
  /** Whether in landscape mode */
  isLandscape: boolean
  /** Whether in portrait mode */
  isPortrait: boolean
}

/**
 * Orientation capabilities
 */
export interface OrientationCapabilities {
  /** Whether orientation control is supported */
  supported: boolean
  /** Whether orientation locking is supported */
  canLock: boolean
  /** Supported lock types */
  supportedLockTypes: OrientationLock[]
  /** Whether orientation change detection is supported */
  canDetectChanges: boolean
}

/**
 * Screen orientation provider interface
 */
export interface ScreenOrientationProvider {
  /**
   * Get current orientation
   */
  getOrientation(): Promise<OrientationType>

  /**
   * Get current orientation state
   */
  getState(): Promise<OrientationState>

  /**
   * Get screen dimensions
   */
  getDimensions(): Promise<ScreenDimensions>

  /**
   * Lock screen orientation
   * @param orientation - Orientation to lock to
   */
  lock(orientation: OrientationLock): Promise<void>

  /**
   * Unlock screen orientation
   */
  unlock(): Promise<void>

  /**
   * Check if orientation is locked
   * @returns Whether the screen orientation is currently locked.
   */
  isLocked(): Promise<boolean>

  /**
   * Listen for orientation changes
   * @param callback - Called when orientation changes
   * @returns Unsubscribe function
   */
  onChange(callback: (event: OrientationChangeEvent) => void): () => void

  /**
   * Get orientation capabilities
   * @returns The supported orientation features for the current platform.
   */
  getCapabilities(): Promise<OrientationCapabilities>
}
