/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real `@molecule/api-ai-speech`
 * core. Only the network is mocked: `fetch` returns real `/v1/voices` and
 * `/v1/text-to-speech/{voiceId}` responses.
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

  it('lists voices and synthesizes speech with the chosen voice through the core', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'test-key')
    vi.stubEnv('ELEVENLABS_BASE_URL', undefined)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            voices: [
              { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade' },
              { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'premade' },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([0x49, 0x44, 0x33, 0x04]), {
          status: 200,
          headers: { 'content-type': 'audio/mpeg' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.ELEVENLABS_API_KEY }))

    const speech = requireProvider()
    if (!speech.listVoices || !speech.synthesizeSpeech) throw new Error('TTS not supported')

    const voices = await speech.listVoices()
    const george = voices.find((voice) => voice.name === 'George') ?? voices[0]
    if (!george) throw new Error('No voices available')

    const { audio, contentType } = await speech.synthesizeSpeech({
      text: 'Your order shipped!',
      voiceId: george.voiceId,
      outputFormat: 'mp3_44100_128',
    })

    expect([contentType, audio.byteLength]).toEqual(['audio/mpeg', 4])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [voicesUrl, voicesInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(voicesUrl).toBe('https://api.elevenlabs.io/v1/voices')
    expect((voicesInit.headers as Record<string, string>)['xi-api-key']).toBe('test-key')
    const [ttsUrl, ttsInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(ttsUrl).toBe(
      'https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128',
    )
    expect(JSON.parse(ttsInit.body as string)).toEqual({
      text: 'Your order shipped!',
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    })
  })
})
