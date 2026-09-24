/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real `@molecule/api-ai-speech`
 * core. Only the network is mocked: `fetch` returns real `/v1/audio/speech` and
 * `/v1/audio/transcriptions` responses.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/api-ai-speech'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('synthesizes speech and transcribes it back through the core', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubEnv('OPENAI_BASE_URL', undefined)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([0x49, 0x44, 0x33, 0x04]), {
          status: 200,
          headers: { 'content-type': 'audio/mpeg' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ text: 'Your order shipped!', language: 'english', duration: 1.2 }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.OPENAI_API_KEY }))

    const speech = requireProvider()
    if (!speech.synthesize || !speech.transcribe) throw new Error('Speech not supported')

    const { audio, contentType } = await speech.synthesize({
      input: 'Your order shipped!',
      voice: 'alloy',
      responseFormat: 'mp3',
    })
    expect([contentType, audio.byteLength]).toEqual(['audio/mpeg', 4])

    const { text, language, duration } = await speech.transcribe({ audio, filename: 'reply.mp3' })
    expect([text, language, duration]).toEqual(['Your order shipped!', 'english', 1.2])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [ttsUrl, ttsInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(ttsUrl).toBe('https://api.openai.com/v1/audio/speech')
    expect((ttsInit.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
    expect(JSON.parse(ttsInit.body as string)).toEqual({
      model: 'tts-1',
      input: 'Your order shipped!',
      voice: 'alloy',
      response_format: 'mp3',
      speed: 1,
    })

    const [sttUrl, sttInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(sttUrl).toBe('https://api.openai.com/v1/audio/transcriptions')
    const form = sttInit.body as FormData
    expect(form.get('model')).toBe('whisper-1')
    expect(form.get('response_format')).toBe('verbose_json')
    expect((form.get('file') as File).name).toBe('reply.mp3')
  })
})
