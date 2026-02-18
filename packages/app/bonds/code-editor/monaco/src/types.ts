/**
 * Monaco Editor provider configuration.
 *
 * @module
 */

/**
 * Configuration for monaco.
 */
export interface MonacoConfig {
  /** Theme for the editor. Defaults to 'vs-dark'. */
  theme?: string
  /** Default font size. */
  fontSize?: number
  /** Default tab size. */
  tabSize?: number
  /** Enable word wrap by default. */
  wordWrap?: boolean
  /** Show minimap by default. */
  minimap?: boolean
  /** CDN URL for Monaco Editor assets. */
  cdnUrl?: string
  /** TypeScript compiler options for the language service. */
  tsCompilerOptions?: Record<string, unknown>
}
