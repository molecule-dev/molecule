/**
 * Workflow provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { WorkflowProvider } from './types.js'

let _provider: WorkflowProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: WorkflowProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): WorkflowProvider | null {
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
export function requireProvider(): WorkflowProvider {
  if (!_provider) {
    throw new Error('Workflow provider not configured. Bond a workflow provider first.')
  }
  return _provider
}
