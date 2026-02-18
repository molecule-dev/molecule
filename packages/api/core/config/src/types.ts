/**
 * Type definitions for configuration core interface.
 *
 * @module
 */

/**
 * Configuration schema for a single value.
 */
export interface ConfigSchema {
  /**
   * Configuration key (e.g., 'DATABASE_URL', 'API_KEY').
   */
  key: string

  /**
   * Human-readable description.
   */
  description?: string

  /**
   * Expected type.
   */
  type?: 'string' | 'number' | 'boolean' | 'json'

  /**
   * Whether this configuration is required.
   */
  required?: boolean

  /**
   * Default value if not provided.
   */
  default?: unknown

  /**
   * Whether this is a secret (should not be logged).
   */
  secret?: boolean

  /**
   * Validation pattern (regex for strings).
   */
  pattern?: string

  /**
   * Minimum value (for numbers).
   */
  min?: number

  /**
   * Maximum value (for numbers).
   */
  max?: number

  /**
   * Allowed values.
   */
  enum?: unknown[]
}

/**
 * Configuration validation result.
 */
export interface ConfigValidationResult {
  /**
   * Whether validation passed.
   */
  valid: boolean

  /**
   * Validation errors.
   */
  errors: Array<{
    key: string
    message: string
  }>

  /**
   * Warnings (non-fatal issues).
   */
  warnings: Array<{
    key: string
    message: string
  }>
}

/**
 * Configuration provider interface.
 *
 * All configuration providers must implement this interface.
 */
export interface ConfigProvider {
  /**
   * Gets a configuration value.
   *
   * @param key - Configuration key
   * @param defaultValue - Default value if not found
   */
  get<T = string>(key: string, defaultValue?: T): T | undefined

  /**
   * Gets a required configuration value.
   *
   * @param key - Configuration key
   * @throws {Error} Error if the key is not found
   */
  getRequired<T = string>(key: string): T

  /**
   * Gets all configuration values.
   */
  getAll(): Record<string, unknown>

  /**
   * Checks if a configuration key exists.
   */
  has(key: string): boolean

  /**
   * Sets a configuration value (runtime override).
   */
  set?(key: string, value: unknown): void

  /**
   * Validates configuration against a schema.
   */
  validate?(schema: ConfigSchema[]): ConfigValidationResult

  /**
   * Reloads configuration from sources.
   */
  reload?(): Promise<void>

  /**
   * Watches for configuration changes.
   */
  watch?(callback: (key: string, value: unknown) => void): () => void
}
