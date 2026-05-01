/**
 * Offline multi-track audio mixdown for molecule.dev — flagship use case
 * is the music-daw app.
 *
 * Same shape as `@molecule/api-video-render`: take a multi-track
 * {@link AudioSession} (channels with clips, per-channel volume / pan /
 * effects), enqueue a render job via the bonded `queue` provider, and
 * have a worker spawn ffmpeg to produce a single mixed-down audio file
 * (WAV, MP3, or FLAC).
 *
 * @example
 * ```ts
 * import { renderAudio, getRenderStatus } from '@molecule/api-audio-render'
 *
 * const job = await renderAudio(
 *   {
 *     duration: 8,
 *     channels: [
 *       {
 *         id: 'drums',
 *         clips: [{ audioUrl: '/tmp/loop.wav', startTime: 0, duration: 8 }],
 *         volume: 0.9,
 *       },
 *       {
 *         id: 'lead',
 *         clips: [{ audioUrl: '/tmp/lead.wav', startTime: 2, duration: 4 }],
 *         pan: 0.3,
 *       },
 *     ],
 *   },
 *   { format: 'mp3', bitrate: '256k' },
 * )
 *
 * // …later…
 * const status = getRenderStatus(job.id)
 * ```
 *
 * @example
 * ```ts
 * // Worker side — typically a long-running process.
 * import { startAudioRenderWorker } from '@molecule/api-audio-render'
 *
 * const stop = startAudioRenderWorker({
 *   ffmpegPath: '/usr/local/bin/ffmpeg',
 *   onJobComplete: (result) => console.log('rendered', result.jobId),
 * })
 * ```
 *
 * @remarks
 * **Security:** Every caller-controlled string (clip `audioUrl`, output
 * path) is checked against {@link sanitizeAudioPath} before it reaches
 * ffmpeg's command line. ffmpeg itself is invoked via
 * `child_process.spawn` with an argv array — never via a shell — so
 * shell metacharacters in legitimate paths can't trigger interpretation.
 *
 * **Resource intensity:** ffmpeg can saturate CPU and IO for large
 * sessions. The package is queue-driven on purpose so flagship apps can
 * gate concurrency at the queue tier rather than in the request path.
 *
 * **No locale bond:** This package's surface is programmatic — no
 * user-visible strings are generated, so there's no companion
 * `@molecule/api-locales-audio-render`.
 *
 * @module
 */

export * from './ffmpegCommand.js'
export * from './handlers.js'
export * from './jobStore.js'
export * from './renderAudio.js'
export * from './types.js'
export * from './worker.js'
