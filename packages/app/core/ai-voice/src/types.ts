/**
 * AIVoice provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-voice implementation.
 *
 * @module
 */

/**
 *
 */
export interface AIVoiceProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AIVoiceConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
