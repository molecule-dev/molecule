/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `api.hellosign.com`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSignatureRequest, getSignatureRequest, setProvider } from '@molecule/api-esign'

import { provider } from '../index.js'

const signatureRequest = {
  signature_request_id: 'fa5c8a0b0f492d768749333ad6fcc214c111e967',
  is_complete: false,
  is_declined: false,
  has_error: false,
  signatures: [
    {
      signer_email_address: 'ada@example.com',
      signer_name: 'Ada Lovelace',
      status_code: 'awaiting_signature',
      signed_at: null,
    },
  ],
}

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, HELLOSIGN_API_KEY: 'test-key' }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends a URL document for signature and reads its status back', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ signature_request: signatureRequest }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(provider)

    const request = await createSignatureRequest({
      title: 'Consulting Agreement',
      message: 'Please review and sign.',
      signers: [{ name: 'Ada Lovelace', email: 'ada@example.com' }],
      document: { url: 'https://files.example.com/contracts/consulting.pdf' },
    })

    const latest = await getSignatureRequest(request.id)
    console.log(latest.status)

    expect(request).toEqual({
      id: 'fa5c8a0b0f492d768749333ad6fcc214c111e967',
      status: 'awaiting_signatures',
      signers: [{ name: 'Ada Lovelace', email: 'ada@example.com', status: 'pending' }],
    })
    expect(log).toHaveBeenCalledWith('awaiting_signatures')

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://api.hellosign.com/v3/signature_request/send')
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('test-key:').toString('base64')}`,
    )
    expect(JSON.parse(String(init?.body))).toMatchObject({
      title: 'Consulting Agreement',
      signers: [{ name: 'Ada Lovelace', email_address: 'ada@example.com' }],
      file_url: ['https://files.example.com/contracts/consulting.pdf'],
    })
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      'https://api.hellosign.com/v3/signature_request/fa5c8a0b0f492d768749333ad6fcc214c111e967',
    )
  })
})
