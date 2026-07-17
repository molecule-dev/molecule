/**
 * Unit tests for `@molecule/api-audio-render`.
 *
 * Coverage:
 * - `buildFfmpegArgs` produces the expected argv for single-clip,
 *   multi-clip, multi-channel, and silent sessions.
 * - `sanitizeAudioPath` rejects control characters.
 * - `renderAudio` enqueues a job to the bonded queue and registers a
 *   `RenderJob` in the in-memory store.
 * - `processAudioRenderJob` spawns ffmpeg via the injected `spawn` shim,
 *   transitions job state to `completed`/`failed`, and respects mid-flight
 *   cancellation.
 * - `cancelRender` only mutates non-terminal jobs.
 * - HTTP handlers return correct status codes.
 *
 * The queue is wired to a small in-process mock that mirrors
 * `@molecule/api-testing/mocks/queue` (we don't depend on the testing
 * package — keeping unit tests dependency-light).
 */

import type { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  MessageHandler,
  Queue,
  QueueMessage,
  QueueProvider,
  ReceivedMessage,
  ReceiveOptions,
} from '@molecule/api-queue'
import { setProvider as setQueueProvider } from '@molecule/api-queue'

import { buildFfmpegArgs, sanitizeAudioPath } from '../ffmpegCommand.js'
import { createAudioRenderRoutes } from '../handlers.js'
import type {
  AudioRenderJobPayload,
  AudioRenderRequest,
  AudioRenderResponse,
  AudioSession,
} from '../index.js'
import {
  createInMemoryAudioJobStore,
  getAudioJobStore,
  getJob,
  resetJobStore,
  setAudioJobStore,
} from '../jobStore.js'
import { cancelRender, getRenderStatus, renderAudio } from '../renderAudio.js'
import { describeSpawnFailure, processAudioRenderJob, resolveFfmpegPath } from '../worker.js'

interface MockQueueInstance extends Queue {
  messages: Array<{ id: string; body: unknown }>
}

const createMockQueueInstance = (name: string): MockQueueInstance => {
  const messages: MockQueueInstance['messages'] = []
  const subscribers = new Map<string, MessageHandler<unknown>>()
  return {
    name,
    messages,
    async send<T = unknown>(message: QueueMessage<T>): Promise<string> {
      const id = message.id ?? `mock-${messages.length + 1}`
      messages.push({ id, body: message.body })
      for (const handler of subscribers.values()) {
        const received: ReceivedMessage<T> = {
          id,
          body: message.body,
          receiptHandle: id,
          async ack() {},
        }
        setImmediate(() => handler(received as ReceivedMessage<unknown>))
      }
      return id
    },
    async receive<T = unknown>(_options?: ReceiveOptions): Promise<ReceivedMessage<T>[]> {
      return []
    },
    subscribe<T = unknown>(handler: MessageHandler<T>): () => void {
      const sid = `sub-${subscribers.size + 1}`
      subscribers.set(sid, handler as MessageHandler<unknown>)
      return () => subscribers.delete(sid)
    },
  }
}

const createMockQueueProvider = (): QueueProvider & { queues: Map<string, MockQueueInstance> } => {
  const queues = new Map<string, MockQueueInstance>()
  return {
    queues,
    queue(name: string): Queue {
      let q = queues.get(name)
      if (!q) {
        q = createMockQueueInstance(name)
        queues.set(name, q)
      }
      return q
    },
  }
}

const sampleSession: AudioSession = {
  duration: 8,
  channels: [
    {
      id: 'drums',
      clips: [{ audioUrl: '/tmp/drums.wav', startTime: 0, duration: 8 }],
      volume: 0.9,
    },
    {
      id: 'lead',
      clips: [
        { audioUrl: '/tmp/lead-a.wav', startTime: 2, duration: 4 },
        { audioUrl: '/tmp/lead-b.wav', startTime: 5, duration: 3 },
      ],
      pan: 0.3,
      effects: [{ kind: 'gain', params: { gain: 1.5 } }],
    },
  ],
}

beforeEach(() => {
  setAudioJobStore(undefined) // reset to a fresh in-memory store
  resetJobStore()
  const provider = createMockQueueProvider()
  setQueueProvider(provider)
  ;(globalThis as Record<string, unknown>).__mockQueueProvider = provider
})

const getMockProvider = () =>
  (globalThis as Record<string, unknown>).__mockQueueProvider as ReturnType<
    typeof createMockQueueProvider
  >

describe('sanitizeAudioPath', () => {
  it('accepts plain paths', () => {
    expect(sanitizeAudioPath('/tmp/song.wav', 'audioUrl')).toBe('/tmp/song.wav')
    expect(sanitizeAudioPath('https://cdn.example/track.flac', 'audioUrl')).toBe(
      'https://cdn.example/track.flac',
    )
  })

  it('rejects newlines', () => {
    expect(() => sanitizeAudioPath('/tmp/a\nb', 'audioUrl')).toThrow(/control character/)
  })

  it('rejects NUL', () => {
    expect(() => sanitizeAudioPath('/tmp/a\u0000b', 'audioUrl')).toThrow(/control character/)
  })

  it('rejects empty / non-string', () => {
    expect(() => sanitizeAudioPath('', 'audioUrl')).toThrow(/non-empty/)
    expect(() => sanitizeAudioPath(undefined, 'audioUrl')).toThrow(/non-empty/)
    expect(() => sanitizeAudioPath(42 as unknown as string, 'audioUrl')).toThrow(/non-empty/)
  })
})

describe('buildFfmpegArgs', () => {
  it('builds argv for a single-clip channel', () => {
    const cmd = buildFfmpegArgs(
      {
        duration: 4,
        channels: [{ id: 'a', clips: [{ audioUrl: '/tmp/a.wav', startTime: 0, duration: 4 }] }],
      },
      { format: 'mp3', sampleRate: 44100, channels: 2, bitrate: '192k' },
      '/tmp/out.mp3',
    )
    expect(cmd.args).toContain('-i')
    expect(cmd.args).toContain('/tmp/a.wav')
    expect(cmd.args).toContain('-filter_complex')
    expect(cmd.args).toContain('-c:a')
    expect(cmd.args).toContain('libmp3lame')
    expect(cmd.args).toContain('-b:a')
    expect(cmd.args).toContain('192k')
    expect(cmd.args[cmd.args.length - 1]).toBe('/tmp/out.mp3')
    expect(cmd.filterGraph).toContain('atrim=duration=4')
  })

  it('builds an amix step when multiple channels are present', () => {
    const cmd = buildFfmpegArgs(
      sampleSession,
      { format: 'wav', sampleRate: 48000, channels: 2 },
      '/tmp/out.wav',
    )
    // Three input clips → three -i flags before the lavfi-or-filter section.
    const inputArgs = cmd.args.filter((a) => a === '-i')
    expect(inputArgs.length).toBe(3)
    expect(cmd.filterGraph).toContain('amix=inputs=2')
    expect(cmd.args).toContain('pcm_s16le')
    // -ar / -ac present
    expect(cmd.args).toContain('-ar')
    expect(cmd.args).toContain('48000')
    expect(cmd.args).toContain('-ac')
    expect(cmd.args).toContain('2')
  })

  it('uses anullsrc for an empty session', () => {
    const cmd = buildFfmpegArgs(
      { duration: 5, channels: [] },
      { format: 'flac', sampleRate: 44100, channels: 2 },
      '/tmp/silent.flac',
    )
    expect(cmd.args).toContain('lavfi')
    expect(cmd.args.some((a) => a.startsWith('anullsrc'))).toBe(true)
    expect(cmd.args).toContain('flac')
  })

  it('skips muted channels', () => {
    const cmd = buildFfmpegArgs(
      {
        duration: 4,
        channels: [
          { id: 'a', muted: true, clips: [{ audioUrl: '/tmp/a.wav', startTime: 0, duration: 4 }] },
          { id: 'b', clips: [{ audioUrl: '/tmp/b.wav', startTime: 0, duration: 4 }] },
        ],
      },
      { format: 'mp3', sampleRate: 44100, channels: 2, bitrate: '192k' },
      '/tmp/out.mp3',
    )
    expect(cmd.args.filter((a) => a === '-i').length).toBe(1)
    expect(cmd.args).toContain('/tmp/b.wav')
    expect(cmd.args).not.toContain('/tmp/a.wav')
  })

  it('rejects malicious clip paths', () => {
    expect(() =>
      buildFfmpegArgs(
        {
          duration: 1,
          channels: [
            { id: 'a', clips: [{ audioUrl: '/tmp/a.wav\n-evil', startTime: 0, duration: 1 }] },
          ],
        },
        { format: 'wav', sampleRate: 44100, channels: 2 },
        '/tmp/out.wav',
      ),
    ).toThrow(/control character/)
  })
})

describe('renderAudio', () => {
  it('enqueues a job and registers a RenderJob', async () => {
    const job = await renderAudio(sampleSession, { format: 'mp3' })
    expect(job.status).toBe('queued')
    expect(job.format).toBe('mp3')
    expect(job.queueName).toBe('audio-render')
    expect(job.outputPath.endsWith('.mp3')).toBe(true)

    const provider = getMockProvider()
    const queue = provider.queues.get('audio-render')!
    expect(queue.messages.length).toBe(1)
    const payload = queue.messages[0]!.body as AudioRenderJobPayload
    expect(payload.session).toBe(sampleSession)
    expect(payload.format).toBe('mp3')
    expect(getJob(job.id)?.status).toBe('queued')
  })

  it('honours custom output path and queue name', async () => {
    const job = await renderAudio(sampleSession, {
      format: 'flac',
      outputPath: '/tmp/custom.flac',
      queueName: 'special-render',
    })
    expect(job.outputPath).toBe('/tmp/custom.flac')
    expect(job.queueName).toBe('special-render')
    expect(getMockProvider().queues.get('special-render')!.messages.length).toBe(1)
  })

  it('rejects malformed sessions', async () => {
    await expect(renderAudio({ duration: -1, channels: [] })).rejects.toThrow(/non-negative/)
    await expect(renderAudio({ duration: 1, channels: [{ id: '', clips: [] }] })).rejects.toThrow(
      /non-empty string id/,
    )
  })

  it('rejects malicious output paths', async () => {
    await expect(renderAudio(sampleSession, { outputPath: '/tmp/out\n.wav' })).rejects.toThrow(
      /control character/,
    )
  })
})

describe('cancelRender', () => {
  it('marks a queued job as cancelled', async () => {
    const job = await renderAudio(sampleSession)
    expect(cancelRender(job.id)).toBe(true)
    expect(getRenderStatus(job.id)?.status).toBe('cancelled')
  })

  it('returns false for terminal or unknown jobs', async () => {
    const job = await renderAudio(sampleSession)
    expect(cancelRender(job.id)).toBe(true)
    expect(cancelRender(job.id)).toBe(false)
    expect(cancelRender('does-not-exist')).toBe(false)
  })
})

/**
 * Build a fake child process with controllable lifecycle events.
 */
const makeFakeChild = () => {
  const ee = new EventEmitter() as EventEmitter & {
    stderr: EventEmitter
    kill: ReturnType<typeof vi.fn>
  }
  ;(ee as { stderr: EventEmitter }).stderr = new EventEmitter()
  ;(ee as { kill: unknown }).kill = vi.fn()
  return ee as unknown as ReturnType<typeof spawn> & {
    stderr: EventEmitter
    kill: ReturnType<typeof vi.fn>
  }
}

describe('processAudioRenderJob', () => {
  it('marks the job completed when ffmpeg exits 0', async () => {
    const job = await renderAudio(sampleSession)
    const payload = getMockProvider().queues.get('audio-render')!.messages[0]!
      .body as AudioRenderJobPayload
    payload.jobId = job.id

    const fakeChild = makeFakeChild()
    const spawn = vi.fn(() => fakeChild)

    const promise = processAudioRenderJob(payload, { spawn: spawn as unknown as never })
    await Promise.resolve()
    fakeChild.emit('close', 0)

    const result = await promise
    expect(result.status).toBe('completed')
    expect(result.exitCode).toBe(0)
    expect(spawn).toHaveBeenCalledTimes(1)
    const [bin, args] = spawn.mock.calls[0]!
    expect(bin).toBe('ffmpeg')
    expect(args[0]).toBe('-y')
    expect(getJob(job.id)?.status).toBe('completed')
    expect(getJob(job.id)?.startedAt).toBeInstanceOf(Date)
    expect(getJob(job.id)?.finishedAt).toBeInstanceOf(Date)
  })

  it('marks the job failed when ffmpeg exits non-zero', async () => {
    const job = await renderAudio(sampleSession)
    const payload = getMockProvider().queues.get('audio-render')!.messages[0]!
      .body as AudioRenderJobPayload
    payload.jobId = job.id

    const fakeChild = makeFakeChild()
    const spawn = vi.fn(() => fakeChild)

    const promise = processAudioRenderJob(payload, { spawn: spawn as unknown as never })
    await Promise.resolve()
    fakeChild.stderr.emit('data', Buffer.from('mock ffmpeg error'))
    fakeChild.emit('close', 1)

    const result = await promise
    expect(result.status).toBe('failed')
    expect(result.error).toContain('mock ffmpeg error')
    expect(getJob(job.id)?.status).toBe('failed')
  })

  it('honours pre-flight cancellation without spawning ffmpeg', async () => {
    const job = await renderAudio(sampleSession)
    cancelRender(job.id)
    const payload = getMockProvider().queues.get('audio-render')!.messages[0]!
      .body as AudioRenderJobPayload
    payload.jobId = job.id

    const spawn = vi.fn()
    const result = await processAudioRenderJob(payload, { spawn: spawn as unknown as never })
    expect(result.status).toBe('cancelled')
    expect(spawn).not.toHaveBeenCalled()
  })

  it('reports a spawn-error as a failure', async () => {
    const job = await renderAudio(sampleSession)
    const payload = getMockProvider().queues.get('audio-render')!.messages[0]!
      .body as AudioRenderJobPayload
    payload.jobId = job.id

    const spawn = vi.fn(() => {
      throw new Error('ENOENT: ffmpeg not found')
    })

    const result = await processAudioRenderJob(payload, { spawn: spawn as unknown as never })
    expect(result.status).toBe('failed')
    expect(result.error).toContain('ENOENT')
    expect(getJob(job.id)?.status).toBe('failed')
  })

  it('spawns the FFMPEG_PATH binary when no ffmpegPath option is given', async () => {
    const original = process.env.FFMPEG_PATH
    process.env.FFMPEG_PATH = '/env/bin/ffmpeg'
    try {
      const job = await renderAudio(sampleSession)
      const payload = getMockProvider().queues.get('audio-render')!.messages[0]!
        .body as AudioRenderJobPayload
      payload.jobId = job.id

      const fakeChild = makeFakeChild()
      const spawn = vi.fn(() => fakeChild)
      const promise = processAudioRenderJob(payload, { spawn: spawn as unknown as never })
      await Promise.resolve()
      fakeChild.emit('close', 0)
      await promise

      expect(spawn).toHaveBeenCalledTimes(1)
      expect(spawn.mock.calls[0]![0]).toBe('/env/bin/ffmpeg')
    } finally {
      if (original === undefined) delete process.env.FFMPEG_PATH
      else process.env.FFMPEG_PATH = original
    }
  })

  it('records an actionable error when ffmpeg is missing (synchronous ENOENT)', async () => {
    const job = await renderAudio(sampleSession)
    const payload = getMockProvider().queues.get('audio-render')!.messages[0]!
      .body as AudioRenderJobPayload
    payload.jobId = job.id

    const spawn = vi.fn(() => {
      throw Object.assign(new Error('spawn /opt/ffmpeg ENOENT'), { code: 'ENOENT' })
    })

    const result = await processAudioRenderJob(payload, {
      spawn: spawn as unknown as never,
      ffmpegPath: '/opt/ffmpeg',
    })
    expect(result.status).toBe('failed')
    expect(result.error).toMatch(/ffmpeg not found at '\/opt\/ffmpeg'/)
    expect(result.error).toMatch(/FFMPEG_PATH/)
    expect(getJob(job.id)?.error).toMatch(/ffmpeg not found/)
  })

  it('records an actionable error when spawn emits ENOENT asynchronously', async () => {
    const job = await renderAudio(sampleSession)
    const payload = getMockProvider().queues.get('audio-render')!.messages[0]!
      .body as AudioRenderJobPayload
    payload.jobId = job.id

    const fakeChild = makeFakeChild()
    const spawn = vi.fn(() => fakeChild)
    const promise = processAudioRenderJob(payload, {
      spawn: spawn as unknown as never,
      ffmpegPath: 'ffmpeg',
    })
    await Promise.resolve()
    fakeChild.emit('error', Object.assign(new Error('spawn ffmpeg ENOENT'), { code: 'ENOENT' }))
    const result = await promise
    expect(result.status).toBe('failed')
    expect(result.error).toMatch(/ffmpeg not found at 'ffmpeg'/)
    expect(result.error).toMatch(/install ffmpeg/i)
  })
})

describe('resolveFfmpegPath', () => {
  const original = process.env.FFMPEG_PATH

  afterEach(() => {
    if (original === undefined) delete process.env.FFMPEG_PATH
    else process.env.FFMPEG_PATH = original
  })

  it("defaults to 'ffmpeg' when no explicit path and no FFMPEG_PATH", () => {
    delete process.env.FFMPEG_PATH
    expect(resolveFfmpegPath()).toBe('ffmpeg')
  })

  it('reads FFMPEG_PATH when no explicit path is given', () => {
    process.env.FFMPEG_PATH = '/env/ffmpeg'
    expect(resolveFfmpegPath()).toBe('/env/ffmpeg')
  })

  it('lets an explicit path win over FFMPEG_PATH', () => {
    process.env.FFMPEG_PATH = '/env/ffmpeg'
    expect(resolveFfmpegPath('/explicit/ffmpeg')).toBe('/explicit/ffmpeg')
  })
})

describe('describeSpawnFailure', () => {
  it('rewrites ENOENT into an actionable message naming the path + fix', () => {
    const err = Object.assign(new Error('spawn /opt/ffmpeg ENOENT'), { code: 'ENOENT' })
    const msg = describeSpawnFailure(err, '/opt/ffmpeg')
    expect(msg).toMatch(/ffmpeg not found at '\/opt\/ffmpeg'/)
    expect(msg).toMatch(/FFMPEG_PATH/)
  })

  it('passes through non-ENOENT error messages unchanged', () => {
    expect(describeSpawnFailure(new Error('permission denied'), 'ffmpeg')).toBe('permission denied')
  })
})

describe('AudioJobStore injection (split-process status fix)', () => {
  it('routes register + worker updates through an injected shared store', async () => {
    const shared = createInMemoryAudioJobStore()
    setAudioJobStore(shared)

    const job = await renderAudio(sampleSession)
    // renderAudio registered the job into the injected store.
    expect(shared.get(job.id)?.status).toBe('queued')

    // A worker sharing the same store completes the job...
    const payload = getMockProvider().queues.get('audio-render')!.messages[0]!
      .body as AudioRenderJobPayload
    payload.jobId = job.id
    const fakeChild = makeFakeChild()
    const spawn = vi.fn(() => fakeChild)
    const promise = processAudioRenderJob(payload, { spawn: spawn as unknown as never })
    await Promise.resolve()
    fakeChild.emit('close', 0)
    await promise

    // ...and getRenderStatus (reading the shared store) observes the transition.
    expect(getRenderStatus(job.id)?.status).toBe('completed')
    expect(shared.get(job.id)?.status).toBe('completed')
  })

  it('setAudioJobStore(undefined) resets to a fresh in-memory store', async () => {
    const shared = createInMemoryAudioJobStore()
    setAudioJobStore(shared)
    await renderAudio(sampleSession)
    expect(shared.ids().length).toBe(1)

    setAudioJobStore(undefined)
    expect(getAudioJobStore()).not.toBe(shared)
    expect(getAudioJobStore().ids().length).toBe(0)
  })
})

describe('createAudioRenderRoutes', () => {
  const makeRes = (): AudioRenderResponse & { status: number; body: unknown } => {
    const res = {
      status: 0,
      body: undefined as unknown,
      setStatus(s: number) {
        this.status = s
      },
      sendJson(b: unknown) {
        this.body = b
      },
    }
    return res
  }

  it('enqueues a session via POST', async () => {
    const routes = createAudioRenderRoutes()
    const res = makeRes()
    const req: AudioRenderRequest = { body: { session: sampleSession, options: { format: 'wav' } } }
    await routes.enqueue(req, res)
    expect(res.status).toBe(202)
    const body = res.body as { id: string; status: string; format: string }
    expect(body.status).toBe('queued')
    expect(body.format).toBe('wav')
    expect(getRenderStatus(body.id)?.status).toBe('queued')
  })

  it('returns 400 for malformed body', async () => {
    const routes = createAudioRenderRoutes()
    const res = makeRes()
    await routes.enqueue({ body: null }, res)
    expect(res.status).toBe(400)
  })

  it('returns 400 when validate() throws', async () => {
    const routes = createAudioRenderRoutes({
      validate: () => {
        throw new Error('forbidden session')
      },
    })
    const res = makeRes()
    await routes.enqueue({ body: { session: sampleSession } }, res)
    expect(res.status).toBe(400)
    expect((res.body as { error: string }).error).toBe('forbidden session')
  })

  it('looks up status by id', async () => {
    const job = await renderAudio(sampleSession)
    const routes = createAudioRenderRoutes()
    const res = makeRes()
    await routes.status({ params: { id: job.id } }, res)
    expect(res.status).toBe(200)
    expect((res.body as { id: string }).id).toBe(job.id)
  })

  it('returns 404 for unknown ids', async () => {
    const routes = createAudioRenderRoutes()
    const res = makeRes()
    await routes.status({ params: { id: 'does-not-exist' } }, res)
    expect(res.status).toBe(404)
  })

  it('cancels jobs via DELETE', async () => {
    const job = await renderAudio(sampleSession)
    const routes = createAudioRenderRoutes()
    const res = makeRes()
    await routes.cancel({ params: { id: job.id } }, res)
    expect(res.status).toBe(200)
    expect(getRenderStatus(job.id)?.status).toBe('cancelled')
  })

  it('returns 409 when DELETE targets a terminal job', async () => {
    const job = await renderAudio(sampleSession)
    cancelRender(job.id)
    const routes = createAudioRenderRoutes()
    const res = makeRes()
    await routes.cancel({ params: { id: job.id } }, res)
    expect(res.status).toBe(409)
  })
})
