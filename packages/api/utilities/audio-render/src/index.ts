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
 * **ffmpeg is a runtime prerequisite, not a dependency.** The worker spawns
 * whatever `ffmpegPath` points at (default: `ffmpeg` resolved on `$PATH`).
 * Install it in the runtime image (e.g. `apt-get install -y ffmpeg`) or pass
 * an explicit `ffmpegPath`; without it every job fails at processing time
 * with a spawn ENOENT recorded on the job's `error` field.
 *
 * **Queue wiring:** `renderAudio` dispatches through the abstract
 * `@molecule/api-queue` core, so a queue bond must be wired at startup —
 * `bond('queue', provider)` with `@molecule/api-queue-memory` (same-process
 * dev default), `-redis`, `-rabbitmq`, or `-sqs` — and
 * `startAudioRenderWorker()` must be running to consume jobs. Both throw
 * "Queue provider not configured. Call setProvider() first." otherwise.
 *
 * **Job status is process-local.** `getRenderStatus` / `cancelRender` read an
 * in-memory map that is shared between `renderAudio` and the worker ONLY when
 * both run in the same process (true with the memory queue bond). With a
 * distributed queue bond and a separate worker process, the enqueuing process
 * never sees status transitions — persist durable status from the worker's
 * `onJobComplete` callback instead. For HTTP exposure of enqueue/status/cancel,
 * see `createAudioRenderRoutes()`.
 *
 * **No locale bond:** This package's surface is programmatic — no
 * user-visible strings are generated, so there's no companion
 * `@molecule/api-locales-audio-render`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './ffmpegCommand.js'
export * from './handlers.js'
export * from './jobStore.js'
export * from './renderAudio.js'
export * from './types.js'
export * from './worker.js'
