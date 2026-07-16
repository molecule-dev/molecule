/**
 * Server-side animation rendering for molecule.dev. Consumes an
 * {@link AnimationDocument} (the keyframe representation produced by
 * `@molecule/app-feature-animation-canvas-react`) and produces either:
 *
 * - a Lottie 5.x JSON document (lossless; the canvas at every frame
 *   reconstructs in any Lottie player), or
 * - an MP4 / animated GIF (frame-by-frame raster via an injected
 *   canvas-render adapter, then concatenated with an injected ffmpeg
 *   adapter).
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
 * // Your thin ffmpeg wrapper — shell out to ffmpeg, resolve the encoded buffer.
 * const spawnFfmpeg = async (
 *   format: 'mp4' | 'gif',
 *   frames: Buffer[],
 *   opts: { fps: number; width: number; height: number },
 * ): Promise<Buffer> => {
 *   throw new Error(`wire ffmpeg here: ${format}, ${frames.length} frames @ ${opts.fps}fps`)
 * }
 *
 * const ffmpeg: FfmpegAdapter = {
 *   encodeMp4: (frames, opts) => spawnFfmpeg('mp4', frames, opts),
 *   encodeGif: (frames, opts) => spawnFfmpeg('gif', frames, opts),
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
 * import {
 *   type AnimationDocument,
 *   getRenderStatus,
 *   renderAnimation,
 * } from '@molecule/api-animation-renderer'
 *
 * const doc: AnimationDocument = {
 *   width: 1080,
 *   height: 1920,
 *   duration: 2,
 *   fps: 30,
 *   layers: [
 *     {
 *       id: 'bg',
 *       kind: 'rect',
 *       shape: { x: 0, y: 0, width: 1080, height: 1920, fill: '#0ea5e9' },
 *       tracks: { 'transform.opacity': [{ time: 0, value: 0 }, { time: 1, value: 1 }] },
 *     },
 *   ],
 * }
 *
 * const job = renderAnimation(doc, { format: 'mp4', resolution: { width: 1080, height: 1920 } })
 * const result = await job.done
 * console.log(result.contentType, result.frameCount)
 *
 * // Or, in an HTTP-driven flow:
 * const snapshot = getRenderStatus(job.id) // → { status: 'rendering', framesRendered: 17, ... }
 * ```
 *
 * @example
 * ```ts
 * // Framework-neutral HTTP handlers (Express/Fastify/Koa need only a thin shim).
 * import {
 *   type AnimationRenderResponse,
 *   createAnimationCancelHandler,
 *   createAnimationRenderHandler,
 *   createAnimationStatusHandler,
 * } from '@molecule/api-animation-renderer'
 *
 * const submit = createAnimationRenderHandler()
 * const status = createAnimationStatusHandler()
 * const cancel = createAnimationCancelHandler()
 *
 * // Adapt your framework's response object to the minimal contract:
 * const shim = (res: {
 *   setHeader: (n: string, v: string) => void
 *   status: (s: number) => unknown
 *   send: (b: unknown) => unknown
 *   json: (b: unknown) => unknown
 * }): AnimationRenderResponse => ({
 *   setHeader: (n, v) => res.setHeader(n, v),
 *   setStatus: (s) => void res.status(s),
 *   sendBuffer: (b) => void res.send(b),
 *   sendJson: (b) => void res.json(b),
 * })
 *
 * // Mount (Express shown as comments):
 * //   router.post('/animation/render', (req, res, next) => submit({ body: req.body }, shim(res)).catch(next))
 * //   router.get('/animation/render/:id', (req, res, next) => status({ params: req.params, query: req.query }, shim(res)).catch(next))
 * //   router.delete('/animation/render/:id', (req, res, next) => cancel({ params: req.params }, shim(res)).catch(next))
 * console.log(typeof shim, typeof submit, typeof status, typeof cancel)
 * ```
 *
 * @remarks
 * The renderer is decoupled from any concrete canvas / ffmpeg
 * implementation — adapters are passed via
 * {@link configureAnimationRenderer}. There is NO 'canvas-render' bond
 * category: `@molecule/api-canvas-render` is a direct-import utility, so
 * wrap its `renderCanvasDocument` as the canvas adapter exactly as shown.
 * The same pipeline can target `@napi-rs/canvas`, a WASM raster, or a
 * headless browser by substituting the adapter. Lottie output requires no
 * adapters at all — MP4/GIF require BOTH (jobs fail with a clear error
 * otherwise).
 *
 * Job state lives in process memory only — no database table, no
 * environment variables. Jobs do not survive restarts, and in
 * multi-process deployments `getRenderStatus` must run in the process that
 * accepted the submit (or supply your own `jobId` and persist results
 * yourself). SERVER-ONLY: a browser-guard throws if bundled into client
 * code.
 *
 * Resource intensity: a frame-rasterised export of a long, complex
 * animation will produce many megabytes of intermediate PNG buffers.
 * Run the queue on a dedicated worker (cron / job runner / sidecar
 * container) rather than inline on the request thread, and gate the
 * submit handler behind a tier check or rate limiter.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './handler.js'
export * from './interpolate.js'
export * from './lottie.js'
export * from './queue.js'
export * from './renderAnimation.js'
export * from './snapshot.js'
export * from './types.js'
