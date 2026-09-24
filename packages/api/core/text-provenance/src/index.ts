/**
 * Which paragraphs of a document an AI wrote — and the prompt and model behind each.
 *
 * Give it the document's blocks and the coding-agent sessions that wrote them
 * (read with `@molecule/api-agent-transcript`); it returns each block as
 * `human` or `ai`, the person's message each AI block answered (as typed),
 * the model that wrote it, and the document's AI word share. The example is
 * the whole build step for a blog or docs site: a post's markdown file and its
 * folder of transcript exports in, `provenance.json` out — per-block
 * `{ origin, prompt, model }` plus `aiShare`. `@molecule/api-text-provenance-overlap`
 * is the provider.
 *
 * @example
 * ```typescript
 * // provenance.ts — runs in Node at build time (a build script or a Vite plugin), never in the page.
 * import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
 * import { dirname, join } from 'node:path'
 *
 * import {
 *   canReadTranscript,
 *   readTranscript,
 *   setProvider as setTranscriptReader,
 * } from '@molecule/api-agent-transcript'
 * import { provider as anyTranscript } from '@molecule/api-agent-transcript-autodetect'
 * import { attributeText, setProvider as setAttribution } from '@molecule/api-text-provenance'
 * import { provider as wordOverlap } from '@molecule/api-text-provenance-overlap'
 *
 * setTranscriptReader(anyTranscript) // reads Claude Code, Codex and Molecule IDE exports
 * setAttribution(wordOverlap)
 *
 * // One block of the post, in page order. `prompt` and `model` are on every ai span.
 * export interface ProvenanceSpan {
 *   text: string // the block's markdown: a paragraph, heading, list or code block
 *   origin: 'human' | 'ai'
 *   prompt?: string // the person's message the AI was answering, as typed
 *   model?: string // the model that wrote it, as the transcript names it
 * }
 *
 * // What /<slug>/provenance.json holds.
 * export interface Provenance {
 *   aiShare: number // 0..1, the share of the post's words the AI wrote
 *   words: number
 *   aiWords: number
 *   prompts: string[] // the distinct prompts behind the ai spans, in page order
 *   spans: ProvenanceSpan[]
 * }
 *
 * // The post's top-level blocks: front matter dropped, split on blank lines, never inside a code fence.
 * export function markdownBlocks(markdown: string): string[] {
 *   const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
 *   const blocks: string[] = []
 *   let lines: string[] = []
 *   let inFence = false
 *   for (const line of body.split(/\r?\n/)) {
 *     if (/^\s*(`{3}|~{3})/.test(line)) inFence = !inFence
 *     if (!inFence && line.trim() === '') {
 *       if (lines.length > 0) blocks.push(lines.join('\n'))
 *       lines = []
 *     } else {
 *       lines.push(line)
 *     }
 *   }
 *   if (lines.length > 0) blocks.push(lines.join('\n'))
 *   return blocks
 * }
 *
 * // Attribute one post from its markdown file and the folder holding its transcript exports.
 * // A missing or empty folder is a 100% human post; files that are not transcripts are skipped.
 * export function postProvenance(markdownFile: string, transcriptDir: string): Provenance {
 *   const blocks = markdownBlocks(readFileSync(markdownFile, 'utf8'))
 *   const files = existsSync(transcriptDir)
 *     ? readdirSync(transcriptDir, { withFileTypes: true })
 *         .filter((entry) => entry.isFile())
 *         .map((entry) => entry.name)
 *         .sort()
 *     : []
 *   const sessions = files
 *     .map((name) => ({ text: readFileSync(join(transcriptDir, name), 'utf8'), fileName: name }))
 *     .filter((input) => canReadTranscript(input))
 *     .map((input) => readTranscript(input))
 *   const result = attributeText({ paragraphs: blocks, sessions })
 *   return {
 *     aiShare: result.aiShare,
 *     words: result.words,
 *     aiWords: result.aiWords,
 *     prompts: result.prompts,
 *     spans: result.paragraphs.map((p): ProvenanceSpan => {
 *       const text = blocks[p.index]
 *       return p.origin === 'ai'
 *         ? { text, origin: 'ai', prompt: p.prompt, model: p.model }
 *         : { text, origin: 'human' }
 *     }),
 *   }
 * }
 *
 * // Write provenance.json, creating its folder.
 * export function writeProvenance(outFile: string, provenance: Provenance): void {
 *   mkdirSync(dirname(outFile), { recursive: true })
 *   writeFileSync(outFile, `${JSON.stringify(provenance, null, 2)}\n`)
 * }
 *
 * // In the build, for each PUBLISHED post (skip drafts), after the site's own build has written dist/:
 * // writeProvenance('dist/my-post/provenance.json', postProvenance('posts/my-post.md', 'transcripts/my-post'))
 * ```
 *
 * @remarks
 * - **Do NOT write your own transcript parser, paragraph matcher or prompt
 *   pairing.** Bond the packages exactly as the example does, and install all
 *   four:
 *   `npm install @molecule/api-agent-transcript @molecule/api-agent-transcript-autodetect @molecule/api-text-provenance @molecule/api-text-provenance-overlap`.
 * - **Do NOT import these from page or client code.** They are server-only and
 *   throw in a browser bundle. Run the example at build time; the page reads
 *   its output (the file, or the spans handed to the prerender).
 * - **Do NOT write into `dist/` before the site's own build** — Vite empties
 *   it. Write after the build, or emit the JSON from a Vite plugin:
 *   `this.emitFile({ type: 'asset', fileName: 'my-post/provenance.json', source: JSON.stringify(map) })`.
 * - **Do NOT look a span's prompt up in `prompts` by position.** Every `ai`
 *   span carries its own `prompt` and `model`; `prompts` is the distinct list,
 *   for the count ("from 3 prompts").
 * - `spans[i]` is block `i` of `markdownBlocks(file)`. Render the page from
 *   these same spans (see `@molecule/app-margin-notes-react`, whose example
 *   takes this file as its input) so the page and the map always agree.
 * - A block made of words the person typed — a heading copied from the prompt,
 *   a paragraph pasted into it — is `human`. That is correct, not a miss.
 * - A light human edit keeps a block `ai`; a rewrite that keeps less than
 *   `minAiShare` (default 0.5) of the AI's words makes it `human`. The share
 *   counts words, and a block counts wholly one way.
 * - No sessions (a missing or empty transcript folder) means every span is
 *   `human` and `aiShare` is 0.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
