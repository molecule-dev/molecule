/**
 * DragDrop provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { DragDropProvider } from './types.js'

let _provider: DragDropProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: DragDropProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): DragDropProvider | null {
  return _provider
}

/**
 *
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 *
 */
export function requireProvider(): DragDropProvider {
  if (!_provider) {
    throw new Error('DragDrop provider not configured. Bond a drag-drop provider first.')
  }
  return _provider
}
