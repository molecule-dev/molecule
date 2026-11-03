/** The bonded fetch provider must preserve caller content types on the real wire. */
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { fetchClient } from '../provider.js'

interface Seen {
  contentType: string
  body: string
}

let server: Server
let url: string

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      body += chunk
    })
    req.on('end', () => {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ contentType: req.headers['content-type'], body }))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/items`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
})

describe('bonded fetch content type', () => {
  it.each(['content-type', 'CONTENT-TYPE', 'cOnTeNt-TyPe'])(
    'sends one JSON type for the caller spelling %s',
    async (name) => {
      const headers = { [name]: 'application/json' }
      const { data } = await fetchClient.put<Seen>(url, { enabled: true }, { headers })
      expect(data.contentType).toBe('application/json')
      expect(JSON.parse(data.body)).toEqual({ enabled: true })
      expect(headers).toEqual({ [name]: 'application/json' })
    },
  )

  it('preserves a custom lower-case JSON media type', async () => {
    const { data } = await fetchClient.patch<Seen>(
      url,
      { name: 'new' },
      {
        headers: { 'content-type': 'application/merge-patch+json' },
      },
    )
    expect(data.contentType).toBe('application/merge-patch+json')
    expect(JSON.parse(data.body)).toEqual({ name: 'new' })
  })

  it('control: retains the default JSON type when no type is declared', async () => {
    const { data } = await fetchClient.post<Seen>(url, { name: 'new' })
    expect(data.contentType).toBe('application/json')
    expect(JSON.parse(data.body)).toEqual({ name: 'new' })
  })

  it('control: preserves a canonical content type and a raw string body', async () => {
    const { data } = await fetchClient.post<Seen>(url, 'a=1&b=2', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    expect(data.contentType).toBe('application/x-www-form-urlencoded')
    expect(data.body).toBe('a=1&b=2')
  })
})
