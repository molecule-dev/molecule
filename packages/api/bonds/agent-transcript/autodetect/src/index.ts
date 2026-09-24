/**
 * The transcript reader to bond when files can come from more than one harness.
 *
 * Implements `@molecule/api-agent-transcript` by trying each bundled reader's
 * `detect()` and delegating to the first that recognizes the file: Claude Code
 * (`/export` text, session `.jsonl`), Codex CLI (Markdown export, rollout
 * `.jsonl`) and the Molecule IDE (stored conversation JSON). `createReader()`
 * composes any other list, including readers of your own. The example is the
 * usual job: read a post's folder of transcript exports at build time and
 * attribute its paragraphs with `@molecule/api-text-provenance`, writing
 * `provenance.json`.
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
 * - **Do NOT call `readTranscript` on every file in a folder.** A file no
 *   reader recognizes throws, naming the file and the readers tried — it is
 *   never read as an empty session. Filter with `canReadTranscript()` first,
 *   as the example does.
 * - **Do NOT parse an export yourself or bond a single-format reader "to be
 *   safe".** This bond reads all three formats; a user turn is already only
 *   what the person typed.
 * - **Do NOT import this from page or client code** — it is server-only and
 *   throws in a browser bundle.
 * - Install all four packages the example uses:
 *   `npm install @molecule/api-agent-transcript @molecule/api-agent-transcript-autodetect @molecule/api-text-provenance @molecule/api-text-provenance-overlap`.
 * - Order matters only for a file two readers would both accept; the bundled
 *   readers accept disjoint formats.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
