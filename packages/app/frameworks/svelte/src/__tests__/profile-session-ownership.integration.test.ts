// @vitest-environment jsdom

/**
 * Session ownership while saving a profile, React's
 * `profile-session-ownership.integration` cases in the Svelte binding: the
 * profile form saves through the client's configured wire API, and an
 * explicitly replaced pending save session rejects the stale completion.
 *
 * @module
 */

import { createServer, type Server } from 'node:http'

import { type Component, flushSync } from 'svelte'
import { afterEach, expect, it, vi } from 'vitest'

import { type AuthClientConfig, createJWTAuthClient, type StorageAdapter } from '@molecule/app-auth'

import { mountInContext } from './context-host.js'
import OwnedSettings from './profile/OwnedSettings.svelte'

interface WireUser {
  username: string
  email: string
  token: string
  bio: string | null
  image: string | null
}
type Profile = WireUser & { id: string }
const initial: WireUser = {
  username: 'before',
  email: 'before@example.test',
  token: 'opaque-session-credential',
  bio: null,
  image: null,
}
const servers: Server[] = []
const hosts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve())
          server.closeAllConnections()
        }),
    ),
  )
  document.body.innerHTML = ''
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

/**
 * Mounts the owned-settings form under a real Svelte context.
 *
 * @param client - The auth client the form reads and saves through.
 * @param props - The form's props.
 * @returns The container and the tree's unmount.
 */
function mountSettings<T extends Record<string, unknown>>(
  client: ReturnType<typeof createJWTAuthClient<Profile>>,
  component: Component<T>,
  props: T,
): { container: HTMLDivElement; stop: () => Promise<void> } {
  const tree = mountInContext({ auth: client }, component, props)
  hosts.push(tree.stop)
  return tree
}

const field = (container: ParentNode, label: string): HTMLInputElement | HTMLTextAreaElement => {
  const element = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `[aria-label="${label}"]`,
  )
  if (!element) throw new Error(`no field labelled ${label}`)
  return element
}

function change(container: ParentNode, label: string, value: string): void {
  const element = field(container, label)
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  flushSync()
}

function submit(container: ParentNode): void {
  const form = container.querySelector('form')
  if (!form) throw new Error('no settings form')
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  flushSync()
}

it('saves a mutable username and biography through the configured wire API without changing sessions', async () => {
  const { client, config, read, writes } = await setup()
  const revision = client.getSessionRevision!()
  const saved = vi.fn<(user: Profile) => void>()
  const view = mountSettings(client, OwnedSettings, { onSaved: saved })
  change(view.container, 'Username', 'after')
  change(view.container, 'Bio', 'Persisted biography')
  submit(view.container)
  await vi.waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
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
  const saved = vi.fn<(user: Profile) => void>()
  const view = mountSettings(client, OwnedSettings, {
    onSaved: saved,
    getIdentity: (user: Profile) => user.id,
  })
  change(view.container, 'Bio', 'Old session write')
  submit(view.container)
  await vi.waitFor(() => expect(writes).toHaveLength(1))
  const user = client.getUser()!
  const revision = client.getSessionRevision!()
  client.setSession({ accessToken: initial.token, user })
  flushSync()
  expect(client.getSessionRevision!()).not.toBe(revision)
  release()
  await vi.waitFor(() => {
    flushSync()
    expect(view.container.querySelector('[aria-label="Saving"]')?.textContent).toBe('false')
  })
  expect(await read()).toMatchObject({ bio: 'Old session write' })
  expect(client.getUser()).toBe(user)
  expect(client.getUser()!.bio).toBeNull()
  expect(saved).not.toHaveBeenCalled()
})
