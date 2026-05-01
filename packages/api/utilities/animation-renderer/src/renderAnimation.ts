/**
 * Public entry points for `@molecule/api-animation-renderer`:
 * {@link renderAnimation}, {@link getRenderStatus}, {@link cancelRender},
 * plus the {@link configureAnimationRenderer} hook host applications use
 * to wire their canvas / ffmpeg adapters.
 *
 * The default queue is a singleton — most apps need exactly one — but
 * additional queues can be created with {@link createAnimationRenderer}
 * for use cases like keeping animation-tool's "preview" and "export" jobs
 * on separate runners.
 *
 * @module
 */

import { toLottie } from './lottie.js'
import { makeStandardRunner, RenderQueue, type ResolvedRenderOptions } from './queue.js'
import { snapshotAtTime } from './snapshot.js'
import type {
  AnimationDocument,
  CanvasRenderAdapter,
  FfmpegAdapter,
  RenderAnimationOptions,
  RenderJob,
  RenderJobSnapshot,
} from './types.js'

const DEFAULT_FPS = 30 as const

/**
 * Adapter set passed to {@link configureAnimationRenderer} /
 * {@link createAnimationRenderer}.
 */
export interface RendererConfig {
  /**
   * Adapter for rasterising one frame to PNG. In production this wraps
   * `bond('canvas-render')` (i.e. `renderCanvasDocument` from
   * `@molecule/api-canvas-render`). Optional — only the lottie path can
   * complete without it.
   */
  canvas?: CanvasRenderAdapter
  /**
   * Adapter for concatenating per-frame PNGs into MP4 / GIF. In
   * production this shells out to ffmpeg. Optional — only the lottie
   * path can complete without it.
   */
  ffmpeg?: FfmpegAdapter
  /**
   * Maximum concurrent jobs. Defaults to `1` (sequential), since the
   * frame-rasterization path tends to be CPU-bound and the ffmpeg path
   * spawns child processes.
   */
  concurrency?: number
}

/**
 * Bound, pre-configured renderer instance — output of
 * {@link createAnimationRenderer}. Identical surface to the singleton
 * functions exported below.
 */
export interface AnimationRenderer {
  renderAnimation: (doc: AnimationDocument, options?: RenderAnimationOptions) => RenderJob
  getRenderStatus: (jobId: string) => RenderJobSnapshot | undefined
  cancelRender: (jobId: string) => boolean
}

/**
 * Build a fresh renderer with its own queue. Use this when an app needs
 * to keep multiple animation pipelines isolated from each other (e.g.
 * preview vs export queues).
 *
 * @param config - Adapter set + queue configuration.
 * @returns A bound renderer instance.
 */
export function createAnimationRenderer(config: RendererConfig = {}): AnimationRenderer {
  const queue = new RenderQueue({
    concurrency: config.concurrency,
    runner: makeStandardRunner({
      canvas: config.canvas,
      ffmpeg: config.ffmpeg,
      toLottie,
      snapshotAtTime,
    }),
  })

  return {
    renderAnimation(doc, options) {
      return submit(queue, doc, options ?? {})
    },
    getRenderStatus(jobId) {
      return queue.snapshot(jobId)
    },
    cancelRender(jobId) {
      return queue.cancel(jobId)
    },
  }
}

let defaultRenderer: AnimationRenderer | undefined

/**
 * Configure the singleton renderer. Call once at process startup with
 * the host's adapters wired (typically `bond('canvas-render')` plus a
 * thin ffmpeg wrapper). Subsequent calls replace the singleton and
 * detach the previous queue (in-flight jobs continue to completion but
 * status lookups against the old queue must use the returned instance).
 *
 * @param config - Adapter set + queue configuration.
 * @returns The newly created singleton.
 */
export function configureAnimationRenderer(config: RendererConfig = {}): AnimationRenderer {
  defaultRenderer = createAnimationRenderer(config)
  return defaultRenderer
}

/**
 * Return the singleton renderer, lazily creating one with no adapters
 * (lottie-only) if no host explicitly configured it. Real apps should
 * call {@link configureAnimationRenderer} explicitly so the lottie-only
 * default never silently masks a missing canvas/ffmpeg wiring bug.
 *
 * @returns Singleton renderer instance.
 */
function getDefaultRenderer(): AnimationRenderer {
  if (!defaultRenderer) {
    defaultRenderer = createAnimationRenderer()
  }
  return defaultRenderer
}

/**
 * Submit an animation document to the singleton renderer. Returns
 * synchronously with a {@link RenderJob} handle whose `done` promise
 * resolves to the rendered buffer.
 *
 * For MP4 / GIF output the singleton must have been configured with a
 * canvas adapter and an ffmpeg adapter via
 * {@link configureAnimationRenderer}; the lottie path needs neither.
 *
 * @param doc - Animation document.
 * @param options - Output format, resolution, fps, optional jobId.
 * @returns The enqueued render job.
 */
export function renderAnimation(
  doc: AnimationDocument,
  options: RenderAnimationOptions = {},
): RenderJob {
  return getDefaultRenderer().renderAnimation(doc, options)
}

/**
 * Look up the current state of a previously submitted job.
 *
 * @param jobId - The id returned by {@link renderAnimation}.
 * @returns Job snapshot, or `undefined` if no such job exists.
 */
export function getRenderStatus(jobId: string): RenderJobSnapshot | undefined {
  return getDefaultRenderer().getRenderStatus(jobId)
}

/**
 * Cancel a queued or running job. Resolves to `true` if the job was
 * found and transitioned to `cancelled`; `false` otherwise.
 *
 * @param jobId - The id returned by {@link renderAnimation}.
 * @returns Whether cancellation took effect.
 */
export function cancelRender(jobId: string): boolean {
  return getDefaultRenderer().cancelRender(jobId)
}

/**
 * Internal: enqueue a job on a given queue, applying option defaults
 * derived from the document's own `width`/`height`/`fps`/`duration`.
 *
 * @param queue - Render queue.
 * @param doc - Animation document.
 * @param options - Input options.
 * @returns The job handle.
 */
function submit(
  queue: RenderQueue,
  doc: AnimationDocument,
  options: RenderAnimationOptions,
): RenderJob {
  const resolved = resolveOptions(doc, options)
  const id = options.jobId ?? generateJobId()
  return queue.submit(doc, resolved, id)
}

/**
 * Apply defaults so the queue runner always receives concrete numeric
 * width/height/fps/totalFrames. Throws on documents that can't render
 * any frames (`duration <= 0`, `fps <= 0`, etc.).
 *
 * @param doc - Source animation document.
 * @param options - Input options.
 * @returns Resolved options ready for the runner.
 */
function resolveOptions(
  doc: AnimationDocument,
  options: RenderAnimationOptions,
): ResolvedRenderOptions {
  if (typeof doc.width !== 'number' || typeof doc.height !== 'number') {
    throw new TypeError('renderAnimation: doc.width and doc.height must be numbers')
  }
  if (typeof doc.duration !== 'number' || doc.duration <= 0) {
    throw new TypeError('renderAnimation: doc.duration must be a positive number')
  }
  const format = options.format ?? 'lottie'
  const fps = options.fps ?? doc.fps ?? DEFAULT_FPS
  if (fps <= 0) {
    throw new TypeError('renderAnimation: fps must be > 0')
  }
  const width = options.resolution?.width ?? doc.width
  const height = options.resolution?.height ?? doc.height
  const totalFrames = Math.max(1, Math.floor(doc.duration * fps))
  return {
    ...options,
    format,
    fps,
    width,
    height,
    totalFrames,
  }
}

let counter = 0

/**
 * Generate a stable, monotonically increasing job id when the caller
 * doesn't supply one. The format `anim-<timestamp>-<counter>` is
 * deliberately human-readable (helpful in logs); production deployments
 * with multiple processes should provide their own uuid via `options.jobId`.
 *
 * @returns A new job id.
 */
function generateJobId(): string {
  counter = (counter + 1) % 1_000_000
  return `anim-${Date.now()}-${counter}`
}
