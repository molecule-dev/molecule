/**
 * Gemini API ai-embeddings provider for molecule.dev.
 *
 * Hosted `gemini-embedding-2`: text, images, audio and video in one vector space
 * (128–3072 dimensions, default 3072), over Google's REST API with the runtime's
 * `fetch` — no SDK. Task prefixes are applied for you.
 *
 * @example
 * ```typescript
 * import { readFile } from 'node:fs/promises'
 *
 * import { requireProvider, setProvider } from '@molecule/api-ai-embeddings'
 * import { createProvider } from '@molecule/api-ai-embeddings-gemini'
 *
 * // Reads GOOGLE_AI_API_KEY (or GEMINI_API_KEY) per request.
 * setProvider(createProvider({ dimensions: 768 }))
 *
 * const embeddings = requireProvider()
 * const queryVector = await embeddings.embedQuery('a turtle swimming in the ocean')
 *
 * // One input = one vector; media need their MIME type.
 * const { embeddings: [clipVector] } = await embeddings.embedContent!({
 *   inputs: [{ video: { data: await readFile('dive.mp4'), mimeType: 'video/mp4' } }],
 * })
 * console.log(queryVector.length, clipVector?.length) // 768 768
 * ```
 *
 * @remarks
 * - **Use `embedQuery` for what the user types and `embedDocuments` for what you
 *   index.** `gemini-embedding-2` rejects `task_type`; the task goes in the text
 *   (`task: search result | query: …` vs `title: none | text: …`), which this bond
 *   adds. `embed()` treats input as DOCUMENTS unless you pass `inputType: 'query'`.
 *   Text already starting with `task: ` / `title: ` is left alone;
 *   `applyPrefixes: false` turns prefixing off.
 * - **This is NOT EmbeddingGemma 2.** `gemini-embedding-2` is a different,
 *   proprietary model with its own vector space — not comparable with
 *   `@molecule/api-ai-embeddings-embeddinggemma`, `gemini-embedding-001`, OpenAI or
 *   bge vectors, nor across `dimensions` settings. Switching re-embeds the index.
 * - **Media need a MIME type**: pass `{ data: bytes, mimeType }` (sent inline,
 *   base64) or `{ data: fileUri, mimeType }` for a Files API upload. Bare bytes or a
 *   bare URL throw. Supported: PNG/JPEG images (max 6 per request), MP3/WAV audio
 *   (max 180 s), MP4/MOV video (max 120 s, ≤32 frames sampled, its audio track
 *   ignored). One input's 8,192 tokens are shared by all its parts; Google
 *   silently truncates anything past that.
 * - **One `embedContent` input = one vector**, even with several parts (Gemini
 *   aggregates them). `<|image|>`-style placeholders are removed from the text —
 *   media are sent as their own parts.
 * - **Billed per token** — text, image, audio and video are priced differently, and
 *   video is the most expensive. `usage.promptTokens` is Google's
 *   `promptTokenCount`. Auth + rate-limit any endpoint that embeds caller input.
 * - `dimensions` must be an integer 128–3072; vectors below 3072 come back
 *   re-normalized by Google.
 * - A missing key throws the tagged `config.notConfigured` error naming
 *   `GOOGLE_AI_API_KEY` (the same key as `@molecule/api-ai-google`). API failures
 *   throw `GeminiEmbeddingsError` with Google's HTTP `status` and `code`
 *   (`INVALID_ARGUMENT`, `RESOURCE_EXHAUSTED`, …); 429/500/503 are retried 3 times
 *   first. `GOOGLE_AI_BASE_URL` (version included, e.g. `…/v1beta`) points it at a
 *   gateway, which may be keyless.
 * - Lists are sent through `batchEmbedContents` in chunks of `maxBatchSize`
 *   (default 100) — one request per text, never one merged vector.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './prefixes.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
