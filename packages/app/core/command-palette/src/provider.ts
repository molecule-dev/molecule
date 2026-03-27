/**
 * Command palette provider singleton.
 *
 * Bond packages call {@link setProvider} during application startup.
 * Application code calls {@link getProvider} or the convenience factory
 * ({@link createPalette}) at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type {
  CommandPaletteInstance,
  CommandPaletteOptions,
  CommandPaletteProvider,
} from './types.js'

/** Bond category key for the command palette provider. */
const BOND_TYPE = 'command-palette'

/**
 * Registers a command palette provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/app-command-palette-cmdk`) during app startup.
 *
 * @param provider - The command palette provider implementation to bond.
 */
export function setProvider(provider: CommandPaletteProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded command palette provider, throwing if none is configured.
 *
 * @returns The bonded command palette provider.
 * @throws {Error} If no command palette provider has been bonded.
 */
export function getProvider(): CommandPaletteProvider {
  const provider = bondGet<CommandPaletteProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-command-palette: No provider bonded. Call setProvider() with a command palette bond (e.g. @molecule/app-command-palette-cmdk).',
    )
  }
  return provider
}

/**
 * Checks whether a command palette provider is currently bonded.
 *
 * @returns `true` if a command palette provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a command palette instance using the bonded provider.
 *
 * @param options - Command palette configuration.
 * @returns A command palette instance.
 * @throws {Error} If no command palette provider has been bonded.
 */
export function createPalette(options: CommandPaletteOptions): CommandPaletteInstance {
  return getProvider().createPalette(options)
}
