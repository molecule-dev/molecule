/**
 * Dndkit implementation of DragProvider.
 *
 * @module
 */

import type { DndkitConfig } from './types.js'

/**
 *
 */
export class DndkitDragProvider {
  readonly name = 'dndkit'

  constructor(private config: DndkitConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DndkitConfig): DndkitDragProvider {
  return new DndkitDragProvider(config)
}
