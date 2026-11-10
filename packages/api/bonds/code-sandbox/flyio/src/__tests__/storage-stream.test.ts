/**
 * `putStream` writes a direct import's archive into the bond's own store while
 * it is still arriving from the source, so this process never buffers it. S3
 * refuses a PUT of unknown length, so the write must reach the wire as ONE plain
 * request carrying `Content-Length` and the exact bytes — never chunked. These
 * run the real SDK client against a local server standing in for the store.
 *
 * @module
 */

import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterEach, describe, expect, it } from 'vitest'

import { createTemplateStore } from '../storage.js'

interface Received {
  method: string | undefined
  url: string | undefined
  headers: IncomingMessage['headers']
  body: Buffer
}

let server: Server | undefined

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()))
  server = undefined
})

/**
 * A store endpoint that records each request and answers 200.
 * @returns The endpoint URL and the requests it received.
 */
async function storeEndpoint(): Promise<{ endpoint: string; received: Received[] }> {
  const received: Received[] = []
  server = createServer((request, response) => {
    const parts: Buffer[] = []
    request.on('data', (chunk: Buffer) => parts.push(chunk))
    request.on('end', () => {
      received.push({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: Buffer.concat(parts),
      })
      response.writeHead(200, { etag: '"fixture"' })
      response.end()
    })
  })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return { endpoint: `http://127.0.0.1:${port}`, received }
}

/**
 * A body that arrives in several pieces, like a network read.
 * @param pieces - The pieces.
 * @yields {Uint8Array} Each piece.
 */
async function* arriving(pieces: string[]): AsyncGenerator<Uint8Array> {
  for (const piece of pieces) yield Buffer.from(piece)
}

describe('Fly template store — streamed archive write', () => {
  it('sends one sized PUT with the exact bytes, never a chunked body', async () => {
    const { endpoint, received } = await storeEndpoint()
    const store = createTemplateStore({
      templateBucket: 'fixture',
      templateEndpoint: endpoint,
      templateRegion: 'auto',
      templateAccessKeyId: 'fixture',
      templateSecretAccessKey: 'fixture-secret',
      templateForcePathStyle: true,
    })!
    const pieces = ['first-', 'second-', 'third']
    const length = Buffer.byteLength(pieces.join(''))
    await store.putStream!('imports/a.tar.gz', arriving(pieces), length)
    expect(received).toHaveLength(1)
    expect(received[0].method).toBe('PUT')
    expect(received[0].url?.split('?')[0]).toBe('/fixture/imports/a.tar.gz')
    expect(received[0].headers['content-length']).toBe(String(length))
    expect(received[0].headers['transfer-encoding']).toBeUndefined()
    expect(received[0].body.toString()).toBe(pieces.join(''))
  })

  it('stops the write when the caller aborts', async () => {
    const { endpoint } = await storeEndpoint()
    const store = createTemplateStore({
      templateBucket: 'fixture',
      templateEndpoint: endpoint,
      templateRegion: 'auto',
      templateAccessKeyId: 'fixture',
      templateSecretAccessKey: 'fixture-secret',
      templateForcePathStyle: true,
    })!
    await expect(
      store.putStream!('imports/b.tar.gz', arriving(['x']), 1, AbortSignal.abort()),
    ).rejects.toThrow()
  })
})
