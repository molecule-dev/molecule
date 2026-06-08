/**
 * Unit tests for the in-process render queue and the high-level
 * {@link createAnimationRenderer} surface — exercises every status
 * transition (`queued → rendering → complete`, `→ cancelled`, `→ failed`),
 * dispatch ordering, and the `frames === duration * fps` invariant on
 * the MP4 / GIF paths.
 */

import { describe, expect, it, vi } from 'vitest'

import { toLottie } from '../lottie.js'
import { makeStandardRunner, RenderQueue } from '../queue.js'
import {
  cancelRender,
  configureAnimationRenderer,
  createAnimationRenderer,
  getRenderStatus,
  renderAnimation,
} from '../renderAnimation.js'
import { snapshotAtTime } from '../snapshot.js'
import type { AnimationDocument, CanvasRenderAdapter, FfmpegAdapter } from '../types.js'

const makeDoc = (overrides: Partial<AnimationDocument> = {}): AnimationDocument => ({
  width: 100,
  height: 100,
  fps: 10,
  duration: 1,
  layers: [{ id: 'r', kind: 'rect', shape: { width: 10, height: 10 } }],
  ...overrides,
})

describe('RenderQueue lottie path', () => {
  it('completes synchronously-ish and reports status transitions', async () => {
    const renderer = createAnimationRenderer()
    const job = renderer.renderAnimation(makeDoc(), { format: 'lottie' })
    expect(job.status).toBe('rendering') // dispatched immediately on submit
    expect(job.totalFrames).toBe(10)

    const result = await job.done
    expect(result.contentType).toBe('application/json')
    expect(result.extension).toBe('json')
    expect(result.frameCount).toBe(10)

    const parsed = JSON.parse(result.buffer.toString('utf8')) as { v: string; op: number }
    expect(parsed.v).toMatch(/^5\./)
    expect(parsed.op).toBe(10)
  })

  it('snapshot reflects completion', async () => {
    const renderer = createAnimationRenderer()
    const job = renderer.renderAnimation(makeDoc(), { format: 'lottie', jobId: 'fixed-id' })
    await job.done
    const snap = renderer.getRenderStatus('fixed-id')
    expect(snap?.status).toBe('complete')
    expect(snap?.framesRendered).toBe(10)
    expect(snap?.contentType).toBe('application/json')
    expect(snap?.extension).toBe('json')
  })
})

describe('RenderQueue mp4/gif path', () => {
  function makeAdapters(): { canvas: CanvasRenderAdapter; ffmpeg: FfmpegAdapter } {
    return {
      canvas: {
        renderFrame: vi.fn(async () => ({ buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]) })),
      },
      ffmpeg: {
        encodeMp4: vi.fn(async (frames) => Buffer.concat([Buffer.from('mp4'), ...frames])),
        encodeGif: vi.fn(async (frames) => Buffer.concat([Buffer.from('gif'), ...frames])),
      },
    }
  }

  it('frame count matches duration * fps', async () => {
    const adapters = makeAdapters()
    const renderer = createAnimationRenderer(adapters)
    const job = renderer.renderAnimation(makeDoc({ duration: 2, fps: 24 }), { format: 'mp4' })
    expect(job.totalFrames).toBe(48)
    const result = await job.done
    expect(result.frameCount).toBe(48)
    expect(adapters.canvas.renderFrame).toHaveBeenCalledTimes(48)
    expect(adapters.ffmpeg.encodeMp4).toHaveBeenCalledTimes(1)
  })

  it('GIF format dispatches encodeGif, not encodeMp4', async () => {
    const adapters = makeAdapters()
    const renderer = createAnimationRenderer(adapters)
    await renderer.renderAnimation(makeDoc(), { format: 'gif' }).done
    expect(adapters.ffmpeg.encodeGif).toHaveBeenCalledTimes(1)
    expect(adapters.ffmpeg.encodeMp4).not.toHaveBeenCalled()
  })

  it('passes resolution to the canvas adapter', async () => {
    const adapters = makeAdapters()
    const renderer = createAnimationRenderer(adapters)
    await renderer.renderAnimation(makeDoc(), {
      format: 'mp4',
      resolution: { width: 320, height: 240 },
    }).done
    expect(adapters.canvas.renderFrame).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ format: 'png', width: 320, height: 240 }),
    )
  })

  it('rejects mp4 without a canvas adapter', async () => {
    const renderer = createAnimationRenderer({})
    const job = renderer.renderAnimation(makeDoc(), { format: 'mp4' })
    await expect(job.done).rejects.toThrow(/Canvas adapter required/)
    const snap = renderer.getRenderStatus(job.id)
    expect(snap?.status).toBe('failed')
    expect(snap?.error).toMatch(/Canvas adapter/)
  })

  it('rejects mp4 without an ffmpeg adapter (canvas only)', async () => {
    const renderer = createAnimationRenderer({
      canvas: { renderFrame: async () => ({ buffer: Buffer.from([0]) }) },
    })
    const job = renderer.renderAnimation(makeDoc(), { format: 'mp4' })
    await expect(job.done).rejects.toThrow(/Ffmpeg adapter required/)
  })
})

describe('cancellation', () => {
  it('cancels a queued job before it can run', async () => {
    const adapters = {
      canvas: {
        renderFrame: vi.fn(async () => ({ buffer: Buffer.from([0]) })),
      } as CanvasRenderAdapter,
      ffmpeg: {
        encodeMp4: vi.fn(async () => Buffer.from([0])),
        encodeGif: vi.fn(async () => Buffer.from([0])),
      } as FfmpegAdapter,
    }
    // concurrency: 1 — second submit is queued
    const renderer = createAnimationRenderer({ ...adapters, concurrency: 1 })
    const first = renderer.renderAnimation(makeDoc({ duration: 1, fps: 5 }), {
      format: 'mp4',
      jobId: 'first',
    })
    const second = renderer.renderAnimation(makeDoc(), { format: 'mp4', jobId: 'second' })
    expect(renderer.getRenderStatus('second')?.status).toBe('queued')
    const cancelled = renderer.cancelRender('second')
    expect(cancelled).toBe(true)
    expect(renderer.getRenderStatus('second')?.status).toBe('cancelled')
    await expect(second.done).rejects.toThrow(/cancelled/)
    await first.done
  })

  it('cancels a running job mid-flight', async () => {
    let resolveFirst: ((v: { buffer: Buffer }) => void) | undefined
    const slowFrame = new Promise<{ buffer: Buffer }>((res) => {
      resolveFirst = res
    })
    const adapters = {
      canvas: {
        renderFrame: vi.fn(() => slowFrame),
      } as CanvasRenderAdapter,
      ffmpeg: {
        encodeMp4: vi.fn(async () => Buffer.from([0])),
        encodeGif: vi.fn(async () => Buffer.from([0])),
      } as FfmpegAdapter,
    }
    const renderer = createAnimationRenderer(adapters)
    const job = renderer.renderAnimation(makeDoc({ duration: 1, fps: 5 }), {
      format: 'mp4',
      jobId: 'running',
    })
    // Allow the runner to start awaiting the first frame.
    await Promise.resolve()
    expect(renderer.getRenderStatus('running')?.status).toBe('rendering')
    expect(renderer.cancelRender('running')).toBe(true)
    // Resolve the frame to let the runner proceed past the await.
    resolveFirst?.({ buffer: Buffer.from([0]) })
    await expect(job.done).rejects.toThrow(/cancelled/)
    expect(renderer.getRenderStatus('running')?.status).toBe('cancelled')
  })

  it('returns false when cancelling a finished job', async () => {
    const renderer = createAnimationRenderer()
    const job = renderer.renderAnimation(makeDoc(), { format: 'lottie', jobId: 'done' })
    await job.done
    expect(renderer.cancelRender('done')).toBe(false)
  })

  it('returns false when cancelling a non-existent job', () => {
    const renderer = createAnimationRenderer()
    expect(renderer.cancelRender('nope')).toBe(false)
    expect(renderer.getRenderStatus('nope')).toBeUndefined()
  })
})

describe('option resolution', () => {
  it('uses doc.fps when options.fps is omitted', () => {
    const renderer = createAnimationRenderer()
    const job = renderer.renderAnimation(makeDoc({ fps: 12 }), { format: 'lottie' })
    expect(job.totalFrames).toBe(12)
  })

  it('options.fps overrides doc.fps', () => {
    const renderer = createAnimationRenderer()
    const job = renderer.renderAnimation(makeDoc({ fps: 12 }), { format: 'lottie', fps: 30 })
    expect(job.totalFrames).toBe(30)
  })

  it('rejects non-positive duration', () => {
    const renderer = createAnimationRenderer()
    expect(() => renderer.renderAnimation(makeDoc({ duration: 0 }))).toThrow(/duration/)
  })

  it('rejects non-positive fps', () => {
    const renderer = createAnimationRenderer()
    expect(() => renderer.renderAnimation(makeDoc(), { fps: 0 })).toThrow(/fps/)
  })

  it('honours a caller-supplied jobId', () => {
    const renderer = createAnimationRenderer()
    const job = renderer.renderAnimation(makeDoc(), { format: 'lottie', jobId: 'custom-id' })
    expect(job.id).toBe('custom-id')
    expect(renderer.getRenderStatus('custom-id')?.id).toBe('custom-id')
  })
})

describe('singleton API', () => {
  it('configureAnimationRenderer wires adapters for the module-level functions', async () => {
    configureAnimationRenderer({
      canvas: { renderFrame: async () => ({ buffer: Buffer.from([0]) }) },
      ffmpeg: {
        encodeMp4: async () => Buffer.from('mp4ok'),
        encodeGif: async () => Buffer.from('gifok'),
      },
    })
    const job = renderAnimation(makeDoc(), { format: 'mp4', jobId: 'sing-1' })
    const result = await job.done
    expect(result.buffer.toString()).toBe('mp4ok')
    expect(getRenderStatus('sing-1')?.status).toBe('complete')
    expect(cancelRender('sing-1')).toBe(false) // already complete
  })
})

describe('makeStandardRunner unit', () => {
  it('respects an aborted signal between frames', async () => {
    const controller = new AbortController()
    const runner = makeStandardRunner({
      canvas: {
        renderFrame: vi.fn(async () => {
          // Abort after the first frame.
          controller.abort()
          return { buffer: Buffer.from([0]) }
        }),
      },
      ffmpeg: {
        encodeMp4: vi.fn(),
        encodeGif: vi.fn(),
      } as unknown as FfmpegAdapter,
      toLottie,
      snapshotAtTime,
    })
    const doc = makeDoc({ duration: 1, fps: 5 })
    await expect(
      runner(
        doc,
        {
          format: 'mp4',
          width: doc.width,
          height: doc.height,
          fps: 5,
          totalFrames: 5,
        },
        controller.signal,
        () => undefined,
      ),
    ).rejects.toThrow(/cancelled/)
  })
})

describe('low-level RenderQueue', () => {
  it('respects concurrency = 1 (sequential dispatch)', async () => {
    const order: string[] = []
    const queue = new RenderQueue({
      concurrency: 1,
      runner: async (doc, options) => {
        order.push(`start-${options.jobId}`)
        await new Promise((r) => setTimeout(r, 5))
        order.push(`end-${options.jobId}`)
        return {
          buffer: Buffer.from([0]),
          contentType: 'application/octet-stream',
          extension: 'json',
          frameCount: options.totalFrames,
        }
      },
    })
    const job1 = queue.submit(
      makeDoc(),
      {
        format: 'lottie',
        width: 100,
        height: 100,
        fps: 10,
        totalFrames: 10,
        jobId: 'A',
      },
      'A',
    )
    const job2 = queue.submit(
      makeDoc(),
      {
        format: 'lottie',
        width: 100,
        height: 100,
        fps: 10,
        totalFrames: 10,
        jobId: 'B',
      },
      'B',
    )
    await Promise.all([job1.done, job2.done])
    expect(order).toEqual(['start-A', 'end-A', 'start-B', 'end-B'])
  })
})
