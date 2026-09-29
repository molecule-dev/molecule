import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AISpeechProvider, TranscriptionStreamEvent } from '@molecule/api-ai-speech'

import { decodeWav, encodeWav, Pcm16Resampler, resample, samplesToBytes } from '../pcm.js'
import { createProvider, NemoSpeechError, provider as lazyProvider } from '../provider.js'
import { aiSpeechNemoSpeechSecretDefinitions } from '../secrets.js'
import type { RealtimeSocketFactory, RealtimeSocketHandlers } from '../socket.js'
import { segmentsFromWords, speakerLabel } from '../speakers.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

/** A 16 kHz mono WAV with `n` samples. */
function wav(n = 160, rate = 16_000): Uint8Array {
  return encodeWav(new Int16Array(n).fill(1000), rate)
}

/** A successful JSON response. */
function jsonResponse(data: unknown): Record<string, unknown> {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(data) }
}

/** A plain-text response. */
function textResponse(text: string): Record<string, unknown> {
  return { ok: true, status: 200, text: vi.fn().mockResolvedValue(text) }
}

/** An error response. */
function errorResponse(status: number, body: string): Record<string, unknown> {
  return { ok: false, status, text: vi.fn().mockResolvedValue(body) }
}

/**
 * Async iterable over the given chunks.
 *
 * @param parts - The chunks.
 * @yields {Uint8Array} Each chunk.
 */
async function* chunks(...parts: Uint8Array[]): AsyncGenerator<Uint8Array> {
  for (const part of parts) yield part
}

/** A scripted fake socket: records what the bond sends and lets tests drive server events. */
interface FakeSocket {
  url: string
  headers: Record<string, string>
  sent: Array<string | Uint8Array>
  closed: number | undefined
  handlers: RealtimeSocketHandlers
  server(event: Record<string, unknown>): void
}

/**
 * Builds a socket factory whose server replies are computed from what the client sends.
 *
 * @param onSend - Called with each client frame; may emit server events.
 * @returns The factory and a handle to the created socket.
 */
function fakeSocketFactory(
  onSend: (socket: FakeSocket, data: string | Uint8Array) => void,
  greet = true,
): { factory: RealtimeSocketFactory; socket: () => FakeSocket } {
  let created: FakeSocket | undefined
  const factory: RealtimeSocketFactory = (url, headers, handlers) => {
    const socket: FakeSocket = {
      url,
      headers,
      sent: [],
      closed: undefined,
      handlers,
      server: (event) => handlers.onMessage(JSON.stringify(event)),
    }
    created = socket
    queueMicrotask(() => {
      handlers.onOpen()
      if (greet) socket.server({ type: 'session.created' })
    })
    return {
      send: (data) => {
        socket.sent.push(data)
        onSend(socket, data)
      },
      close: (code) => {
        if (socket.closed !== undefined) return
        socket.closed = code ?? 1000
        queueMicrotask(() => handlers.onClose(code ?? 1000, ''))
      },
    }
  }
  return { factory, socket: () => created as FakeSocket }
}

/**
 * Collects every event a stream yields.
 *
 * @param stream - The stream.
 * @returns All events.
 */
async function collect(
  stream: AsyncIterable<TranscriptionStreamEvent>,
): Promise<TranscriptionStreamEvent[]> {
  const out: TranscriptionStreamEvent[] = []
  for await (const event of stream) out.push(event)
  return out
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NemoSpeechProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  const provider = createProvider({ baseUrl: 'http://asr.internal:8080', apiKey: 'k1' })

  describe('transcribe()', () => {
    it('posts a 16 kHz WAV to /v1/audio/transcriptions with bearer auth', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ text: 'hello world' }))

      const result = await provider.transcribe!({ audio: wav(), language: 'en' })

      expect(result).toEqual({ text: 'hello world' })
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('http://asr.internal:8080/v1/audio/transcriptions')
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({ Authorization: 'Bearer k1' })
      const form = init.body as FormData
      expect(form.get('response_format')).toBe('verbose_json')
      expect(form.get('language')).toBe('en')
      expect(form.get('diarization')).toBeNull()
      expect(form.get('model')).toBeNull()
      const file = form.get('file') as File
      expect(file.name).toBe('audio.wav')
      const sent = decodeWav(new Uint8Array(await file.arrayBuffer()))
      expect(sent.sampleRate).toBe(16_000)
    })

    it('resamples a 48 kHz stereo WAV to 16 kHz mono before upload', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ text: 'x' }))
      const stereo = new Uint8Array(44 + 480 * 4)
      stereo.set(encodeWav(new Int16Array(0), 48_000).subarray(0, 44))
      const view = new DataView(stereo.buffer)
      view.setUint16(22, 2, true)
      view.setUint32(40, 480 * 4, true)

      await provider.transcribe!({ audio: stereo, filename: 'memo.wav' })

      const file = (mockFetch.mock.calls[0][1] as RequestInit).body as FormData
      const sent = decodeWav(new Uint8Array(await (file.get('file') as File).arrayBuffer()))
      expect(sent.sampleRate).toBe(16_000)
      expect(sent.channels).toBe(1)
      expect(sent.samples.length).toBe(160)
    })

    it('rejects non-WAV audio instead of passing m4a through', async () => {
      await expect(
        provider.transcribe!({
          audio: new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74]),
          filename: 'memo.m4a',
        }),
      ).rejects.toThrow(/WAV only/)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sends diarization=true and normalizes speakers + builds segments', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          text: 'hi there yes',
          words: [
            { word: 'hi', start: 0, end: 0.3, confidence: 0.9, speaker: 0 },
            { word: 'there', start: 0.3, end: 0.6, confidence: 0.9, speaker: 0 },
            { word: 'yes', start: 1, end: 1.2, confidence: 0.8, speaker: 1 },
          ],
        }),
      )

      const result = await provider.transcribe!({
        audio: wav(),
        diarize: true,
        model: 'nemotron-3.5',
      })

      const form = (mockFetch.mock.calls[0][1] as RequestInit).body as FormData
      expect(form.get('diarization')).toBe('true')
      expect(form.get('model')).toBe('nemotron-3.5')
      expect(result.words).toEqual([
        { word: 'hi', start: 0, end: 0.3, speaker: 'speaker_0' },
        { word: 'there', start: 0.3, end: 0.6, speaker: 'speaker_0' },
        { word: 'yes', start: 1, end: 1.2, speaker: 'speaker_1' },
      ])
      expect(result.segments).toEqual([
        { id: 0, start: 0, end: 0.6, text: 'hi there', speaker: 'speaker_0' },
        { id: 1, start: 1, end: 1.2, text: 'yes', speaker: 'speaker_1' },
      ])
    })

    it('refuses diarize with a non-verbose format and maxSpeakers above 8', async () => {
      await expect(
        provider.transcribe!({ audio: wav(), diarize: true, responseFormat: 'text' }),
      ).rejects.toThrow(/verbose_json/)
      await expect(provider.transcribe!({ audio: wav(), maxSpeakers: 9 })).rejects.toThrow(/8/)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns plain text for text/srt/vtt formats', async () => {
      mockFetch.mockResolvedValue(textResponse('WEBVTT'))
      const result = await provider.transcribe!({ audio: wav(), responseFormat: 'vtt' })
      expect(result).toEqual({ text: 'WEBVTT' })
    })

    it('omits the auth header when no key is configured', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ text: '' }))
      await createProvider({ baseUrl: 'http://h' }).transcribe!({ audio: wav() })
      expect((mockFetch.mock.calls[0][1] as RequestInit).headers).toEqual({})
    })
  })

  describe('diarize()', () => {
    it('posts to /v1/audio/diarizations and normalizes + sorts segments', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          segments: [
            { start: 2, end: 3, speaker: 1 },
            { start: 0.51, end: 1.9, speaker: 0 },
          ],
        }),
      )

      const result = await provider.diarize!({ audio: wav() })

      expect((mockFetch.mock.calls[0] as [string])[0]).toBe(
        'http://asr.internal:8080/v1/audio/diarizations',
      )
      expect(result.segments).toEqual([
        { start: 0.51, end: 1.9, speaker: 'speaker_0' },
        { start: 2, end: 3, speaker: 'speaker_1' },
      ])
    })
  })

  describe('errors', () => {
    it('maps the server error body to NemoSpeechError with status and type', async () => {
      mockFetch.mockResolvedValue(
        errorResponse(
          400,
          JSON.stringify({
            error: { message: 'diarizer not loaded', type: 'invalid_request_error' },
          }),
        ),
      )
      const error = await provider.transcribe!({ audio: wav() }).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(NemoSpeechError)
      expect(error).toMatchObject({
        status: 400,
        code: 'invalid_request_error',
        message: 'NeMo-Speech error: diarizer not loaded',
      })
      expect(error).not.toHaveProperty('statusCode')
    })

    it('uses a short non-JSON body as the message', async () => {
      mockFetch.mockResolvedValue(errorResponse(500, 'boom'))
      await expect(provider.diarize!({ audio: wav() })).rejects.toThrow('NeMo-Speech error: boom')
    })

    it('reports an unreachable server with status 0', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'))
      await expect(provider.transcribe!({ audio: wav() })).rejects.toMatchObject({
        name: 'NemoSpeechError',
        status: 0,
      })
    })
  })

  describe('configuration', () => {
    it('reads NEMO_SPEECH_URL and NEMO_SPEECH_API_KEY per call and strips /v1', async () => {
      const envProvider = createProvider()
      vi.stubEnv('NEMO_SPEECH_URL', 'https://asr.example/v1/')
      vi.stubEnv('NEMO_SPEECH_API_KEY', 'env-key')
      mockFetch.mockResolvedValue(jsonResponse({ text: '' }))

      await envProvider.transcribe!({ audio: wav() })

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://asr.example/v1/audio/transcriptions')
      expect(init.headers).toEqual({ Authorization: 'Bearer env-key' })
    })

    it('defaults to http://127.0.0.1:8080', async () => {
      vi.stubEnv('NEMO_SPEECH_URL', '')
      mockFetch.mockResolvedValue(jsonResponse({ text: '' }))
      await createProvider().transcribe!({ audio: wav() })
      expect((mockFetch.mock.calls[0] as [string])[0]).toBe(
        'http://127.0.0.1:8080/v1/audio/transcriptions',
      )
    })
  })

  describe('transcribeStream()', () => {
    it('waits for session.created, streams 16 kHz PCM, commits, and ends on completed', async () => {
      const { factory, socket } = fakeSocketFactory((s, data) => {
        if (typeof data === 'string' && JSON.parse(data).type === 'input_audio_buffer.commit') {
          s.server({
            type: 'conversation.item.input_audio_transcription.delta',
            delta: 'hel',
          })
          s.server({
            type: 'conversation.item.input_audio_transcription.completed',
            transcript: 'hello',
            words: [{ word: 'hello', start: 0, end: 0.4, speaker: 0 }],
          })
        }
      })
      const streaming = createProvider({
        baseUrl: 'https://asr.internal:8443',
        apiKey: 'k1',
        socketFactory: factory,
      })

      const pcm = samplesToBytes(new Int16Array(4800).fill(100)) // 100 ms at 48 kHz
      const events = await collect(streaming.transcribeStream!(chunks(pcm), { sampleRate: 48_000 }))

      expect(socket().url).toBe('wss://asr.internal:8443/v1/audio/transcriptions/realtime')
      expect(socket().headers).toEqual({ Authorization: 'Bearer k1' })
      const binary = socket().sent.filter((d): d is Uint8Array => d instanceof Uint8Array)
      const total = binary.reduce((n, b) => n + b.length, 0)
      expect(total).toBe(1600 * 2) // resampled to 16 kHz
      expect(socket().sent.at(-1)).toBe(JSON.stringify({ type: 'input_audio_buffer.commit' }))
      expect(events).toEqual([
        { type: 'partial', text: 'hel' },
        {
          type: 'final',
          text: 'hello',
          words: [{ word: 'hello', start: 0, end: 0.4, speaker: 'speaker_0' }],
        },
      ])
      expect(socket().closed).toBe(1000)
      expect(streaming.streamingAppendOnly).toBe(false)
    })

    it('sends a configured session.update verbatim after session.created', async () => {
      const { factory, socket } = fakeSocketFactory((s, data) => {
        if (typeof data === 'string' && JSON.parse(data).type === 'input_audio_buffer.commit') {
          s.server({ type: 'conversation.item.input_audio_transcription.completed', text: 'ok' })
        }
      })
      const streaming = createProvider({
        baseUrl: 'http://h',
        socketFactory: factory,
        sessionUpdate: { session: { custom: true } },
      })

      const events = await collect(streaming.transcribeStream!(chunks(new Uint8Array(320))))

      expect(socket().sent[0]).toBe(
        JSON.stringify({ session: { custom: true }, type: 'session.update' }),
      )
      expect(socket().url).toBe('ws://h/v1/audio/transcriptions/realtime')
      expect(events).toEqual([{ type: 'final', text: 'ok' }])
    })

    it('turns a server error event into an error event and stops', async () => {
      const { factory } = fakeSocketFactory((s) => {
        s.server({ type: 'error', error: { message: 'bad frame' } })
      })
      const streaming = createProvider({ baseUrl: 'http://h', socketFactory: factory })
      const events = await collect(streaming.transcribeStream!(chunks(new Uint8Array(3200))))
      expect(events).toEqual([{ type: 'error', message: 'NeMo-Speech realtime error: bad frame' }])
    })

    it('reports an abnormal close as an error event', async () => {
      const { factory, socket } = fakeSocketFactory(() => undefined, false)
      const streaming = createProvider({ baseUrl: 'http://h', socketFactory: factory })
      const pending = collect(streaming.transcribeStream!(chunks(new Uint8Array(32))))
      await Promise.resolve()
      await Promise.resolve()
      socket().handlers.onClose(1011, 'overloaded')
      expect(await pending).toEqual([
        { type: 'error', message: 'NeMo-Speech realtime connection closed (1011: overloaded)' },
      ])
    })
  })

  it('has the expected name', () => {
    expect(provider.name).toBe('nemo-speech')
  })
})

describe('pcm helpers', () => {
  it('resamples 48 kHz to 16 kHz by a factor of three', () => {
    expect(resample(new Int16Array(480), 48_000, 16_000).length).toBe(160)
  })

  it('streaming resampler carries odd bytes across chunks', () => {
    const r = new Pcm16Resampler(16_000, 16_000)
    const bytes = samplesToBytes(Int16Array.from([1, 2, 3]))
    const a = r.push(bytes.subarray(0, 3))
    const b = r.push(bytes.subarray(3))
    expect(a.length + b.length).toBe(6)
  })
})

describe('speaker helpers', () => {
  it('normalizes integers and numeric strings, keeps other labels', () => {
    expect(speakerLabel(2)).toBe('speaker_2')
    expect(speakerLabel('speaker_1')).toBe('speaker_1')
    expect(speakerLabel('3')).toBe('speaker_3')
    expect(speakerLabel('alice')).toBe('alice')
    expect(speakerLabel(undefined)).toBeUndefined()
  })

  it('builds no segments when no word has a speaker', () => {
    expect(segmentsFromWords([{ word: 'a', start: 0, end: 1 }])).toBeUndefined()
  })
})

describe('secret registration', () => {
  it('registers both keys as optional', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    expect(getSecretDefinition('NEMO_SPEECH_URL')).toBeDefined()
    expect(aiSpeechNemoSpeechSecretDefinitions.every((d) => d.required === false)).toBe(true)
  })
})

describe('provider — lazy singleton export', () => {
  it('is typed as the core AISpeechProvider and wires on first use', () => {
    const typed: AISpeechProvider = lazyProvider
    expect(typed.name).toBe('nemo-speech')
    expect(typeof typed.transcribeStream).toBe('function')
    expect(typeof typed.diarize).toBe('function')
  })
})
