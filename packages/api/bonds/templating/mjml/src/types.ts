/**
 * MJML template provider configuration types.
 *
 * @module
 */

/**
 * MJML validation level for template processing.
 */
export type MjmlValidationLevel = 'strict' | 'soft' | 'skip'

/**
 * Configuration options for the MJML template provider.
 */
export interface MjmlTemplateConfig {
  /**
   * Validation level for MJML templates.
   * - `'strict'` — throws on any MJML error (default)
   * - `'soft'` — renders despite errors, attaching warnings
   * - `'skip'` — no validation at all
   */
  validationLevel?: MjmlValidationLevel

  /** Whether to minify the HTML output. Defaults to `false`. */
  minify?: boolean

  /** Whether to beautify the HTML output. Defaults to `false`. */
  beautify?: boolean

  /** File path for resolving `mj-include` relative paths. */
  filePath?: string

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
