/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the sink is bonded through the real
 * activity core; only the network (`fetch`) is mocked.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { record, setSink } from '@molecule/api-activity'

import { createHttpSink } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds the HTTP sink and POSTs each recorded event as JSON', async () => {
    vi.stubEnv('MOLECULE_ACTIVITY_URL', 'https://my-app.example/v1/activity')
    vi.stubEnv('MOLECULE_VAULT_TOKEN', 'mvt_test')
    vi.stubEnv('MOLECULE_APP_ID', 'app-123')
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    setSink(
      createHttpSink({
        url: process.env.MOLECULE_ACTIVITY_URL,
        token: process.env.MOLECULE_VAULT_TOKEN,
        appId: process.env.MOLECULE_APP_ID,
      }),
    )

    const event = {
      id: crypto.randomUUID(),
      type: 'email' as const,
      status: 'captured' as const,
      recipient: 'user@example.com',
      summary: 'Welcome email',
      timestamp: new Date().toISOString(),
    }
    await record(event)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://my-app.example/v1/activity')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer mvt_test',
      'X-Molecule-App-Id': 'app-123',
    })
    expect(JSON.parse(init.body as string)).toEqual(event)
  })

  it('sends nothing when no URL is configured', async () => {
    vi.stubEnv('MOLECULE_ACTIVITY_URL', '')
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    setSink(createHttpSink({ url: process.env.MOLECULE_ACTIVITY_URL || undefined }))
    await record({
      id: 'evt-2',
      type: 'sms',
      status: 'sent',
      timestamp: new Date().toISOString(),
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
