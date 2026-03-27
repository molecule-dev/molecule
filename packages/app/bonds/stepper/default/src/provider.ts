/**
 * Default implementation of StepperProvider.
 *
 * @module
 */

import type { DefaultConfig } from './types.js'

/**
 *
 */
export class DefaultStepperProvider {
  readonly name = 'default'

  constructor(private config: DefaultConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DefaultConfig): DefaultStepperProvider {
  return new DefaultStepperProvider(config)
}
