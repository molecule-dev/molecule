/**
 * Monaco Editor provider configuration.
 *
 * @module
 */

/**
 * Configuration for monaco.
 */
export interface MonacoConfig {
  /** Theme for the editor. Defaults to the bundled 'molecule-dark' (registered at mount); the diff editor defaults to 'vs-dark'. */
  theme?: string
  /** Default font family. */
  fontFamily?: string
  /** Default font size. */
  fontSize?: number
  /** Default tab size. */
  tabSize?: number
  /** Enable word wrap by default. */
  wordWrap?: boolean
  /** Show minimap by default. */
  minimap?: boolean
  /** Currently unused — Monaco loads from the bundled `monaco-editor` peer dependency, never from a CDN. */
  cdnUrl?: string
  /** TypeScript compiler options for the language service. */
  tsCompilerOptions?: Record<string, unknown>
}
