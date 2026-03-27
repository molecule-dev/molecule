/**
 * Stepper types for molecule.dev.
 *
 * Defines the provider interface and data types for multi-step
 * wizard / stepper UI components.
 *
 * @module
 */

/**
 * A single step in a stepper wizard.
 */
export interface Step {
  /** Display label for the step. */
  label: string

  /** Optional description or help text. */
  description?: string

  /** Optional icon identifier. */
  icon?: string

  /** Whether this step can be skipped. Defaults to `false`. */
  optional?: boolean

  /** Error message to display on the step. */
  error?: string

  /** Whether this step has been completed. */
  completed?: boolean
}

/**
 * Configuration options for creating a stepper.
 */
export interface StepperOptions {
  /** Steps to display. */
  steps: Step[]

  /** Index of the initially active step. Defaults to `0`. */
  activeStep?: number

  /** Layout orientation. Defaults to `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical'

  /** Callback when the active step changes. */
  onStepChange?: (step: number) => void

  /** Whether steps must be completed in order. Defaults to `false`. */
  linear?: boolean
}

/**
 * A live stepper instance returned by the provider.
 */
export interface StepperInstance {
  /**
   * Advances to the next step.
   */
  next(): void

  /**
   * Goes back to the previous step.
   */
  previous(): void

  /**
   * Jumps to a specific step by index.
   *
   * @param step - Zero-based step index.
   */
  goTo(step: number): void

  /**
   * Returns the index of the currently active step.
   *
   * @returns Zero-based index of the active step.
   */
  getActiveStep(): number

  /**
   * Checks whether all steps have been completed.
   *
   * @returns `true` if every step is marked as completed.
   */
  isComplete(): boolean

  /**
   * Validates the current step.
   *
   * @returns `true` if the current step passes validation.
   */
  validate(): boolean

  /**
   * Destroys the stepper instance and cleans up resources.
   */
  destroy(): void
}

/**
 * Stepper provider interface.
 *
 * All stepper providers must implement this interface to create
 * and manage multi-step wizard UI.
 */
export interface StepperProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new stepper instance.
   *
   * @param options - Configuration for the stepper.
   * @returns A stepper instance for managing navigation.
   */
  createStepper(options: StepperOptions): StepperInstance
}
