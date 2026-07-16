/**
 * Configuration for the Shepherd tour provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 *
 * Reserved — the current implementation consumes NO configuration; these
 * fields have no effect (there is no built-in overlay or button UI to
 * configure — see the module notes).
 */
export interface ShepherdConfig {
  /** Reserved. Not consumed — this provider draws no overlay. */
  overlay?: boolean

  /** Reserved. Not consumed — this provider draws no buttons. */
  showButtons?: boolean
}
