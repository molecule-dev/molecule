/**
 * Twilio implementation of SmsProvider.
 *
 * @module
 */

import type { TwilioConfig } from './types.js'

/**
 *
 */
export class TwilioSmsProvider {
  readonly name = 'twilio'

  constructor(private config: TwilioConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: TwilioConfig): TwilioSmsProvider {
  return new TwilioSmsProvider(config)
}
