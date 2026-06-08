/**
 * HTTP handler tests — exercises body parsing, status mapping, and the
 * three handlers the API surface ships (`POST`, `GET`, `DELETE`).
 */

import { describe, expect, it, vi } from 'vitest'

import type { AnimationRenderResponse } from '../handler.js'
import {
  createAnimationCancelHandler,
  createAnimationRenderHandler,
  createAnimationStatusHandler,
} from '../handler.js'
import { configureAnimationRenderer } from '../renderAnimation.js'

function makeRes(): AnimationRenderResponse & {
  status?: number
  jsonBody?: unknown
  bufferBody?: Buffer
  headers: Record<string, string>
} {
  const headers: Record<string, string> = {}
  const res = {
    headers,
    setHeader(name: string, value: string) {
      headers[name] = value
    },
    setStatus(s: number) {
      ;(res as { status?: number }).status = s
    },
    sendBuffer(b: Buffer) {
      ;(res as { bufferBody?: Buffer }).bufferBody = b
    },
    sendJson(j: unknown) {
      ;(res as { jsonBody?: unknown }).jsonBody = j
    },
  }
  return res as AnimationRenderResponse & {
    status?: number
    jsonBody?: unknown
    bufferBody?: Buffer
    headers: Record<string, string>
  }
}

const validBody = {
  doc: {
    width: 100,
    height: 100,
    fps: 10,
    duration: 1,
    layers: [{ id: 'a', kind: 'rect', shape: { width: 10, height: 10 } }],
  },
  options: { format: 'lottie' },
}

describe('createAnimationRenderHandler', () => {
  it('rejects non-object bodies with 400', async () => {
    const handle = createAnimationRenderHandler()
    const res = makeRes()
    await handle({ body: 'not-an-object' }, res)
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: expect.stringMatching(/JSON object/) })
  })

  it('rejects missing doc', async () => {
    const handle = createAnimationRenderHandler()
    const res = makeRes()
    await handle({ body: {} }, res)
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: expect.stringMatching(/doc/) })
  })

  it('rejects unknown format', async () => {
    const handle = createAnimationRenderHandler()
    const res = makeRes()
    await handle({ body: { ...validBody, options: { format: 'webm' } } }, res)
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: expect.stringMatching(/lottie/) })
  })

  it('returns 202 + job snapshot on success', async () => {
    configureAnimationRenderer()
    const handle = createAnimationRenderHandler()
    const res = makeRes()
    await handle({ body: validBody }, res)
    expect(res.status).toBe(202)
    const body = res.jsonBody as { id: string; status: string; format: string; totalFrames: number }
    expect(body.id).toMatch(/^anim-/)
    expect(body.format).toBe('lottie')
    expect(body.totalFrames).toBe(10)
  })

  it('runs the validate hook and bubbles its error to 400', async () => {
    configureAnimationRenderer()
    const handle = createAnimationRenderHandler({
      validate: () => {
        throw new Error('Layer count exceeds tier limit')
      },
    })
    const res = makeRes()
    await handle({ body: validBody }, res)
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Layer count exceeds tier limit' })
  })
})

describe('createAnimationStatusHandler', () => {
  it('returns 400 when id is missing', async () => {
    const handle = createAnimationStatusHandler()
    const res = makeRes()
    await handle({ params: {} }, res)
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown job ids', async () => {
    configureAnimationRenderer()
    const handle = createAnimationStatusHandler()
    const res = makeRes()
    await handle({ params: { id: 'never-was' } }, res)
    expect(res.status).toBe(404)
  })

  it('returns 200 + snapshot when the job exists', async () => {
    configureAnimationRenderer()
    const submit = createAnimationRenderHandler()
    const status = createAnimationStatusHandler()

    const submitRes = makeRes()
    await submit(
      { body: { ...validBody, options: { ...validBody.options, jobId: 'fixed' } } },
      submitRes,
    )

    // Wait for completion before polling — the renderer for lottie is
    // synchronous-ish on the microtask queue.
    await new Promise((r) => setTimeout(r, 5))

    const statusRes = makeRes()
    await status({ params: { id: 'fixed' } }, statusRes)
    expect(statusRes.status).toBe(200)
    const body = statusRes.jsonBody as { id: string; status: string }
    expect(body.id).toBe('fixed')
    expect(body.status).toBe('complete')
  })
})

describe('createAnimationCancelHandler', () => {
  it('returns 404 when the job does not exist', async () => {
    configureAnimationRenderer()
    const handle = createAnimationCancelHandler()
    const res = makeRes()
    await handle({ params: { id: 'nope' } }, res)
    expect(res.status).toBe(404)
  })

  it('returns 409 if the job has already finished', async () => {
    configureAnimationRenderer()
    const submit = createAnimationRenderHandler()
    await submit(
      { body: { ...validBody, options: { ...validBody.options, jobId: 'finished' } } },
      makeRes(),
    )
    await new Promise((r) => setTimeout(r, 5))

    const handle = createAnimationCancelHandler()
    const res = makeRes()
    await handle({ params: { id: 'finished' } }, res)
    expect(res.status).toBe(409)
  })

  it('cancels a running job and returns 200', async () => {
    let resolveFrame: ((v: { buffer: Buffer }) => void) | undefined
    const slow = new Promise<{ buffer: Buffer }>((res) => {
      resolveFrame = res
    })
    configureAnimationRenderer({
      canvas: { renderFrame: vi.fn(() => slow) },
      ffmpeg: {
        encodeMp4: vi.fn(async () => Buffer.from([0])),
        encodeGif: vi.fn(async () => Buffer.from([0])),
      },
    })
    const submit = createAnimationRenderHandler()
    const submitRes = makeRes()
    await submit(
      {
        body: {
          doc: validBody.doc,
          options: { format: 'mp4', jobId: 'cancel-me' },
        },
      },
      submitRes,
    )
    await Promise.resolve()

    const cancel = createAnimationCancelHandler()
    const cancelRes = makeRes()
    await cancel({ params: { id: 'cancel-me' } }, cancelRes)
    expect(cancelRes.status).toBe(200)
    expect(cancelRes.jsonBody).toEqual({ id: 'cancel-me', status: 'cancelled' })

    resolveFrame?.({ buffer: Buffer.from([0]) })
  })
})
