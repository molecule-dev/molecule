/**
 * Hotkeys implementation of KeyboardProvider.
 *
 * @module
 */

import type { HotkeysConfig } from './types.js'

/**
 *
 */
export class HotkeysKeyboardProvider {
  readonly name = 'hotkeys'

  constructor(private config: HotkeysConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: HotkeysConfig): HotkeysKeyboardProvider {
  return new HotkeysKeyboardProvider(config)
}
