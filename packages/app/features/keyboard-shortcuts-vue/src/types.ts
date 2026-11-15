/**
 * Types for the Vue keyboard-shortcuts hooks.
 *
 * @module
 */

/** Options for {@link useKeyboardShortcut} in `@molecule/app-keyboard-shortcuts-vue`. */
export interface UseKeyboardShortcutOptions {
  /** Register the shortcut at all. `false` unregisters it. Defaults to `true`. */
  enabled?: boolean

  /** What the shortcut does, already translated, for a shortcuts panel. */
  description?: string

  /** The provider scope to register under. */
  scope?: string

  /** Call `preventDefault()` on the event. Defaults to `true`. */
  preventDefault?: boolean
}
