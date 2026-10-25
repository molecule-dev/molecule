// @vitest-environment jsdom

import { createServer, type Server } from 'node:http'

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { type AuthClientConfig, createJWTAuthClient, type StorageAdapter } from '@molecule/app-auth'
import { AuthProvider, useProfileForm } from '@molecule/app-react'

interface WireUser {
  username: string
  email: string
  token: string
  bio: string | null
  image: string | null
}
type Profile = WireUser & { id: string }
type Fields = { username: string; bio: string }
const initial: WireUser = {
  username: 'before',
  email: 'before@example.test',
  token: 'opaque-session-credential',
  bio: null,
  image: null,
}
const servers: Server[] = []

afterEach(async () => {
  cleanup()
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve())
          server.closeAllConnections()
        }),
    ),
  )
})

/** Real HTTP writes and independent reads of the wire contract, without a server-side id. */
async function setup() {
  let persisted = { ...initial }
  const writes: Partial<WireUser>[] = []
  const service = { hold: null as Promise<void> | null }
  const server = createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json')
    response.setHeader('Connection', 'close')
    if (request.url !== '/api/user') {
      response.writeHead(404).end('{}')
      return
    }
    if (request.headers.authorization !== `Token ${initial.token}`) {
      response.writeHead(401).end('{}')
      return
    }
    if (request.method === 'PUT') {
      let body = ''
      for await (const chunk of request) body += String(chunk)
      const patch = (JSON.parse(body) as { user: Partial<WireUser> }).user
      writes.push(patch)
      if (service.hold) await service.hold
      persisted = { ...persisted, ...patch }
    }
    response.end(JSON.stringify({ user: persisted }))
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseURL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const values = new Map<string, string>()
  const storage: StorageAdapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
  const config: AuthClientConfig<Profile> = {
    baseURL,
    storage,
    tokenKey: 'jwtToken',
    authScheme: 'Token',
    autoRefresh: false,
    currentUserEndpoint: '/api/user',
    profileEndpoint: '/api/user',
    profileUpdateMethod: 'PUT',
    profileRequestBody: (data) => ({ user: data }),
    mapAuthResponse: (data) => {
      const { user } = data as { user: WireUser }
      return { accessToken: user.token, user: { ...user, id: user.username } }
    },
  }
  const client = createJWTAuthClient<Profile>(config)
  client.setSession({ accessToken: initial.token, user: { ...initial, id: initial.username } })
  await client.initialize()
  return {
    client,
    config,
    service,
    writes,
    read: async () => {
      const response = await fetch(`${baseURL}/api/user`, {
        headers: { authorization: `Token ${initial.token}` },
      })
      return ((await response.json()) as { user: WireUser }).user
    },
  }
}

function Settings({
  onSaved,
  getIdentity,
}: {
  onSaved: (user: Profile) => void
  getIdentity?: (user: Profile) => string
}) {
  const form = useProfileForm<Profile, Fields>({
    defaultValues: { username: '', bio: '' },
    getIdentity,
    toValues: (user) => ({ username: user.username, bio: user.bio ?? '' }),
    toPatch: (changes) => changes,
    onSaved,
  })
  return (
    <form aria-label="Settings" {...form.formProps}>
      <input aria-label="Username" {...form.register('username')} />
      <textarea aria-label="Bio" {...form.register('bio')} />
      <button type="submit" disabled={form.isSubmitting}>
        Save
      </button>
      <output aria-label="Saving">{String(form.isSubmitting)}</output>
    </form>
  )
}

it('saves a mutable username and biography through the configured wire API without changing sessions', async () => {
  const { client, config, read, writes } = await setup()
  const revision = client.getSessionRevision!()
  const saved = vi.fn()
  render(
    <AuthProvider client={client}>
      <Settings onSaved={saved} />
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'after' } })
  fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'Persisted biography' } })
  fireEvent.submit(screen.getByRole('form', { name: 'Settings' }))
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
  expect(writes).toEqual([{ username: 'after', bio: 'Persisted biography' }])
  expect(saved.mock.calls[0][0]).toMatchObject({
    username: 'after',
    id: 'after',
    bio: 'Persisted biography',
  })
  expect(client.getAccessToken()).toBe(initial.token)
  expect(client.getSessionRevision!()).toBe(revision)
  expect(client.getState().status).toBe('authenticated')
  expect(await read()).toMatchObject({ username: 'after', bio: 'Persisted biography' })
  const restored = createJWTAuthClient<Profile>(config)
  await restored.initialize()
  const validateSession = restored.validateSession
  if (!validateSession) throw new Error('the JWT auth client must expose validateSession')
  await validateSession()
  expect(restored.getUser()).toMatchObject({
    username: 'after',
    id: 'after',
    bio: 'Persisted biography',
  })
})

it('rejects stale completion when the same token and user explicitly replace a pending save session', async () => {
  const { client, service, writes, read } = await setup()
  let release!: () => void
  service.hold = new Promise<void>((resolve) => {
    release = resolve
  })
  const saved = vi.fn()
  render(
    <AuthProvider client={client}>
      <Settings onSaved={saved} getIdentity={(user) => user.id} />
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'Old session write' } })
  fireEvent.submit(screen.getByRole('form', { name: 'Settings' }))
  await waitFor(() => expect(writes).toHaveLength(1))
  const user = client.getUser()!
  const revision = client.getSessionRevision!()
  act(() => client.setSession({ accessToken: initial.token, user }))
  expect(client.getSessionRevision!()).not.toBe(revision)
  await act(async () => release())
  await waitFor(() => expect(screen.getByLabelText('Saving').textContent).toBe('false'))
  expect(await read()).toMatchObject({ bio: 'Old session write' })
  expect(client.getUser()).toBe(user)
  expect(client.getUser()!.bio).toBeNull()
  expect(saved).not.toHaveBeenCalled()
})
