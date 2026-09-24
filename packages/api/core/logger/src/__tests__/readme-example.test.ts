/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real pino bond. Nothing
 * is mocked: pino's stdout writes (`fs.writeSync` on fd 1) are observed with a
 * spy that captures the JSON lines instead of printing them.
 *
 * @module
 */
import fs from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createLogger } from '@molecule/api-logger-pino'

import { logger, resetLogger, setLevel, setLogger } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetLogger()
    setLevel('info')
  })

  it('bonds pino, gates debug at the default level and serializes errors with their stack', async () => {
    const lines: Record<string, unknown>[] = []
    const capture = (data: unknown): number => {
      const text = typeof data === 'string' ? data : String(data)
      for (const line of text.split('\n').filter(Boolean)) {
        lines.push(JSON.parse(line) as Record<string, unknown>)
      }
      return Buffer.byteLength(text)
    }
    const realWrite = fs.write.bind(fs) as (...args: unknown[]) => void
    vi.spyOn(fs, 'write').mockImplementation(((fd: unknown, data: unknown, ...rest: unknown[]) => {
      if (fd !== 1) return realWrite(fd, data, ...rest)
      const written = capture(data)
      const callback = rest.find((arg) => typeof arg === 'function') as
        ((err: Error | null, bytes: number) => void) | undefined
      process.nextTick(() => callback?.(null, written))
    }) as typeof fs.write)
    const realWriteSync = fs.writeSync.bind(fs) as (...args: unknown[]) => number
    vi.spyOn(fs, 'writeSync').mockImplementation(((
      fd: unknown,
      data: unknown,
      ...rest: unknown[]
    ) => (fd === 1 ? capture(data) : realWriteSync(fd, data, ...rest))) as typeof fs.writeSync)

    setLogger(createLogger({ name: 'api' }))

    logger.info('Server started', { port: 3000 })
    logger.debug('Cache warmed', { keys: 42 })

    setLevel('debug')
    logger.debug('Request received', { method: 'GET', path: '/api/items' })

    try {
      JSON.parse('{not json')
    } catch (error) {
      logger.error('Failed to parse webhook payload', { error })
    }

    // pino's stdout stream flushes asynchronously.
    await vi.waitFor(() => expect(lines).toHaveLength(3))
    expect(lines.map((l) => l.msg)).toEqual([
      'Server started',
      'Request received',
      'Failed to parse webhook payload',
    ])
    expect(lines[0]).toMatchObject({ name: 'api', level: 30, port: 3000 })
    expect(lines[1]).toMatchObject({ level: 20, method: 'GET', path: '/api/items' })
    expect(lines[2]).toMatchObject({ level: 50, error: { type: 'SyntaxError' } })
    expect(String((lines[2]?.error as { stack?: string } | undefined)?.stack)).toContain(
      'SyntaxError',
    )
  })
})
