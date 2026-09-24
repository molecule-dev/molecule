/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — the real filesystem bond (writing to
 * a temp directory) behind a real Express router and busboy, driven over real
 * HTTP with multipart bodies (no mocks).
 *
 * @module
 */
import { mkdtempSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import busboy from 'busboy'
import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { logger } from '@molecule/api-logger'

import { getProvider, setProvider, UploadAbortedError } from '../index.js'

// In an app the bond and the handler share ONE `@molecule/api-uploads`; here the bond's dist
// would otherwise load the core's dist while this test loads its source, so
// `instanceof UploadAbortedError` would compare two different classes. Unify them (no logic mocked).
vi.mock('@molecule/api-uploads', () => import('../index.js'))

describe('README @example', () => {
  let server: Server
  let baseUrl = ''

  const uploadDir = mkdtempSync(join(tmpdir(), 'uploads-readme-'))

  beforeAll(async () => {
    // The filesystem bond reads FILE_UPLOAD_PATH (relative to cwd) at IMPORT time.
    process.env.FILE_UPLOAD_PATH = relative(process.cwd(), uploadDir)
    const { provider: filesystemUploads } = await import('@molecule/api-uploads-filesystem')
    setProvider(filesystemUploads)

    const MAX_BYTES = 1024 // smaller than the example's 10 MB so the limit is testable
    const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf'])
    const fileRows = new Map<string, { userId: string; filename: string; mimetype: string }>()

    const router = express.Router()

    router.post('/files', (req, res) => {
      const userId = String(res.locals.userId)
      const parser = busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_BYTES } })
      parser.on('file', (fieldname, stream, info) => {
        if (!ALLOWED_TYPES.has(info.mimeType)) {
          stream.resume()
          return void res.status(415).json({ error: 'Unsupported file type' })
        }
        const uploads = getProvider()
        const file = uploads.upload(fieldname, stream, info, () => void uploads.abortUpload(file))
        file.uploadPromise
          ?.then(() => {
            fileRows.set(file.id, { userId, filename: info.filename, mimetype: info.mimeType })
            res.status(201).json({ id: file.id })
          })
          .catch((error: unknown) => {
            logger.warn('Upload failed', { error, userId })
            res
              .status(error instanceof UploadAbortedError ? 413 : 500)
              .json({ error: 'Upload failed' })
          })
      })
      req.pipe(parser)
    })

    router.get('/files/:id', async (req, res) => {
      const row = fileRows.get(req.params.id)
      if (!row || row.userId !== String(res.locals.userId)) return void res.status(404).end()
      const stream = await getProvider().getFile?.(req.params.id)
      if (!stream) return void res.status(404).end()
      res.type(row.mimetype).set('X-Content-Type-Options', 'nosniff')
      stream.pipe(res)
    })

    const app = express()
    // Stands in for the app's auth middleware.
    app.use((req, res, next) => {
      res.locals.userId = req.get('x-user-id')
      next()
    })
    app.use(router)

    server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
    rmSync(uploadDir, { recursive: true, force: true })
    delete process.env.FILE_UPLOAD_PATH
  })

  const uploadAs = (userId: string, body: string, type: string): Promise<Response> => {
    const form = new FormData()
    form.append('file', new Blob([body], { type }), 'upload.bin')
    return fetch(`${baseUrl}/files`, {
      method: 'POST',
      headers: { 'x-user-id': userId },
      body: form,
    })
  }

  it('stores an allowed file, serves it only to its owner, and rejects bad types and sizes', async () => {
    const created = await uploadAs('alice', 'PNG-BYTES', 'image/png')
    expect(created.status).toBe(201)
    const { id } = (await created.json()) as { id: string }

    const own = await fetch(`${baseUrl}/files/${id}`, { headers: { 'x-user-id': 'alice' } })
    expect(own.status).toBe(200)
    expect(own.headers.get('content-type')).toBe('image/png')
    expect(await own.text()).toBe('PNG-BYTES')

    const other = await fetch(`${baseUrl}/files/${id}`, { headers: { 'x-user-id': 'mallory' } })
    expect(other.status).toBe(404)

    expect((await uploadAs('alice', '<script></script>', 'text/html')).status).toBe(415)
    expect((await uploadAs('alice', 'x'.repeat(4096), 'application/pdf')).status).toBe(413)
  })
})
