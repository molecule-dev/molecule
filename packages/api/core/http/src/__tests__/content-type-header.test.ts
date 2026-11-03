/**
 * The default client's `Content-Type` against a real server, through the real `fetch`.
 *
 * Header names are case-insensitive. A caller's `content-type` next to the client's own
 * `Content-Type` reached the server as `application/json, application/json`; Express's JSON parser
 * does not accept that media type, so the handler saw no body (every confirm of a reviewed
 * repository preview answered 400 "`enabled` must be true or false").
 *
 * @module
 */

import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { defaultClient } from '../client.js'

interface Seen {
  contentType: string | undefined
  body: string
}

let server: Server
let url = ''

beforeAll(async () => {
  server = createServer((req: IncomingMessage, res) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      const seen: Seen = { contentType: req.headers['content-type'], body }
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(seen))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/echo`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

const send = async (headers: Record<string, string>, body: unknown): Promise<Seen> =>
  (await defaultClient.request<Seen>(url, { method: 'PUT', headers, body })).data

describe('the Content-Type the default client sends', () => {
  it('sends one JSON type when the caller names it in lower case', async () => {
    const seen = await send({ 'content-type': 'application/json' }, { enabled: true })
    expect(seen.contentType).toBe('application/json')
    expect(JSON.parse(seen.body)).toEqual({ enabled: true })
  })

  it('sends one JSON type when the caller names it in any other case', async () => {
    const seen = await send({ 'CONTENT-TYPE': 'application/json' }, { id: 1 })
    expect(seen.contentType).toBe('application/json')
  })

  it('adds the JSON type for an object body when the caller names none', async () => {
    const seen = await send({ authorization: 'Bearer t' }, { enabled: true })
    expect(seen.contentType).toBe('application/json')
    expect(JSON.parse(seen.body)).toEqual({ enabled: true })
  })

  it("keeps the caller's own type for an object body", async () => {
    const seen = await send({ 'content-type': 'application/merge-patch+json' }, { name: 'x' })
    expect(seen.contentType).toBe('application/merge-patch+json')
    expect(JSON.parse(seen.body)).toEqual({ name: 'x' })
  })

  it('leaves a string body and its declared type alone', async () => {
    const seen = await send({ 'content-type': 'application/x-www-form-urlencoded' }, 'a=1&b=2')
    expect(seen.contentType).toBe('application/x-www-form-urlencoded')
    expect(seen.body).toBe('a=1&b=2')
  })
})
