/**
 * Tour types for molecule.dev.
 *
 * Defines the provider interface and data types for onboarding
 * walkthrough / guided tour UI components.
 *
 * @module
 */

/**
 * A single step in a guided tour.
 */
export interface TourStep {
  /** CSS selector for the target element to highlight. */
  target: string

  /** Title of the tour step. */
  title: string

  /** Content/description body for the step. */
  content: string

  /** Preferred placement of the tooltip relative to the target. */
  placement?: 'top' | 'bottom' | 'left' | 'right'

  /** Action to perform when the step is shown. */
  action?: () => void

  /** Async function that runs before the step is displayed. */
  beforeShow?: () => Promise<void>
}

/**
 * Configuration options for creating a tour.
 */
export interface TourOptions {
  /** Steps to display in the tour. */
  steps: TourStep[]

  /** Callback when the tour is completed. */
  onComplete?: () => void

  /** Callback when the tour is cancelled. */
  onCancel?: () => void

  /** Whether to show a progress indicator. Defaults to `true`. */
  showProgress?: boolean

  /** Whether to show navigation buttons. Defaults to `true`. */
  showButtons?: boolean

  /** Whether to display a backdrop overlay. Defaults to `true`. */
  overlay?: boolean
}

/**
 * A live tour instance returned by the provider.
 */
export interface TourInstance {
  /**
   * Starts the tour from the beginning.
   */
  start(): void

  /**
   * Advances to the next step.
   */
  next(): void

  /**
   * Goes back to the previous step.
   */
  previous(): void

  /**
   * Cancels the tour without completing it.
   */
  cancel(): void

  /**
   * Marks the tour as complete and triggers the onComplete callback.
   */
  complete(): void

  /**
   * Checks whether the tour is currently running.
   *
   * @returns `true` if the tour is active.
   */
  isActive(): boolean

  /**
   * Returns the index of the current step.
   *
   * @returns Zero-based index of the current step.
   */
  getCurrentStep(): number
}

/**
 * Tour provider interface.
 *
 * All tour providers must implement this interface to create
 * and manage onboarding walkthrough / guided tour UI.
 */
export interface TourProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new tour instance.
   *
   * @param options - Configuration for the tour.
   * @returns A tour instance for controlling the walkthrough.
   */
  createTour(options: TourOptions): TourInstance
}
