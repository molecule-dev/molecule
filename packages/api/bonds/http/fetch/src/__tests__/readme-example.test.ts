/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real global `fetch` against a local
 * HTTP server standing in for the remote APIs.
 *
 * @module
 */
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { get, type HttpError, post, setClient } from '@molecule/api-http'

import { provider } from '../index.js'

describe('README @example', () => {
  const seen: Array<{ method: string; url: string; contentType?: string; body: string }> = []
  let server: Server
  let origin = ''

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
          contentType: req.headers['content-type'],
          body,
        })
        res.setHeader('content-type', 'application/json')
        if (req.method === 'GET' && req.url?.startsWith('/users/octocat/repos')) {
          res.end(JSON.stringify([{ name: 'hello-world' }, { name: 'spoon-knife' }]))
        } else if (req.method === 'POST' && req.url === '/anything') {
          res.end(JSON.stringify({ json: JSON.parse(body) as unknown }))
        } else {
          res.statusCode = 404
          res.statusMessage = 'Not Found'
          res.end(JSON.stringify({ message: 'Not Found' }))
        }
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('bonds the fetch client and calls through the core', async () => {
    setClient(provider)

    const repos = await get<Array<{ name: string }>>('/users/octocat/repos', {
      baseURL: origin,
      params: { per_page: 5, sort: 'updated' },
      timeout: 5000,
    })
    expect(repos.status).toBe(200)
    expect(repos.data.map((r) => r.name)).toEqual(['hello-world', 'spoon-knife'])
    expect(seen[0]?.url).toBe('/users/octocat/repos?per_page=5&sort=updated')

    const echoed = await post<{ json: { title: string } }>(`${origin}/anything`, {
      title: 'Bug',
    })
    expect(echoed.data.json).toEqual({ title: 'Bug' })
    expect(seen[1]?.contentType).toBe('application/json')

    const error = await get(`${origin}/missing`).catch((e: unknown) => e as HttpError)
    expect((error as HttpError).message).toBe('HTTP 404: Not Found')
    expect((error as HttpError).response?.status).toBe(404)
  })
})
