/**
 * Stepper provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete stepper implementation.
 *
 * @module
 */

/**
 *
 */
export interface StepperProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface StepperConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
