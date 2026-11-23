/**
 * `FILE_UPLOAD_PATH` names the directory files are stored in: an absolute path is used as given and
 * a relative one is resolved against the working directory.
 *
 * The provider used to join every value under the working directory, so `/tmp/uploads-x` stored
 * files in `<cwd>/tmp/uploads-x`: a server's own temp directory stayed empty and a stray `tmp/`
 * appeared in the project (2026-11-23, harness eval `add`: both Claude Code and Codex hit it).
 *
 * @module
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'

const silentLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
const made: string[] = []

/** The provider module as loaded with `FILE_UPLOAD_PATH` set to `value`. */
async function load(value: string): Promise<typeof ProviderModule> {
  vi.resetModules()
  vi.stubEnv('FILE_UPLOAD_PATH', value)
  const { bond } = await import('@molecule/api-bond')
  bond('logger', silentLogger)
  return import('../provider.js')
}

afterEach(() => {
  vi.unstubAllEnvs()
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

describe('FILE_UPLOAD_PATH', () => {
  it('stores files in an absolute directory as given', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-absolute-'))
    made.push(dir)
    const mod = await load(dir)
    expect(mod.uploadPath).toBe(dir)
    const file = mod.upload(
      'file',
      Readable.from([Buffer.from('hello')]),
      {
        filename: 'a.txt',
        encoding: '7bit',
        mimeType: 'text/plain',
      },
      () => {},
    )
    await file.uploadPromise
    expect(fs.readFileSync(path.join(dir, file.id), 'utf8')).toBe('hello')
    expect(fs.existsSync(path.join(process.cwd(), dir))).toBe(false)
  })

  it('resolves a relative directory against the working directory', async () => {
    const relative = `.uploads-relative-${process.pid}`
    made.push(path.join(process.cwd(), relative))
    const mod = await load(relative)
    expect(mod.uploadPath).toBe(path.join(process.cwd(), relative))
    expect(fs.existsSync(mod.uploadPath)).toBe(true)
  })
})
