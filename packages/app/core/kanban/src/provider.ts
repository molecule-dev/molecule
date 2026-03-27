/**
 * Kanban provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { KanbanProvider } from './types.js'

let _provider: KanbanProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: KanbanProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): KanbanProvider | null {
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
export function requireProvider(): KanbanProvider {
  if (!_provider) {
    throw new Error('Kanban provider not configured. Bond a kanban provider first.')
  }
  return _provider
}
