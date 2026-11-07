import { createServer } from 'node:http'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthClient, AuthClientConfigOptions, UserProfile } from '../types.js'

let baseURL = ''
const received: Array<{ path: string; body: unknown; status: number }> = []
const clients: Array<AuthClient<UserProfile, { username: string }>> = []
const server = createServer(async (request, response) => {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  const body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>
  const key = request.url === '/members' ? 'member' : 'user'
  const user = body[key]
  const valid =
    user !== null &&
    typeof user === 'object' &&
    typeof (user as Record<string, unknown>).username === 'string' &&
    typeof (user as Record<string, unknown>).email === 'string' &&
    typeof (user as Record<string, unknown>).password === 'string'
  received.push({ path: request.url ?? '', body, status: valid ? 200 : 422 })
  response.writeHead(valid ? 200 : 422, { 'content-type': 'application/json' })
  response.end(
    JSON.stringify(
      valid
        ? { accessToken: 'local-token', user: { id: 'person', email: 'reader@example.test' } }
        : { error: 'Expected an account object containing username, email and password' },
    ),
  )
})

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Account fixture listener unavailable')
  baseURL = `http://127.0.0.1:${address.port}`
})
afterEach(() => {
  for (const client of clients.splice(0)) client.destroy()
  received.length = 0
})
afterAll(async () => {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
})

function client(config: AuthClientConfigOptions): AuthClient<UserProfile, { username: string }> {
  const result = createJWTAuthClient<UserProfile, { username: string }>({
    baseURL,
    registerEndpoint: '/users',
    storage: 'memory',
    autoRefresh: false,
    ...config,
  })
  clients.push(result)
  return result
}
const values = { username: 'reader', email: 'reader@example.test', password: 'sample-password' }

describe('auth body adapters at a strict HTTP boundary', () => {
  it('reproduces the recorded Registration failed cause: user is the operation string', async () => {
    const auth = client({ requestBody: (data: unknown) => ({ user: data }) })
    await expect(auth.register(values)).rejects.toThrow('Expected an account object')
    expect(received).toEqual([{ path: '/users', body: { user: 'register' }, status: 422 }])
  })

  it('makes the natural one-argument adapter send the complete typed registration', async () => {
    const auth = client({ mapRequestBody: (data: unknown) => ({ user: data }) })
    await auth.register(values)
    expect(received).toEqual([{ path: '/users', body: { user: values }, status: 200 }])
    expect(auth.getUser()).toMatchObject({ id: 'person' })
  })

  it('keeps the existing scaffold’s two-argument request adapter working', async () => {
    await client({ requestBody: (_kind, payload) => ({ user: payload }) }).register(values)
    expect(received[0]).toMatchObject({ body: { user: values }, status: 200 })
  })

  it('supports a non-X1 membership API with a different endpoint and envelope', async () => {
    await client({
      registerEndpoint: '/members',
      mapRequestBody: (payload) => ({ member: payload }),
    }).register(values)
    expect(received).toEqual([{ path: '/members', body: { member: values }, status: 200 }])
  })
})
