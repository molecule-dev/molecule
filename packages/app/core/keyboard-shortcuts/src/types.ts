/**
 * Keyboard shortcuts types for molecule.dev.
 *
 * Defines the provider interface for registering, managing, and
 * responding to keyboard shortcut bindings across the application.
 *
 * @module
 */

/**
 * Keyboard shortcut definition.
 */
export interface Shortcut {
  /** Key combination string (e.g. 'ctrl+s', 'shift+alt+n'). */
  keys: string

  /** Handler function invoked when the shortcut is triggered. */
  handler: (event: KeyboardEvent) => void

  /** Human-readable description of the shortcut action. */
  description?: string

  /** Scope to restrict the shortcut to (e.g. 'editor', 'modal'). */
  scope?: string

  /** Whether to call `preventDefault()` on the keyboard event. Defaults to `true`. */
  preventDefault?: boolean
}

/**
 * A registered shortcut with runtime state.
 */
export interface RegisteredShortcut {
  /** Key combination string. */
  keys: string

  /** Human-readable description of the shortcut action. */
  description?: string

  /** Scope the shortcut is restricted to. */
  scope?: string

  /** Whether the shortcut is currently enabled. */
  enabled: boolean
}

/**
 * Keyboard shortcuts provider interface.
 *
 * All keyboard shortcut providers must implement this interface
 * to manage hotkey bindings across the application.
 */
export interface KeyboardShortcutsProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Registers a single keyboard shortcut.
   *
   * @param shortcut - The shortcut definition to register.
   * @returns A function that unregisters the shortcut when called.
   */
  register(shortcut: Shortcut): () => void

  /**
   * Registers multiple keyboard shortcuts at once.
   *
   * @param shortcuts - Array of shortcut definitions to register.
   * @returns A function that unregisters all shortcuts when called.
   */
  registerMany(shortcuts: Shortcut[]): () => void

  /**
   * Unregisters a shortcut by its key combination.
   *
   * @param keys - The key combination string to unregister.
   */
  unregister(keys: string): void

  /**
   * Unregisters all keyboard shortcuts.
   */
  unregisterAll(): void

  /**
   * Returns all currently registered shortcuts.
   *
   * @returns Array of registered shortcut descriptors.
   */
  getAll(): RegisteredShortcut[]

  /**
   * Checks whether a specific key is currently pressed.
   *
   * @param key - The key to check (e.g. 'shift', 'ctrl').
   * @returns `true` if the key is currently held down.
   */
  isPressed(key: string): boolean

  /**
   * Enables all shortcut handling.
   */
  enable(): void

  /**
   * Disables all shortcut handling.
   */
  disable(): void
}
