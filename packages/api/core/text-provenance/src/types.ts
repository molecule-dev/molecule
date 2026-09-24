/**
 * Types for `@molecule/api-text-provenance`: which paragraphs of a document an
 * AI wrote, and the prompt and model behind each.
 *
 * @module
 */

import type { AgentSession } from '@molecule/api-agent-transcript'

/** Who wrote a paragraph. */
export type ParagraphOrigin = 'human' | 'ai'

/** Tuning for an attribution. */
export interface AttributionOptions {
  /**
   * The share of a paragraph's words that must come from the AI for the
   * paragraph to count as AI-written. Default 0.5.
   */
  minAiShare?: number
}

/** What to attribute: the document's paragraphs and the sessions that may have written them. */
export interface AttributionInput {
  /** The document's paragraphs as plain text, in order (headings and list items may be passed as their own blocks). */
  paragraphs: readonly string[]
  /** The agent sessions behind the document (`@molecule/api-agent-transcript`). None = all human. */
  sessions: readonly AgentSession[]
  /** Tuning. */
  options?: AttributionOptions
}

/** One paragraph's attribution. */
export interface ParagraphAttribution {
  /** The paragraph's position in the input. */
  index: number
  /** `ai` when at least `minAiShare` of its words came from the AI and not from the user. */
  origin: ParagraphOrigin
  /** How many words it has. */
  words: number
  /** How many of them came from the AI (and were not typed by the user). */
  aiWords: number
  /** For an `ai` paragraph: the user message, as typed, that the writing answered. */
  prompt?: string
  /** For an `ai` paragraph: the model that wrote it, when the session records one. */
  model?: string
  /** For an `ai` paragraph: which session (index into `sessions`) and turn (index into its `turns`) wrote it. */
  source?: { session: number; turn: number }
}

/** A document's attribution. */
export interface Attribution {
  /** One entry per input paragraph, in order. */
  paragraphs: ParagraphAttribution[]
  /** Words in the whole document. */
  words: number
  /** Words in the paragraphs attributed to the AI. */
  aiWords: number
  /** `aiWords / words` (0 for an empty document). */
  aiShare: number
  /** The distinct prompts behind the AI paragraphs, in the order they first appear in the document. */
  prompts: string[]
}

/** The contract every attribution bond implements. */
export interface TextProvenanceProvider {
  /**
   * Attribute each paragraph to the human or to the AI.
   *
   * @param input - The paragraphs, the sessions, and tuning.
   * @returns The attribution.
   */
  attribute(input: AttributionInput): Attribution
}
