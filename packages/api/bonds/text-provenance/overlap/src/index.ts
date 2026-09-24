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
 * import type { AgentSession } from '@molecule/api-agent-transcript'
 * import { attributeText, setProvider } from '@molecule/api-text-provenance'
 * import { provider } from '@molecule/api-text-provenance-overlap'
 *
 * // Startup: bond once.
 * setProvider(provider)
 *
 * // Sessions normally come from readTranscript() (`@molecule/api-agent-transcript` + a reader bond).
 * const sessions: AgentSession[] = [
 *   {
 *     format: 'claude-code',
 *     harness: 'Claude Code',
 *     model: 'claude-opus-4-5',
 *     turns: [
 *       { role: 'user', text: 'Write an intro about tide pools.', files: [] },
 *       {
 *         role: 'assistant',
 *         text: 'Tide pools are rocky hollows that trap seawater when the ocean retreats at low tide.',
 *         files: [],
 *       },
 *     ],
 *   },
 * ]
 *
 * // The published text, already split into paragraphs by you.
 * const paragraphs = [
 *   'Tide pools are rocky hollows that trap seawater when the ocean retreats at low tide.',
 *   'I spent every summer of my childhood poking at anemones on the Oregon coast.',
 * ]
 *
 * const result = attributeText({ paragraphs, sessions }) // synchronous — no await
 * // result.paragraphs[0].origin === 'ai' (prompt: 'Write an intro about tide pools.')
 * // result.paragraphs[1].origin === 'human'
 * // result.aiShare === 15 / 29, result.prompts === ['Write an intro about tide pools.']
 * ```
 *
 * @remarks
 * - **`attributeText()` is synchronous** and works on the paragraphs YOU pass — it does not
 *   split text, read files, or parse transcripts (use `readTranscript()` for that).
 * - **`aiShare` is by whole paragraphs**: `words` of every `ai` paragraph over all words, not
 *   the per-paragraph `aiWords` overlap. `prompts` lists each distinct source prompt once.
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
