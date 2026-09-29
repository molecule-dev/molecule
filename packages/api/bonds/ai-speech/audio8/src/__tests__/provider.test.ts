import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AISpeechProvider, TranscriptionStreamEvent } from '@molecule/api-ai-speech'

import { encodeWav, samplesToBytes } from '../pcm.js'
import {
  assertTargetDelay,
  Audio8SpeechError,
  createProvider,
  provider as lazyProvider,
  toAudio8Language,
} from '../provider.js'
import type { RealtimeSocketFactory, RealtimeSocketHandlers } from '../socket.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A scripted fake socket. */
interface FakeSocket {
  url: string
  sent: string[]
  closed: number | undefined
  handlers: RealtimeSocketHandlers
  server(event: Record<string, unknown>): void
}

/**
 * Builds a socket factory whose server replies are computed from client frames.
 *
 * @param onSend - Called with each parsed client frame.
 * @returns The factory and the created socket.
 */
function fakeSocketFactory(onSend: (socket: FakeSocket, frame: Record<string, unknown>) => void): {
  factory: RealtimeSocketFactory
  socket: () => FakeSocket
} {
  let created: FakeSocket | undefined
  const factory: RealtimeSocketFactory = (url, _headers, handlers) => {
    const socket: FakeSocket = {
      url,
      sent: [],
      closed: undefined,
      handlers,
      server: (event) => handlers.onMessage(JSON.stringify(event)),
    }
    created = socket
    queueMicrotask(() => handlers.onOpen())
    return {
      send: (data) => {
        const text = typeof data === 'string' ? data : ''
        socket.sent.push(text)
        onSend(socket, JSON.parse(text) as Record<string, unknown>)
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

/** Replies like the real server: a delta per append, done on the final commit. */
const echoServer = (socket: FakeSocket, frame: Record<string, unknown>): void => {
  if (frame.type === 'input_audio_buffer.append')
    socket.server({ type: 'transcription.delta', delta: '你' })
  if (frame.type === 'input_audio_buffer.commit' && frame.final === true) {
    socket.server({ type: 'transcription.done', text: '你好' })
  }
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

describe('Audio8SpeechProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('transcribeStream()', () => {
    it('sends session.update, opening commit, base64 appends, then final commit', async () => {
      const { factory, socket } = fakeSocketFactory(echoServer)
      const speech = createProvider({
        realtimeUrl: 'ws://gpu:18191/v1/realtime',
        socketFactory: factory,
      })
      const pcm = samplesToBytes(new Int16Array(3200).fill(7)) // 200 ms at 16 kHz

      const events = await collect(speech.transcribeStream!(chunks(pcm), { language: 'zh-CN' }))

      const frames = socket().sent.map((s) => JSON.parse(s) as Record<string, unknown>)
      expect(socket().url).toBe('ws://gpu:18191/v1/realtime')
      expect(frames[0]).toEqual({
        type: 'session.update',
        model: 'audio8-asr-infinite',
        language: 'zh',
        target_delay_ms: 480,
      })
      expect(frames[1]).toEqual({ type: 'input_audio_buffer.commit', final: false })
      const appends = frames.filter((f) => f.type === 'input_audio_buffer.append')
      expect(appends).toHaveLength(2) // two 100 ms blocks
      expect(Buffer.from(appends[0].audio as string, 'base64').length).toBe(3200)
      expect(frames.at(-1)).toEqual({ type: 'input_audio_buffer.commit', final: true })
      expect(events).toEqual([
        { type: 'partial', text: '你' },
        { type: 'partial', text: '你' },
        { type: 'final', text: '你好' },
      ])
      expect(socket().closed).toBe(1000)
    })

    it('resamples 48 kHz input to 16 kHz', async () => {
      const { factory, socket } = fakeSocketFactory(echoServer)
      const speech = createProvider({ socketFactory: factory })
      const pcm = samplesToBytes(new Int16Array(4800)) // 100 ms at 48 kHz

      await collect(speech.transcribeStream!(chunks(pcm), { sampleRate: 48_000 }))

      const bytes = socket()
        .sent.map((s) => JSON.parse(s) as Record<string, unknown>)
        .filter((f) => f.type === 'input_audio_buffer.append')
        .reduce((n, f) => n + Buffer.from(f.audio as string, 'base64').length, 0)
      expect(bytes).toBe(3200)
      expect(socket().url).toBe('ws://127.0.0.1:18191/v1/realtime')
    })

    it('rejects a language other than zh/en before connecting', async () => {
      const factory = vi.fn()
      const speech = createProvider({ socketFactory: factory })
      await expect(collect(speech.transcribeStream!(chunks(), { language: 'fr' }))).rejects.toThrow(
        /Chinese \(zh\) and English \(en\) only/,
      )
      expect(factory).not.toHaveBeenCalled()
    })

    it('reads AUDIO8_TARGET_DELAY_MS and AUDIO8_REALTIME_URL per call and validates the delay', async () => {
      const { factory, socket } = fakeSocketFactory(echoServer)
      const speech = createProvider({ socketFactory: factory })
      vi.stubEnv('AUDIO8_TARGET_DELAY_MS', '320')
      vi.stubEnv('AUDIO8_REALTIME_URL', 'ws://env:18191/v1/realtime')

      await collect(speech.transcribeStream!(chunks(new Uint8Array(320))))

      expect(JSON.parse(socket().sent[0]).target_delay_ms).toBe(320)
      expect(socket().url).toBe('ws://env:18191/v1/realtime')

      vi.stubEnv('AUDIO8_TARGET_DELAY_MS', '500')
      await expect(collect(speech.transcribeStream!(chunks()))).rejects.toThrow(/target delay/)
    })

    it('turns a server error into an error event', async () => {
      const { factory } = fakeSocketFactory((s, frame) => {
        if (frame.type === 'session.update')
          s.server({ type: 'error', message: 'model not loaded' })
      })
      const events = await collect(
        createProvider({ socketFactory: factory }).transcribeStream!(chunks(new Uint8Array(320))),
      )
      expect(events).toEqual([
        { type: 'error', message: 'Audio8 realtime error: model not loaded' },
      ])
    })

    it('reports a close before transcription.done as an error', async () => {
      const { factory } = fakeSocketFactory((s, frame) => {
        if (frame.type === 'input_audio_buffer.commit' && frame.final === true) {
          s.handlers.onClose(1006, '')
        }
      })
      const events = await collect(
        createProvider({ socketFactory: factory }).transcribeStream!(chunks(new Uint8Array(320))),
      )
      expect(events).toEqual([
        {
          type: 'error',
          message: 'Audio8 realtime connection closed before transcription.done (1006)',
        },
      ])
    })

    it('stops and closes the socket when aborted', async () => {
      const { factory, socket } = fakeSocketFactory(() => undefined)
      const controller = new AbortController()
      const never = (async function* (): AsyncGenerator<Uint8Array> {
        yield new Uint8Array(3200)
        await new Promise(() => undefined)
      })()
      const pending = collect(
        createProvider({ socketFactory: factory }).transcribeStream!(never, {
          signal: controller.signal,
        }),
      )
      await new Promise((resolve) => setTimeout(resolve, 5))
      controller.abort()
      expect(await pending).toEqual([])
      expect(socket().closed).toBe(1000)
    })
  })

  describe('transcribe()', () => {
    it('streams a WAV and returns the done text', async () => {
      const { factory } = fakeSocketFactory(echoServer)
      const result = await createProvider({ socketFactory: factory }).transcribe!({
        audio: encodeWav(new Int16Array(1600), 16_000),
        language: 'zh',
      })
      expect(result).toEqual({ text: '你好', language: 'zh' })
    })

    it('throws Audio8SpeechError when the stream fails', async () => {
      const { factory } = fakeSocketFactory((s) => s.server({ type: 'error', message: 'oops' }))
      await expect(
        createProvider({ socketFactory: factory }).transcribe!({
          audio: encodeWav(new Int16Array(160), 16_000),
        }),
      ).rejects.toBeInstanceOf(Audio8SpeechError)
    })

    it('rejects non-WAV audio', async () => {
      await expect(
        createProvider().transcribe!({ audio: new Uint8Array(16), filename: 'memo.m4a' }),
      ).rejects.toThrow(/WAV only/)
    })
  })

  it('validates languages and delays', () => {
    expect(toAudio8Language('en-US', 'zh')).toBe('en')
    expect(toAudio8Language(undefined, 'zh')).toBe('zh')
    expect(assertTargetDelay(240)).toBe(240)
    expect(assertTargetDelay(360)).toBe(360)
    expect(() => assertTargetDelay(200)).toThrow()
    expect(() => assertTargetDelay(600)).toThrow()
  })

  it('is a non-append-only streaming provider named audio8', () => {
    const speech = createProvider()
    expect(speech.name).toBe('audio8')
    expect(speech.streamingAppendOnly).toBe(false)
  })
})

describe('secret registration', () => {
  it('registers AUDIO8_REALTIME_URL', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    expect(getSecretDefinition('AUDIO8_REALTIME_URL')).toBeDefined()
    expect(getSecretDefinition('AUDIO8_TARGET_DELAY_MS')).toBeDefined()
  })
})

describe('provider — lazy singleton export', () => {
  it('is typed as the core AISpeechProvider and wires on first use', () => {
    const typed: AISpeechProvider = lazyProvider
    expect(typed.name).toBe('audio8')
    expect(typeof typed.transcribeStream).toBe('function')
  })
})
