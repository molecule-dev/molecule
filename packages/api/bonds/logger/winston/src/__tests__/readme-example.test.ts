/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real winston, a real log file in a
 * temp dir, and stdout captured with a spy on `console._stdout` (where
 * winston's Console transport writes).
 *
 * @module
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { logger, resetLogger, setLevel, setLogger } from '@molecule/api-logger'

import { createLogger } from '../index.js'

const waitFor = async (check: () => Promise<boolean>): Promise<void> => {
  for (let i = 0; i < 50; i++) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('timed out waiting for log output')
}

describe('README @example', () => {
  let dir = ''

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'logger-winston-readme-'))
  })

  afterAll(async () => {
    resetLogger()
    setLevel('info')
    vi.restoreAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  it('writes JSON to stdout and warnings/errors to the file transport', async () => {
    const stdout: string[] = []
    const consoleStdout = (console as unknown as { _stdout: NodeJS.WritableStream })._stdout
    const stdoutSpy = vi
      .spyOn(consoleStdout, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        stdout.push(String(chunk))
        return true
      })
    const filename = join(dir, 'logs/errors.log')
    setLevel('info')

    setLogger(
      createLogger({
        format: 'json',
        transports: [{ type: 'console' }, { type: 'file', level: 'warn', options: { filename } }],
      }),
    )

    logger.info('Server started', { port: 3000 })
    logger.debug('Cache warmed', { keys: 42 })
    setLevel('debug')

    try {
      JSON.parse('{not json')
    } catch (error) {
      logger.error('Failed to parse webhook payload', { error })
    }

    const readLog = async (): Promise<string> => {
      try {
        return await readFile(filename, 'utf8')
      } catch (_error) {
        // The file transport creates the file asynchronously — "not there yet" means "no lines".
        return ''
      }
    }
    await waitFor(async () => (await readLog()).includes('Failed to parse webhook payload'))
    stdoutSpy.mockRestore()

    const out = stdout
      .join('')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>)
    expect(out[0]).toMatchObject({ level: 'info', message: 'Server started', port: 3000 })
    expect(out.some((r) => r.message === 'Cache warmed')).toBe(false)
    expect(out[1]).toMatchObject({ level: 'error', message: 'Failed to parse webhook payload' })

    const fileRecords = (await readLog())
      .split('\n')
      .filter(Boolean)
      .map(
        (line) => JSON.parse(line) as { message: string; error: { type: string; stack: string } },
      )
    expect(fileRecords).toHaveLength(1)
    expect(fileRecords[0]?.message).toBe('Failed to parse webhook payload')
    expect(fileRecords[0]?.error.type).toBe('SyntaxError')
    expect(fileRecords[0]?.error.stack).toContain('SyntaxError')
  })
})
