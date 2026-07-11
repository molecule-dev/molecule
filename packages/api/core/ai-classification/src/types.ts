/**
 * AI classification provider interface.
 *
 * Model-agnostic, zero-shot text classification: score a piece of text against
 * a set of candidate labels. Implemented by composing the swappable `ai` chat
 * bond (`@molecule/api-ai`) — see the default `provider` in `./provider.js`.
 *
 * @module
 */

import type { TokenUsage } from '@molecule/api-ai'

/**
 * Input to a single classification request.
 */
export interface ClassifyInput {
  /** The text to classify. */
  text: string
  /** Candidate labels to score the text against (required, non-empty). */
  labels: string[]
  /** Allow multiple positive labels rather than a single winner (default `false`). */
  multiLabel?: boolean
  /** Extra guidance passed to the classifier (e.g. label definitions, tone). */
  instructions?: string
  /** Override the AI model used for this request. */
  model?: string
  /** Select a specific named AI provider (defaults to the bonded singleton). */
  provider?: string
  /** Abort signal to cancel the in-flight request. */
  signal?: AbortSignal
}

/**
 * A single label with its confidence score in the range `0..1`.
 */
export interface LabelScore {
  /** The candidate label. */
  label: string
  /** Confidence score in the range `0..1`. */
  score: number
}

/**
 * Result of a classification request.
 */
export interface ClassifyResult {
  /** All candidate labels with scores, sorted descending by score. Only labels from the candidate set. */
  labels: LabelScore[]
  /** The highest-scoring label. */
  top: string
  /** Token usage reported by the underlying AI provider, when available. */
  usage?: TokenUsage
}

/**
 * AI classification provider interface.
 *
 * Implement (or bond the default `provider`) to give an app zero-shot text
 * classification. All providers return the same normalized `ClassifyResult`.
 */
export interface AIClassificationProvider {
  /** Provider identifier. */
  readonly name: string

  /**
   * Classify `text` against the candidate `labels`, returning a normalized,
   * score-sorted result.
   *
   * @param input - The text, candidate labels, and options.
   * @returns The scored, sorted labels plus the top label and token usage.
   */
  classify(input: ClassifyInput): Promise<ClassifyResult>
}

/**
 * Config options for an AI classification bond.
 */
export interface AIClassificationConfig {
  [key: string]: unknown
}
