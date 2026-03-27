/**
 * AICopilot provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-copilot implementation.
 *
 * @module
 */

/**
 *
 */
export interface AICopilotProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AICopilotConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
