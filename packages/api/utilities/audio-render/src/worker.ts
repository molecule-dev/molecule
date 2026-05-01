/**
 * Queue worker that consumes {@link AudioRenderJobPayload} messages and
 * spawns ffmpeg to perform the actual mixdown.
 *
 * Decoupling notes:
 * - The ffmpeg binary is invoked via `child_process.spawn` with an argv
 *   array — never via a shell. Caller-controlled paths are sanitised by
 *   {@link sanitizeAudioPath} before they reach the argv (rejects NUL,
 *   newline, and other control characters).
 * - The spawn itself is injected (`processAudioRenderJobOptions.spawn`) so
 *   tests can substitute a fake without re-implementing process trees.
 *
 * @module
 */

import type { ChildProcess, SpawnOptions } from 'node:child_process'
import { spawn as nodeSpawn } from 'node:child_process'

import type { ReceivedMessage } from '@molecule/api-queue'
import { subscribe } from '@molecule/api-queue'

import { buildFfmpegArgs } from './ffmpegCommand.js'
import { getJob, updateJob } from './jobStore.js'
import { DEFAULT_AUDIO_RENDER_QUEUE } from './renderAudio.js'
import type {
  AudioRenderFormat,
  AudioRenderJobPayload,
  AudioRenderOptions,
  RenderJob,
} from './types.js'

/**
 * Function signature compatible with `child_process.spawn`. Exposed as
 * the injection seam for tests.
 */
export type SpawnFunction = (
  command: string,
  args: readonly string[],
  options?: SpawnOptions,
) => ChildProcess

/**
 * Options for {@link processAudioRenderJob}.
 */
export interface ProcessAudioRenderJobOptions {
  /** ffmpeg binary path. Defaults to `'ffmpeg'` (resolved on $PATH). */
  ffmpegPath?: string
  /** Override `child_process.spawn` for tests. */
  spawn?: SpawnFunction
  /** Maximum time (ms) to allow ffmpeg before killing it. Defaults to 600_000 (10 min). */
  timeoutMs?: number
}

/**
 * Resolve an options patch into the same merged shape `renderAudio` uses.
 *
 * @param options
 * @internal
 */
const resolveWorkerOptions = (
  options: AudioRenderOptions = {},
): {
  format: AudioRenderFormat
  sampleRate: number
  channels: number
  bitrate?: string
} => {
  const format = options.format ?? 'mp3'
  return {
    format,
    sampleRate: options.sampleRate ?? 44100,
    channels: options.channels ?? 2,
    bitrate: options.bitrate ?? (format === 'mp3' ? '192k' : undefined),
  }
}

/**
 * Result of a single render attempt.
 */
export interface ProcessAudioRenderJobResult {
  jobId: string
  status: RenderJob['status']
  outputPath?: string
  exitCode?: number | null
  error?: string
  /** The exact argv passed to ffmpeg — useful for diagnostics in tests. */
  ffmpegArgs: string[]
}

/**
 * Process a single render-job payload: build the ffmpeg argv, spawn
 * ffmpeg, await exit, and update the job-store entry to match.
 *
 * Intended to be wired into a queue subscription via
 * {@link startAudioRenderWorker}, but exported on its own so callers
 * with custom queue topologies can drive the work directly.
 *
 * @param payload - The job payload received from the queue.
 * @param processOptions - Optional spawn / timeout overrides.
 * @returns A summary of the attempt suitable for logging.
 */
export const processAudioRenderJob = async (
  payload: AudioRenderJobPayload,
  processOptions: ProcessAudioRenderJobOptions = {},
): Promise<ProcessAudioRenderJobResult> => {
  const ffmpegPath = processOptions.ffmpegPath ?? 'ffmpeg'
  const spawn = processOptions.spawn ?? nodeSpawn
  const timeoutMs = processOptions.timeoutMs ?? 600_000

  const merged = resolveWorkerOptions(payload.options)
  const command = buildFfmpegArgs(payload.session, merged, payload.outputPath)

  // If the job has already been cancelled while waiting in the queue, bail.
  const pre = getJob(payload.jobId)
  if (pre && pre.status === 'cancelled') {
    return {
      jobId: payload.jobId,
      status: 'cancelled',
      ffmpegArgs: command.args,
    }
  }

  const startedAt = new Date()
  updateJob(payload.jobId, { status: 'processing', startedAt })

  let timeoutHandle: NodeJS.Timeout | undefined
  let timedOut = false

  return await new Promise<ProcessAudioRenderJobResult>((resolve) => {
    let child: ChildProcess
    try {
      child = spawn(ffmpegPath, command.args, { stdio: ['ignore', 'ignore', 'pipe'] })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      updateJob(payload.jobId, { status: 'failed', error: message, finishedAt: new Date() })
      resolve({
        jobId: payload.jobId,
        status: 'failed',
        error: message,
        ffmpegArgs: command.args,
      })
      return
    }

    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
      // Cap to keep failure messages bounded.
      if (stderr.length > 8 * 1024) stderr = stderr.slice(-8 * 1024)
    })

    timeoutHandle = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)

    child.on('error', (err: Error) => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      const message = err.message
      updateJob(payload.jobId, { status: 'failed', error: message, finishedAt: new Date() })
      resolve({
        jobId: payload.jobId,
        status: 'failed',
        error: message,
        ffmpegArgs: command.args,
      })
    })

    child.on('close', (code: number | null) => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      const finishedAt = new Date()

      // Cancellation requested mid-flight.
      const current = getJob(payload.jobId)
      if (current && current.status === 'cancelled') {
        resolve({
          jobId: payload.jobId,
          status: 'cancelled',
          exitCode: code,
          ffmpegArgs: command.args,
        })
        return
      }

      if (timedOut) {
        const message = `ffmpeg timed out after ${timeoutMs}ms`
        updateJob(payload.jobId, { status: 'failed', error: message, finishedAt })
        resolve({
          jobId: payload.jobId,
          status: 'failed',
          error: message,
          exitCode: code,
          ffmpegArgs: command.args,
        })
        return
      }

      if (code === 0) {
        updateJob(payload.jobId, { status: 'completed', finishedAt })
        resolve({
          jobId: payload.jobId,
          status: 'completed',
          outputPath: payload.outputPath,
          exitCode: code,
          ffmpegArgs: command.args,
        })
        return
      }

      const message = stderr.trim() || `ffmpeg exited with code ${code}`
      updateJob(payload.jobId, { status: 'failed', error: message, finishedAt })
      resolve({
        jobId: payload.jobId,
        status: 'failed',
        error: message,
        exitCode: code,
        ffmpegArgs: command.args,
      })
    })
  })
}

/**
 * Options for {@link startAudioRenderWorker}.
 */
export interface StartAudioRenderWorkerOptions extends ProcessAudioRenderJobOptions {
  /** Queue name to subscribe to. Defaults to `'audio-render'`. */
  queueName?: string
  /** Called whenever a job completes (success, failure, or cancellation). */
  onJobComplete?: (result: ProcessAudioRenderJobResult) => void
}

/**
 * Subscribe to the render queue and process every incoming job.
 *
 * @param options - Queue name + spawn / timeout overrides.
 * @returns The unsubscribe function returned by `subscribe()`.
 * @throws {Error} If no queue provider is bonded.
 */
export const startAudioRenderWorker = (
  options: StartAudioRenderWorkerOptions = {},
): (() => void) => {
  const queueName = options.queueName ?? DEFAULT_AUDIO_RENDER_QUEUE

  return subscribe<AudioRenderJobPayload>(
    queueName,
    async (message: ReceivedMessage<AudioRenderJobPayload>) => {
      const payload: AudioRenderJobPayload = {
        ...message.body,
        jobId: message.body.jobId || message.id,
      }
      try {
        const result = await processAudioRenderJob(payload, {
          ffmpegPath: options.ffmpegPath,
          spawn: options.spawn,
          timeoutMs: options.timeoutMs,
        })
        await message.ack()
        options.onJobComplete?.(result)
      } catch (err) {
        // processAudioRenderJob already updates the job-store on failure,
        // but if something throws *outside* its promise we still want to
        // ack so the message doesn't loop forever.
        const error = err instanceof Error ? err.message : String(err)
        updateJob(payload.jobId, { status: 'failed', error, finishedAt: new Date() })
        await message.ack()
        options.onJobComplete?.({
          jobId: payload.jobId,
          status: 'failed',
          error,
          ffmpegArgs: [],
        })
      }
    },
  )
}
