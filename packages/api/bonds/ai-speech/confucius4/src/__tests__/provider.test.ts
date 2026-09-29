import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AISpeechProvider, TranscriptionStreamEvent } from '@molecule/api-ai-speech'

import { encodeWav, samplesToBytes } from '../pcm.js'
import {
  CONFUCIUS4_EOS,
  Confucius4SpeechError,
  createProvider,
  provider as lazyProvider,
} from '../provider.js'
import type { RealtimeSocketFactory, RealtimeSocketHandlers } from '../socket.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A scripted fake socket. */
interface FakeSocket {
  url: string
  sent: Array<string | Uint8Array>
  closed: number | undefined
  handlers: RealtimeSocketHandlers
  reply(text: string, reset?: boolean): void
  serverClose(code: number): void
}

/**
 * Builds a socket factory whose server replies are computed from client frames.
 *
 * @param onSend - Called with each client frame.
 * @returns The factory and the created socket.
 */
function fakeSocketFactory(onSend: (socket: FakeSocket, data: string | Uint8Array) => void): {
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
      reply: (text, reset = false) =>
        handlers.onMessage(
          JSON.stringify({
            status: 'success',
            requestId: 'r',
            msg: { text, reset, asr_cost_ms: 35.4, total_cost_ms: 42.0 },
          }),
        ),
      serverClose: (code) => {
        socket.closed = code
        queueMicrotask(() => handlers.onClose(code, ''))
      },
    }
    created = socket
    queueMicrotask(() => handlers.onOpen())
    return {
      send: (data) => {
        socket.sent.push(data)
        onSend(socket, data)
      },
      close: (code) => {
        if (socket.closed !== undefined) return
        socket.serverClose(code ?? 1000)
      },
    }
  }
  return { factory, socket: () => created as FakeSocket }
}

/** Replies like the real server: an increment per block, a reset, then close on EOS. */
const server = (socket: FakeSocket, data: string | Uint8Array): void => {
  if (data instanceof Uint8Array) socket.reply('字')
  else if (data === CONFUCIUS4_EOS) {
    socket.reply('。', true)
    socket.reply('ok')
    socket.serverClose(1000)
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

describe('Confucius4SpeechProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('transcribeStream()', () => {
    it('sends the header, 160 ms binary blocks and EOS; maps reset to final + turn-end', async () => {
      const { factory, socket } = fakeSocketFactory(server)
      const speech = createProvider({ socketFactory: factory })
      const pcm = samplesToBytes(new Int16Array(2560 * 2)) // 320 ms at 16 kHz

      const events = await collect(speech.transcribeStream!(chunks(pcm)))

      expect(socket().url).toBe('ws://127.0.0.1:8272/asr_stream_api_v1')
      const header = JSON.parse(socket().sent[0] as string) as Record<string, unknown>
      expect(header).toMatchObject({
        channels: 1,
        sample_rate: 16000,
        language: 'zhen',
        use_vad: false,
        secret_key: 'test0102',
        mode: 'slow',
      })
      expect(typeof header.requestId).toBe('string')
      expect(header).not.toHaveProperty('system_prompt')
      const blocks = socket().sent.filter((d): d is Uint8Array => d instanceof Uint8Array)
      expect(blocks.map((b) => b.length)).toEqual([5120, 5120])
      expect(socket().sent.at(-1)).toBe(CONFUCIUS4_EOS)
      expect(events).toEqual([
        { type: 'delta', text: '字' },
        { type: 'delta', text: '字' },
        { type: 'delta', text: '。' },
        { type: 'final', text: '字字。' },
        { type: 'turn-end' },
        { type: 'delta', text: 'ok' },
        { type: 'final', text: 'ok' },
      ])
    })

    it('resamples 48 kHz input to 16 kHz (the server never resamples)', async () => {
      const { factory, socket } = fakeSocketFactory(server)
      const pcm = samplesToBytes(new Int16Array(7680)) // 160 ms at 48 kHz
      await collect(
        createProvider({ socketFactory: factory }).transcribeStream!(chunks(pcm), {
          sampleRate: 48_000,
        }),
      )
      const bytes = socket()
        .sent.filter((d): d is Uint8Array => d instanceof Uint8Array)
        .reduce((n, b) => n + b.length, 0)
      expect(bytes).toBe(5120)
    })

    it('reads URL, key and prompt from env per call; prompt overrides the env prompt', async () => {
      const { factory, socket } = fakeSocketFactory(server)
      const speech = createProvider({ socketFactory: factory, useVad: true, smooth: true })
      vi.stubEnv('CONFUCIUS4_WS_URL', 'ws://gpu:8272/asr_stream_api_v1')
      vi.stubEnv('CONFUCIUS4_SECRET_KEY', 'k2')
      vi.stubEnv('CONFUCIUS4_SYSTEM_PROMPT', 'env hotwords')

      await collect(speech.transcribeStream!(chunks(), { prompt: 'Synthase, molecule.dev' }))

      expect(socket().url).toBe('ws://gpu:8272/asr_stream_api_v1')
      expect(JSON.parse(socket().sent[0] as string)).toMatchObject({
        secret_key: 'k2',
        system_prompt: 'Synthase, molecule.dev',
        use_vad: true,
        smooth: true,
      })
    })

    it('rejects a system_prompt over 4000 characters before connecting', async () => {
      const factory = vi.fn()
      await expect(
        collect(
          createProvider({ socketFactory: factory }).transcribeStream!(chunks(), {
            prompt: 'x'.repeat(4001),
          }),
        ),
      ).rejects.toThrow(/at most 4000/)
      expect(factory).not.toHaveBeenCalled()
    })

    it('reports close 4401 as a rejected secret key', async () => {
      const { factory } = fakeSocketFactory((s, data) => {
        if (typeof data === 'string' && data.startsWith('{')) s.serverClose(4401)
      })
      const events = await collect(
        createProvider({ socketFactory: factory }).transcribeStream!(chunks(new Uint8Array(320))),
      )
      expect(events).toEqual([
        {
          type: 'error',
          message: 'Confucius4 rejected the secret key (close 4401) — check CONFUCIUS4_SECRET_KEY',
        },
      ])
    })

    it('maps status:error to an error event', async () => {
      const { factory } = fakeSocketFactory((s, data) => {
        if (typeof data === 'string' && data.startsWith('{')) {
          s.handlers.onMessage(
            JSON.stringify({ status: 'error', requestId: 'r', msg: 'bad header' }),
          )
        }
      })
      const events = await collect(
        createProvider({ socketFactory: factory }).transcribeStream!(chunks()),
      )
      expect(events).toEqual([{ type: 'error', message: 'Confucius4 error: bad header' }])
    })
  })

  describe('transcribe()', () => {
    it('joins every segment of a WAV', async () => {
      const { factory } = fakeSocketFactory(server)
      const result = await createProvider({ socketFactory: factory }).transcribe!({
        audio: encodeWav(new Int16Array(2560), 16_000),
      })
      expect(result).toEqual({ text: '字。ok' })
    })

    it('throws Confucius4SpeechError carrying the close code', async () => {
      const { factory } = fakeSocketFactory((s, data) => {
        if (typeof data === 'string' && data.startsWith('{')) s.serverClose(4401)
      })
      const error = await createProvider({ socketFactory: factory }).transcribe!({
        audio: encodeWav(new Int16Array(160), 16_000),
      }).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(Confucius4SpeechError)
      expect(error).toMatchObject({ status: 4401 })
    })

    it('rejects non-WAV audio', async () => {
      await expect(
        createProvider().transcribe!({ audio: new Uint8Array(16), filename: 'memo.webm' }),
      ).rejects.toThrow(/WAV only/)
    })
  })

  it('is an append-only provider named confucius4', () => {
    const speech = createProvider()
    expect(speech.name).toBe('confucius4')
    expect(speech.streamingAppendOnly).toBe(true)
  })
})

describe('secret registration', () => {
  it('registers the three keys', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    for (const key of ['CONFUCIUS4_WS_URL', 'CONFUCIUS4_SECRET_KEY', 'CONFUCIUS4_SYSTEM_PROMPT']) {
      expect(getSecretDefinition(key)).toBeDefined()
    }
  })
})

describe('provider — lazy singleton export', () => {
  it('is typed as the core AISpeechProvider and wires on first use', () => {
    const typed: AISpeechProvider = lazyProvider
    expect(typed.name).toBe('confucius4')
    expect(typeof typed.transcribeStream).toBe('function')
  })
})
