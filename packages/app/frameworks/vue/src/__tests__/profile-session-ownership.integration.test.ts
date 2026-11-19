// @vitest-environment jsdom

/**
 * A signed-in profile save over the real wire contract: the configured profile
 * transport, the shared user every `useAuth` reader sees, and a `useProfileForm`
 * that keeps a pending save owned by the session it started on.
 *
 * @module
 */

import { createServer, type Server } from 'node:http'

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

import { type AuthClientConfig, createJWTAuthClient, type StorageAdapter } from '@molecule/app-auth'

import { useProfileForm } from '../composables/useProfileForm.js'
import { moleculePlugin } from '../plugin.js'

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
const wrappers: VueWrapper[] = []

afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve())
          server.closeAllConnections()
        }),
    ),
  )
  vi.unstubAllGlobals()
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
 * The settings page: a profile form over the fields the app edits.
 *
 * @param onSaved - Records the saved profile.
 * @param getIdentity - Optional explicit account identity check.
 * @returns The page component.
 */
function Settings({
  onSaved,
  getIdentity,
}: {
  onSaved: (user: Profile) => void
  getIdentity?: (user: Profile) => string
}) {
  return defineComponent({
    setup() {
      const form = useProfileForm<Profile, Fields>({
        defaultValues: { username: '', bio: '' },
        getIdentity,
        toValues: (user) => ({ username: user.username, bio: user.bio ?? '' }),
        toPatch: (changes) => changes,
        onSaved,
      })
      const bind = (name: keyof Fields) => {
        const registration = form.register(name)
        return {
          name: registration.name,
          onChange: registration.onChange,
          value: form.formState.value.values[name],
        }
      }
      return () =>
        h('form', { 'aria-label': 'Settings', onSubmit: form.formProps.onSubmit }, [
          h('input', { 'aria-label': 'Username', ...bind('username') }),
          h('textarea', { 'aria-label': 'Bio', ...bind('bio') }),
          h('button', { type: 'submit', disabled: form.isSubmitting.value }, 'Save'),
          h('output', { 'aria-label': 'Saving' }, String(form.isSubmitting.value)),
        ])
    },
  })
}

/**
 * Types into a native control and fires the `change` the form binding listens to.
 *
 * @param wrapper - The mounted wrapper.
 * @param selector - The control selector.
 * @param value - The text to type.
 */
async function typeInto(wrapper: VueWrapper, selector: string, value: string): Promise<void> {
  const control = wrapper.get(selector)
  if (
    control.element instanceof HTMLInputElement ||
    control.element instanceof HTMLTextAreaElement
  ) {
    control.element.value = value
  }
  await control.trigger('change')
}

it('saves a mutable username and biography through the configured wire API without changing sessions', async () => {
  const { client, config, read, writes } = await setup()
  const revision = client.getSessionRevision!()
  const saved = vi.fn<(user: Profile) => void>()
  const wrapper = mount(Settings({ onSaved: saved }), {
    global: { plugins: [[moleculePlugin, { auth: client }]] },
  })
  wrappers.push(wrapper)
  await typeInto(wrapper, 'input[aria-label="Username"]', 'after')
  await typeInto(wrapper, 'textarea[aria-label="Bio"]', 'Persisted biography')
  await wrapper.get('form').trigger('submit')
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
  const wrapper = mount(Settings({ onSaved: saved, getIdentity: (user) => user.id }), {
    global: { plugins: [[moleculePlugin, { auth: client }]] },
  })
  wrappers.push(wrapper)
  await typeInto(wrapper, 'textarea[aria-label="Bio"]', 'Old session write')
  await wrapper.get('form').trigger('submit')
  await vi.waitFor(() => expect(writes).toHaveLength(1))
  const user = client.getUser()!
  const revision = client.getSessionRevision!()
  client.setSession({ accessToken: initial.token, user })
  await nextTick()
  expect(client.getSessionRevision!()).not.toBe(revision)
  release()
  await vi.waitFor(() => expect(wrapper.get('output[aria-label="Saving"]').text()).toBe('false'))
  expect(await read()).toMatchObject({ bio: 'Old session write' })
  expect(client.getUser()).toBe(user)
  expect(client.getUser()!.bio).toBeNull()
  expect(saved).not.toHaveBeenCalled()
})
