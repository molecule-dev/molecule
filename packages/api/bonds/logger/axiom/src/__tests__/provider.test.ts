import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Logger } from '@molecule/api-logger'

import { createLogger, splitLogArgs } from '../provider.js'

const okFetch = (): { fetch: typeof fetch; bodies: string[] } => {
  const bodies: string[] = []
  const fn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(String(init?.body))
    return new Response('{}')
  })
  return { fetch: fn as unknown as typeof fetch, bodies }
}

const parse = (body: string): Array<Record<string, unknown>> =>
  body.split('\n').map((l) => JSON.parse(l) as Record<string, unknown>)

const recorder = (): Logger & { lines: Array<[string, unknown[]]> } => {
  const lines: Array<[string, unknown[]]> = []
  const at =
    (level: string) =>
    (...args: unknown[]): void => {
      lines.push([level, args])
    }
  return {
    lines,
    trace: at('trace'),
    debug: at('debug'),
    info: at('info'),
    warn: at('warn'),
    error: at('error'),
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('splitLogArgs', () => {
  it('joins words, merges objects and lifts errors', () => {
    const err = new Error('db down')
    expect(splitLogArgs(['Query failed', 42, { table: 'users' }, err, { retry: true }])).toEqual({
      message: 'Query failed 42',
      fields: { table: 'users', retry: true, error: err },
    })
  })

  it('uses the error message when there is no text', () => {
    expect(splitLogArgs([new Error('boom')]).message).toBe('boom')
  })
})

describe('createLogger', () => {
  it('only writes to the inner logger without a token', async () => {
    vi.stubEnv('AXIOM_TOKEN', '')
    vi.stubEnv('AXIOM_DATASET', '')
    const inner = recorder()
    const { fetch, bodies } = okFetch()
    const log = createLogger({ inner, fetch })
    log.error('x')
    await log.flush()
    expect(log.enabled).toBe(false)
    expect(inner.lines).toEqual([['error', ['x']]])
    expect(bodies).toHaveLength(0)
  })

  it('mirrors lines at or above the level with a JSON fields string', async () => {
    const inner = recorder()
    const { fetch, bodies } = okFetch()
    const log = createLogger({
      token: 't',
      dataset: 'logs',
      fetch,
      inner,
      level: 'warn',
      service: 'molecule-api',
      env: 'production',
    })
    log.info('not mirrored')
    log.warn('Disk low', { box: 'mol-ax42-01', freeGb: 18 })
    log.error('Crash', new Error('nope'))
    await log.flush()
    expect(inner.lines.map(([l]) => l)).toEqual(['info', 'warn', 'error'])
    const [warn, error] = parse(bodies[0])
    expect(warn).toMatchObject({
      kind: 'log',
      level: 'warn',
      message: 'Disk low',
      service: 'molecule-api',
      env: 'production',
    })
    expect(JSON.parse(String(warn.fields))).toEqual({ box: 'mol-ax42-01', freeGb: 18 })
    expect(JSON.parse(String(error.fields)).error).toMatchObject({ message: 'nope' })
    expect(parse(bodies[0])).toHaveLength(2)
  })

  it('stores fields as an object in object mode, and supports inner: null', async () => {
    const { fetch, bodies } = okFetch()
    const log = createLogger({ token: 't', dataset: 'd', fetch, inner: null, fieldsMode: 'object' })
    log.info('hi', { a: 1 })
    await log.flush()
    expect(parse(bodies[0])[0].fields).toEqual({ a: 1 })
  })

  it('passes the shutdown budget through to the ingester', async () => {
    vi.useFakeTimers()
    const warn = vi.fn()
    const hang = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        }),
    )
    const log = createLogger({
      token: 't',
      dataset: 'd',
      fetch: hang as unknown as typeof fetch,
      inner: null,
      warn,
      flushIntervalMs: 60_000,
    })
    log.error('boom')
    let resolved = false
    const done = log.shutdown({ deadlineMs: 300 }).then(() => {
      resolved = true
    })
    await vi.advanceTimersByTimeAsync(299)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await done
    expect(resolved).toBe(true)
    expect(warn.mock.calls[0][1]).toMatchObject({ deadlineMs: 300, lost: 1 })
  })

  it('drops new lines past maxQueueBytes but still writes them to the inner logger', async () => {
    const inner = recorder()
    const { fetch, bodies } = okFetch()
    const log = createLogger({
      token: 't',
      dataset: 'd',
      fetch,
      inner,
      warn: () => {},
      maxBatchBytes: 2_000,
      maxQueueBytes: 3_500, // two ~1.5 KB lines fit, a third does not
      flushIntervalMs: 60_000,
    })
    const big = 'x'.repeat(1_400)
    for (let i = 0; i < 4; i++) log.warn('line', { i, big })
    await log.flush()
    expect(inner.lines).toHaveLength(4)
    expect(bodies.flatMap(parse)).toHaveLength(2)
  })
})
