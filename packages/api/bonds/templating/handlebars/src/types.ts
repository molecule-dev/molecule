/**
 * Handlebars template provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Handlebars template provider.
 */
export interface HandlebarsTemplateConfig {
  /** Whether to HTML-escape output by default. Defaults to `true`. */
  escape?: boolean

  /**
   * Built-in helpers to register on creation.
   * Keys are helper names, values are helper functions.
   */
  helpers?: Record<string, (...args: unknown[]) => string>

  /**
   * Built-in partials to register on creation.
   * Keys are partial names, values are partial template strings.
   */
  partials?: Record<string, string>
}
