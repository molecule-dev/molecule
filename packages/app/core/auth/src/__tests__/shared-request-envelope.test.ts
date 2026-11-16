import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

import { describe, expect, it } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthClientConfigOptions } from '../types.js'

interface Member {
  id: string
  email: string
  bio: string
}

/** A bookshop API accepts an envelope and answers an ignored profile patch with its unchanged user. */
async function accountApi(
  envelope: string | null,
  use: (baseURL: string, requests: unknown[]) => Promise<void>,
): Promise<void> {
  const requests: unknown[] = []
  let member: Member = { id: 'reader-1', email: 'reader@example.test', bio: 'Old biography' }
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(Buffer.from(chunk))
    const body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>
    requests.push(body)
    const payload = (envelope ? body[envelope] : body) as Partial<Member> | undefined
    if (request.url === '/profile') member = { ...member, ...payload }
    else if (!payload?.email) {
      response.writeHead(422)
      response.end('{}')
      return
    }
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ accessToken: 'test-token', user: member }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    await use(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, requests)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

async function exercise(
  baseURL: string,
  options: AuthClientConfigOptions<Member>,
): Promise<Member> {
  const client = createJWTAuthClient<Member>({
    baseURL,
    storage: 'memory',
    autoRefresh: false,
    loginEndpoint: '/login',
    registerEndpoint: '/register',
    profileEndpoint: '/profile',
    ...options,
  })
  try {
    await client.login({ email: 'reader@example.test', password: 'secret' })
    await client.register({ email: 'reader@example.test', password: 'secret' })
    return await client.updateProfile({ bio: 'New biography' })
  } finally {
    client.destroy()
  }
}

describe('one request envelope across authentication and profile writes', () => {
  it('does not silently drop a profile edit when auth already has a body adapter', async () => {
    await accountApi('member', async (baseURL, requests) => {
      const user = await exercise(baseURL, {
        requestEnvelope: 'member',
        mapRequestBody: (payload) => ({ member: payload }),
      })
      expect(user.bio).toBe('New biography')
      expect(requests[2]).toEqual({ member: { bio: 'New biography' } })
    })
  })

  it('wraps login, registration and profile values consistently without per-operation adapters', async () => {
    await accountApi('account', async (baseURL, requests) => {
      expect((await exercise(baseURL, { requestEnvelope: 'account' })).bio).toBe('New biography')
      expect(requests).toHaveLength(3)
      expect(requests.every((body) => Object.keys(body as object).join() === 'account')).toBe(true)
    })
  })

  it('counterexample: explicit operation adapters win over the common envelope', async () => {
    await accountApi('custom', async (baseURL) => {
      const user = await exercise(baseURL, {
        requestEnvelope: 'unused',
        mapRequestBody: (payload) => ({ custom: payload }),
        profileRequestBody: (payload) => ({ custom: payload }),
      })
      expect(user.bio).toBe('New biography')
    })
  })

  it('counterexample: an ordinary flat API keeps flat request bodies', async () => {
    await accountApi(null, async (baseURL, requests) => {
      expect((await exercise(baseURL, {})).bio).toBe('New biography')
      expect(requests[2]).toEqual({ bio: 'New biography' })
    })
  })

  it('rejects an empty envelope name before any request', () => {
    expect(() => createJWTAuthClient({ requestEnvelope: '' })).toThrow('requestEnvelope')
  })
})
