/**
 * Configuration for the default (Web Speech API) voice provider.
 *
 * @module
 */

import type { AIVoiceConfig } from '@molecule/app-ai-voice'

/**
 * Configuration specific to the default Web Speech API voice provider.
 * Extends the base AIVoiceConfig with Web Speech API-specific options.
 */
export interface DefaultVoiceConfig extends AIVoiceConfig {
  /**
   * When true, immediately restarts recognition after it ends
   * (e.g. due to silence timeout) in continuous mode.
   * Defaults to true.
   */
  autoRestart?: boolean
}
