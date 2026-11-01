import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError, snapshotHttpErrorBody } from '@molecule/app-http'
import { I18nError } from '@molecule/app-i18n'
import { snapshotCredentials } from '@molecule/app-logger'

import { createJWTAuthClient } from '../index.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const response = (data: unknown) => ({
  data,
  status: 422,
  statusText: 'Unprocessable Content',
  headers: { 'x-request-id': 'safe-id' },
  config: { method: 'POST' as const, url: '/safe' },
})

const rejectLogin = async (failure: unknown, mapper = false) => {
  vi.stubGlobal(
    'fetch',
    mapper
      ? vi.fn().mockResolvedValue(new Response('{"user":{"id":"u1"}}', { status: 200 }))
      : vi.fn().mockRejectedValue(failure),
  )
  const client = createJWTAuthClient({
    autoRefresh: false,
    ...(mapper
      ? {
          mapAuthResponse: () => {
            throw failure
          },
        }
      : {}),
  })
  await client.initialize()
  const caught = await client
    .login({ email: 'a@example.test', password: 'input' })
    .catch((error: unknown) => error)
  client.destroy()
  return caught
}

describe('round-seven auth failure invariants', () => {
  it('preserves the ArrayBuffer body kind on an HttpError crossing auth', async () => {
    const input = new Uint8Array([0xff, 0xfe]).buffer
    const original = new HttpError('failed', 422, response(input))
    const caught = (await rejectLogin(original, true)) as HttpError
    expect(caught).not.toBe(original)
    expect(caught).toBeInstanceOf(HttpError)
    expect(caught.status).toBe(422)
    expect(caught.response!.data).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(caught.response!.data as ArrayBuffer)).toEqual(new Uint8Array(input))
  })

  it('preserves a readable safe Blob on an HttpError crossing auth', async () => {
    const body = await snapshotHttpErrorBody(new Blob(['safe body'], { type: 'text/plain' }))
    const original = new HttpError('failed', 422, response(body))
    const caught = (await rejectLogin(original, true)) as HttpError
    expect(caught).toBeInstanceOf(HttpError)
    expect(caught.response!.data).toBeInstanceOf(Blob)
    expect(await (caught.response!.data as Blob).text()).toBe('safe body')
  })

  it('keeps I18nError, HttpError, TypeError, AggregateError and custom safe diagnostics across auth', async () => {
    for (const original of [
      new I18nError('auth.failed', { count: 3 }, 'try again'),
      new TypeError('offline'),
      new AggregateError([new Error('offline')], 'several failed'),
      new HttpError(
        'failed',
        422,
        response({ errors: { password: ['is too short'] }, safe: 'same' }),
      ),
    ]) {
      Object.assign(original, { customDiagnostic: 'safe', cause: { code: 'ENOTFOUND' } })
      const caught = (await rejectLogin(original)) as Error & {
        customDiagnostic: string
        cause: { code: string }
      }
      expect(caught).not.toBe(original)
      expect(caught).toBeInstanceOf(original.constructor)
      expect(caught.customDiagnostic).toBe('safe')
      expect(caught.cause.code).toBe('ENOTFOUND')
    }
  })

  it('closes r5 lazy message and AggregateError payload retention through auth', async () => {
    let reads = 0
    const original = new AggregateError([new Error('/auth?token=aggregate-secret')], 'placeholder')
    Object.defineProperty(original, 'message', {
      get: () => (++reads === 1 ? 'offline' : '/auth?token=accessor-secret'),
      configurable: true,
    })
    const caught = (await rejectLogin(original)) as AggregateError
    expect(reads).toBe(1)
    expect(caught.message).toBe('offline')
    expect(JSON.stringify(snapshotCredentials(caught))).not.toContain('aggregate-secret')
    expect(JSON.stringify(snapshotCredentials(caught))).not.toContain('accessor-secret')
  })
})
