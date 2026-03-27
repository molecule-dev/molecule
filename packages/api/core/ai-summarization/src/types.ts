/**
 * AISummarization provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-summarization implementation.
 *
 * @module
 */

/**
 *
 */
export interface AISummarizationProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AISummarizationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
