/**
 * AISummarization provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-summarization implementation.
 *
 * @module
 */

/**
 * Live AI summarization integration contract (TODO: expand methods).
 */
export interface AISummarizationProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 * Config options for an AI summarization bond (TODO: tighten schema).
 */
export interface AISummarizationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
