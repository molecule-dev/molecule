/**
 * Workflow provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete workflow implementation.
 *
 * @module
 */

/**
 *
 */
export interface WorkflowProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface WorkflowConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
