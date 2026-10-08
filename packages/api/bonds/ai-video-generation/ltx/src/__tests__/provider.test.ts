import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createProvider,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_RESOLUTION,
  LTX_CAMERA_MOTIONS,
  LTX_MODELS,
  LtxVideoError,
  provider,
} from '../provider.js'
import { aiVideoGenerationLtxSecretDefinitions } from '../secrets.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

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

/** Returns the [url, init] of the nth fetch call. */
function call(n = 0): [string, RequestInit] {
  return mockFetch.mock.calls[n] as [string, RequestInit]
}

/** Parses the JSON body of the nth fetch call. */
function jsonBody(n = 0): Record<string, unknown> {
  return JSON.parse(call(n)[1].body as string) as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LtxVideoGenerationProvider', () => {
  const envKeys = ['LTXV_API_KEY', 'LTX_MODEL', 'LTX_BASE_URL'] as const
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

  const bond = createProvider({ apiKey: 'ltx-key' })

  // =========================================================================
  // generate()
  // =========================================================================

  describe('generate()', () => {
    it('POSTs the V2 text-to-video body with automatic duration (null) on 2.5', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({ id: 'job-1', created_at: '2026-10-08T12:00:00Z' }),
      )

      const job = await bond.generate({
        prompt: 'A majestic eagle soaring through clouds at sunset',
      })

      expect(job).toEqual({
        id: `ltx/text-to-video/${DEFAULT_MODEL}/job-1`,
        model: DEFAULT_MODEL,
        createdAt: '2026-10-08T12:00:00Z',
      })
      const [url, init] = call()
      expect(url).toBe(`${DEFAULT_BASE_URL}/v2/text-to-video`)
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({
        Authorization: 'Bearer ltx-key',
        'Content-Type': 'application/json',
      })
      expect(jsonBody()).toEqual({
        prompt: 'A majestic eagle soaring through clouds at sunset',
        model: DEFAULT_MODEL,
        duration: null,
        resolution: DEFAULT_RESOLUTION,
      })
    })

    it('rounds and forwards an explicit duration plus fps, audio and camera motion', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'job-2' }))
      await bond.generate({
        prompt: 'p',
        model: 'ltx-2-5-pro',
        durationSeconds: 7.6,
        resolution: '1080x1920',
        fps: 25,
        generateAudio: false,
        cameraMotion: 'dolly_in',
      })
      expect(jsonBody()).toEqual({
        prompt: 'p',
        model: 'ltx-2-5-pro',
        duration: 8,
        resolution: '1080x1920',
        fps: 25,
        generate_audio: false,
        camera_motion: 'dolly_in',
      })
    })

    it('builds resolution from width/height and rejects a malformed one', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'j' }))
      await bond.generate({ prompt: 'p', width: 1920, height: 1080 })
      expect(jsonBody().resolution).toBe('1920x1080')

      await expect(bond.generate({ prompt: 'p', resolution: '1080p' })).rejects.toThrow(
        /"WxH" string/,
      )
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('refuses an unknown model or camera motion before any request', async () => {
      await expect(bond.generate({ prompt: 'p', model: 'ltx-3-fast' })).rejects.toMatchObject({
        name: 'LtxVideoError',
        status: 400,
      })
      await expect(
        bond.generate({ prompt: 'p', cameraMotion: 'pan_left' as never }),
      ).rejects.toThrow(/cameraMotion.*must be one of/)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('requires durationSeconds on the 2.3 tiers (no automatic duration there)', async () => {
      await expect(bond.generate({ prompt: 'p', model: 'ltx-2-3-fast' })).rejects.toThrow(
        /durationSeconds.*ltx-2-3-fast/,
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('passes an image URI straight through to image-to-video', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'job-3' }))
      const job = await bond.generate({ prompt: 'p', image: 'https://cdn.example.com/first.png' })
      expect(call()[0]).toBe(`${DEFAULT_BASE_URL}/v2/image-to-video`)
      expect(jsonBody().image_uri).toBe('https://cdn.example.com/first.png')
      expect(job.id).toBe(`ltx/image-to-video/${DEFAULT_MODEL}/job-3`)
    })

    it('uploads raw first-frame bytes through /v1/upload and sends the storage URI', async () => {
      mockFetch.mockImplementation(async (url: string | URL) => {
        const u = url.toString()
        if (u === 'https://api.ltx.io/v1/upload') {
          return mockJsonResponse({
            upload_url: 'https://storage.googleapis.com/ltx-uploads/u1?sig=abc',
            storage_uri: 'ltx://uploads/u1',
            required_headers: { 'x-goog-if-generation-match': '0' },
          })
        }
        if (u.startsWith('https://storage.googleapis.com/')) return mockJsonResponse({})
        return mockJsonResponse({ id: 'job-4' })
      })

      const job = await bond.generate({ prompt: 'p', image: PNG })

      // Step 1: the upload ticket — auth only, no body.
      const [ticketUrl, ticketInit] = call(0)
      expect(ticketUrl).toBe(`${DEFAULT_BASE_URL}/v1/upload`)
      expect(ticketInit.method).toBe('POST')
      expect(ticketInit.headers).toEqual({ Authorization: 'Bearer ltx-key' })
      expect(ticketInit.body).toBeUndefined()
      // Step 2: the pre-signed PUT — required headers + content type, no Bearer.
      const [putUrl, putInit] = call(1)
      expect(putUrl).toBe('https://storage.googleapis.com/ltx-uploads/u1?sig=abc')
      expect(putInit.method).toBe('PUT')
      expect(putInit.headers).toEqual({
        'x-goog-if-generation-match': '0',
        'Content-Type': 'image/png',
      })
      expect(Buffer.from(putInit.body as Uint8Array)).toEqual(PNG)
      // Step 3: the submit carries the storage URI.
      expect(call(2)[0]).toBe(`${DEFAULT_BASE_URL}/v2/image-to-video`)
      expect(jsonBody(2).image_uri).toBe('ltx://uploads/u1')
      expect(job.id).toBe(`ltx/image-to-video/${DEFAULT_MODEL}/job-4`)
    })

    it('throws when the upload ticket is malformed', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({}))
      await expect(bond.generate({ prompt: 'p', image: PNG })).rejects.toMatchObject({
        name: 'LtxVideoError',
        status: 502,
      })
    })

    it('throws on a submit response with no id', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ created_at: '2026-10-08T12:00:00Z' }))
      await expect(bond.generate({ prompt: 'p' })).rejects.toMatchObject({ status: 502 })
    })
  })

  // =========================================================================
  // getStatus()
  // =========================================================================

  describe('getStatus()', () => {
    const jobId = 'ltx/text-to-video/ltx-2-5-fast/job-9'

    it('GETs the encoded poll path and normalizes pending', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({ id: 'job-9', status: 'pending', created_at: '2026-10-08T12:00:00Z' }),
      )
      const status = await bond.getStatus(jobId)
      expect(status).toEqual({
        id: jobId,
        status: 'pending',
        model: 'ltx-2-5-fast',
        createdAt: '2026-10-08T12:00:00Z',
      })
      const [url, init] = call()
      expect(url).toBe(`${DEFAULT_BASE_URL}/v2/text-to-video/job-9`)
      expect(init.method).toBe('GET')
      expect(init.headers).toEqual({ Authorization: 'Bearer ltx-key' })
    })

    it('maps a completed job to the result URL', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({
          id: 'job-9',
          status: 'completed',
          completed_at: '2026-10-08T12:01:00Z',
          result: { video_url: 'https://outputs.ltx.video/job-9.mp4' },
        }),
      )
      const status = await bond.getStatus(jobId)
      expect(status.status).toBe('completed')
      expect(status.completedAt).toBe('2026-10-08T12:01:00Z')
      expect(status.result).toEqual({
        url: 'https://outputs.ltx.video/job-9.mp4',
        mimeType: 'video/mp4',
      })
    })

    it('carries a failed job error, including content-filter types', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({
          id: 'job-9',
          status: 'failed',
          error: { type: 'content_filtered_error', message: 'Prompt rejected by safety filter' },
        }),
      )
      const status = await bond.getStatus(jobId)
      expect(status.status).toBe('failed')
      expect(status.error).toEqual({
        type: 'content_filtered_error',
        message: 'Prompt rejected by safety filter',
      })
    })

    it('throws on an unrecognized status word instead of polling forever', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'job-9', status: 'expired' }))
      await expect(bond.getStatus(jobId)).rejects.toThrow(/unrecognized job status "expired"/)
    })

    it('rejects a job id this bond did not issue', async () => {
      await expect(bond.getStatus('job-9')).rejects.toMatchObject({
        name: 'LtxVideoError',
        status: 400,
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('keeps API ids intact even when they contain slashes', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'a/b', status: 'processing' }))
      const status = await bond.getStatus('ltx/image-to-video/ltx-2-5-pro/a/b')
      expect(call()[0]).toBe(`${DEFAULT_BASE_URL}/v2/image-to-video/a/b`)
      expect(status.model).toBe('ltx-2-5-pro')
    })
  })

  // =========================================================================
  // configuration
  // =========================================================================

  describe('configuration', () => {
    it('throws the tagged config error when no API key is set', async () => {
      const unconfigured = createProvider()
      await expect(unconfigured.generate({ prompt: 'p' })).rejects.toMatchObject({
        statusCode: 503,
        errorKey: 'config.notConfigured',
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('reads env vars lazily, on each call, including the base-URL override', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ id: 'env-1' }))
      process.env.LTXV_API_KEY = 'env-key'
      process.env.LTX_MODEL = 'ltx-2-3-pro'
      process.env.LTX_BASE_URL = 'https://broker.example/'

      const job = await provider.generate({ prompt: 'p', durationSeconds: 6 })

      const [url, init] = call()
      expect(url).toBe('https://broker.example/v2/text-to-video')
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer env-key')
      expect(jsonBody()).toMatchObject({ model: 'ltx-2-3-pro', duration: 6 })
      expect(job.model).toBe('ltx-2-3-pro')
    })

    it('exposes a typed provider object', () => {
      expect(provider.name).toBe('ltx')
      expect(typeof provider.generate).toBe('function')
      expect(typeof provider.getStatus).toBe('function')
      expect(provider.upscale).toBeUndefined()
    })
  })

  // =========================================================================
  // errors
  // =========================================================================

  describe('errors', () => {
    it('throws LtxVideoError with status and the error type on a 402', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          402,
          JSON.stringify({
            type: 'error',
            error: { type: 'insufficient_funds_error', message: 'Not enough credits' },
          }),
        ),
      )
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(LtxVideoError)
      expect(error).toMatchObject({ status: 402, code: 'insufficient_funds_error' })
      expect(error.message).toContain('Not enough credits')
      expect(error).not.toHaveProperty('statusCode')
      expect(error).not.toHaveProperty('errorKey')
    })

    it('carries the raw body on a non-JSON 503 and does not retry', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(503, 'temporarily unavailable'))
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as LtxVideoError
      expect(error.status).toBe(503)
      expect(error.code).toBeUndefined()
      expect(error.message).toContain('temporarily unavailable')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('wraps a network failure with status 0', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'))
      await expect(bond.generate({ prompt: 'p' })).rejects.toMatchObject({
        name: 'LtxVideoError',
        status: 0,
      })
    })
  })
})

describe('ltx constants and secrets', () => {
  it('lists the documented models, camera motions and defaults', () => {
    expect(LTX_MODELS).toEqual(['ltx-2-3-fast', 'ltx-2-3-pro', 'ltx-2-5-fast', 'ltx-2-5-pro'])
    expect(LTX_CAMERA_MOTIONS).toHaveLength(8)
    expect(DEFAULT_BASE_URL).toBe('https://api.ltx.io')
    expect(DEFAULT_MODEL).toBe('ltx-2-5-fast')
    expect(DEFAULT_RESOLUTION).toBe('1280x720')
  })

  it('registers its secrets with only the API key required', () => {
    expect(aiVideoGenerationLtxSecretDefinitions.map((d) => [d.key, d.required])).toEqual([
      ['LTXV_API_KEY', true],
      ['LTX_MODEL', false],
      ['LTX_BASE_URL', false],
    ])
  })
})
