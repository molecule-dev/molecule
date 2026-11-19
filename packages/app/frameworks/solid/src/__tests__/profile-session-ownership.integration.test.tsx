// @vitest-environment jsdom

/**
 * Profile saves through the configured wire API, and what a replacement session
 * does to a save that is still in flight.
 *
 * Mirrors the React package's `profile-session-ownership.integration.test.tsx`.
 *
 * @module
 */

import { createServer, type Server } from 'node:http'

import { createComponent, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, expect, it, vi } from 'vitest'

import { type AuthClientConfig, createJWTAuthClient, type StorageAdapter } from '@molecule/app-auth'

import { AuthContext } from '../context.js'
import { useProfileForm } from '../primitives/react-forms.js'

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
const disposers: Array<() => void> = []

afterEach(async () => {
  for (const dispose of disposers.splice(0)) dispose()
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

/** The profile page over `useProfileForm`. */
function Settings(props: {
  onSaved: (user: Profile) => void
  getIdentity?: (user: Profile) => string
}): JSX.Element {
  const form = useProfileForm<Profile, Fields>({
    defaultValues: { username: '', bio: '' },
    getIdentity: props.getIdentity,
    toValues: (user) => ({ username: user.username, bio: user.bio ?? '' }),
    toPatch: (changes) => changes,
    onSaved: props.onSaved,
  })
  const username = form.register('username')
  const bio = form.register('bio')
  const values = (): Fields => form.formState().values
  return (
    <form aria-label="Settings" onSubmit={form.formProps.onSubmit}>
      <input
        aria-label="Username"
        name="username"
        value={values().username}
        onInput={username.onChange}
      />
      <textarea aria-label="Bio" name="bio" value={values().bio} onInput={bio.onChange} />
      <button type="submit" disabled={form.isSubmitting()}>
        Save
      </button>
      <output aria-label="Saving">{String(form.isSubmitting())}</output>
    </form>
  )
}

/**
 * Renders a tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container it rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/**
 * Mounts {@link Settings} under the auth context.
 *
 * @param client - The auth client the page reads.
 * @param props - The page's saved callback and optional identity.
 * @returns The rendered container.
 */
function mountSettings(
  client: Awaited<ReturnType<typeof setup>>['client'],
  props: { onSaved: (user: Profile) => void; getIdentity?: (user: Profile) => string },
): HTMLElement {
  return mount(() =>
    createComponent(AuthContext.Provider, {
      value: client,
      get children() {
        return createComponent(Settings, props)
      },
    }),
  )
}

/**
 * The element matching a selector, or a failure naming it.
 *
 * @param container - The rendered tree.
 * @param selector - The CSS selector.
 * @returns The matching element.
 */
function query<T extends Element>(container: HTMLElement, selector: string): T {
  const element = container.querySelector<T>(selector)
  if (!element) throw new Error(`no element matched ${selector}`)
  return element
}

/**
 * Types into a labeled control the way a person does.
 *
 * @param container - The rendered tree.
 * @param label - The control's `aria-label`.
 * @param next - The text to type.
 */
function typeInto(container: HTMLElement, label: string, next: string): void {
  const element = query<HTMLInputElement | HTMLTextAreaElement>(
    container,
    `[aria-label="${label}"]`,
  )
  element.value = next
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Submits the settings form. */
function save(container: HTMLElement): void {
  query(container, 'form[aria-label="Settings"]').dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  )
}

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Retries an assertion until it passes or the deadline expires.
 *
 * @param assertion - The assertion to retry.
 * @param timeoutMs - How long to keep retrying.
 * @returns A promise resolved once the assertion passes.
 */
async function waitFor(assertion: () => void, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      assertion()
      return
    } catch (error) {
      if (Date.now() > deadline) throw error
      await settle()
    }
  }
}

it('saves a mutable username and biography through the configured wire API without changing sessions', async () => {
  const { client, config, read, writes } = await setup()
  const revision = client.getSessionRevision!()
  const saved = vi.fn<(user: Profile) => void>()
  const container = mountSettings(client, { onSaved: saved })
  typeInto(container, 'Username', 'after')
  typeInto(container, 'Bio', 'Persisted biography')
  save(container)
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
  const saved = vi.fn<(user: Profile) => void>()
  const container = mountSettings(client, {
    onSaved: saved,
    getIdentity: (user) => user.id,
  })
  typeInto(container, 'Bio', 'Old session write')
  save(container)
  await waitFor(() => expect(writes).toHaveLength(1))
  const user = client.getUser()!
  const revision = client.getSessionRevision!()
  client.setSession({ accessToken: initial.token, user })
  await settle()
  expect(client.getSessionRevision!()).not.toBe(revision)
  release()
  await waitFor(() =>
    expect(query<HTMLOutputElement>(container, 'output[aria-label="Saving"]').textContent).toBe(
      'false',
    ),
  )
  expect(await read()).toMatchObject({ bio: 'Old session write' })
  expect(client.getUser()).toBe(user)
  expect(client.getUser()!.bio).toBeNull()
  expect(saved).not.toHaveBeenCalled()
})
