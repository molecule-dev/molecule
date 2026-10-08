import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  framesForDuration,
  isKandinskyDistilled,
  KANDINSKY_6_DEFAULT_SIZE,
  KANDINSKY_6_DISTILL_GUIDANCE_SCALE,
  KANDINSKY_6_DISTILL_STEPS,
  KANDINSKY_6_LITE_DISTILL_MODEL,
  kandinskyDimension,
} from '../kandinsky.js'
import { createProvider, KandinskyVideoError, provider } from '../provider.js'
import { aiVideoGenerationKandinskySecretDefinitions } from '../secrets.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

/** Creates a successful JSON response. */
function mockJsonResponse(body: unknown): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(body),
  }
}

/** Creates a mock error response. */
function mockErrorResponse(status: number, body: string): Record<string, unknown> {
  return {
    ok: false,
    status,
    headers: new Headers(),
    text: vi.fn().mockResolvedValue(body),
  }
}

/** Creates a successful binary response (e.g. the finished MP4). */
function mockBytesResponse(bytes: Uint8Array, type = 'video/mp4'): Record<string, unknown> {
  const ab = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(ab).set(bytes)
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': type }),
    arrayBuffer: vi.fn().mockResolvedValue(ab),
  }
}

/** Returns the [url, init] of the nth fetch call. */
function call(n = 0): [string, RequestInit] {
  return mockFetch.mock.calls[n] as [string, RequestInit]
}

/** Returns the FormData body of the nth fetch call. */
function formBody(n = 0): FormData {
  return call(n)[1].body as FormData
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KandinskyVideoGenerationProvider', () => {
  const envKeys = ['KANDINSKY_BASE_URL', 'KANDINSKY_API_KEY', 'KANDINSKY_MODEL'] as const
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    for (const key of envKeys) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key]
      else process.env[key] = savedEnv[key]
    }
  })

  const bond = createProvider({ baseUrl: 'http://gpu.local:8091' })

  // =========================================================================
  // generate()
  // =========================================================================

  describe('generate()', () => {
    it('POSTs multipart to /v1/videos with the distilled defaults pinned', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({ id: 'video-123', status: 'queued', created_at: 1760000000 }),
      )

      const job = await bond.generate({ prompt: 'Waves on a beach', durationSeconds: 5 })

      expect(job).toEqual({
        id: 'video-123',
        model: KANDINSKY_6_LITE_DISTILL_MODEL,
        createdAt: '2025-10-09T08:53:20.000Z',
      })
      const [url, init] = call()
      expect(url).toBe('http://gpu.local:8091/v1/videos')
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({})
      const form = formBody()
      expect(form.get('model')).toBe(KANDINSKY_6_LITE_DISTILL_MODEL)
      expect(form.get('prompt')).toBe('Waves on a beach')
      expect(form.get('size')).toBe(KANDINSKY_6_DEFAULT_SIZE)
      expect(form.get('num_frames')).toBe('121')
      expect(form.get('num_inference_steps')).toBe(String(KANDINSKY_6_DISTILL_STEPS))
      expect(form.get('guidance_scale')).toBe('1')
      expect(form.has('sample_audio')).toBe(false)
    })

    it('passes explicit diffusion controls through for base checkpoints', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'v2' }))
      await bond.generate({
        prompt: 'p',
        model: 'kandinskylab/Kandinsky-6.0-Pro-5s-Diffusers',
        guidanceScale: 5,
        steps: 50,
        seed: 42,
        negativePrompt: 'blurry',
        fps: 12,
        resolution: '960x544',
        generateAudio: false,
      })
      const form = formBody()
      expect(form.get('guidance_scale')).toBe('5')
      expect(form.get('num_inference_steps')).toBe('50')
      expect(form.get('seed')).toBe('42')
      expect(form.get('negative_prompt')).toBe('blurry')
      expect(form.get('fps')).toBe('12')
      expect(form.get('size')).toBe('960x544')
      expect(form.get('sample_audio')).toBe('false')
    })

    it('keeps an explicit guidanceScale of 1 on a distilled checkpoint', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'v3' }))
      await bond.generate({ prompt: 'p', guidanceScale: 1 })
      expect(formBody().get('guidance_scale')).toBe('1')
    })

    it('refuses a non-1 guidanceScale on a distilled checkpoint before any request', async () => {
      await expect(bond.generate({ prompt: 'p', guidanceScale: 5 })).rejects.toThrow(
        /must run with guidanceScale 1/,
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('snaps width/height to the 16-pixel grid', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'v4' }))
      await bond.generate({ prompt: 'p', width: 481, height: 319 })
      expect(formBody().get('size')).toBe('480x320')
    })

    it('sends the first frame as the input_reference file part', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'v5' }))
      await bond.generate({ prompt: 'Animate this', image: JPEG })
      const file = formBody().get('input_reference') as File
      expect(file).toBeInstanceOf(File)
      expect(file.type).toBe('image/jpeg')
      expect(file.name).toBe('first-frame.jpg')
      expect(Buffer.from(await file.arrayBuffer())).toEqual(JPEG)
    })

    it('does not forward cameraMotion', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'v6' }))
      await bond.generate({ prompt: 'p', cameraMotion: 'dolly_in' })
      expect(formBody().has('camera_motion')).toBe(false)
    })

    it('sends a Bearer token only when an API key is configured', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'v7' }))
      await createProvider({ baseUrl: 'http://gpu.local', apiKey: 'secret' }).generate({
        prompt: 'p',
      })
      expect(call()[1].headers).toEqual({ Authorization: 'Bearer secret' })
    })

    it('throws on a submit response with no id', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ status: 'queued' }))
      await expect(bond.generate({ prompt: 'p' })).rejects.toMatchObject({
        name: 'KandinskyVideoError',
        status: 502,
      })
    })

    it('refuses to mint a handle whose id getStatus() could never poll back', async () => {
      // generate() is the only place handles are minted, so the shape guard
      // getStatus() enforces must hold THERE: an upstream id carrying a dot
      // segment, empty segment, "?" or "#" would otherwise spend the GPU run
      // and hand back a handle every later getStatus() rejects as "not a
      // valid Kandinsky job id" — an un-pollable job whose error blames the
      // caller for passing exactly what generate() returned.
      for (const id of [
        '..',
        '.',
        '%2e%2e',
        '.%2e',
        '%2E',
        'job-9?redirect=/v1/upload',
        'job-9#fragment',
        'job-9//extra',
        'job-9/.',
      ]) {
        mockFetch.mockResolvedValue(mockJsonResponse({ id }))
        await expect(bond.generate({ prompt: 'p' })).rejects.toMatchObject({
          name: 'KandinskyVideoError',
          status: 502,
        })
      }
      // A plain id still round-trips.
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'video-123' }))
      await expect(bond.generate({ prompt: 'p' })).resolves.toMatchObject({ id: 'video-123' })
    })
  })

  // =========================================================================
  // getStatus()
  // =========================================================================

  describe('getStatus()', () => {
    it('GETs /v1/videos/{id} and normalizes queued to pending', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({
          id: 'video-123',
          status: 'queued',
          model: KANDINSKY_6_LITE_DISTILL_MODEL,
          created_at: 1760000000,
        }),
      )
      const status = await bond.getStatus('video-123')
      expect(status).toEqual({
        id: 'video-123',
        status: 'pending',
        model: KANDINSKY_6_LITE_DISTILL_MODEL,
        createdAt: '2025-10-09T08:53:20.000Z',
      })
      const [url, init] = call()
      expect(url).toBe('http://gpu.local:8091/v1/videos/video-123')
      expect(init.method).toBe('GET')
      expect(init.headers).toEqual({})
    })

    it('maps in_progress to processing', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'v', status: 'in_progress' }))
      expect((await bond.getStatus('v')).status).toBe('processing')
    })

    it('points a completed job at the content endpoint with server metadata', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({
          id: 'video-123',
          status: 'completed',
          model: KANDINSKY_6_LITE_DISTILL_MODEL,
          created_at: 1760000000,
          completed_at: 1760000300,
          media_type: 'video/mp4',
          expires_at: 1760003600,
          duration_s: 5.04,
        }),
      )
      const status = await bond.getStatus('video-123')
      expect(status.status).toBe('completed')
      expect(status.completedAt).toBe('2025-10-09T08:58:20.000Z')
      expect(status.result).toEqual({
        url: 'http://gpu.local:8091/v1/videos/video-123/content',
        mimeType: 'video/mp4',
        expiresAt: '2025-10-09T09:53:20.000Z',
        durationSeconds: 5.04,
      })
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('downloads the finished MP4 itself when the server requires an API key', async () => {
      // The content endpoint answers 401 without the Bearer — only this bond
      // holds KANDINSKY_API_KEY, so a bare result.url would be unreachable
      // for the caller. The bytes must arrive inline instead.
      const MP4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70])
      mockFetch
        .mockResolvedValueOnce(
          mockJsonResponse({
            id: 'video-123',
            status: 'completed',
            media_type: 'video/mp4',
            expires_at: 1760003600,
            duration_s: 5.04,
          }),
        )
        .mockResolvedValueOnce(mockBytesResponse(MP4))

      const status = await createProvider({
        baseUrl: 'http://gpu.local:8091',
        apiKey: 'secret',
      }).getStatus('video-123')

      expect(status.status).toBe('completed')
      expect(status.result).toEqual({
        data: Buffer.from(MP4),
        mimeType: 'video/mp4',
        expiresAt: '2025-10-09T09:53:20.000Z',
        durationSeconds: 5.04,
      })
      expect(mockFetch).toHaveBeenCalledTimes(2)
      const [pollUrl, pollInit] = call(0)
      expect(pollUrl).toBe('http://gpu.local:8091/v1/videos/video-123')
      expect((pollInit.headers as Record<string, string>).Authorization).toBe('Bearer secret')
      const [contentUrl, contentInit] = call(1)
      expect(contentUrl).toBe('http://gpu.local:8091/v1/videos/video-123/content')
      expect(contentInit.method).toBe('GET')
      expect((contentInit.headers as Record<string, string>).Authorization).toBe('Bearer secret')
    })

    it('surfaces a download failure on a completed job behind auth instead of a dead URL', async () => {
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ id: 'v', status: 'completed' }))
        .mockResolvedValueOnce(mockErrorResponse(404, 'Not Found'))
      await expect(
        createProvider({ baseUrl: 'http://gpu.local:8091', apiKey: 'secret' }).getStatus('v'),
      ).rejects.toMatchObject({ name: 'KandinskyVideoError', status: 404 })
    })

    it('carries the error payload of a failed job', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({
          id: 'v',
          status: 'failed',
          error: { code: 'OOM', message: 'CUDA out of memory' },
        }),
      )
      const status = await bond.getStatus('v')
      expect(status.status).toBe('failed')
      expect(status.error).toEqual({ type: 'OOM', message: 'CUDA out of memory' })
    })

    it('throws on an unrecognized status word instead of polling forever', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'v', status: 'cancelled' }))
      await expect(bond.getStatus('v')).rejects.toThrow(/unrecognized job status "cancelled"/)
    })

    it('rejects a job id whose shape would traverse or re-shape the poll URL', async () => {
      // The id is interpolated into `/v1/videos/{id}` on an AUTHENTICATED
      // request (the Bearer rides along when an API key is configured), and
      // `encodeURIComponent` does NOT encode `.`: a job id of `..` survives
      // encoding whole and Node's WHATWG URL parser pops the segment —
      // `/v1/videos/..` normalizes to `/v1/` — so the GET lands on another
      // path of the configured host and whatever answers there rides back
      // inside the typed error detail. The percent-encoded spellings matter
      // equally (`%2e%2e`/`.%2e`/`%2e.` normalize exactly like `..`), and
      // `?`/`#` would start a query or fragment. All must be refused before
      // any request leaves the process.
      for (const hostile of [
        '..',
        '.',
        '%2e',
        '%2E%2E',
        '.%2e',
        'job/../v1',
        'job-9?redirect=/v1/upload',
        'job-9#fragment',
        'job-9//extra',
        'job-9/%2e%2e',
      ]) {
        await expect(bond.getStatus(hostile)).rejects.toMatchObject({
          name: 'KandinskyVideoError',
          status: 400,
        })
      }
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('re-polling a finished job behind auth does not download the MP4 again', async () => {
      // A status route that re-polls a completed job (or a reconciliation
      // sweep over finished jobs) must not re-transfer the full video off the
      // GPU box on every call — the bytes are downloaded once per job.
      const MP4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70])
      const authed = createProvider({ baseUrl: 'http://gpu.local:8091', apiKey: 'secret' })
      mockFetch
        .mockResolvedValueOnce(
          mockJsonResponse({ id: 'v', status: 'completed', media_type: 'video/mp4' }),
        )
        .mockResolvedValueOnce(mockBytesResponse(MP4))
        .mockResolvedValueOnce(
          mockJsonResponse({ id: 'v', status: 'completed', media_type: 'video/mp4' }),
        )
        // Would only be fetched if the fix regressed — and its bytes differ,
        // so the result comparison fails too.
        .mockResolvedValueOnce(mockBytesResponse(new Uint8Array([9, 9, 9])))

      const first = await authed.getStatus('v')
      const second = await authed.getStatus('v')

      // Two status polls, ONE content download.
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(second.result).toEqual(first.result)
      expect((second.result!.data as Buffer).equals(Buffer.from(MP4))).toBe(true)
    })

    it('retries a failed download on the next poll instead of poisoning the job', async () => {
      const authed = createProvider({ baseUrl: 'http://gpu.local:8091', apiKey: 'secret' })
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ id: 'v', status: 'completed' }))
        .mockResolvedValueOnce(mockErrorResponse(404, 'Not Found'))
        .mockResolvedValueOnce(mockJsonResponse({ id: 'v', status: 'completed' }))
        .mockResolvedValueOnce(mockBytesResponse(new Uint8Array([5, 6, 7])))

      await expect(authed.getStatus('v')).rejects.toMatchObject({
        name: 'KandinskyVideoError',
        status: 404,
      })
      const status = await authed.getStatus('v')
      expect(status.result?.data).toEqual(Buffer.from([5, 6, 7]))
    })

    it('bounds the download cache — the oldest finished job re-downloads, recent ones do not', async () => {
      // CONTENT_CACHE_MAX is 8: fill it with 9 finished jobs (the 9th evicts
      // job-0), then a re-poll of the newest must not download while a
      // re-poll of the evicted oldest must — a long-lived provider forgets
      // old videos instead of growing without end.
      const authed = createProvider({ baseUrl: 'http://gpu.local:8091', apiKey: 'secret' })
      for (let i = 0; i < 9; i++) {
        mockFetch
          .mockResolvedValueOnce(mockJsonResponse({ id: `job-${i}`, status: 'completed' }))
          .mockResolvedValueOnce(mockBytesResponse(new Uint8Array([i])))
      }
      for (let i = 0; i < 9; i++) await authed.getStatus(`job-${i}`)
      expect(mockFetch).toHaveBeenCalledTimes(18)

      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ id: 'job-8', status: 'completed' }))
        .mockResolvedValueOnce(mockJsonResponse({ id: 'job-0', status: 'completed' }))
        .mockResolvedValueOnce(mockBytesResponse(new Uint8Array([0])))
      await authed.getStatus('job-8')
      expect(mockFetch).toHaveBeenCalledTimes(19) // poll only — cached bytes
      await authed.getStatus('job-0')
      expect(mockFetch).toHaveBeenCalledTimes(21) // poll + re-download
    })
  })

  // =========================================================================
  // configuration
  // =========================================================================

  describe('configuration', () => {
    it('throws the tagged config error when no base URL is set', async () => {
      const unconfigured = createProvider()
      await expect(unconfigured.generate({ prompt: 'p' })).rejects.toMatchObject({
        statusCode: 503,
        errorKey: 'config.notConfigured',
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('reads env vars lazily, on each call', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'env-1' }))
      process.env.KANDINSKY_BASE_URL = 'http://late.example:8000/v1/'
      process.env.KANDINSKY_API_KEY = 'env-key'
      process.env.KANDINSKY_MODEL = 'kandinskylab/Kandinsky-6.0-Pro-5s-Diffusers'

      const job = await provider.generate({ prompt: 'p' })

      const [url, init] = call()
      expect(url).toBe('http://late.example:8000/v1/videos')
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer env-key')
      expect(job.model).toBe('kandinskylab/Kandinsky-6.0-Pro-5s-Diffusers')
    })

    it('exposes a typed provider object', () => {
      expect(provider.name).toBe('kandinsky')
      expect(typeof provider.generate).toBe('function')
      expect(typeof provider.getStatus).toBe('function')
      expect(provider.upscale).toBeUndefined()
    })
  })

  // =========================================================================
  // errors
  // =========================================================================

  describe('errors', () => {
    it('throws KandinskyVideoError with status and code on a 4xx', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(400, JSON.stringify({ error: { message: 'Bad size', code: 400 } })),
      )
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(KandinskyVideoError)
      expect(error).toMatchObject({ status: 400, code: '400' })
      expect(error.message).toContain('Bad size')
      expect(error).not.toHaveProperty('statusCode')
      expect(error).not.toHaveProperty('errorKey')
    })

    it('carries the raw body on a non-JSON 503 and does not retry', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(503, 'Diffusion engine not initialized'))
      const error = (await bond
        .generate({ prompt: 'p' })
        .catch((e: unknown) => e)) as KandinskyVideoError
      expect(error.status).toBe(503)
      expect(error.code).toBeUndefined()
      expect(error.message).toContain('Diffusion engine not initialized')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('wraps a network failure with status 0', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'))
      await expect(bond.generate({ prompt: 'p' })).rejects.toMatchObject({
        name: 'KandinskyVideoError',
        status: 0,
      })
    })

    it('answers a 2xx with a non-JSON body as a typed error, not a raw SyntaxError', async () => {
      // A proxy interstitial (or an empty 204 body) reaches the success path:
      // the promise that failures arrive as KandinskyVideoError carrying a
      // status must hold, or logic keyed on `error.status` never fires.
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi
          .fn()
          .mockRejectedValue(
            new SyntaxError(`Unexpected token '<', "<html>..." is not valid JSON`),
          ),
      })
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(KandinskyVideoError)
      expect(error).toMatchObject({ status: 502 })
      expect(error.message).toContain('non-JSON body')
      expect(error.message).toContain('HTTP 200')
    })

    it('answers an error body that dies mid-stream as the typed error, not a raw TypeError', async () => {
      // The server already answered non-2xx; the connection then resets while
      // the error body streams, so `response.text()` rejects with a raw
      // `TypeError: terminated`. That must not escape — the contract keys on
      // KandinskyVideoError.status.
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        headers: new Headers(),
        text: vi.fn().mockRejectedValue(new TypeError('terminated')),
      })
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(KandinskyVideoError)
      expect(error).toMatchObject({ status: 502 })
      expect(error.message).toContain('HTTP 502')
    })

    it('answers an MP4 download that dies mid-transfer as the typed error, not a raw TypeError', async () => {
      // send() already handed back the 2xx — the transfer itself then resets
      // mid-MP4. The raw `TypeError: terminated` from arrayBuffer() would
      // escape every catch in the download path and break the typed-error
      // contract; it must arrive as a status-0 KandinskyVideoError, like
      // every other transfer failure.
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ id: 'v', status: 'completed' }))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'video/mp4' }),
          arrayBuffer: vi.fn().mockRejectedValue(new TypeError('terminated')),
        })
      await expect(
        createProvider({ baseUrl: 'http://gpu.local:8091', apiKey: 'secret' }).getStatus('v'),
      ).rejects.toMatchObject({ name: 'KandinskyVideoError', status: 0 })
    })
  })
})

describe('kandinsky helpers', () => {
  it('detects distilled checkpoints regardless of case', () => {
    expect(isKandinskyDistilled(KANDINSKY_6_LITE_DISTILL_MODEL)).toBe(true)
    expect(isKandinskyDistilled('kandinskylab/Kandinsky-6.0-Pro-DISTILL-5s-Diffusers')).toBe(true)
    expect(isKandinskyDistilled('kandinskylab/Kandinsky-6.0-Pro-5s-Diffusers')).toBe(false)
  })

  it('computes 4k+1 frame counts from a duration', () => {
    expect(framesForDuration(5, 24)).toBe(121)
    expect(framesForDuration(5.2, 24)).toBe(125)
    expect(framesForDuration(6, 24)).toBe(145)
    expect(framesForDuration(1, 24)).toBe(25)
  })

  it('snaps dimensions to multiples of 16', () => {
    expect(kandinskyDimension(481)).toBe(480)
    expect(kandinskyDimension(100)).toBe(96)
    expect(kandinskyDimension(864)).toBe(864)
    expect(kandinskyDimension(8)).toBe(16)
  })

  it('registers its secrets with only the base URL required', () => {
    expect(aiVideoGenerationKandinskySecretDefinitions.map((d) => [d.key, d.required])).toEqual([
      ['KANDINSKY_BASE_URL', true],
      ['KANDINSKY_API_KEY', false],
      ['KANDINSKY_MODEL', false],
    ])
  })

  it('exposes the distilled pairing constants', () => {
    expect(KANDINSKY_6_DISTILL_STEPS).toBe(10)
    expect(KANDINSKY_6_DISTILL_GUIDANCE_SCALE).toBe(1)
  })
})
