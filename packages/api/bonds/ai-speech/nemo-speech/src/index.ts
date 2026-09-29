/**
 * NVIDIA NeMo-Speech.cpp provider for `@molecule/api-ai-speech`.
 *
 * Batch and streaming speech-to-text plus speaker diarization ("who spoke
 * when", Nemotron-3-Diarization) on your own `nemo-speech serve` instance —
 * NVIDIA's native C++ runtime, which runs on CPU, CUDA, Metal and Vulkan.
 * Implements `transcribe` (with `diarize: true` speaker labels), `diarize` and
 * `transcribeStream`.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-speech'
 * import { provider } from '@molecule/api-ai-speech-nemo-speech'
 *
 * // Reads NEMO_SPEECH_URL (default http://127.0.0.1:8080) on each call.
 * setProvider(provider)
 *
 * const speech = requireProvider()
 * const result = await speech.transcribe!({ audio: wavBytes, diarize: true })
 * for (const segment of result.segments ?? []) {
 *   console.log(`${segment.speaker}: ${segment.text}`)
 * }
 * ```
 *
 * @remarks
 * - **You run the server.** `nemo-speech serve --asr-model nemotron-3.5
 *   --diar-model <model> [--api-key <key>]` (default `127.0.0.1:8080`).
 *   Speaker labels need a diarizer loaded (`--diar-model`); without one a
 *   `diarize: true` call fails on the server. `sortformer` is the documented
 *   example name — list the real ones with `nemo-speech model list`.
 * - **Uploads must be 16-bit PCM WAV.** The server documents WAV only, so the
 *   bond converts any 16-bit PCM WAV to 16 kHz mono itself and THROWS for
 *   m4a/webm/mp3 (a `filename: 'memo.m4a'` is never passed through). Decode
 *   browser recordings to WAV/PCM first (e.g. with ffmpeg).
 * - **Speakers are per call, at most 8.** Labels are `speaker_0`, `speaker_1`,
 *   … in the order people first speak IN THAT FILE — `speaker_1` in two calls
 *   can be two different people; it is not speaker identification.
 *   `maxSpeakers` above 8 throws; below 8 it is validated but not sent (the
 *   server has no such field). `diarize: true` requires `responseFormat:
 *   'verbose_json'` (the default) and throws otherwise. `segments` are built by
 *   the bond from consecutive same-speaker words, joined with spaces.
 * - **Not forwarded:** `prompt`, `temperature`, `timestampGranularity` (words
 *   always come back with `verbose_json`). No `translate`, no TTS.
 * - **Streaming** (`transcribeStream`): send PCM16 LE mono at
 *   `sampleRate` (resampled to 16 kHz here) over the
 *   `/v1/audio/transcriptions/realtime` WebSocket. Text arrives as `partial`
 *   events that the following `final` REPLACES — `streamingAppendOnly` is
 *   `false`, so never treat a partial as settled. Streaming diarization is not
 *   requested by default; to turn it on, pass the server's own `session.update`
 *   fields via `createProvider({ sessionUpdate })` (see the server's
 *   `docs/server.md`). The bond needs a global `WebSocket` (Node 22+) or a
 *   `socketFactory`.
 * - **Server-side only.** A browser microphone streams to YOUR API, which
 *   calls `transcribeStream`; never expose the model host or the key to the
 *   browser. Keep the server on a private network, and set `--api-key` +
 *   `NEMO_SPEECH_API_KEY` (sent as `Authorization: Bearer …`) whenever it is
 *   reachable by anyone else.
 * - Errors are `NemoSpeechError` with `status` (0 = unreachable or timed out)
 *   and `code` = the server's error `type` (`invalid_request_error` /
 *   `server_error`). Nothing is retried; the HTTP timeout is 300 s.
 * - Nemotron-3-Diarization is OpenMDW-1.1 licensed (the card says "ready for
 *   commercial or non-commercial use"); confirm the licence terms before
 *   offering it as a hosted service to others.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './pcm.js'
export * from './provider.js'
export * from './secrets.js'
export * from './socket.js'
export * from './speakers.js'
export * from './types.js'
