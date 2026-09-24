/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. The real `@sendgrid/mail` client runs;
 * the SendGrid API is replaced by a local HTTP server via `SENDGRID_BASE_URL`
 * (read on the first send).
 *
 * @module
 */
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sendMail, setTransport } from '@molecule/api-emails'

import { provider as sendgrid } from '../index.js'

describe('README @example', () => {
  const originalEnv = process.env
  const requests: Array<{ url: string; auth: string | undefined; body: Record<string, unknown> }> =
    []
  let api: Server

  beforeAll(async () => {
    api = createServer((req, res) => {
      let data = ''
      req.on('data', (chunk: Buffer) => (data += chunk.toString()))
      req.on('end', () => {
        requests.push({
          url: req.url ?? '',
          auth: req.headers.authorization,
          body: JSON.parse(data) as Record<string, unknown>,
        })
        res.writeHead(202, { 'x-message-id': 'sg-msg-1' })
        res.end()
      })
    })
    await new Promise<void>((resolve) => api.listen(0, '127.0.0.1', () => resolve()))
    const { port } = api.address() as AddressInfo
    process.env = {
      ...originalEnv,
      SENDGRID_API_KEY: 'SG.readme-key',
      SENDGRID_BASE_URL: `http://127.0.0.1:${port}`,
      NO_PROXY: '127.0.0.1,localhost',
      no_proxy: '127.0.0.1,localhost',
    }
    delete process.env.SENDGRID_TEST_MODE
    delete process.env.HTTPS_PROXY
    delete process.env.https_proxy
    delete process.env.HTTP_PROXY
    delete process.env.http_proxy
  })

  afterAll(async () => {
    process.env = originalEnv
    await new Promise<void>((resolve) => api.close(() => resolve()))
  })

  it('sends through the SendGrid v3 API and normalizes the result', async () => {
    setTransport(sendgrid)

    const result = await sendMail({
      from: { name: 'Acme', address: 'no-reply@acme.example' },
      to: 'ada@example.com',
      subject: 'Welcome to Acme',
      text: 'Thanks for signing up!',
      html: '<p>Thanks for signing up!</p>',
    })

    expect(result).toEqual({
      accepted: ['ada@example.com'],
      rejected: [],
      messageId: 'sg-msg-1',
      response: '202',
    })
    expect(requests).toHaveLength(1)
    expect(requests[0]?.url).toBe('/v3/mail/send')
    expect(requests[0]?.auth).toBe('Bearer SG.readme-key')
    expect(requests[0]?.body).toMatchObject({
      from: { email: 'no-reply@acme.example', name: 'Acme' },
      subject: 'Welcome to Acme',
      personalizations: [{ to: [{ email: 'ada@example.com' }] }],
    })
  })
})
