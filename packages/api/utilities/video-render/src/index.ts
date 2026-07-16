/**
 * Server-side video rendering for molecule.dev. Takes a `VideoTimeline`
 * (clips + tracks + effects) and queues an ffmpeg-driven render that
 * produces an MP4 (or WebM) file at a caller-supplied `outputPath`.
 *
 * Renders run asynchronously: {@link renderVideo} enqueues a job onto the
 * bonded `@molecule/api-queue` provider and returns a `{ jobId, status:
 * 'queued' }` handle. Workers process jobs by calling
 * {@link processRenderJob}, which spawns ffmpeg with a sanitized,
 * argv-only command line — never a shell string. Status is observed via
 * {@link getRenderStatus}; jobs are cancelled via {@link cancelRender}.
 *
 * @example
 * ```ts
 * import {
 *   renderVideo,
 *   getRenderStatus,
 *   cancelRender,
 * } from '@molecule/api-video-render'
 *
 * const job = await renderVideo(
 *   {
 *     duration: 10,
 *     resolution: { width: 1920, height: 1080 },
 *     fps: 30,
 *     tracks: [
 *       {
 *         id: 'v0',
 *         kind: 'video',
 *         clips: [
 *           { id: 'c0', source: '/uploads/intro.mp4', start: 0, duration: 5 },
 *           { id: 'c1', source: '/uploads/main.mp4',  start: 5, duration: 5 },
 *         ],
 *         effects: [{ id: 'fx0', kind: 'fade-in', start: 0, duration: 1 }],
 *       },
 *     ],
 *   },
 *   { format: 'mp4', outputPath: '/tmp/out.mp4' },
 * )
 *
 * // Poll for completion.
 * let status = await getRenderStatus(job.jobId)
 * while (status.status === 'queued' || status.status === 'rendering') {
 *   await new Promise((r) => setTimeout(r, 250))
 *   status = await getRenderStatus(job.jobId)
 * }
 * ```
 *
 * @example
 * ```ts
 * // Express adapter (POST /render/video, GET/DELETE /render/jobs/:id)
 * import express from 'express'
 * import {
 *   createEnqueueRenderHandler,
 *   createGetRenderStatusHandler,
 *   createCancelRenderHandler,
 * } from '@molecule/api-video-render'
 *
 * const router = express.Router()
 * const enqueue = createEnqueueRenderHandler()
 * const status = createGetRenderStatusHandler()
 * const cancel = createCancelRenderHandler()
 *
 * router.post('/render/video', (req, res, next) => {
 *   enqueue(
 *     { body: req.body },
 *     {
 *       setStatus: (s) => { res.status(s) },
 *       sendJson: (j) => { res.json(j) },
 *     },
 *   ).catch(next)
 * })
 *
 * router.get('/render/jobs/:id', (req, res, next) => {
 *   status(
 *     { params: req.params },
 *     {
 *       setStatus: (s) => { res.status(s) },
 *       sendJson: (j) => { res.json(j) },
 *     },
 *   ).catch(next)
 * })
 *
 * router.delete('/render/jobs/:id', (req, res, next) => {
 *   cancel(
 *     { params: req.params },
 *     {
 *       setStatus: (s) => { res.status(s) },
 *       sendJson: (j) => { res.json(j) },
 *     },
 *   ).catch(next)
 * })
 * ```
 *
 * @remarks
 * **Security model.** The argv passed to ffmpeg is built by
 * {@link buildFfmpegArgs} — a pure function that validates every field on
 * the timeline against a strict allow-list before emitting tokens.
 * Filenames must match `[A-Za-z0-9_./:\-+@%]+` and may not start with `-`
 * (which ffmpeg would otherwise read as an option). Effects compile to
 * fixed filter strings keyed by `effect.kind`; arbitrary `-vf` filter
 * strings from user input are NEVER accepted. The default ffmpeg runner
 * uses `child_process.spawn(args, { shell: false })` so argv elements
 * cannot be reinterpreted by a shell.
 *
 * **Resource intensity.** Rendering even a short timeline can take
 * minutes and saturate a CPU core; the package is queue-driven by design.
 * Bond a real queue provider (e.g. `@molecule/api-queue-redis` or
 * `@molecule/api-queue-rabbitmq`; `@molecule/api-queue-memory` keeps
 * everything in one process for dev/tests) before calling `renderVideo` —
 * without one, the call throws because no queue provider is bonded.
 *
 * **Runtime prerequisite: the `ffmpeg` binary.** The worker spawns the
 * literal command `ffmpeg` — it must be installed and on `PATH` in the
 * process that runs {@link processRenderJob} (there is no config option for
 * a custom binary path; to point at a bundled binary, wrap
 * {@link setFfmpegRunner} with your own spawn call). It is NOT bundled with
 * this package and NOT present in minimal containers — without it every job
 * fails at processing time with `spawn ffmpeg ENOENT` (surfaced as job
 * status `failed`).
 *
 * **Job status is process-local by default.** The default {@link JobStore}
 * is an in-memory Map. If the queue worker runs in a separate process from
 * the API (the normal topology for redis/rabbitmq/sqs queues), the API's
 * `getRenderStatus` polls ITS OWN store and reports `queued` forever while
 * the worker renders happily elsewhere. Either run the worker in-process
 * (with `@molecule/api-queue-memory`), or wire a shared store via
 * {@link setJobStore} (Redis/database-backed) in BOTH the API and worker
 * processes before enqueueing.
 *
 * **Locale.** This package is purely programmatic. There is no companion
 * locale bond; all error messages are English-only by design.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './buildFfmpegArgs.js'
export * from './ffmpeg.js'
export * from './handler.js'
export * from './jobStore.js'
export * from './renderVideo.js'
export * from './types.js'
export * from './worker.js'
