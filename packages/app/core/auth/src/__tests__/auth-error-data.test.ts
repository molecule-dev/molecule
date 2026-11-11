import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthError } from '../types.js'
import { flattenErrors } from './fixtures/p318-error-reader.js'

afterEach(() => vi.unstubAllGlobals())

describe('auth error data is available to direct payload readers', () => {
  it.each(['wrong password', 'unknown account'])(
    'keeps %s visible through the retained l2407 reader',
    async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json({ errors: { credentials: ['invalid'] } }, { status: 401 })),
      )
      const client = createJWTAuthClient({ autoRefresh: false })
      let messages: string[] = []
      try {
        await client.login({ email: 'reader@example.test', password: 'incorrect' })
      } catch (error) {
        // l2407 Login.tsx:33: this widely used error-reader shape must keep the server payload.
        messages = flattenErrors((error as { data?: unknown })?.data ?? error)
      }
      expect(messages).toEqual(['credentials invalid'])
      expect(client.getState().authenticated).toBe(false)
    },
  )

  it('keeps a non-benchmark profile validation payload and its credential redaction in each view', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { errors: { displayName: ['too long'] }, password: 'private-value' },
          { status: 422 },
        ),
      ),
    )
    const client = createJWTAuthClient({ autoRefresh: false })
    client.setSession({ accessToken: 'opaque-token', user: { id: 'reader' } })
    const error = await client.updateProfile({ id: 'reader' }).catch((error) => error as AuthError)
    expect(flattenErrors(error.data)).toEqual(['displayName too long'])
    expect(error.data).toEqual(error.body)
    expect(error.data).toEqual(error.response.data)
    expect(JSON.stringify(error)).not.toContain('private-value')
    expect(error.status).toBe(422)
  })

  it('keeps successful login result data and authentication unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ accessToken: 'opaque-token', user: { id: 'reader' } })),
    )
    const client = createJWTAuthClient({ autoRefresh: false })
    expect(await client.login({ email: 'reader@example.test', password: 'correct' })).toMatchObject(
      { user: { id: 'reader' } },
    )
    expect(client.getState().authenticated).toBe(true)
  })
})
