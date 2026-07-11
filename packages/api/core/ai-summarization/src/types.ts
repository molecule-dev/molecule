/**
 * AI summarization contract.
 *
 * Model-agnostic interface for turning a block of text into a concise summary.
 * The default provider (see `provider.ts`) composes the swappable `ai` chat
 * bond (`@molecule/api-ai`) — there is no separate summarization vendor, it is
 * prompt orchestration over whatever LLM the app has bonded. Apps may swap in
 * their own `AISummarizationProvider` via `bond('ai-summarization', provider)`.
 *
 * @module
 */

import type { TokenUsage } from '@molecule/api-ai'

/**
 * Input for a summarize request.
 */
export interface SummarizeInput {
  /** The source text to summarize. */
  text: string
  /** Approximate target length in words. */
  maxLength?: number
  /** Output shape. Defaults to `'paragraph'`. */
  format?: 'paragraph' | 'bullets' | 'tldr'
  /** Optional angle or extra instructions to steer the summary. */
  focus?: string
  /** AI model override, passed through to the AI provider. */
  model?: string
  /** Named AI provider to use; falls back to the bonded default when omitted. */
  provider?: string
  /** Abort signal to cancel the in-flight AI request. */
  signal?: AbortSignal
}

/**
 * Result of a summarize request.
 */
export interface SummarizeResult {
  /** The generated summary. */
  summary: string
  /** Token usage reported by the underlying AI provider, when available. */
  usage?: TokenUsage
}

/**
 * AI summarization provider interface.
 *
 * Implemented by the batteries-included default (composing `@molecule/api-ai`)
 * or by a custom bond package. All implementations return the same normalized
 * `SummarizeResult` regardless of the LLM behind them.
 */
export interface AISummarizationProvider {
  readonly name: string

  /**
   * Summarize the given text.
   *
   * @param input - The source text plus optional shape/length/focus controls.
   * @returns The summary and (when reported) token usage.
   */
  summarize(input: SummarizeInput): Promise<SummarizeResult>
}

/**
 * Config options for an AI summarization bond.
 */
export interface AISummarizationConfig {
  [key: string]: unknown
}
