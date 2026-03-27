/**
 * CommandPalette provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { CommandPaletteProvider } from './types.js'

let _provider: CommandPaletteProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: CommandPaletteProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): CommandPaletteProvider | null {
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
export function requireProvider(): CommandPaletteProvider {
  if (!_provider) {
    throw new Error(
      'CommandPalette provider not configured. Bond a command-palette provider first.',
    )
  }
  return _provider
}
