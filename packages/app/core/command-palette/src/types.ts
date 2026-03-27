/**
 * CommandPalette provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete command-palette implementation.
 *
 * @module
 */

/**
 *
 */
export interface CommandPaletteProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface CommandPaletteConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
