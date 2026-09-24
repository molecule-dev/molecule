/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the HelloSign bond: calls to
 * the Dropbox Sign API (`fetch`) are stubbed, while the webhook is delivered
 * over real HTTP to a real Express app with a correctly signed event.
 *
 * @module
 */
import { createHmac } from 'node:crypto'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provider as hellosign } from '@molecule/api-esign-hellosign'

import { createSignatureRequest, processWebhook, setProvider } from '../index.js'

const API_KEY = 'test-key'
const realFetch = globalThis.fetch

const signedEvent = (eventType: string, signatureRequestId: string): string => {
  const eventTime = String(Math.floor(Date.now() / 1000))
  const eventHash = createHmac('sha256', API_KEY)
    .update(eventTime + eventType)
    .digest('hex')
  const json = JSON.stringify({
    event: { event_time: eventTime, event_type: eventType, event_hash: eventHash },
    signature_request: { signature_request_id: signatureRequestId, signatures: [] },
  })
  return new URLSearchParams({ json }).toString()
}

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('HELLOSIGN_API_KEY', API_KEY)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('creates a pending request, then flips it to signed only on a verified webhook', async () => {
    const vendorCalls: Array<{ url: string; body: unknown }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input)
        if (!url.startsWith('https://api.hellosign.com/')) return realFetch(input, init)
        vendorCalls.push({ url, body: JSON.parse(String(init?.body)) })
        return new Response(
          JSON.stringify({
            signature_request: {
              signature_request_id: 'sig_abc123',
              is_complete: false,
              signatures: [
                {
                  signer_email_address: 'alice@example.com',
                  signer_name: 'Alice Tenant',
                  signer_role: 'Tenant',
                  status_code: 'awaiting_signature',
                },
              ],
            },
          }),
          { headers: { 'content-type': 'application/json' } },
        )
      }),
    )

    setProvider(hellosign)

    const contracts = new Map<string, { title: string; status: string }>()

    const request = await createSignatureRequest({
      title: 'Lease Agreement',
      signers: [{ name: 'Alice Tenant', email: 'alice@example.com', role: 'Tenant' }],
      document: { url: 'https://files.example.com/lease.pdf', filename: 'lease.pdf' },
    })
    contracts.set(request.id, { title: 'Lease Agreement', status: request.status })

    expect(request).toMatchObject({ id: 'sig_abc123', status: 'awaiting_signatures' })
    expect(vendorCalls[0]?.url).toBe('https://api.hellosign.com/v3/signature_request/send')
    expect(vendorCalls[0]?.body).toMatchObject({
      title: 'Lease Agreement',
      file_url: ['https://files.example.com/lease.pdf'],
    })

    const app = express()
    app.post('/webhooks/esign', express.urlencoded({ extended: false }), async (req, res) => {
      const event = await processWebhook(req.headers, req.body).catch((error: unknown) => {
        console.warn('Rejected e-sign webhook', error)
        return null
      })
      if (!event) {
        res.status(400).end()
        return
      }
      const contract = contracts.get(event.signatureRequestId)
      if (contract && event.type === 'signature_request_all_signed') contract.status = 'signed'
      res.status(200).send('Hello API Event Received')
    })

    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    const { port } = server.address() as AddressInfo
    const post = (body: string): Promise<Response> =>
      realFetch(`http://127.0.0.1:${port}/webhooks/esign`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      })

    try {
      const good = signedEvent('signature_request_all_signed', 'sig_abc123')
      const forged = await post(
        good.replace(/event_hash%22%3A%22[0-9a-f]+/, 'event_hash%22%3A%22deadbeef'),
      )
      expect(forged.status).toBe(400)
      expect(contracts.get('sig_abc123')?.status).toBe('awaiting_signatures')

      const delivered = await post(good)
      expect(delivered.status).toBe(200)
      expect(await delivered.text()).toBe('Hello API Event Received')
      expect(contracts.get('sig_abc123')?.status).toBe('signed')
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
