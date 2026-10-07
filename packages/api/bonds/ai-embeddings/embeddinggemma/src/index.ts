/**
 * EmbeddingGemma 2 ai-embeddings provider for molecule.dev.
 *
 * Runs Google's open (Apache-2.0) multimodal embedding model in-process via
 * Transformers.js on `onnx-community/embeddinggemma-2-ONNX` — no API key, no
 * per-call cost, no network after the first download. Text, images and audio
 * map into ONE 768-dimensional, L2-normalized vector space (a dot product is the
 * cosine similarity), with Matryoshka truncation to 512 / 256 / 128. Strong on
 * code retrieval and 100+ languages.
 *
 * @example
 * ```typescript
 * import { readFile } from 'node:fs/promises'
 *
 * import { requireProvider, setProvider } from '@molecule/api-ai-embeddings'
 * import { createProvider } from '@molecule/api-ai-embeddings-embeddinggemma'
 *
 * // Text only by default; add the encoders you embed (each costs memory).
 * setProvider(createProvider({ modalities: ['text', 'image'] }))
 *
 * const embeddings = requireProvider()
 * // Task prefixes are applied for you: queries and documents embed differently.
 * const queryVector = await embeddings.embedQuery('cats sleeping on a couch')
 * const docVectors = await embeddings.embedDocuments(['Mars is the Red Planet.'])
 *
 * // Images share the text vector space — check support before calling.
 * if (embeddings.modalities?.includes('image') && embeddings.embedContent) {
 *   const { embeddings: [photoVector] } = await embeddings.embedContent({
 *     inputs: [{ image: { data: await readFile('photo.jpg'), mimeType: 'image/jpeg' } }],
 *   })
 *   console.log(queryVector.length, docVectors.length, photoVector?.length) // 768 1 768
 * }
 * ```
 *
 * @remarks
 * - **Use `embedQuery` for what the user types and `embedDocuments` for what you
 *   index.** The model needs task prefixes (`task: search result | query: …` vs
 *   `title: none | text: …`); embedding both sides with the same call — or with
 *   `embed()`, which treats input as DOCUMENTS unless you pass
 *   `inputType: 'query'` — silently lowers search quality. Set `task`
 *   (`'code-retrieval'`, `'question-answering'`, `'classification'`, …) in the
 *   config or per `embed` call. Text that already starts with `task: ` or
 *   `title: ` is left alone; `applyPrefixes: false` turns prefixing off.
 * - **Never mix vector spaces.** These vectors are not comparable with
 *   EmbeddingGemma 1, `gemini-embedding-2`, bge (`-local`) or OpenAI vectors, nor
 *   across `dimensions` settings. Switching to this bond means re-embedding the
 *   whole index; store the model id + dimensions with each index.
 * - **`dimensions` must be 768, 512, 256 or 128** — the only trained sizes;
 *   anything else throws. Truncated vectors are re-normalized.
 * - **Load only the encoders you need.** `modalities` defaults to `['text']`
 *   (314 MB of q8 weights, ~850 MB RSS measured with Node). `image` adds the
 *   vision encoder (195 MB), `audio` the audio encoder (340 MB). Calling
 *   `embedContent` with a medium whose encoder is not loaded throws.
 * - **Video is NOT supported in Node** (Transformers.js decodes video only in a
 *   browser): `modalities: ['video']` and `video` inputs throw. Embed sampled
 *   frames as images, or use `@molecule/api-ai-embeddings-gemini`.
 * - **Audio must be WAV in Node** (Transformers.js cannot decode audio there).
 *   The bond decodes integer-PCM / float WAV, mixes to mono and resamples to the
 *   16 kHz the model expects; convert MP3/OGG to WAV first.
 * - **One `embedContent` input = one vector**, even when it combines text with an
 *   image or audio clip (write `<|image|>` / `<|audio|>` in the text where the
 *   media belongs; a missing marker is appended). Media inputs run one forward
 *   pass each.
 * - **The 8,192-token context is shared by everything in one input**: an image
 *   costs ~280 tokens, audio 25 tokens per second (~5 minutes max).
 * - `dtype` defaults to `q8` (cosine ≥ 0.9999 vs the Python reference). `q4` is
 *   ~45% smaller but drifts to ~0.988 on text; `fp16`/`q4f16` quality is
 *   unreported. Changing `dtype` changes the vectors — re-embed.
 * - First use downloads the weights from Hugging Face and caches them (set
 *   `cacheDir` to a persistent path). For offline deployments bundle them and set
 *   `localModelPath`. Loading takes seconds; the model then stays resident.
 * - `usage` is always zero — local inference is not billed.
 * - Configure with `createProvider({...})` or the `MOL_EMBEDDINGS_EMBEDDINGGEMMA_*`
 *   env vars (`MODEL`, `DTYPE`, `DEVICE`, `MODALITIES`, `DIMENSIONS`, `TASK`,
 *   `CACHE_DIR`, `MODEL_PATH`, `BATCH_SIZE`). `batchSize` (default 16) bounds peak
 *   memory, not throughput.
 * - Pulls `@huggingface/transformers` + `onnxruntime-node` — a real third-party
 *   dependency. To serve the model from a GPU box instead, run vLLM and use
 *   `@molecule/api-ai-embeddings-openai` (you then add the prefixes yourself).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './matryoshka.js'
export * from './media.js'
export * from './prefixes.js'
export * from './provider.js'
export * from './types.js'
