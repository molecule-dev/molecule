/**
 * Worker tests — assert processRenderJob's lifecycle by injecting a fake
 * ffmpeg child + an explicit JobStore. No real ffmpeg binary is invoked.
 */

import { EventEmitter } from 'node:events'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FfmpegProcess, FfmpegRunner } from '../ffmpeg.js'
import { createMemoryJobStore, type JobStore } from '../jobStore.js'
import type { RenderJobMessage } from '../types.js'
import { processRenderJob } from '../worker.js'

/**
 * Build a fake ffmpeg child that records the argv it was invoked with and
 * exposes hooks to emit stderr chunks + signal close/error.
 */
function makeFakeChild(): FfmpegProcess & {
  stderrEmitter: EventEmitter
  emitClose: (code: number) => void
  emitError: (err: Error) => void
  readonly killCalled: boolean
} {
  const stderrEmitter = new EventEmitter()
  const childEmitter = new EventEmitter()
  const state = { killCalled: false }
  const result: FfmpegProcess & {
    stderrEmitter: EventEmitter
    emitClose: (code: number) => void
    emitError: (err: Error) => void
    readonly killCalled: boolean
  } = {
    stderr: { on: stderrEmitter.on.bind(stderrEmitter) } as unknown as FfmpegProcess['stderr'],
    on: childEmitter.on.bind(childEmitter) as FfmpegProcess['on'],
    kill: () => {
      state.killCalled = true
      return true
    },
    stderrEmitter,
    emitClose: (code: number) => childEmitter.emit('close', code),
    emitError: (err: Error) => childEmitter.emit('error', err),
    get killCalled() {
      return state.killCalled
    },
  }
  return result
}

const message: RenderJobMessage = {
  jobId: 'vrj_w1',
  timeline: {
    duration: 4,
    resolution: { width: 1280, height: 720 },
    fps: 30,
    tracks: [
      {
        id: 'v0',
        kind: 'video',
        clips: [{ id: 'c0', source: '/uploads/x.mp4', start: 0, duration: 4 }],
      },
    ],
  },
  options: {
    outputPath: '/tmp/out.mp4',
    format: 'mp4',
    codec: 'libx264',
  },
}

describe('processRenderJob', () => {
  let jobStore: JobStore

  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs ffmpeg, reports progress, and resolves to completed on exit code 0', async () => {
    jobStore = createMemoryJobStore()
    const child = makeFakeChild()
    const runner: FfmpegRunner = vi.fn(() => child)

    const promise = processRenderJob(message, { jobStore, ffmpegRunner: runner })

    // Wait for listener registration in the async worker setup.
    await new Promise((r) => setImmediate(r))
    await new Promise((r) => setImmediate(r))

    // Runner saw a sane argv.
    expect(runner).toHaveBeenCalledTimes(1)
    const argv = (runner as unknown as { mock: { calls: string[][] } }).mock.calls[0]![0]
    expect(argv).toContain('-i')
    expect(argv).toContain('/uploads/x.mp4')
    expect(argv[argv.length - 1]).toBe('/tmp/out.mp4')

    // Halfway progress.
    child.stderrEmitter.emit('data', 'frame=60 fps=30 time=00:00:02.00 bitrate=...')
    // Yield so the async patch lands.
    await new Promise((r) => setImmediate(r))
    let snapshot = await jobStore.get('vrj_w1')
    expect(snapshot?.status).toBe('rendering')
    expect(snapshot?.progress).toBeCloseTo(0.5, 5)

    child.emitClose(0)
    const final = await promise
    expect(final.status).toBe('completed')
    expect(final.progress).toBe(1)
    expect(final.outputUrl).toBe('/tmp/out.mp4')
    expect(final.finishedAt).toBeInstanceOf(Date)

    snapshot = await jobStore.get('vrj_w1')
    expect(snapshot?.status).toBe('completed')
  })

  it('clamps progress to [0, 1]', async () => {
    jobStore = createMemoryJobStore()
    const child = makeFakeChild()
    const runner: FfmpegRunner = () => child

    const promise = processRenderJob(message, { jobStore, ffmpegRunner: runner })
    // Wait for listeners to be registered.
    await new Promise((r) => setImmediate(r))
    await new Promise((r) => setImmediate(r))
    // Time exceeds total duration → should clamp to 1.
    child.stderrEmitter.emit('data', 'time=00:01:00.00')
    await new Promise((r) => setImmediate(r))
    const snapshot = await jobStore.get('vrj_w1')
    expect(snapshot?.progress).toBe(1)
    child.emitClose(0)
    await promise
  })

  it('resolves to failed when ffmpeg exits non-zero', async () => {
    jobStore = createMemoryJobStore()
    const child = makeFakeChild()
    const runner: FfmpegRunner = () => child

    const promise = processRenderJob(message, { jobStore, ffmpegRunner: runner })
    await new Promise((r) => setImmediate(r))
    await new Promise((r) => setImmediate(r))
    child.emitClose(1)
    const final = await promise
    expect(final.status).toBe('failed')
    expect(final.error).toMatch(/ffmpeg exited with code 1/)
  })

  it('resolves to failed when the spawn errors', async () => {
    jobStore = createMemoryJobStore()
    const child = makeFakeChild()
    const runner: FfmpegRunner = () => child

    const promise = processRenderJob(message, { jobStore, ffmpegRunner: runner })
    await new Promise((r) => setImmediate(r))
    await new Promise((r) => setImmediate(r))
    child.emitError(new Error('ENOENT: ffmpeg not found'))
    const final = await promise
    expect(final.status).toBe('failed')
    expect(final.error).toMatch(/ENOENT/)
  })

  it('returns immediately when the job was cancelled before processing', async () => {
    jobStore = createMemoryJobStore()
    await jobStore.set('vrj_w1', { status: 'cancelled' })
    const runner: FfmpegRunner = vi.fn(() => makeFakeChild())
    const final = await processRenderJob(message, { jobStore, ffmpegRunner: runner })
    expect(final.status).toBe('cancelled')
    expect(runner).not.toHaveBeenCalled()
  })

  it('honours mid-flight cancellation by signalling the child + preserving cancelled state', async () => {
    jobStore = createMemoryJobStore()
    const child = makeFakeChild()
    const runner: FfmpegRunner = () => child

    const promise = processRenderJob(message, { jobStore, ffmpegRunner: runner })

    // Wait for listeners + cancel-poll interval to be installed.
    await new Promise((r) => setImmediate(r))
    await new Promise((r) => setImmediate(r))

    // Race: caller patches the store to cancelled, the worker's poll-timer
    // should pick it up (250ms interval) and call child.kill().
    await jobStore.patch('vrj_w1', { status: 'cancelled' })

    // Wait long enough for the polling interval to fire + the async patch
    // inside the interval handler to land.
    await new Promise((r) => setTimeout(r, 350))
    expect(child.killCalled).toBe(true)

    // ffmpeg "exits" after the kill.
    child.emitClose(255)
    const final = await promise
    expect(final.status).toBe('cancelled')
  })

  it('fails fast on a malformed argv build (e.g. unsafe outputPath)', async () => {
    jobStore = createMemoryJobStore()
    const runner: FfmpegRunner = vi.fn(() => makeFakeChild())
    const final = await processRenderJob(
      {
        ...message,
        options: { ...message.options, outputPath: '/tmp/$(rm -rf /)' },
      },
      { jobStore, ffmpegRunner: runner },
    )
    expect(final.status).toBe('failed')
    expect(final.error).toMatch(/outputPath/)
    // No spawn happened.
    expect(runner).not.toHaveBeenCalled()
  })
})
