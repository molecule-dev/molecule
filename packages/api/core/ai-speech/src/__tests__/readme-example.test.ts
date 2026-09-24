/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the OpenAI speech bond. Only
 * the network is mocked: `fetch` answers `/v1/audio/speech` with audio bytes
 * and `/v1/audio/transcriptions` with a real verbose_json body.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-ai-speech-openai'

import { requireProvider, setProvider } from '../index.js'

const MP3_BYTES = new Uint8Array([0x49, 0x44, 0x33, 0x04])

/**
 * Serves the two OpenAI audio endpoints the example reaches.
 *
 * @param url - The requested URL.
 * @returns The endpoint's response.
 */
async function upstream(url: string): Promise<Response> {
  if (url.endsWith('/v1/audio/speech')) {
    return new Response(MP3_BYTES, { status: 200, headers: { 'content-type': 'audio/mpeg' } })
  }
  if (url.endsWith('/v1/audio/transcriptions')) {
    return Response.json({ text: 'Your order shipped!', language: 'english', duration: 1.2 })
  }
  return new Response('not found', { status: 404 })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds the OpenAI provider, synthesizes speech and transcribes it back', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const fetchMock = vi.fn(upstream)
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.OPENAI_API_KEY }))

    const speech = requireProvider()
    if (!speech.synthesize || !speech.transcribe) throw new Error('Speech not supported')
    const { audio, contentType } = await speech.synthesize({
      input: 'Your order shipped!',
      voice: 'alloy',
      responseFormat: 'mp3',
    })
    expect(contentType).toBe('audio/mpeg')
    expect(audio.byteLength).toBe(4)
    expect(Array.from(audio)).toEqual(Array.from(MP3_BYTES))

    const { text, duration } = await speech.transcribe({ audio, filename: 'reply.mp3' })
    expect(text).toBe('Your order shipped!')
    expect(duration).toBe(1.2)

    const speechCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(speechCall[1].body as string)).toMatchObject({
      input: 'Your order shipped!',
      voice: 'alloy',
      response_format: 'mp3',
    })
    const sttCall = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    const form = sttCall[1].body as FormData
    expect((form.get('file') as File).name).toBe('reply.mp3')
  })
})
