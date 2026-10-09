/**
 * Whistle (Cactus Compute) provider for `@molecule/api-ai-speech`.
 *
 * Speech-to-text that runs IN-PROCESS under Node on the `needle` WebAssembly
 * engine — Cactus Compute's 16.9 MB open-weights Whistle model (Apache-2.0),
 * CPU-only, in exactly seven languages (en, de, fr, es, it, nl, pl) with
 * automatic language detection, keyword biasing and per-word timestamps. No
 * server to run, no API key, no per-minute billing; audio never leaves the
 * process. Implements `transcribe` and `transcribeStream`.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-speech'
 * import { provider } from '@molecule/api-ai-speech-whistle'
 *
 * setProvider(provider)
 *
 * const speech = requireProvider()
 * const result = await speech.transcribe!({
 *   audio: wavBytes,
 *   timestampGranularity: 'word',
 *   prompt: 'Acme\nvialoh', // keyword biasing toward your names
 * })
 * for (const word of result.words ?? []) {
 *   console.log(word.start.toFixed(2), word.word)
 * }
 * ```
 *
 * @remarks
 * - **First call downloads ~18 MB** (engine ~1 MB + `whistle.cact` 16.9 MB)
 *   from Hugging Face unless local paths are configured (`NEEDLE_WHISTLE_WEIGHTS`
 *   for the weights — the vendor's own env name — and `NEEDLE_ENGINE_PATH` +
 *   `NEEDLE_WASM_PATH` for the engine, fully offline). The download is cached
 *   in memory for the process lifetime; self-host or pin URLs with
 *   `WHISTLE_ENGINE_URL` / `WHISTLE_WEIGHTS_URL`.
 * - **Input must be uncompressed PCM WAV** (8/16/24/32-bit integer or 32-bit
 *   float, any rate, any channel count): it is mixed to mono and resampled to
 *   the 16 kHz float the engine takes. webm/m4a/mp3 and μ-law/ADPCM WAV THROW
 *   — decode to WAV first (e.g. `ffmpeg -i in.webm out.wav`); never passed
 *   through.
 * - **Seven languages, full stop** (`en de fr es it nl pl`): a call with any
 *   other `language` throws rather than transcribing in the wrong language —
 *   use `@molecule/api-ai-speech-openai` (~99 languages) for the rest. Leave
 *   `language` unset to auto-detect.
 * - **30 s per pass** (Whistle's window): longer audio is transcribed in
 *   consecutive 30 s windows and joined — words carry corrected absolute
 *   times, but each window caps at 320 transcript tokens, so very dense
 *   long-form audio can truncate per window (meetings/long-form are not
 *   Whistle's strength).
 * - **Silence or steady noise returns EMPTY text and EMPTY language** — that
 *   is the engine's "nothing spoken" answer, not a failure; do not render `''`
 *   as a detected language.
 * - **Keyword biasing deliberately CHANGES transcripts** toward the given
 *   words (`prompt`, newline-separated). Pass identifiers you actually care
 *   about; a large "helpful" list distorts neutral words.
 * - **Streaming is append-only** (`streamingAppendOnly: true`): `delta`
 *   events carry words two consecutive passes agreed on (never revised);
 *   `partial` events carry the still-unconfirmed tail; one `final` with the
 *   full text ends the stream. Audio is PCM16 LE mono at `sampleRate` (default
 *   16 kHz, resampled here), buffered into ~1 s passes. A stream session HOLDS
 *   the engine's one stream from its first block until its stop, so a
 *   concurrent `transcribeStream` call queues behind the running one instead of
 *   interleaving its audio into it (audio already delivered waits in the
 *   resampler; audio not yet pulled waits in the caller's transport).
 * - **One model per process, not thread-safe**: the wasm engine is shared by
 *   every provider instance in the process; calls are synchronous and
 *   serialize naturally. The first in-flight call blocks the event loop for
 *   the download + load; transcription of a 10 s clip takes roughly a second
 *   of CPU.
 * - **STT only**: `synthesize*`, `translate`, `diarize` and `listVoices` are
 *   not implemented (feature-detect per the core docs).
 * - Errors are `WhistleEngineError` (`code`: `download-failed` / `load-failed`
 *   / `transcribe-failed` / `stream-failed`) or `WhistleWavError` (`code`:
 *   `not-wav` / `unsupported-format` / `truncated`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './engine.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
export * from './wav.js'
