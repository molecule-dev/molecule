/**
 * REAL-DEPENDENCY integration tests — no mocks, a real node:http server and the
 * runtime's real `fetch`/`FormData`/`File` doing actual multipart uploads over
 * a loopback socket.
 *
 * The unit suite (`provider.test.ts`) stubs the global `fetch`, so it can only
 * validate OUR assumptions about the transport — not the transport. This file
 * exercises the fetch fallback path end-to-end (Node has no XMLHttpRequest; the
 * XHR path is browser-only and its shape is covered by the unit suite) and pins
 * the consumer-facing properties: the default configuration must survive a
 * slow-but-legitimate server, and the distinct failure modes — client-side
 * validation rejection, HTTP failure, timeout, and user cancellation — must stay
 * distinguishable for the caller.
 *
 * @module
 */

import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFilepondProvider, provider } from '../provider.js'

/** A request as the real server received it. */
interface RecordedRequest {
  method: string
  url: string
  headers: Record<string, string | string[] | undefined>
  body: string
}

let server: Server
let baseUrl: string
let requests: RecordedRequest[] = []
let failOnceCount = 0
let activeCount = 0
let maxActive = 0

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      requests.push({
        method: req.method ?? '',
        url: req.url ?? '',
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      })

      const respond = (status: number, payload: string): void => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(payload)
      }

      switch (req.url) {
        case '/upload':
          return respond(200, JSON.stringify({ id: 'srv-1', ok: true }))
        case '/slow':
          // A legitimate-but-slow server: responds well after a "snappy" request
          // would have, but far inside any reasonable upload window.
          setTimeout(() => respond(200, JSON.stringify({ id: 'slow-1' })), 400).unref()
          return
        case '/never': {
          // Responds only after the client's configured timeout has already fired.
          setTimeout(() => respond(200, '{}'), 600).unref()
          return
        }
        case '/error':
          return respond(500, JSON.stringify({ error: 'boom' }))
        case '/fail-once': {
          failOnceCount += 1
          return respond(
            failOnceCount === 1 ? 500 : 200,
            JSON.stringify({ id: `attempt-${failOnceCount}` }),
          )
        }
        case '/track': {
          activeCount += 1
          maxActive = Math.max(maxActive, activeCount)
          setTimeout(() => {
            activeCount -= 1
            respond(200, JSON.stringify({ id: 'tracked' }))
          }, 60).unref()
          return
        }
        default:
          return respond(404, '{}')
      }
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
})

beforeEach(() => {
  requests = []
  failOnceCount = 0
  activeCount = 0
  maxActive = 0
})

describe('@molecule/app-file-upload-filepond × REAL http + fetch', () => {
  it('full lifecycle: queue → real multipart POST → server sees field/filename/bytes/headers/extra data → parseResponse → complete', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const uploader = provider.createUploader({
      destination: {
        url: `${baseUrl}/upload`,
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        fieldName: 'document',
        additionalData: { folder: 'docs' },
        parseResponse: (response) => (response as { id: string }).id,
      },
      events: { onComplete, onError },
    })

    const [added] = uploader.addFiles([
      new File(['hello world'], 'hello.txt', { type: 'text/plain' }),
    ])
    expect(added.status).toBe('idle')

    uploader.upload()
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))

    const file = uploader.getFiles()[0]
    expect(file.status).toBe('complete')
    expect(file.progress).toBe(100)
    expect(file.result).toBe('srv-1') // parseResponse extracted the id from real JSON
    expect(onError).not.toHaveBeenCalled()

    // What the REAL server actually received:
    expect(requests).toHaveLength(1)
    const received = requests[0]
    expect(received.method).toBe('POST')
    expect(received.headers.authorization).toBe('Bearer test-token')
    expect(String(received.headers['content-type'])).toContain('multipart/form-data')
    expect(received.body).toContain('name="document"')
    expect(received.body).toContain('filename="hello.txt"')
    expect(received.body).toContain('hello world')
    expect(received.body).toContain('name="folder"')
    expect(received.body).toContain('docs')
  })

  it('CONSUMER PROPERTY: the default config (timeout 0 = none) survives a slow-but-legitimate server response', async () => {
    // The trap class this pins: a hostile default timeout would expire uploads on
    // slow links/servers mid-flow. The default must wait, not fail.
    const onComplete = vi.fn()
    const onError = vi.fn()
    const uploader = provider.createUploader({
      destination: { url: `${baseUrl}/slow` },
      events: { onComplete, onError },
    })

    uploader.addFiles([new File(['slow but fine'], 'slow.txt', { type: 'text/plain' })])
    uploader.upload()

    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 3000 })
    expect(uploader.getFiles()[0].status).toBe('complete')
    expect(onError).not.toHaveBeenCalled()
  })

  it('FAILURE DISAMBIGUATION: validation rejection, HTTP failure, timeout, and cancellation are four distinguishable outcomes', async () => {
    // 1. Client-side validation failure → onValidationError, file never queued,
    //    server NEVER contacted.
    const onValidationError = vi.fn()
    const validator = provider.createUploader({
      destination: { url: `${baseUrl}/upload` },
      validation: { acceptedTypes: ['image/*'] },
      events: { onValidationError },
    })
    const rejected = validator.addFiles([new File(['nope'], 'doc.txt', { type: 'text/plain' })])
    expect(rejected).toHaveLength(0)
    expect(validator.getFiles()).toHaveLength(0)
    expect(onValidationError).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'doc.txt' }),
      expect.arrayContaining([expect.stringContaining('not accepted')]),
    )
    expect(requests).toHaveLength(0)

    // 2. HTTP failure → onError with the status baked into the message.
    const onHttpError = vi.fn()
    const failing = provider.createUploader({
      destination: { url: `${baseUrl}/error` },
      events: { onError: onHttpError },
    })
    failing.addFiles([new File(['x'], 'x.txt', { type: 'text/plain' })])
    failing.upload()
    await vi.waitFor(() => expect(onHttpError).toHaveBeenCalledTimes(1))
    expect(failing.getFiles()[0].status).toBe('error')
    expect(failing.getFiles()[0].error).toBe('Upload failed with status 500')

    // 3. Timeout → onError says 'Upload timed out' — NOT a generic abort, NOT a
    //    cancellation (parity with the XHR path).
    const onTimeoutError = vi.fn()
    const timingOut = createFilepondProvider({ timeout: 120 }).createUploader({
      destination: { url: `${baseUrl}/never` },
      events: { onError: onTimeoutError },
    })
    timingOut.addFiles([new File(['y'], 'y.txt', { type: 'text/plain' })])
    timingOut.upload()
    await vi.waitFor(() => expect(onTimeoutError).toHaveBeenCalledTimes(1))
    expect(timingOut.getFiles()[0].status).toBe('error')
    expect(timingOut.getFiles()[0].error).toBe('Upload timed out')

    // 4. User cancellation → status 'cancelled' and NO onError at all: an
    //    intentional cancel must never masquerade as a failure.
    const onCancelError = vi.fn()
    const cancelling = provider.createUploader({
      destination: { url: `${baseUrl}/slow` },
      events: { onError: onCancelError },
    })
    const [queued] = cancelling.addFiles([new File(['z'], 'z.txt', { type: 'text/plain' })])
    cancelling.upload()
    await vi.waitFor(() => expect(cancelling.getFile(queued.id)?.status).toBe('uploading'))
    cancelling.cancelUpload(queued.id)
    expect(cancelling.getFile(queued.id)?.status).toBe('cancelled')
    await delay(150) // give any stray transport rejection time to (wrongly) surface
    expect(onCancelError).not.toHaveBeenCalled()
  })

  it('removing an in-flight file fires onFileRemoved and never a spurious onError', async () => {
    const onFileRemoved = vi.fn()
    const onError = vi.fn()
    const uploader = provider.createUploader({
      destination: { url: `${baseUrl}/slow` },
      events: { onFileRemoved, onError },
    })

    const [queued] = uploader.addFiles([new File(['bye'], 'bye.txt', { type: 'text/plain' })])
    uploader.upload()
    await vi.waitFor(() => expect(uploader.getFile(queued.id)?.status).toBe('uploading'))

    uploader.removeFile(queued.id)

    expect(uploader.getFiles()).toHaveLength(0)
    expect(onFileRemoved).toHaveBeenCalledTimes(1)
    await delay(150) // the aborted transport settles asynchronously
    expect(onError).not.toHaveBeenCalled()
  })

  it('retry after a real 500 re-sends the request and completes on the second attempt', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const uploader = provider.createUploader({
      destination: {
        url: `${baseUrl}/fail-once`,
        parseResponse: (response) => (response as { id: string }).id,
      },
      events: { onComplete, onError },
    })

    const [queued] = uploader.addFiles([new File(['try'], 'retry.txt', { type: 'text/plain' })])
    uploader.upload()
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    expect(uploader.getFile(queued.id)?.status).toBe('error')

    uploader.retry(queued.id)
    expect(uploader.getFile(queued.id)?.status).toBe('idle')
    uploader.upload()

    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(uploader.getFile(queued.id)?.status).toBe('complete')
    expect(uploader.getFile(queued.id)?.result).toBe('attempt-2')
    expect(requests.filter((r) => r.url === '/fail-once')).toHaveLength(2)
  })

  it('honors maxConcurrent against a real server (never more than 2 requests in flight)', async () => {
    const onAllComplete = vi.fn()
    const uploader = provider.createUploader({
      destination: { url: `${baseUrl}/track` },
      maxConcurrent: 2,
      events: { onAllComplete },
    })

    uploader.addFiles([
      new File(['1'], 'a.txt', { type: 'text/plain' }),
      new File(['2'], 'b.txt', { type: 'text/plain' }),
      new File(['3'], 'c.txt', { type: 'text/plain' }),
      new File(['4'], 'd.txt', { type: 'text/plain' }),
    ])
    uploader.upload()

    await vi.waitFor(() => expect(onAllComplete).toHaveBeenCalled(), { timeout: 3000 })
    expect(requests.filter((r) => r.url === '/track')).toHaveLength(4)
    expect(maxActive).toBeLessThanOrEqual(2)
    expect(uploader.getFiles().every((f) => f.status === 'complete')).toBe(true)
  })
})
