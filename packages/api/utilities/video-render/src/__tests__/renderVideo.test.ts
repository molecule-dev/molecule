/**
 * Integration tests for the public surface: renderVideo, getRenderStatus,
 * cancelRender, and the HTTP handlers. The bonded queue provider is mocked
 * via `setProvider()` so tests don't need a real queue backend.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider as setQueueProvider } from '@molecule/api-queue'
import type { Queue, QueueProvider } from '@molecule/api-queue'

import {
  createCancelRenderHandler,
  createEnqueueRenderHandler,
  createGetRenderStatusHandler,
} from '../handler.js'
import { setJobStore } from '../jobStore.js'
import {
  cancelRender,
  generateJobId,
  getRenderStatus,
  renderVideo,
} from '../renderVideo.js'
import type {
  RenderVideoOptions,
  VideoRenderRequest,
  VideoRenderResponse,
  VideoTimeline,
} from '../index.js'

interface MockQueueState {
  sent: Array<{ queueName: string; message: { id?: string; body: unknown } }>
}

function createMockQueueProvider(state: MockQueueState): QueueProvider {
  return {
    queue: (name: string): Queue => ({
      name,
      send: vi.fn(async (message) => {
        state.sent.push({ queueName: name, message })
        return message.id ?? 'auto-id'
      }),
      receive: vi.fn(async () => []),
      subscribe: vi.fn(() => () => {}),
    }),
  }
}

const baseTimeline: VideoTimeline = {
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
}
const baseOptions: RenderVideoOptions = { outputPath: '/tmp/out.mp4' }

describe('renderVideo', () => {
  let queueState: MockQueueState

  beforeEach(() => {
    queueState = { sent: [] }
    setQueueProvider(createMockQueueProvider(queueState))
    setJobStore(undefined) // reset to default in-memory store
  })

  afterEach(() => {
    setJobStore(undefined)
  })

  it('enqueues a job and returns a queued status', async () => {
    const job = await renderVideo(baseTimeline, baseOptions)
    expect(job.status).toBe('queued')
    expect(job.queueName).toBe('video-render')
    expect(job.jobId).toMatch(/^vrj_/)
    expect(queueState.sent).toHaveLength(1)
    expect(queueState.sent[0]!.queueName).toBe('video-render')
    expect(queueState.sent[0]!.message.id).toBe(job.jobId)
  })

  it('uses an explicit jobId and queueName when supplied', async () => {
    const job = await renderVideo(baseTimeline, {
      ...baseOptions,
      jobId: 'vrj_explicit',
      queueName: 'custom-q',
    })
    expect(job.jobId).toBe('vrj_explicit')
    expect(job.queueName).toBe('custom-q')
    expect(queueState.sent[0]!.queueName).toBe('custom-q')
  })

  it('records initial status before enqueuing', async () => {
    const job = await renderVideo(baseTimeline, baseOptions)
    const status = await getRenderStatus(job.jobId)
    expect(status.status).toBe('queued')
  })

  it('applies default codec per format', async () => {
    const job = await renderVideo(baseTimeline, { ...baseOptions, format: 'webm' })
    const sent = queueState.sent[0]!.message.body as {
      options: { codec: string; format: string }
    }
    expect(sent.options.codec).toBe('libvpx-vp9')
    expect(sent.options.format).toBe('webm')

    queueState.sent.length = 0
    await renderVideo(baseTimeline, { ...baseOptions, jobId: 'vrj_2' })
    const sent2 = queueState.sent[0]!.message.body as {
      options: { codec: string; format: string }
    }
    expect(sent2.options.codec).toBe('libx264')
    expect(sent2.options.format).toBe('mp4')
    void job // keep ref
  })

  it('rejects malicious outputPath at the public API', async () => {
    await expect(
      renderVideo(baseTimeline, { outputPath: '/tmp/$(rm -rf /)' }),
    ).rejects.toThrow(/outputPath/)
  })

  it('rejects malformed timelines', async () => {
    await expect(
      renderVideo(
        { ...baseTimeline, fps: -1 } as unknown as VideoTimeline,
        baseOptions,
      ),
    ).rejects.toThrow(/fps/)
  })
})

describe('getRenderStatus / cancelRender', () => {
  let queueState: MockQueueState

  beforeEach(() => {
    queueState = { sent: [] }
    setQueueProvider(createMockQueueProvider(queueState))
    setJobStore(undefined)
  })

  it('returns failed/Unknown for unknown ids', async () => {
    const status = await getRenderStatus('vrj_does_not_exist')
    expect(status.status).toBe('failed')
    expect(status.error).toBe('Unknown jobId')
  })

  it('marks a job as cancelled and persists the state', async () => {
    const job = await renderVideo(baseTimeline, baseOptions)
    const after = await cancelRender(job.jobId)
    expect(after.status).toBe('cancelled')
    expect(after.finishedAt).toBeInstanceOf(Date)
    const status = await getRenderStatus(job.jobId)
    expect(status.status).toBe('cancelled')
  })

  it('rejects empty jobIds', async () => {
    await expect(getRenderStatus('')).rejects.toThrow(/non-empty/)
    await expect(cancelRender('')).rejects.toThrow(/non-empty/)
  })
})

describe('generateJobId', () => {
  it('produces a vrj_-prefixed ID with sufficient entropy', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const id = generateJobId()
      expect(id.startsWith('vrj_')).toBe(true)
      ids.add(id)
    }
    expect(ids.size).toBe(100)
  })
})

describe('HTTP handlers', () => {
  let queueState: MockQueueState

  beforeEach(() => {
    queueState = { sent: [] }
    setQueueProvider(createMockQueueProvider(queueState))
    setJobStore(undefined)
  })

  function fakeRes(): VideoRenderResponse & { status: number; body: unknown } {
    let status = 200
    let body: unknown = null
    return {
      get status() {
        return status
      },
      get body() {
        return body
      },
      setStatus: (s) => {
        status = s
      },
      sendJson: (j) => {
        body = j
      },
    } as unknown as VideoRenderResponse & { status: number; body: unknown }
  }

  it('POST /render/video returns 202 with a job handle', async () => {
    const handle = createEnqueueRenderHandler()
    const req: VideoRenderRequest = {
      body: { timeline: baseTimeline, options: baseOptions },
    }
    const res = fakeRes()
    await handle(req, res)
    expect(res.status).toBe(202)
    const body = res.body as { jobId: string; status: string }
    expect(body.status).toBe('queued')
    expect(body.jobId).toMatch(/^vrj_/)
    expect(queueState.sent).toHaveLength(1)
  })

  it('POST /render/video returns 400 on missing/malformed body', async () => {
    const handle = createEnqueueRenderHandler()
    const r1 = fakeRes()
    await handle({ body: null }, r1)
    expect(r1.status).toBe(400)

    const r2 = fakeRes()
    await handle({ body: { timeline: baseTimeline } }, r2)
    expect(r2.status).toBe(400)

    const r3 = fakeRes()
    await handle({ body: { timeline: baseTimeline, options: { outputPath: 123 } } }, r3)
    expect(r3.status).toBe(400)
  })

  it('POST /render/video runs the optional validator', async () => {
    const handle = createEnqueueRenderHandler({
      validate: (timeline) => {
        if (timeline.duration > 1) throw new Error('Too long')
      },
    })
    const res = fakeRes()
    await handle({ body: { timeline: baseTimeline, options: baseOptions } }, res)
    expect(res.status).toBe(400)
    expect((res.body as { error: string }).error).toBe('Too long')
  })

  it('POST /render/video maps render-time validation errors to 400', async () => {
    const handle = createEnqueueRenderHandler()
    const res = fakeRes()
    await handle(
      {
        body: {
          timeline: baseTimeline,
          options: { outputPath: '/tmp/$(rm -rf /)' },
        },
      },
      res,
    )
    expect(res.status).toBe(400)
    expect((res.body as { error: string }).error).toMatch(/outputPath/)
  })

  it('GET /render/jobs/:id returns 200 with the status', async () => {
    const job = await renderVideo(baseTimeline, baseOptions)
    const handle = createGetRenderStatusHandler()
    const res = fakeRes()
    await handle({ params: { id: job.jobId } }, res)
    expect(res.status).toBe(200)
    expect((res.body as { status: string }).status).toBe('queued')
  })

  it('GET /render/jobs/:id returns 404 for unknown ids', async () => {
    const handle = createGetRenderStatusHandler()
    const res = fakeRes()
    await handle({ params: { id: 'vrj_unknown' } }, res)
    expect(res.status).toBe(404)
    expect((res.body as { status: string }).status).toBe('failed')
  })

  it('GET /render/jobs/:id requires :id', async () => {
    const handle = createGetRenderStatusHandler()
    const res = fakeRes()
    await handle({ params: {} }, res)
    expect(res.status).toBe(400)
  })

  it('DELETE /render/jobs/:id cancels and returns 200', async () => {
    const job = await renderVideo(baseTimeline, baseOptions)
    const handle = createCancelRenderHandler()
    const res = fakeRes()
    await handle({ params: { id: job.jobId } }, res)
    expect(res.status).toBe(200)
    expect((res.body as { status: string }).status).toBe('cancelled')
  })

  it('DELETE /render/jobs/:id requires :id', async () => {
    const handle = createCancelRenderHandler()
    const res = fakeRes()
    await handle({ params: {} }, res)
    expect(res.status).toBe(400)
  })
})
