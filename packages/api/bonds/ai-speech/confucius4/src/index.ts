/**
 * Confucius4-R2T2 provider for `@molecule/api-ai-speech`.
 *
 * Append-only streaming speech-to-text on your own GPU (NetEase Youdao's 2B
 * Confucius4-R2T2, built on Qwen3-ASR): text it has sent never changes, which
 * suits live captions that must not rewrite themselves. Tuned for Chinese and
 * English; supports context/hotword prompts. Implements `transcribeStream`
 * (`streamingAppendOnly: true`) and a buffer `transcribe` built on it.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-speech'
 * import { provider } from '@molecule/api-ai-speech-confucius4'
 *
 * // Reads CONFUCIUS4_WS_URL (default ws://127.0.0.1:8272/asr_stream_api_v1) per call.
 * setProvider(provider)
 *
 * const speech = requireProvider()
 * // micChunks: AsyncIterable<Uint8Array> of PCM16 mono audio forwarded by your API.
 * for await (const event of speech.transcribeStream!(micChunks, { sampleRate: 48000 })) {
 *   if (event.type === 'delta') process.stdout.write(event.text) // never revised
 *   if (event.type === 'turn-end') process.stdout.write('\n')
 * }
 * ```
 *
 * @remarks
 * - **WEIGHT LICENCE: the NetEase Model Use License Agreement, not
 *   Apache-2.0** (only the code is). Commercial use is allowed, but a company
 *   with **>100M MAU or >RMB 1B annual revenue needs a separate licence**;
 *   derivative works must carry a no-endorsement notice; it is **banned in
 *   "high-risk scenarios"** including large-scale biometric surveillance and
 *   **automated decision-making**; you may not use it to improve other AI
 *   models (except non-commercial ones); PRC law and CIETAC arbitration apply.
 *   Check the automated-decision-making clause before offering it as a
 *   hosted service.
 * - **The "secret key" is not auth.** `ws_server.py` checks `secret_key`
 *   against a hardcoded `["test0102"]` (a mismatch closes with code 4401), so
 *   anyone who can reach port 8272 uses your GPU. Keep it on a private network
 *   or behind an authenticating reverse proxy; never expose it publicly.
 * - **You run the server, on a CUDA GPU** (vLLM with strict CUDA/PyTorch
 *   versions, single process, one GPU): `./run_start_server.sh start
 *   --model_path <ckpt> --vad_model_path <Stream-VAD dir> --port 8272 --gpu 0`.
 * - **16 kHz only, and the server does NOT resample** — 48 kHz browser audio
 *   produces garbage with no error. The bond resamples PCM16 input from
 *   `sampleRate` to 16 kHz for you; never bypass it with raw frames.
 *   `transcribe` accepts 16-bit PCM WAV only and throws for m4a/webm/mp3.
 * - **Finality has no flag.** Every server message is an append-only
 *   increment (`delta` events). `reset: true` (VAD end of speech, a detected
 *   hallucination, or the 60 s soft / 90 s hard reset timeout) is a segment
 *   boundary, NOT an error: the bond emits `final` (that segment's text,
 *   equal to its deltas) then `turn-end`. The stream ends when the server
 *   closes the socket after end-of-stream — never wait for a final flag. Set
 *   `createProvider({ useVad: true })` for VAD-driven segments.
 * - `language` is sent verbatim; only `'zhen'` (auto Chinese/English, the
 *   default) is documented for the WebSocket server. `prompt` (or
 *   `CONFUCIUS4_SYSTEM_PROMPT`) becomes `system_prompt`, at most 4000
 *   characters — longer throws. No word timestamps or speakers over the
 *   WebSocket (`diarize` is ignored).
 * - **Server-side only.** A browser microphone streams to YOUR API, which
 *   calls `transcribeStream`; never connect the browser to the model host.
 *   The bond needs a global `WebSocket` (Node 22+) or a `socketFactory`.
 * - A failed buffer `transcribe` throws `Confucius4SpeechError` (`status` =
 *   close code; 4401 = secret key rejected); streams report failures as an
 *   `error` event and end.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './pcm.js'
export * from './provider.js'
export * from './secrets.js'
export * from './socket.js'
export * from './types.js'
