/**
 * Server-side animation rendering for molecule.dev. Consumes an
 * {@link AnimationDocument} (the keyframe representation produced by
 * `@molecule/app-feature-animation-canvas`) and produces either:
 *
 * - a Lottie 5.x JSON document (lossless; the canvas at every frame
 *   reconstructs in any Lottie player), or
 * - an MP4 / animated GIF (frame-by-frame raster via the `canvas-render`
 *   bond, then concatenated with an injected ffmpeg adapter).
 *
 * The package is queue-driven — `renderAnimation()` enqueues a job and
 * returns a {@link RenderJob} handle whose `done` promise resolves to a
 * {@link RenderResult}. {@link getRenderStatus} polls a job by id;
 * {@link cancelRender} aborts a queued or running job.
 *
 * @example
 * ```ts
 * // Wire adapters once at startup.
 * import { configureAnimationRenderer, type FfmpegAdapter } from '@molecule/api-animation-renderer'
 * import { type CanvasDocument, renderCanvasDocument } from '@molecule/api-canvas-render'
 *
 * // Thin ffmpeg wrapper — e.g. shell out to `ffmpeg` and resolve the encoded buffer.
 * const ffmpeg: FfmpegAdapter = {
 *   encodeMp4: async (frames, { fps, width, height }) => { ... },
 *   encodeGif: async (frames, { fps, width, height }) => { ... },
 * }
 *
 * configureAnimationRenderer({
 *   // Each per-frame snapshot is canvas-render-shaped — its layers ARE canvas-render layers.
 *   canvas: { renderFrame: (doc, opts) => renderCanvasDocument(doc as CanvasDocument, opts) },
 *   ffmpeg,
 *   concurrency: 2,
 * })
 * ```
 *
 * @example
 * ```ts
 * // Submit a render and poll for completion.
 * import { renderAnimation, getRenderStatus } from '@molecule/api-animation-renderer'
 *
 * const job = renderAnimation(doc, { format: 'mp4', resolution: { width: 1080, height: 1920 } })
 * const result = await job.done
 *
 * // Or, in an HTTP-driven flow:
 * const snapshot = getRenderStatus(job.id) // → { status: 'rendering', framesRendered: 17, ... }
 * ```
 *
 * @example
 * ```ts
 * // Express adapter wiring all three handlers.
 * import {
 *   createAnimationRenderHandler,
 *   createAnimationStatusHandler,
 *   createAnimationCancelHandler,
 * } from '@molecule/api-animation-renderer'
 *
 * const submit = createAnimationRenderHandler()
 * const status = createAnimationStatusHandler()
 * const cancel = createAnimationCancelHandler()
 *
 * router.post('/animation/render', (req, res, next) =>
 *   submit({ body: req.body }, expressShim(res)).catch(next))
 * router.get('/animation/render/:id', (req, res, next) =>
 *   status({ params: req.params }, expressShim(res)).catch(next))
 * router.delete('/animation/render/:id', (req, res, next) =>
 *   cancel({ params: req.params }, expressShim(res)).catch(next))
 * ```
 *
 * @remarks
 * The renderer is decoupled from any concrete canvas / ffmpeg
 * implementation — adapters are passed via
 * {@link configureAnimationRenderer} so the same animation pipeline can
 * target `@napi-rs/canvas`, a WASM raster, or a headless browser without
 * touching this package. Lottie output requires no adapters at all.
 *
 * Resource intensity: a frame-rasterised export of a long, complex
 * animation will produce many megabytes of intermediate PNG buffers.
 * Run the queue on a dedicated worker (cron / job runner / sidecar
 * container) rather than inline on the request thread, and gate the
 * submit handler behind a tier check or rate limiter.
 *
 * @module
 */

export * from './handler.js'
export * from './interpolate.js'
export * from './lottie.js'
export * from './queue.js'
export * from './renderAnimation.js'
export * from './snapshot.js'
export * from './types.js'
