/**
 * Shared AI model definitions.
 *
 * Single source of truth for model metadata — used by both API (validation,
 * compaction budgets) and App (model picker UI). Add or remove models here
 * and both sides update automatically.
 *
 * @module
 */

/**
 * AI provider identifier.
 *
 * Maps to the bond category used at runtime (e.g., `bond('ai', anthropicProvider)`).
 * Adding a new provider here means a corresponding AI bond package must exist.
 */
export type AIProviderID =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'xai'
  | 'meta'
  | 'moonshot'
  | 'minimax'
  | 'alibaba'
  | 'zhipu'

/**
 * Static metadata for an AI model.
 */
export interface ModelDefinition {
  /** API model ID (e.g., 'claude-sonnet-4-6', 'gpt-4o'). */
  id: string
  /** Which AI provider serves this model. */
  provider: AIProviderID
  /** Human-readable label (e.g., 'Claude Sonnet 4.6'). */
  label: string
  /** Short description for UI display. */
  description: string
  /** Maximum input context window in tokens. */
  contextWindow: number
  /** Maximum output tokens per response. */
  maxOutputTokens: number
  /** Whether the model supports extended thinking / chain-of-thought. */
  supportsThinking: boolean
  /** Default thinking budget in tokens (only relevant when supportsThinking is true). */
  thinkingBudgetTokens: number
  /** Whether the model supports vision (images, documents, etc.). */
  supportsVision: boolean
  /** Whether the model supports prompt caching. */
  supportsPromptCaching: boolean
  /** Whether the model supports tool use / function calling. */
  supportsTools: boolean
  /**
   * Provider-specific server tool type for web search (e.g. `'web_search_20250305'`).
   *  When set, the chat handler sends this as a `ServerTool` alongside custom tools.
   *  Omit if the model/provider does not support native web search.
   */
  webSearchToolType?: string
  /**
   * Provider-specific server tool type for code execution (e.g. `'code_execution_20250825'`).
   *  When set, the chat handler sends this as a `ServerTool` for server-side calculations.
   *  Omit if the model/provider does not support native code execution.
   */
  codeExecutionToolType?: string
  /**
   * Provider-specific server tool type for web fetch / URL context (e.g. `'web_fetch_20260209'`).
   *  When set, the chat handler sends this as a `ServerTool` for server-side URL fetching.
   *  Omit if the model/provider does not support native web fetch.
   */
  webFetchToolType?: string
  /** Input price per million tokens in USD. */
  inputPricePerMTok: number
  /** Output price per million tokens in USD. */
  outputPricePerMTok: number
  /** Reliable knowledge cutoff date (YYYY-MM-DD). */
  knowledgeCutoff: string
}
