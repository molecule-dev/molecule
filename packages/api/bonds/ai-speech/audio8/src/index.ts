/**
 * Audio8-ASR-Infinite provider for `@molecule/api-ai-speech`.
 *
 * Low-latency streaming speech-to-text for **Chinese and English** on your own
 * GPU (Edge0's 4B Audio8-ASR-Infinite, Apache-2.0 code and weights). A rolling
 * KV cache lets one stream run for any length at constant memory and latency.
 * Implements `transcribeStream` and a buffer `transcribe` built on it.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-speech'
 * import { provider } from '@molecule/api-ai-speech-audio8'
 *
 * // Reads AUDIO8_REALTIME_URL (default ws://127.0.0.1:18191/v1/realtime) per call.
 * setProvider(provider)
 *
 * const speech = requireProvider()
 * // micChunks: AsyncIterable<Uint8Array> of PCM16 mono audio forwarded by your API.
 * for await (const event of speech.transcribeStream!(micChunks, { sampleRate: 48000, language: 'zh' })) {
 *   if (event.type === 'partial') process.stdout.write(event.text)
 *   if (event.type === 'final') console.log('\n' + event.text)
 * }
 * ```
 *
 * @remarks
 * - **Chinese and English only.** Any other `language` throws before
 *   connecting (`zh-CN`/`en-US` map to `zh`/`en`); omitted means `'en'`
 *   unless `createProvider({ defaultLanguage: 'zh' })`. English accuracy trails
 *   dedicated English models — pick it for zh/en voice agents.
 * - **You run the server, on a CUDA GPU.** `cd docker &&
 *   AUDIO8_MODEL_DIR=/path/to/checkpoint docker compose up -d`; the compose file
 *   publishes the WebSocket on **18191** (the service listens on 18190 inside
 *   the container, which is the reference client's default). Only a full merged
 *   weight directory loads — adapter-style or partially converted weights do
 *   not. It does not fit a molecule sandbox.
 * - **No auth exists.** The server documents none, so anyone who can reach
 *   the port uses your GPU: keep it on a private network or behind an
 *   authenticating reverse proxy, and never expose it publicly.
 * - **Server-side only.** A browser microphone streams to YOUR API, which
 *   calls `transcribeStream`; never connect the browser to the model host.
 * - **Finality: `partial` increments, then ONE `final`.** Deltas are
 *   provisional (`streamingAppendOnly: false`) and `final` carries the full
 *   text of the whole stream (`transcription.done`) after the audio ends — do
 *   not wait for a per-sentence final. There is no end-of-turn event: the
 *   semantic-VAD head is not surfaced by the server's protocol, so no
 *   `turn-end` is emitted. No word timestamps, no speakers (`diarize` is
 *   ignored).
 * - **Audio**: send PCM16 LE mono at `sampleRate`; the bond resamples to
 *   16 kHz and sends 100 ms base64 blocks. `transcribe` accepts 16-bit PCM
 *   WAV only and throws for m4a/webm/mp3.
 * - `AUDIO8_TARGET_DELAY_MS` (default 480) must be 240–560 and a multiple of
 *   the server's audio clock (80, 120 or 160 ms) — others throw before
 *   connecting. Lower delay = faster text, lower accuracy.
 * - The bond needs a global `WebSocket` (Node 22+) or a `socketFactory`.
 *   A failed buffer `transcribe` throws `Audio8SpeechError` (`status` = close
 *   code or 0); streams report failures as an `error` event and end.
 * - Benchmarks on the model card are the vendor's own (greedy decoding, 80 ms
 *   clock, 480 ms delay).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './pcm.js'
export * from './provider.js'
export * from './secrets.js'
export * from './socket.js'
export * from './types.js'
