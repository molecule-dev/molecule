/**
 * Which paragraphs of a document an AI wrote — and the prompt and model behind each.
 *
 * Give it the document's paragraphs and the coding-agent sessions that
 * produced it (read with `@molecule/api-agent-transcript`); it returns each
 * paragraph as `human` or `ai`, the user message each AI paragraph answered
 * (as typed) and the model that wrote it, plus the document's AI word share
 * and the distinct prompts. Use it for "written with AI" disclosures, a
 * margin mark on AI paragraphs, a prompt shown beside the prose, or an audit
 * of generated docs. `@molecule/api-text-provenance-overlap` is the provider.
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 *
 * import { readTranscript, setProvider as setReader } from '@molecule/api-agent-transcript'
 * import { provider as reader } from '@molecule/api-agent-transcript-autodetect'
 * import { attributeText, setProvider } from '@molecule/api-text-provenance'
 * import { provider as overlap } from '@molecule/api-text-provenance-overlap'
 *
 * // Startup: bond BOTH the transcript reader and the attribution provider.
 * setReader(reader)
 * setProvider(overlap)
 *
 * // The agent session that helped write the post — pass its TEXT plus the file name.
 * const fileName = 'transcripts/why-logs-first/claude-code-export.txt'
 * const session = readTranscript({ text: readFileSync(fileName, 'utf8'), fileName })
 *
 * // The post as PLAIN-TEXT paragraphs (render markdown first).
 * const post = readFileSync('posts/why-logs-first.txt', 'utf8')
 * const paragraphs = post.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
 *
 * const result = attributeText({ paragraphs, sessions: [session] })
 * for (const paragraph of result.paragraphs) {
 *   console.log(paragraph.index, paragraph.origin, paragraph.prompt, paragraph.model)
 *   // 0 'human' undefined undefined
 *   // 1 'ai' 'Reply with a markdown heading …' 'Haiku 4.5'
 * }
 * console.log(`${Math.round(result.aiShare * 100)}% written with AI`, result.prompts)
 * ```
 *
 * @remarks
 * - **Two bonds, not one.** `readTranscript` needs `@molecule/api-agent-transcript`'s
 *   `setProvider(reader)`; `attributeText` needs this package's `setProvider(overlap)`.
 *   Both throw until bonded. `attributeText` is SYNCHRONOUS — do not `await` it expecting I/O.
 * - **The caller passes everything**: the paragraphs (plain text — render
 *   markdown first, or pass the source's blocks) and the sessions. Nothing is
 *   read from disk or guessed; no sessions means every paragraph is human.
 * - **The user's own words are never the AI's.** A paragraph the person typed
 *   into a prompt stays human even when the agent later wrote it into a file.
 * - A light human edit of an AI paragraph stays AI; a rewrite that keeps less
 *   than `minAiShare` (default 0.5) of the AI's words becomes human.
 * - Word counts are the attribution's own (letters and digits); the AI share
 *   is by words, per paragraph — a paragraph counts wholly one way.
 * - Pure and synchronous. Run it at build time and publish the result (for
 *   example as a per-post `provenance.json`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
