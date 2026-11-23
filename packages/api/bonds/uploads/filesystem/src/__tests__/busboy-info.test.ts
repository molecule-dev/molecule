/**
 * A multipart parser's file info is passed to `upload()` as it is. busboy types `filename` as
 * `string | undefined`: a part counts as a file by its `application/octet-stream` type alone, with
 * no name. The core typed it `string`, so the documented `upload(fieldname, stream, info, …)` failed
 * to compile in both Claude Code's and Codex's Express apps (harness eval `add`, 2026-11-23), and a
 * nameless part crashed the provider on `info.filename.substring`.
 *
 * Type-checked by `scripts/typecheck-tests.mjs`; the assignment below is the compile-time half.
 *
 * @module
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import type busboy from 'busboy'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-busboy-info-'))
let mod: typeof ProviderModule

beforeAll(async () => {
  vi.stubEnv('FILE_UPLOAD_PATH', dir)
  const { bond } = await import('@molecule/api-bond')
  bond('logger', { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
  mod = await import('../provider.js')
})

afterAll(() => {
  vi.unstubAllEnvs()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('busboy file info', () => {
  it('is accepted as it is, including a part without a filename', async () => {
    const info: busboy.FileInfo = {
      filename: undefined,
      encoding: '7bit',
      mimeType: 'application/octet-stream',
    }
    const onError = vi.fn()
    const file = mod.upload('file', Readable.from([Buffer.from('bytes')]), info, onError)
    await file.uploadPromise
    expect(onError).not.toHaveBeenCalled()
    expect(file.filename).toBe('')
    expect(fs.readFileSync(path.join(dir, file.id), 'utf8')).toBe('bytes')
  })
})
