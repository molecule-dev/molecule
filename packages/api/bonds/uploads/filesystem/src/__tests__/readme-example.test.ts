/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — against the REAL filesystem, in a
 * throwaway upload directory.
 *
 * @module
 */
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

import { afterAll, describe, expect, it, vi } from 'vitest'

import { getProvider, setProvider } from '@molecule/api-uploads'

vi.hoisted(() => {
  // FILE_UPLOAD_PATH is read once at import time, so set it before the bond loads.
  process.env.FILE_UPLOAD_PATH = '.readme-example-uploads'
})

import { provider as filesystemUploads, uploadPath } from '../index.js'

describe('README @example', () => {
  afterAll(() => {
    fs.rmSync(uploadPath, { recursive: true, force: true })
  })

  it('uploads a stream to disk, reads it back, and deletes it', async () => {
    expect(uploadPath).toBe(path.join(process.cwd(), '.readme-example-uploads'))

    setProvider(filesystemUploads)

    const uploads = getProvider()
    const source = Readable.from([Buffer.from('Hello, uploads!')])
    const errors: Error[] = []
    const file = uploads.upload(
      'document',
      source,
      { filename: 'hello.txt', encoding: '7bit', mimeType: 'text/plain' },
      (error) => errors.push(error),
    )
    await file.uploadPromise

    expect(errors).toEqual([])
    expect(file.uploaded).toBe(true)
    expect(file.size).toBe(15)
    expect(fs.readFileSync(path.join(uploadPath, file.id), 'utf8')).toBe('Hello, uploads!')

    const stored = await uploads.getFile?.(file.id)
    expect(stored).not.toBeNull()
    let text = ''
    for await (const chunk of stored ?? []) text += String(chunk)
    expect(text).toBe('Hello, uploads!')

    await uploads.deleteFile(file.id)
    expect(fs.existsSync(path.join(uploadPath, file.id))).toBe(false)
    expect(await uploads.getFile?.(file.id)).toBeNull()
  })
})
