/**
 * AIAgents provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-agents implementation.
 *
 * @module
 */

/**
 *
 */
export interface AIAgentsProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AIAgentsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
