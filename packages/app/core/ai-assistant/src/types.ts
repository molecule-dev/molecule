/**
 * AIAssistant provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-assistant implementation.
 *
 * @module
 */

/**
 *
 */
export interface AIAssistantProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AIAssistantConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
