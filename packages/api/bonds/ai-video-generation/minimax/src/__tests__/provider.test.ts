import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createProvider,
  DEFAULT_BASE_URL,
  DEFAULT_DURATION_SECONDS,
  DEFAULT_MODEL,
  DEFAULT_RATIO,
  DEFAULT_RESOLUTION,
  DEFAULT_TIMEOUT_MS,
  MINIMAX_VIDEO_MODELS,
  MINIMAX_VIDEO_RATIOS,
  MINIMAX_VIDEO_RESOLUTIONS,
  MinimaxVideoError,
  provider,
} from '../provider.js'
import { aiVideoGenerationMinimaxSecretDefinitions } from '../secrets.js'

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

describe('MinimaxVideoGenerationProvider', () => {
  const envKeys = ['MINIMAX_API_KEY', 'MINIMAX_BASE_URL', 'MINIMAX_VIDEO_MODEL'] as const
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

  const bond = createProvider({ apiKey: 'minimax-key' })

  // =========================================================================
  // generate()
  // =========================================================================

  describe('generate()', () => {
    it('POSTs the documented text-to-video body and returns the task id as the job id', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task_id: '424010985738629' }))

      const job = await bond.generate({
        prompt: 'A boy playing basketball by the sea',
        resolution: '2560x1440',
        durationSeconds: 5,
      })

      expect(job).toEqual({ id: '424010985738629', model: DEFAULT_MODEL })
      const [url, init] = call()
      expect(url).toBe(`${DEFAULT_BASE_URL}/v2/video_generation`)
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({
        Authorization: 'Bearer minimax-key',
        'Content-Type': 'application/json',
      })
      expect(jsonBody()).toEqual({
        model: 'MiniMax-H3',
        content: [{ type: 'text', text: 'A boy playing basketball by the sea' }],
        duration: 5,
        resolution: '2K',
        ratio: '16:9',
      })
    })

    it('sends the bond defaults (5 s, 768P, 16:9) when the caller sets nothing', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task_id: '1' }))
      await bond.generate({ prompt: 'p' })
      expect(jsonBody()).toEqual({
        model: DEFAULT_MODEL,
        content: [{ type: 'text', text: 'p' }],
        duration: DEFAULT_DURATION_SECONDS,
        resolution: DEFAULT_RESOLUTION,
        ratio: DEFAULT_RATIO,
      })
    })

    it('snaps width/height and resolution strings to buckets and concrete ratios', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task_id: '1' }))
      await bond.generate({ prompt: 'p', width: 1920, height: 1080 })
      expect(jsonBody()).toMatchObject({ resolution: '768P', ratio: '16:9' })

      await bond.generate({ prompt: 'p', width: 1080, height: 1920 })
      expect(jsonBody(1)).toMatchObject({ resolution: '768P', ratio: '9:16' })

      await bond.generate({ prompt: 'p', width: 854, height: 480, model: 'MiniMax-H3-Lite' })
      expect(jsonBody(2)).toMatchObject({ resolution: '480P', ratio: '16:9' })

      await bond.generate({ prompt: 'p', width: 3840, height: 1600 })
      expect(jsonBody(3)).toMatchObject({ resolution: '2K', ratio: '21:9' })

      await bond.generate({ prompt: 'p', width: 1440, height: 1440 })
      expect(jsonBody(4)).toMatchObject({ resolution: '2K', ratio: '1:1' })
    })

    it('rejects a malformed or non-finite resolution/dimension before any request', async () => {
      await expect(bond.generate({ prompt: 'p', resolution: '1080p' })).rejects.toThrow(
        /"WxH" string/,
      )
      await expect(bond.generate({ prompt: 'p', width: Number.NaN, height: 1080 })).rejects.toThrow(
        /finite pixel counts/,
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rounds an explicit duration and rejects out-of-range or non-finite ones', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task_id: '1' }))
      await bond.generate({ prompt: 'p', durationSeconds: 7.6 })
      expect(jsonBody().duration).toBe(8)

      await expect(bond.generate({ prompt: 'p', durationSeconds: 3 })).rejects.toMatchObject({
        name: 'MinimaxVideoError',
        status: 400,
      })
      await expect(bond.generate({ prompt: 'p', durationSeconds: 16 })).rejects.toThrow(/4-15/)
      // 4 s is valid on every tier EXCEPT H3-Max, which starts at 5.
      await expect(
        bond.generate({ prompt: 'p', model: 'MiniMax-H3-Max', durationSeconds: 4 }),
      ).rejects.toThrow(/5-15 for MiniMax-H3-Max/)
      await expect(bond.generate({ prompt: 'p', durationSeconds: Number.NaN })).rejects.toThrow(
        /finite number of seconds/,
      )
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('rejects an unknown model, 2K off base H3 and 480P on base H3', async () => {
      await expect(bond.generate({ prompt: 'p', model: 'MiniMax-H3-Pro' })).rejects.toThrow(
        /"model" must be one of/,
      )
      await expect(
        bond.generate({ prompt: 'p', model: 'MiniMax-H3-Highspeed', width: 3840, height: 2160 }),
      ).rejects.toThrow(/2K is only available on MiniMax-H3/)
      await expect(bond.generate({ prompt: 'p', width: 854, height: 480 })).rejects.toThrow(
        /480P is not available on MiniMax-H3/,
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sends an image as a first_frame content item with the adaptive ratio', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task_id: '2' }))
      await bond.generate({
        prompt: 'p',
        image: 'https://cdn.example.com/first.png',
        width: 1920,
        height: 1080,
      })
      expect(call()[0]).toBe(`${DEFAULT_BASE_URL}/v2/video_generation`)
      const content = jsonBody().content as Array<Record<string, unknown>>
      expect(content).toEqual([
        { type: 'text', text: 'p' },
        {
          type: 'image_url',
          image_url: { url: 'https://cdn.example.com/first.png' },
          role: 'first_frame',
        },
      ])
      expect(jsonBody().ratio).toBe('adaptive')
    })

    it('wraps raw first-frame bytes in a data: URI and passes mm_file: through', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task_id: '3' }))
      await bond.generate({ prompt: 'p', image: PNG })
      await bond.generate({ prompt: 'p', image: 'mm_file://file-9' })
      const first = (jsonBody(0).content as Array<Record<string, { url: string }>>)[1]
      expect(first.image_url.url).toBe(`data:image/png;base64,${PNG.toString('base64')}`)
      const second = (jsonBody(1).content as Array<Record<string, { url: string }>>)[1]
      expect(second.image_url.url).toBe('mm_file://file-9')
    })

    it('refuses image-to-video on MiniMax-H3-Lite (no adaptive ratio there)', async () => {
      await expect(
        bond.generate({ prompt: 'p', model: 'MiniMax-H3-Lite', image: PNG }),
      ).rejects.toThrow(/cannot do image-to-video/)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('forwards promptExpansionMode as extra only on MiniMax-H3-Max', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task_id: '4' }))
      const max = createProvider({ apiKey: 'k', promptExpansionMode: 'quality' })
      await max.generate({ prompt: 'p', model: 'MiniMax-H3-Max', durationSeconds: 8 })
      expect(jsonBody().extra).toEqual({ prompt_expansion_mode: 'quality' })

      await expect(max.generate({ prompt: 'p' })).rejects.toThrow(/only MiniMax-H3-Max accepts/)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('does not forward seed/steps/guidanceScale/negativePrompt/fps/generateAudio', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task_id: '5' }))
      await bond.generate({
        prompt: 'p',
        seed: 42,
        steps: 30,
        guidanceScale: 7.5,
        negativePrompt: 'blurry',
        fps: 30,
        generateAudio: false,
      })
      expect(jsonBody()).toEqual({
        model: DEFAULT_MODEL,
        content: [{ type: 'text', text: 'p' }],
        duration: DEFAULT_DURATION_SECONDS,
        resolution: DEFAULT_RESOLUTION,
        ratio: DEFAULT_RATIO,
      })
    })

    it('throws when the submit response carries no task_id', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({ base_resp: { status_code: 1004, status_msg: 'invalid model' } }),
      )
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(MinimaxVideoError)
      expect(error).toMatchObject({ status: 502 })
      expect(error.message).toContain('invalid model')
    })

    it('refuses to mint a job id getStatus() could never poll back', async () => {
      // generate() is the only place job ids are minted, so the shape guard
      // getStatus() enforces must hold THERE: an upstream id carrying a
      // query, fragment, dot segment (literal or percent-encoded) or empty
      // segment would otherwise spend the credits and hand back a job id
      // every later getStatus() rejects as "not a valid MiniMax task id".
      for (const taskId of [
        '424010985738629?redirect=/v1/chat/completions',
        '424010985738629#fragment',
        '424010985738629//extra',
        'a/../../v1/chat/completions',
        '424010985738629/%2e%2e',
        '%2E%2E',
        '.',
      ]) {
        mockFetch.mockResolvedValue(mockJsonResponse({ task_id: taskId }))
        await expect(bond.generate({ prompt: 'p' })).rejects.toMatchObject({
          name: 'MinimaxVideoError',
          status: 502,
        })
      }
      // A slash-carrying id is fine — getStatus() re-encodes each segment.
      mockFetch.mockResolvedValue(mockJsonResponse({ task_id: 'a/b' }))
      const job = await bond.generate({ prompt: 'p' })
      expect(job.id).toBe('a/b')
    })
  })

  // =========================================================================
  // getStatus()
  // =========================================================================

  describe('getStatus()', () => {
    it('GETs the encoded query path and normalizes queued/running', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({
          task: {
            id: '424010985738629',
            model: 'MiniMax-H3',
            status: 'queued',
            created_at: 1785125529,
          },
        }),
      )
      const status = await bond.getStatus('424010985738629')
      expect(status).toEqual({
        id: '424010985738629',
        status: 'pending',
        model: 'MiniMax-H3',
        createdAt: '2026-07-27T04:12:09.000Z',
      })
      const [url, init] = call()
      expect(url).toBe(`${DEFAULT_BASE_URL}/v2/query/video_generation/424010985738629`)
      expect(init.method).toBe('GET')
      expect(init.headers).toEqual({ Authorization: 'Bearer minimax-key' })
    })

    it('maps running to processing', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task: { id: '1', status: 'running' } }))
      const status = await bond.getStatus('1')
      expect(status.status).toBe('processing')
    })

    it('maps a succeeded task to the result URL, mime type and duration', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({
          task: {
            id: '424010985738629',
            model: 'MiniMax-H3',
            status: 'succeeded',
            created_at: 1785125529,
            updated_at: 1785125946,
            content: { url: 'https://video-product.cdn.minimax.io/out/output.mp4' },
            resolution: '2K',
            duration: 5,
            ratio: '16:9',
          },
        }),
      )
      const status = await bond.getStatus('424010985738629')
      expect(status.status).toBe('completed')
      expect(status.completedAt).toBe('2026-07-27T04:19:06.000Z')
      expect(status.result).toEqual({
        url: 'https://video-product.cdn.minimax.io/out/output.mp4',
        mimeType: 'video/mp4',
        durationSeconds: 5,
      })
    })

    it('fails a succeeded task that carries no content.url, instead of completing empty', async () => {
      // The URL is never re-delivered outside a fresh query: a silent
      // `completed` with no `url` would end every poll loop with no video and
      // no error.
      mockFetch.mockResolvedValue(
        mockJsonResponse({ task: { id: '1', status: 'succeeded', content: {} } }),
      )
      await expect(bond.getStatus('1')).rejects.toMatchObject({
        name: 'MinimaxVideoError',
        status: 502,
      })
    })

    it('carries a failed task error, including the content-filter code', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({
          task: {
            id: '1',
            status: 'failed',
            error: { code: '1026', message: 'video description contains sensitive content' },
          },
        }),
      )
      const status = await bond.getStatus('1')
      expect(status.status).toBe('failed')
      expect(status.error).toEqual({
        type: '1026',
        message: 'video description contains sensitive content',
      })
    })

    it('maps a cancelled task to failed with a cancelled error', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task: { id: '1', status: 'cancelled' } }))
      const status = await bond.getStatus('1')
      expect(status.status).toBe('failed')
      expect(status.error).toEqual({
        type: 'cancelled',
        message: 'The MiniMax video task was cancelled.',
      })
    })

    it('throws on an unrecognized status word instead of polling forever', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task: { id: '1', status: 'expired' } }))
      await expect(bond.getStatus('1')).rejects.toThrow(/unrecognized task status "expired"/)
    })

    it('throws when the query response carries no task object', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({}))
      await expect(bond.getStatus('1')).rejects.toMatchObject({ status: 502 })
    })

    it('rejects a job id this bond could never have minted', async () => {
      for (const hostile of [
        '',
        '424010985738629?redirect=/v1/chat/completions',
        '424010985738629#fragment',
        '424010985738629//extra',
        '../../v1/chat/completions',
        '424010985738629/%2e%2e',
        '%2E%2E',
        './424010985738629',
      ]) {
        await expect(bond.getStatus(hostile)).rejects.toMatchObject({
          name: 'MinimaxVideoError',
          status: 400,
        })
      }
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('percent-encodes each tail segment, so shapes the guard cannot enumerate stay literal', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ task: { id: 'x', status: 'running' } }))
      // `job%2f..` is not a dot segment and carries no `?`/`#`, so the guard
      // admits it — but its bytes must be re-encoded on the way out. Sent
      // raw, a decoding server would read this segment as `job/../v1/upload`;
      // sent encoded, it is one inert segment and the GET stays inside the
      // query path.
      await bond.getStatus('job%2f..%2fv1%2fchat')
      expect(call()[0]).toBe(
        `${DEFAULT_BASE_URL}/v2/query/video_generation/job%252f..%252fv1%252fchat`,
      )
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
      mockFetch.mockResolvedValue(mockJsonResponse({ task_id: 'env-1' }))
      process.env.MINIMAX_API_KEY = 'env-key'
      process.env.MINIMAX_VIDEO_MODEL = 'MiniMax-H3-Lite'
      process.env.MINIMAX_BASE_URL = 'https://api.minimaxi.com/'

      const job = await provider.generate({ prompt: 'p' })

      const [url, init] = call()
      expect(url).toBe('https://api.minimaxi.com/v2/video_generation')
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer env-key')
      expect(jsonBody()).toMatchObject({ model: 'MiniMax-H3-Lite', resolution: '768P' })
      expect(job.model).toBe('MiniMax-H3-Lite')
    })

    it('exposes a typed provider object', () => {
      expect(provider.name).toBe('minimax')
      // `generate`/`getStatus` are REQUIRED members of the interface, so their
      // presence is already guaranteed by the type annotation on `provider` —
      // a `typeof … === 'function'` check here could never fail. What is worth
      // pinning is the OPTIONAL surface this bond deliberately leaves out.
      expect(provider.upscale).toBeUndefined()
    })
  })

  // =========================================================================
  // errors
  // =========================================================================

  describe('errors', () => {
    it('throws MinimaxVideoError with status and code on a 401', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          401,
          JSON.stringify({ error: { code: 2049, message: 'invalid api key' } }),
        ),
      )
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(MinimaxVideoError)
      expect(error).toMatchObject({ status: 401, code: '2049' })
      expect(error.message).toContain('invalid api key')
      expect(error).not.toHaveProperty('statusCode')
      expect(error).not.toHaveProperty('errorKey')
    })

    it('carries the raw body on a non-JSON 503 and does not retry', async () => {
      // Submitting a task spends money — a retried submit would create a
      // SECOND chargeable task, so no status is retried.
      mockFetch.mockResolvedValue(mockErrorResponse(503, 'temporarily unavailable'))
      const error = (await bond
        .generate({ prompt: 'p' })
        .catch((e: unknown) => e)) as MinimaxVideoError
      expect(error.status).toBe(503)
      expect(error.message).toContain('temporarily unavailable')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('wraps a network failure with status 0', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'))
      await expect(bond.generate({ prompt: 'p' })).rejects.toMatchObject({
        name: 'MinimaxVideoError',
        status: 0,
      })
    })

    it('answers a 2xx with a non-JSON body as a typed error, not a raw SyntaxError', async () => {
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
      const error = (await bond.getStatus('1').catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(MinimaxVideoError)
      expect(error).toMatchObject({ status: 502 })
      expect(error.message).toContain('non-JSON body')
      expect(error.message).toContain('HTTP 200')
    })

    it('answers an error body that dies mid-stream as the typed error, not a raw TypeError', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        headers: new Headers(),
        text: vi.fn().mockRejectedValue(new TypeError('terminated')),
      })
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(MinimaxVideoError)
      expect(error).toMatchObject({ status: 502 })
      expect(error.message).toContain('HTTP 502')
    })
  })
})

describe('minimax video constants and secrets', () => {
  it('lists the documented models, resolutions, ratios and defaults', () => {
    expect(MINIMAX_VIDEO_MODELS).toEqual([
      'MiniMax-H3',
      'MiniMax-H3-Highspeed',
      'MiniMax-H3-Lite',
      'MiniMax-H3-Max',
    ])
    expect(MINIMAX_VIDEO_RESOLUTIONS).toEqual(['480P', '768P', '2K'])
    expect(MINIMAX_VIDEO_RATIOS).toEqual(['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'])
    expect(DEFAULT_BASE_URL).toBe('https://api.minimax.io')
    expect(DEFAULT_MODEL).toBe('MiniMax-H3')
    expect(DEFAULT_DURATION_SECONDS).toBe(5)
    expect(DEFAULT_RESOLUTION).toBe('768P')
    expect(DEFAULT_RATIO).toBe('16:9')
    expect(DEFAULT_TIMEOUT_MS).toBe(120_000)
  })

  it('registers its secrets with only the API key required', () => {
    expect(aiVideoGenerationMinimaxSecretDefinitions.map((d) => [d.key, d.required])).toEqual([
      ['MINIMAX_API_KEY', true],
      ['MINIMAX_BASE_URL', false],
      ['MINIMAX_VIDEO_MODEL', false],
    ])
  })

  it('registers MINIMAX_API_KEY byte-identically to the chat bond', () => {
    // One console key, one host: the chat bond (@molecule/api-ai-minimax)
    // registers the same definition, and the fleet formula requires packages
    // sharing a key to register byte-identical definitions.
    const [definition] = aiVideoGenerationMinimaxSecretDefinitions
    expect(definition).toEqual({
      key: 'MINIMAX_API_KEY',
      description: 'MiniMax API key — Create an interface key in the MiniMax platform user center.',
      helpUrl: 'https://platform.minimax.io/',
      required: true,
    })
  })
})
