/**
 * AIAgents provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-agents implementation.
 *
 * @module
 */

/**
 * Live AI agents integration contract (TODO: expand methods).
 */
export interface AIAgentsProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 * Config options for an AI agents bond (TODO: tighten schema).
 */
export interface AIAgentsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
