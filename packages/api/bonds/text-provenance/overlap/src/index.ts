/**
 * Text provenance by word overlap, for `@molecule/api-text-provenance`.
 *
 * Indexes every three-word sequence the assistant produced in the sessions
 * (its replies and the files it wrote) and every sequence the user typed,
 * then marks a paragraph `ai` when at least `minAiShare` (default 0.5) of its
 * words are covered by assistant sequences and by no user sequence. The turn
 * that contributed the most sequences is the paragraph's source; its prompt
 * is the user message just before it, and its model is the turn's.
 *
 * @example
 * ```typescript
 * import { attributeText, setProvider } from '@molecule/api-text-provenance'
 * import { provider } from '@molecule/api-text-provenance-overlap'
 *
 * setProvider(provider)
 * const { paragraphs, aiShare, prompts } = attributeText({ paragraphs: blocks, sessions })
 * ```
 *
 * @remarks
 * - Compares words only (letters and digits, lowercase), so markdown in the
 *   session (`**bold**`, `## heading`, links) matches the rendered prose, and a
 *   Claude Code `/export`'s re-wrapped text matches too.
 * - Tolerates light edits: changing a word breaks at most three sequences, so
 *   a paragraph with a few words changed stays `ai`. A rewrite falls below
 *   `minAiShare` and becomes `human`.
 * - Words the user typed are never counted as the AI's, even where the agent
 *   repeated them — a paragraph pasted into a prompt stays human.
 * - A paragraph shorter than three words is `ai` only when the whole phrase
 *   appears in an assistant text and in no user text.
 * - When several turns wrote the same words (a draft, then a revision), the
 *   turn with the most matching sequences wins, and the later one on a tie.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './words.js'
