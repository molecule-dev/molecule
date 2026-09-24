/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real axios against a local HTTP
 * server standing in for the remote API.
 *
 * @module
 */
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { get, type HttpError, post, setClient } from '@molecule/api-http'

import { createClient } from '../index.js'

interface Seen {
  method: string
  url: string
  authorization: string | undefined
  body: string
}

describe('README @example', () => {
  const seen: Seen[] = []
  let server: Server
  let baseURL = ''

  const readBody = async (req: IncomingMessage): Promise<string> => {
    let body = ''
    for await (const chunk of req) body += String(chunk)
    return body
  }

  beforeAll(async () => {
    server = createServer((req, res) => {
      void readBody(req).then((body) => {
        seen.push({
          method: req.method ?? '',
          url: req.url ?? '',
          authorization: req.headers.authorization,
          body,
        })
        res.setHeader('content-type', 'application/json')
        if (req.method === 'GET' && req.url === '/repos/nodejs/node') {
          res.end(JSON.stringify({ full_name: 'nodejs/node', stargazers_count: 100000 }))
        } else if (req.method === 'POST' && req.url === '/repos/acme/app/issues') {
          res.statusCode = 201
          res.end(JSON.stringify({ number: 7 }))
        } else {
          res.statusCode = 404
          res.end(JSON.stringify({ message: 'Not Found' }))
        }
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('bonds the axios client and calls through the core with the interceptor applied', async () => {
    process.env.GITHUB_API_TOKEN = 'test-token'

    const client = createClient({ baseURL, timeout: 5000 })
    client.addRequestInterceptor?.((req) => ({
      ...req,
      headers: { ...req.headers, Authorization: `Bearer ${process.env.GITHUB_API_TOKEN ?? ''}` },
    }))
    setClient(client)

    const repo = await get<{ full_name: string; stargazers_count: number }>('/repos/nodejs/node')
    expect(repo.status).toBe(200)
    expect(repo.data.full_name).toBe('nodejs/node')

    const created = await post<{ number: number }>('/repos/acme/app/issues', { title: 'Bug' })
    expect(created.status).toBe(201)
    expect(created.data.number).toBe(7)

    expect(seen.map((s) => [s.method, s.url, s.authorization])).toEqual([
      ['GET', '/repos/nodejs/node', 'Bearer test-token'],
      ['POST', '/repos/acme/app/issues', 'Bearer test-token'],
    ])
    expect(JSON.parse(seen[1]?.body ?? '')).toEqual({ title: 'Bug' })

    // Non-2xx rejects with a normalized HttpError (as the remarks state).
    const error = await get('/missing').catch((e: unknown) => e as HttpError)
    expect(error).toBeInstanceOf(Error)
    expect((error as HttpError).response?.status).toBe(404)

    delete process.env.GITHUB_API_TOKEN
  })
})
