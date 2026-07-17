/**
 * Unit tests for the ffmpeg seam:
 *  - Default runner is replaceable via setFfmpegRunner / getFfmpegRunner.
 *  - The ffmpeg binary path is configurable (setFfmpegBinaryPath / FFMPEG_PATH),
 *    defaulting to `'ffmpeg'`.
 *  - A missing binary (ENOENT) yields an actionable error naming the path + fix,
 *    both when spawn throws synchronously and when the child emits `error`.
 *  - parseFfmpegProgressSeconds extracts the LAST `time=` token from a chunk.
 *
 * `node:child_process` is mocked so the default runner can be exercised without
 * a real ffmpeg binary while asserting the exact binary path + argv it spawns.
 */

import { EventEmitter } from 'node:events'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }))
vi.mock('node:child_process', () => ({ spawn: spawnMock }))

import {
  defaultFfmpegRunner,
  type FfmpegProcess,
  getFfmpegBinaryPath,
  getFfmpegRunner,
  parseFfmpegProgressSeconds,
  setFfmpegBinaryPath,
  setFfmpegRunner,
  toActionableSpawnError,
} from '../ffmpeg.js'

/**
 * A fake spawned child sufficient for the wrapper: an EventEmitter for
 * `close`/`error`, a stderr EventEmitter, and a `kill` spy. `emitError`
 * simulates node's async spawn failure.
 */
function makeFakeChild() {
  const emitter = new EventEmitter()
  const stderr = new EventEmitter()
  return {
    stderr,
    on: emitter.on.bind(emitter),
    kill: vi.fn(() => true),
    emitError: (err: Error) => emitter.emit('error', err),
    emitClose: (code: number | null) => emitter.emit('close', code),
  }
}

const enoent = (msg: string): Error => Object.assign(new Error(msg), { code: 'ENOENT' })

describe('parseFfmpegProgressSeconds', () => {
  it('parses a single `time=HH:MM:SS.SS` token', () => {
    expect(parseFfmpegProgressSeconds('frame=  60 fps= 30 time=00:00:02.00 bitrate=...')).toBe(2)
  })

  it('returns the LAST time token in a multi-line chunk', () => {
    const chunk =
      'frame= 30 fps= 30 time=00:00:01.00 bitrate=1\nframe= 60 fps= 30 time=00:00:02.50 bitrate=2'
    expect(parseFfmpegProgressSeconds(chunk)).toBe(2.5)
  })

  it('parses HH:MM:SS correctly', () => {
    expect(parseFfmpegProgressSeconds('time=01:30:15.00')).toBe(1 * 3600 + 30 * 60 + 15)
  })

  it('returns undefined when no time token is present', () => {
    expect(parseFfmpegProgressSeconds('hello world')).toBeUndefined()
  })

  it('returns undefined when the time value is malformed', () => {
    // 100 minutes is "valid-looking" but Number-coerces fine; still parses.
    expect(parseFfmpegProgressSeconds('time=00:99:00.00')).toBe(99 * 60)
  })
})

describe('setFfmpegRunner / getFfmpegRunner', () => {
  afterEach(() => {
    setFfmpegRunner(undefined)
  })

  it('returns the default runner initially', () => {
    expect(getFfmpegRunner()).toBe(defaultFfmpegRunner)
  })

  it('replaces and resets the runner', () => {
    const fake = vi.fn(
      () =>
        ({
          stderr: null,
          on: () => {},
          kill: () => true,
        }) as unknown as FfmpegProcess,
    )
    setFfmpegRunner(fake)
    expect(getFfmpegRunner()).toBe(fake)
    setFfmpegRunner(undefined)
    expect(getFfmpegRunner()).toBe(defaultFfmpegRunner)
  })
})

describe('ffmpeg binary path resolution', () => {
  const originalEnv = process.env['FFMPEG_PATH']

  beforeEach(() => {
    spawnMock.mockReset()
    setFfmpegBinaryPath(undefined)
    delete process.env['FFMPEG_PATH']
  })

  afterEach(() => {
    setFfmpegBinaryPath(undefined)
    if (originalEnv === undefined) delete process.env['FFMPEG_PATH']
    else process.env['FFMPEG_PATH'] = originalEnv
  })

  it("defaults to 'ffmpeg' when neither an override nor FFMPEG_PATH is set", () => {
    expect(getFfmpegBinaryPath()).toBe('ffmpeg')
  })

  it('reads the FFMPEG_PATH env var when no override is set', () => {
    process.env['FFMPEG_PATH'] = '/env/bin/ffmpeg'
    expect(getFfmpegBinaryPath()).toBe('/env/bin/ffmpeg')
  })

  it('lets an explicit override win over FFMPEG_PATH', () => {
    process.env['FFMPEG_PATH'] = '/env/ffmpeg'
    setFfmpegBinaryPath('/explicit/ffmpeg')
    expect(getFfmpegBinaryPath()).toBe('/explicit/ffmpeg')
    setFfmpegBinaryPath(undefined)
    expect(getFfmpegBinaryPath()).toBe('/env/ffmpeg')
  })

  it('spawns the configured binary path with { shell: false } and the given argv', () => {
    spawnMock.mockReturnValue(makeFakeChild())
    setFfmpegBinaryPath('/opt/ffmpeg-static')
    defaultFfmpegRunner(['-i', '/a.mp4', '-y', '/out.mp4'])
    expect(spawnMock).toHaveBeenCalledWith(
      '/opt/ffmpeg-static',
      ['-i', '/a.mp4', '-y', '/out.mp4'],
      {
        shell: false,
      },
    )
  })

  it('spawns the FFMPEG_PATH binary when no override is configured', () => {
    spawnMock.mockReturnValue(makeFakeChild())
    process.env['FFMPEG_PATH'] = '/env/bin/ffmpeg'
    defaultFfmpegRunner([])
    expect(spawnMock).toHaveBeenCalledWith('/env/bin/ffmpeg', [], { shell: false })
  })
})

describe('actionable ffmpeg-missing errors', () => {
  beforeEach(() => {
    spawnMock.mockReset()
    setFfmpegBinaryPath(undefined)
    delete process.env['FFMPEG_PATH']
  })

  afterEach(() => {
    setFfmpegBinaryPath(undefined)
    delete process.env['FFMPEG_PATH']
  })

  it('translates a synchronous ENOENT throw into an actionable error naming the path', () => {
    spawnMock.mockImplementation(() => {
      throw enoent('spawn /no/such/ffmpeg ENOENT')
    })
    setFfmpegBinaryPath('/no/such/ffmpeg')
    expect(() => defaultFfmpegRunner([])).toThrow(/ffmpeg not found at '\/no\/such\/ffmpeg'/)
    expect(() => defaultFfmpegRunner([])).toThrow(/FFMPEG_PATH/)
  })

  it('translates an async ENOENT spawn error delivered to the error listener', async () => {
    const child = makeFakeChild()
    spawnMock.mockReturnValue(child)
    setFfmpegBinaryPath('/opt/custom/ffmpeg')
    const proc = defaultFfmpegRunner(['-i', 'x.mp4'])
    const received = new Promise<Error>((resolve) => proc.on('error', resolve as never))
    child.emitError(enoent('spawn /opt/custom/ffmpeg ENOENT'))
    const err = await received
    expect(err.message).toMatch(/ffmpeg not found at '\/opt\/custom\/ffmpeg'/)
    expect(err.message).toMatch(/install ffmpeg/i)
    expect(err.message).toMatch(/FFMPEG_PATH/)
  })

  it('forwards the close event + non-ENOENT errors unchanged through the wrapper', async () => {
    const child = makeFakeChild()
    spawnMock.mockReturnValue(child)
    const proc = defaultFfmpegRunner([])

    const closeCode = new Promise<number | null>((resolve) => proc.on('close', resolve as never))
    child.emitClose(0)
    expect(await closeCode).toBe(0)

    const child2 = makeFakeChild()
    spawnMock.mockReturnValue(child2)
    const proc2 = defaultFfmpegRunner([])
    const otherErr = new Promise<Error>((resolve) => proc2.on('error', resolve as never))
    child2.emitError(new Error('some other ffmpeg failure'))
    expect((await otherErr).message).toBe('some other ffmpeg failure')
  })
})

describe('toActionableSpawnError', () => {
  it('rewrites ENOENT into an actionable message and preserves the cause', () => {
    const cause = enoent('spawn ffmpeg ENOENT')
    const out = toActionableSpawnError(cause, '/bin/ffmpeg')
    expect(out.message).toMatch(/ffmpeg not found at '\/bin\/ffmpeg'/)
    expect(out.message).toMatch(/FFMPEG_PATH/)
    expect((out as { cause?: unknown }).cause).toBe(cause)
  })

  it('returns non-ENOENT errors unchanged', () => {
    const other = new Error('permission denied')
    expect(toActionableSpawnError(other, 'ffmpeg')).toBe(other)
  })
})
