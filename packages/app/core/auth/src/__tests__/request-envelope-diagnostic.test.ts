import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as Logger from '@molecule/app-logger'

import { createJWTAuthClient } from '../client.js'
import { fieldsSentButReportedMissing } from '../request-envelope.js'

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }))
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof Logger>()),
  getLogger: () => ({ warn, debug: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

const blank = {
  errors: { email: ["can't be blank"], password: ["can't be blank"], username: ["can't be blank"] },
}
const signUp = { email: 'person@example.invalid', password: 'fixture-password', username: 'person' }

const answer = (status: number, body: unknown): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status })),
  )
}

beforeEach(() => warn.mockReset())
afterEach(() => vi.unstubAllGlobals())

describe('a login/register body the API wanted inside an envelope', () => {
  it('names the fields and mapRequestBody once when every sent field is reported missing', async () => {
    answer(422, blank)
    const client = createJWTAuthClient({ storage: 'memory', autoRefresh: false })
    await expect(client.register(signUp)).rejects.toMatchObject({ status: 422 })
    await expect(client.register(signUp)).rejects.toMatchObject({ status: 422 })
    expect(warn).toHaveBeenCalledTimes(1)
    const text = String(warn.mock.calls[0][0])
    expect(text).toContain('email, password, username')
    expect(text).toContain('mapRequestBody: (data) => ({ user: data })')
    // The credential is never part of the diagnostic.
    expect(JSON.stringify(warn.mock.calls)).not.toContain('fixture-password')
  })

  it('reads a list of field errors too', async () => {
    answer(400, {
      errors: [
        { path: 'email', msg: 'Required' },
        { path: 'password', msg: 'Required' },
      ],
    })
    const client = createJWTAuthClient({ storage: 'memory', autoRefresh: false })
    await expect(
      client.login({ email: signUp.email, password: signUp.password }),
    ).rejects.toBeTruthy()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('login request sent email, password')
  })

  it.each([
    ['a field rejected for another reason', 422, { errors: { email: ['has already been taken'] } }],
    ['wrong credentials', 401, { errors: { 'email or password': ['is invalid'] } }],
    ['a server failure', 500, blank],
    ['a message-only answer', 422, { error: 'Validation failed' }],
  ])('stays quiet for %s', async (_label, status, body) => {
    answer(status, body)
    const client = createJWTAuthClient({ storage: 'memory', autoRefresh: false })
    await expect(client.register(signUp)).rejects.toBeTruthy()
    expect(warn).not.toHaveBeenCalled()
  })

  it('stays quiet when a body mapper is configured', async () => {
    answer(422, blank)
    for (const config of [
      { mapRequestBody: (data: Record<string, unknown>) => ({ account: data }) },
      { requestBody: (_kind: 'login' | 'register', data: Record<string, unknown>) => data },
    ]) {
      const client = createJWTAuthClient({ storage: 'memory', autoRefresh: false, ...config })
      await expect(client.register(signUp)).rejects.toBeTruthy()
    }
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('fieldsSentButReportedMissing', () => {
  it('requires every named field to have been sent non-empty', () => {
    expect(fieldsSentButReportedMissing(signUp, blank)).toEqual(['email', 'password', 'username'])
    expect(fieldsSentButReportedMissing({ ...signUp, username: '' }, blank)).toEqual([])
    expect(fieldsSentButReportedMissing({ email: 'a@b.c' }, { email: ['is required'] })).toEqual([
      'email',
    ])
    expect(fieldsSentButReportedMissing(signUp, {})).toEqual([])
    expect(fieldsSentButReportedMissing(null, blank)).toEqual([])
  })
})
