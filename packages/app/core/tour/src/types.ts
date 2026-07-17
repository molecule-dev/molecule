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

  /**
   * Whether navigation buttons (back / next / done) should be rendered.
   * Defaults to `true`. Surfaced back to the consumer's render code via
   * {@link TourInstance.hasButtons}.
   */
  showButtons?: boolean

  /**
   * Whether a backdrop overlay should be rendered. Defaults to `true`.
   * Surfaced back to the consumer's render code via
   * {@link TourInstance.hasOverlay}.
   */
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

  /**
   * Whether a backdrop overlay should be rendered for this tour.
   *
   * The provider tracks state only and draws nothing on screen — read this in
   * your render code to decide whether to paint the backdrop. Reflects the
   * resolved `overlay` value: the per-tour {@link TourOptions.overlay}, else
   * the provider's default, else `true`.
   *
   * @returns `true` if the consumer should render a backdrop overlay.
   */
  hasOverlay(): boolean

  /**
   * Whether navigation buttons (back / next / done) should be rendered.
   *
   * The provider draws no buttons itself — read this in your render code to
   * decide whether to paint the nav controls. Reflects the resolved
   * `showButtons` value: the per-tour {@link TourOptions.showButtons}, else the
   * provider's default, else `true`.
   *
   * @returns `true` if the consumer should render navigation buttons.
   */
  hasButtons(): boolean
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
