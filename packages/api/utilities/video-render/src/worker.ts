/**
 * Worker entry point: consume {@link RenderJobMessage}s from the queue and
 * shell out to ffmpeg.
 *
 * The worker is a pure function of `(message, deps)` — `deps` are the job
 * store + ffmpeg runner, both injectable. This keeps the worker testable
 * end-to-end without mocking module-level state.
 *
 * Lifecycle:
 *  1. Read job status — bail out if `cancelled`.
 *  2. Set status to `rendering` with `startedAt`.
 *  3. Build argv via {@link buildFfmpegArgs}.
 *  4. Spawn ffmpeg via the bonded {@link FfmpegRunner}.
 *  5. Stream stderr → progress fraction (`time= / timeline.duration`).
 *  6. On exit: code 0 → `completed`, non-zero → `failed`.
 *
 * @module
 */

import { buildFfmpegArgs } from './buildFfmpegArgs.js'
import {
  getFfmpegRunner as getDefaultFfmpegRunner,
  parseFfmpegProgressSeconds,
  type FfmpegRunner,
} from './ffmpeg.js'
import { getJobStore as getDefaultJobStore, type JobStore } from './jobStore.js'
import type { RenderJobMessage, RenderJobStatus } from './types.js'

/**
 * Optional dependency overrides for {@link processRenderJob}. Defaults to
 * the bonded job store + ffmpeg runner.
 */
export interface ProcessRenderJobDeps {
  /** Override the job store. Defaults to {@link getDefaultJobStore}. */
  jobStore?: JobStore
  /** Override the ffmpeg runner. Defaults to {@link getDefaultFfmpegRunner}. */
  ffmpegRunner?: FfmpegRunner
}

/**
 * Process a single render job. Returns the terminal {@link RenderJobStatus}
 * after the worker observes ffmpeg's exit (or the job's cancellation).
 *
 * Implementations of `@molecule/api-queue` consumers wire this up by
 * subscribing to the queue and calling `processRenderJob(message)` for each
 * received message.
 *
 * @param message - The render job message to process.
 * @param deps - Optional dependency overrides (primarily for tests).
 * @returns The final job status.
 */
export async function processRenderJob(
  message: RenderJobMessage,
  deps: ProcessRenderJobDeps = {},
): Promise<RenderJobStatus> {
  const jobStore = deps.jobStore ?? getDefaultJobStore()
  const ffmpegRunner = deps.ffmpegRunner ?? getDefaultFfmpegRunner()

  // Check for pre-process cancellation.
  const initial = await jobStore.get(message.jobId)
  if (initial?.status === 'cancelled') {
    return initial
  }

  await jobStore.patch(message.jobId, { status: 'rendering', startedAt: new Date(), progress: 0 })

  let argv: readonly string[]
  try {
    argv = buildFfmpegArgs(message)
  } catch (err) {
    return jobStore.patch(message.jobId, {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      finishedAt: new Date(),
    })
  }

  const child = ffmpegRunner(argv)

  // Surface progress reports as fractional values clamped to [0, 1].
  const totalDuration = message.timeline.duration > 0 ? message.timeline.duration : 1
  child.stderr?.on('data', (chunk) => {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    const seconds = parseFfmpegProgressSeconds(text)
    if (seconds !== undefined) {
      const progress = Math.max(0, Math.min(1, seconds / totalDuration))
      // Fire-and-forget — patching is async but ordering against `close`
      // is not critical here; the final close handler always wins.
      void jobStore.patch(message.jobId, { progress, status: 'rendering' })
    }
  })

  // Watch for cancellation while the child is running. We poll the job
  // store at a coarse interval — fine-grained enough that long renders
  // can be aborted, coarse enough not to add measurable load.
  const cancelTimer = setInterval(() => {
    void (async () => {
      const snapshot = await jobStore.get(message.jobId)
      if (snapshot?.status === 'cancelled') {
        try {
          child.kill('SIGTERM')
        } catch {
          // Already exited.
        }
      }
    })()
  }, 250)

  return new Promise<RenderJobStatus>((resolve) => {
    let settled = false
    const settle = (final: RenderJobStatus): void => {
      if (settled) return
      settled = true
      clearInterval(cancelTimer)
      resolve(final)
    }

    child.on('error', (err) => {
      void jobStore
        .patch(message.jobId, {
          status: 'failed',
          error: err.message,
          finishedAt: new Date(),
        })
        .then(settle)
    })

    child.on('close', (code) => {
      void (async () => {
        const snapshot = await jobStore.get(message.jobId)
        // If a cancel landed mid-flight, preserve the cancelled state.
        if (snapshot?.status === 'cancelled') {
          settle(await jobStore.patch(message.jobId, { finishedAt: new Date() }))
          return
        }
        if (code === 0) {
          settle(
            await jobStore.patch(message.jobId, {
              status: 'completed',
              progress: 1,
              outputUrl: message.options.outputPath,
              finishedAt: new Date(),
            }),
          )
        } else {
          settle(
            await jobStore.patch(message.jobId, {
              status: 'failed',
              error: `ffmpeg exited with code ${String(code)}`,
              finishedAt: new Date(),
            }),
          )
        }
      })()
    })
  })
}
