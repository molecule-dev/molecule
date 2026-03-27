/**
 * KeyboardShortcuts provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete keyboard-shortcuts implementation.
 *
 * @module
 */

/**
 *
 */
export interface KeyboardShortcutsProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface KeyboardShortcutsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
