/**
 * Health and fitness data types for molecule.dev.
 *
 * @module
 */

/**
 * Health data types
 */
export type HealthDataType =
  // Activity
  | 'steps'
  | 'distance'
  | 'activeEnergy'
  | 'basalEnergy'
  | 'flights'
  | 'exerciseTime'
  | 'standTime'
  | 'moveMinutes'
  // Body measurements
  | 'weight'
  | 'height'
  | 'bodyMass'
  | 'bodyFat'
  | 'bmi'
  | 'leanBodyMass'
  | 'waistCircumference'
  // Vitals
  | 'heartRate'
  | 'restingHeartRate'
  | 'heartRateVariability'
  | 'bloodPressureSystolic'
  | 'bloodPressureDiastolic'
  | 'respiratoryRate'
  | 'oxygenSaturation'
  | 'bodyTemperature'
  | 'bloodGlucose'
  // Sleep
  | 'sleepAnalysis'
  | 'sleepInBed'
  | 'sleepAsleep'
  | 'sleepAwake'
  | 'sleepRem'
  | 'sleepDeep'
  | 'sleepCore'
  // Nutrition
  | 'water'
  | 'caffeine'
  | 'calories'
  | 'protein'
  | 'carbohydrates'
  | 'fat'
  | 'fiber'
  | 'sugar'
  | 'sodium'
  // Workouts
  | 'workout'
  // Mindfulness
  | 'mindfulMinutes'

/**
 * Workout activity type
 */
export type WorkoutType =
  | 'running'
  | 'walking'
  | 'cycling'
  | 'swimming'
  | 'hiking'
  | 'yoga'
  | 'strength'
  | 'highIntensityInterval'
  | 'rowing'
  | 'elliptical'
  | 'stairClimbing'
  | 'other'

/**
 * Health data sample
 */
export interface HealthSample {
  /** Data type */
  type: HealthDataType
  /** Value */
  value: number
  /** Unit */
  unit: string
  /** Start date (ISO string) */
  startDate: string
  /** End date (ISO string) */
  endDate: string
  /** Source name */
  sourceName?: string
  /** Source bundle ID */
  sourceBundleId?: string
  /** Device name */
  device?: string
  /** Metadata */
  metadata?: Record<string, unknown>
}

/**
 * A recorded workout with type, duration, energy burned, distance, and heart rate data.
 */
export interface WorkoutSample {
  /** Workout type */
  workoutType: WorkoutType
  /** Start date (ISO string) */
  startDate: string
  /** End date (ISO string) */
  endDate: string
  /** Duration in seconds */
  duration: number
  /** Active energy burned (kcal) */
  activeEnergy?: number
  /** Total energy burned (kcal) */
  totalEnergy?: number
  /** Distance (meters) */
  distance?: number
  /** Average heart rate */
  avgHeartRate?: number
  /** Max heart rate */
  maxHeartRate?: number
  /** Source name */
  sourceName?: string
  /** Metadata */
  metadata?: Record<string, unknown>
}

/**
 * A recorded sleep session with stages (in-bed, asleep, awake, REM, deep, core) and efficiency.
 */
export interface SleepSample {
  /** Start date (ISO string) */
  startDate: string
  /** End date (ISO string) */
  endDate: string
  /** Sleep stages */
  stages?: {
    /** Stage type */
    type: 'inBed' | 'asleep' | 'awake' | 'rem' | 'deep' | 'core'
    /** Start date (ISO string) */
    startDate: string
    /** End date (ISO string) */
    endDate: string
    /** Duration in seconds */
    duration: number
  }[]
  /** Total time in bed (seconds) */
  timeInBed: number
  /** Total time asleep (seconds) */
  timeAsleep: number
  /** Sleep efficiency (0-1) */
  efficiency?: number
  /** Source name */
  sourceName?: string
}

/**
 * Options for querying health data samples (date range, limit, sort order, data source).
 */
export interface HealthQueryOptions {
  /** Start date (ISO string) */
  startDate: string
  /** End date (ISO string) */
  endDate: string
  /** Maximum samples to return */
  limit?: number
  /** Sort ascending */
  ascending?: boolean
  /** Aggregate by interval */
  aggregateBy?: 'hour' | 'day' | 'week' | 'month'
}

/**
 * Health authorization status
 */
export type HealthAuthStatus =
  | 'authorized'
  | 'denied'
  | 'notDetermined'
  | 'sharingDenied'
  | 'unsupported'

/**
 * Health capabilities
 */
export interface HealthCapabilities {
  /** Whether health data is supported */
  supported: boolean
  /** Platform (ios/android) */
  platform?: 'ios' | 'android'
  /** Readable data types */
  readableTypes: HealthDataType[]
  /** Writable data types */
  writableTypes: HealthDataType[]
  /** Whether background delivery is supported */
  supportsBackgroundDelivery: boolean
}

/**
 * Health provider interface
 */
export interface HealthProvider {
  /**
   * Request authorization for data types.
   * @param readTypes - Health data types to request read access for.
   * @param writeTypes - Health data types to request write access for.
   * @returns Whether authorization was granted.
   */
  requestAuthorization(readTypes: HealthDataType[], writeTypes?: HealthDataType[]): Promise<boolean>

  /**
   * Check authorization status for a specific data type and access level.
   * @param type - The health data type to check.
   * @param access - Whether checking 'read' or 'write' access.
   * @returns The authorization status: 'authorized', 'denied', 'notDetermined', 'sharingDenied', or 'unsupported'.
   */
  getAuthorizationStatus(type: HealthDataType, access: 'read' | 'write'): Promise<HealthAuthStatus>

  /**
   * Query health samples
   * @param type - Data type
   * @param options - Query options
   */
  querySamples(type: HealthDataType, options: HealthQueryOptions): Promise<HealthSample[]>

  /**
   * Get aggregated statistics
   * @param type - Data type
   * @param options - Query options
   */
  queryStatistics(
    type: HealthDataType,
    options: HealthQueryOptions,
  ): Promise<{
    sum?: number
    average?: number
    min?: number
    max?: number
    count: number
  }>

  /**
   * Write a health sample
   * @param sample - Sample to write
   */
  writeSample(sample: Omit<HealthSample, 'sourceName' | 'device'>): Promise<void>

  /**
   * Query workouts
   * @param options - Query options
   */
  queryWorkouts(options: HealthQueryOptions): Promise<WorkoutSample[]>

  /**
   * Write a workout
   * @param workout - Workout to write
   */
  writeWorkout(workout: Omit<WorkoutSample, 'sourceName'>): Promise<void>

  /**
   * Query sleep data
   * @param options - Query options
   */
  querySleep(options: HealthQueryOptions): Promise<SleepSample[]>

  /**
   * Delete samples
   * @param type - Data type
   * @param options - Query options for samples to delete
   */
  deleteSamples(type: HealthDataType, options: HealthQueryOptions): Promise<void>

  /**
   * Open health app
   */
  openHealthApp(): Promise<void>

  /**
   * Get the platform's health data capabilities.
   * @returns The capabilities including supported data types, platform, and background delivery support.
   */
  getCapabilities(): Promise<HealthCapabilities>
}
