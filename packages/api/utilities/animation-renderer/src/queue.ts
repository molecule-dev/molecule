/**
 * In-process job queue for animation rendering.
 *
 * The queue is a deliberately small, single-process scheduler — render
 * jobs run sequentially up to `concurrency`, retain their state until a
 * caller cancels or until the host process restarts, and surface their
 * status via a {@link RenderJobSnapshot}.
 *
 * Persistence and multi-worker coordination are the host application's
 * responsibility — wrap this module in a database-backed queue (BullMQ,
 * pgbosss, etc.) when those guarantees are required. The interface here
 * is the smallest contract animation-tool needs to ship the basic
 * "submit → poll → download" UX without adopting a queue runtime.
 *
 * @module
 */

import type {
  AnimationDocument,
  CanvasRenderAdapter,
  FfmpegAdapter,
  RenderAnimationOptions,
  RenderJob,
  RenderJobSnapshot,
  RenderJobStatus,
  RenderResult,
} from './types.js'

/**
 * Configuration for {@link RenderQueue}.
 */
export interface RenderQueueOptions {
  /** Maximum jobs that may run simultaneously. Defaults to `1`. */
  concurrency?: number
  /**
   * Function that performs the actual render — injected so tests can
   * replace it with a deterministic stub. Receives the {@link AnimationDocument},
   * the resolved options, and the per-job cancellation signal.
   */
  runner: (
    doc: AnimationDocument,
    options: ResolvedRenderOptions,
    signal: AbortSignal,
    onProgress: (frame: number) => void,
  ) => Promise<RenderResult>
}

/**
 * Options after defaults have been applied — the shape the queue
 * runner is guaranteed to receive.
 */
export interface ResolvedRenderOptions extends RenderAnimationOptions {
  format: 'lottie' | 'mp4' | 'gif'
  width: number
  height: number
  fps: number
  totalFrames: number
}

/**
 * Internal mutable representation of a queued/running/finished job.
 */
interface JobRecord {
  job: RenderJob
  doc: AnimationDocument
  options: ResolvedRenderOptions
  controller: AbortController
  resolve: (r: RenderResult) => void
  reject: (e: unknown) => void
}

/**
 * Sequential render queue. One queue instance owns its job records — call
 * {@link RenderQueue.submit} to enqueue a job and {@link RenderQueue.cancel}
 * to abort one.
 */
export class RenderQueue {
  /** All jobs ever enqueued, indexed by id. */
  private readonly jobs = new Map<string, JobRecord>()

  /** Ids waiting to start. */
  private readonly waiting: string[] = []

  /** Number of currently running jobs. */
  private running = 0

  /** Concurrency limit. */
  private readonly concurrency: number

  /** Render runner. */
  private readonly runner: RenderQueueOptions['runner']

  /**
   * @param options - Queue configuration. The `runner` is required.
   */
  constructor(options: RenderQueueOptions) {
    this.concurrency = options.concurrency ?? 1
    this.runner = options.runner
  }

  /**
   * Enqueue a render job. Returns immediately with a {@link RenderJob}
   * whose `done` promise resolves when the job reaches a terminal state.
   *
   * @param doc - Animation document.
   * @param options - Resolved render options.
   * @param id - Stable id (host-supplied or generated).
   * @returns The enqueued job handle.
   */
  submit(doc: AnimationDocument, options: ResolvedRenderOptions, id: string): RenderJob {
    const controller = new AbortController()
    let resolve!: (r: RenderResult) => void
    let reject!: (e: unknown) => void
    const done = new Promise<RenderResult>((res, rej) => {
      resolve = res
      reject = rej
    })

    const job: RenderJob = {
      id,
      status: 'queued',
      format: options.format,
      totalFrames: options.totalFrames,
      framesRendered: 0,
      done,
    }

    const record: JobRecord = { job, doc, options, controller, resolve, reject }
    this.jobs.set(id, record)
    this.waiting.push(id)
    this.dispatch()
    return job
  }

  /**
   * Read-only snapshot of a job's state (no Promise / no controllers).
   * Suitable for HTTP responses and worker logs.
   *
   * @param id - Job id.
   * @returns The snapshot, or `undefined` if no such job exists.
   */
  snapshot(id: string): RenderJobSnapshot | undefined {
    const rec = this.jobs.get(id)
    if (!rec) return undefined
    const { job } = rec
    return {
      id: job.id,
      status: job.status,
      format: job.format,
      totalFrames: job.totalFrames,
      framesRendered: job.framesRendered,
      ...(job.result ? { contentType: job.result.contentType, extension: job.result.extension } : {}),
      ...(job.error ? { error: job.error } : {}),
    }
  }

  /**
   * Cancel a queued or running job. Resolves to `true` if the job
   * existed and was in a non-terminal state; `false` otherwise.
   *
   * @param id - Job id.
   * @returns `true` if a transition to `cancelled` happened.
   */
  cancel(id: string): boolean {
    const rec = this.jobs.get(id)
    if (!rec) return false
    if (isTerminal(rec.job.status)) return false
    rec.job.status = 'cancelled'
    rec.controller.abort()
    rec.reject(new Error('cancelled'))
    // Remove from waiting queue if it was still pending — otherwise the
    // running job's runner will observe the abort signal.
    const idx = this.waiting.indexOf(id)
    if (idx !== -1) this.waiting.splice(idx, 1)
    return true
  }

  /**
   * Internal: pump pending jobs onto running slots respecting `concurrency`.
   * Each running job uses the doc/options captured on its own record at
   * submit-time — no parameters needed.
   */
  private dispatch(): void {
    while (this.running < this.concurrency && this.waiting.length > 0) {
      const id = this.waiting.shift()!
      const rec = this.jobs.get(id)
      if (!rec) continue
      if (rec.job.status === 'cancelled') continue
      this.running++
      rec.job.status = 'rendering'
      this.runner(rec.doc, rec.options, rec.controller.signal, (frame) => {
        if (rec.job.status === 'rendering') rec.job.framesRendered = frame
      })
        .then((result) => {
          if (rec.job.status === 'cancelled') return
          rec.job.status = 'complete'
          rec.job.result = result
          rec.job.framesRendered = rec.options.totalFrames
          rec.resolve(result)
        })
        .catch((err: unknown) => {
          if (rec.job.status === 'cancelled') return
          rec.job.status = 'failed'
          rec.job.error = err instanceof Error ? err.message : String(err)
          rec.reject(err)
        })
        .finally(() => {
          this.running--
          if (this.waiting.length > 0) {
            this.dispatch()
          }
        })
    }
  }
}

/**
 * Return `true` if the given status is terminal (no further transitions).
 *
 * @param s - Job status.
 * @returns `true` if `complete`, `cancelled`, or `failed`.
 */
function isTerminal(s: RenderJobStatus): boolean {
  return s === 'complete' || s === 'cancelled' || s === 'failed'
}

/**
 * Build the standard runner that the public API uses — splits on output
 * format and dispatches to the lottie / mp4 / gif paths.
 *
 * Exported so callers building a custom queue (e.g. Redis-backed) can
 * compose the same render pipeline with their own scheduling layer.
 *
 * @param adapters - Canvas + ffmpeg adapters.
 * @returns A function suitable as {@link RenderQueueOptions.runner}.
 */
export function makeStandardRunner(adapters: {
  canvas?: CanvasRenderAdapter
  ffmpeg?: FfmpegAdapter
  toLottie: (doc: AnimationDocument, opts: { fps: number; width: number; height: number }) => unknown
  snapshotAtTime: (doc: AnimationDocument, t: number) => unknown
}): RenderQueueOptions['runner'] {
  return async (doc, options, signal, onProgress) => {
    if (options.format === 'lottie') {
      const json = adapters.toLottie(doc, {
        fps: options.fps,
        width: options.width,
        height: options.height,
      })
      const buffer = Buffer.from(JSON.stringify(json), 'utf8')
      onProgress(options.totalFrames)
      return {
        buffer,
        contentType: 'application/json',
        extension: 'json',
        frameCount: options.totalFrames,
      }
    }

    if (!adapters.canvas) {
      throw new Error('Canvas adapter required for mp4/gif formats')
    }
    if (!adapters.ffmpeg) {
      throw new Error('Ffmpeg adapter required for mp4/gif formats')
    }

    const frames: Buffer[] = []
    for (let i = 0; i < options.totalFrames; i++) {
      if (signal.aborted) {
        throw new Error('cancelled')
      }
      const t = i / options.fps
      const snapshot = adapters.snapshotAtTime(doc, t) as {
        width: number
        height: number
        background?: string
        layers: unknown[]
      }
      const result = await adapters.canvas.renderFrame(snapshot, {
        format: 'png',
        width: options.width,
        height: options.height,
      })
      frames.push(result.buffer)
      onProgress(i + 1)
    }

    if (signal.aborted) {
      throw new Error('cancelled')
    }

    const encoded =
      options.format === 'mp4'
        ? await adapters.ffmpeg.encodeMp4(frames, {
            fps: options.fps,
            width: options.width,
            height: options.height,
          })
        : await adapters.ffmpeg.encodeGif(frames, {
            fps: options.fps,
            width: options.width,
            height: options.height,
          })

    return {
      buffer: encoded,
      contentType: options.format === 'mp4' ? 'video/mp4' : 'image/gif',
      extension: options.format,
      frameCount: options.totalFrames,
    }
  }
}
