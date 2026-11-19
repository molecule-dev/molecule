// @vitest-environment jsdom

/**
 * Profile form late records and profile writes, React's
 * `profile-late-values` cases driven through a real Svelte tree: the profile
 * form is a component under `setMoleculeContext({ auth })`, its native inputs
 * are typed through DOM events, and the auth client is the real JWT client.
 *
 * @module
 */

import { type Component, flushSync } from 'svelte'
import { writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type AuthClient, createJWTAuthClient } from '@molecule/app-auth'

import { mountInContext } from './context-host.js'
import BaseSettings from './profile/BaseSettings.svelte'
import Settings from './profile/Settings.svelte'

const loaded = {
  id: 'reader-1',
  username: 'reader',
  email: 'reader@example.test',
  bio: 'Server bio',
  image: 'server.png',
  tags: ['old'],
}
type User = typeof loaded
type Fields = Omit<User, 'id'>
const defaults: Fields = { username: '', email: '', bio: '', image: '', tags: [] }

const hosts: Array<() => Promise<void>> = []

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { resolve, promise }
}

function setup(initial?: User) {
  const storage = new Map<string, string>()
  const client = createJWTAuthClient<User>({
    autoRefresh: false,
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value)
      },
      removeItem: (key) => {
        storage.delete(key)
      },
    },
  })
  if (initial) client.setSession({ accessToken: 'opaque-token', user: initial })
  const writes: Partial<User>[] = []
  const mutations = vi.spyOn(client, 'updateProfile').mockImplementation(async (patch) => {
    writes.push(patch)
    const saved = { ...loaded, ...client.getUser(), ...patch }
    client.setUser(saved)
    return saved
  })
  return { client, writes, mutations }
}

/**
 * Mounts a component under a real Svelte context carrying the auth client.
 *
 * @param client - The auth client the profile form reads and saves through.
 * @param component - The component to render under that context.
 * @param props - The component's props.
 * @returns The container and the tree's unmount.
 */
function mountTree<T extends Record<string, unknown>>(
  client: AuthClient<User>,
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
const value = (container: ParentNode, label: string): string => field(container, label).value
const output = (container: ParentNode, label: string): string =>
  container.querySelector(`[aria-label="${label}"]`)?.textContent ?? ''

function change(container: ParentNode, label: string, next: string): void {
  const element = field(container, label)
  element.value = next
  element.dispatchEvent(new Event('input', { bubbles: true }))
  flushSync()
}

function typeEdits(container: ParentNode): void {
  change(container, 'Bio', 'Typed bio')
  change(container, 'Image', 'typed.png')
}
function expectEdits(container: ParentNode): void {
  expect(value(container, 'Bio')).toBe('Typed bio')
  expect(value(container, 'Image')).toBe('typed.png')
}

function mountSettings(
  client: AuthClient<User>,
  validate?: (values: Fields) => Promise<Partial<Record<keyof Fields, string>>>,
  initialDefaults?: Fields,
) {
  return mountTree(client, Settings, { validate, initialDefaults })
}

function save(container: ParentNode): void {
  const form = container.querySelector('form')
  if (!form) throw new Error('no settings form')
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  flushSync()
}

async function expectSaved(api: ReturnType<typeof setup>, container: ParentNode) {
  save(container)
  await vi.waitFor(() => expect(api.writes).toHaveLength(1))
  expect(api.writes[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
  expect(api.writes[0].username).not.toBe('')
  expect(api.writes[0].email).not.toBe('')
  expectEdits(container)
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('Settings late records and profile writes', () => {
  it('hydrates the first user after typing', async () => {
    const api = setup()
    const view = mountSettings(api.client)
    typeEdits(view.container)
    api.client.setUser(loaded)
    flushSync()
    expectEdits(view.container)
    expect(value(view.container, 'Username')).toBe('reader')
    expect(value(view.container, 'Email')).toBe('reader@example.test')
    await expectSaved(api, view.container)
  })

  it('retains edits through repeated same-user hydration', async () => {
    const api = setup()
    const view = mountSettings(api.client)
    typeEdits(view.container)
    api.client.setUser(loaded)
    flushSync()
    flushSync()
    api.client.setUser({ ...loaded })
    flushSync()
    expectEdits(view.container)
    await expectSaved(api, view.container)
  })

  it.each(['before submit', 'during validation', 'after submit'] as const)(
    'keeps edits when a profile response lands %s',
    async (when) => {
      const api = setup(loaded)
      const response = deferred<User>()
      const validation = deferred<Partial<Record<keyof Fields, string>>>()
      const view = mountSettings(
        api.client,
        when === 'during validation' ? () => validation.promise : undefined,
      )
      const request = response.promise.then((user) => api.client.setUser(user))
      typeEdits(view.container)
      if (when !== 'before submit') save(view.container)
      if (when === 'after submit') await vi.waitFor(() => expect(api.writes).toHaveLength(1))
      response.resolve({ ...loaded, username: 'background-name' })
      await request
      flushSync()
      expectEdits(view.container)
      if (when === 'during validation') {
        validation.resolve({})
        flushSync()
      }
      if (when === 'before submit') await expectSaved(api, view.container)
      else {
        await vi.waitFor(() => expect(api.writes).toHaveLength(1))
        expect(api.writes[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
      }
      await view.stop()
    },
  )

  it('keeps cleared tags through a late record and submits the clear', async () => {
    const api = setup(loaded)
    const view = mountSettings(api.client, undefined, { ...defaults, tags: ['old'] })
    view.container
      .querySelector<HTMLButtonElement>('button[type="button"]')
      ?.dispatchEvent(new Event('click', { bubbles: true }))
    flushSync()
    typeEdits(view.container)
    api.client.setUser({ ...loaded, tags: ['restored'] })
    flushSync()
    expect(output(view.container, 'Tags')).toBe('[]')
    await expectSaved(api, view.container)
    expect(api.writes[0].tags).toEqual([])
  })

  it('keeps an unchanged field submit error through a selective refresh', async () => {
    const api = setup(loaded)
    const validation = deferred<Partial<Record<keyof Fields, string>>>()
    const view = mountSettings(api.client, () => validation.promise)
    save(view.container)
    api.client.setUser({ ...loaded, bio: 'Background bio' })
    flushSync()
    validation.resolve({ username: 'Rejected name' })
    await vi.waitFor(() =>
      expect(output(view.container, 'Errors')).toBe('{"username":"Rejected name"}'),
    )
    expect(api.mutations).not.toHaveBeenCalled()
  })

  it('sends no blank fields while loading and saves after hydration', async () => {
    const api = setup()
    const view = mountSettings(api.client)
    typeEdits(view.container)
    const saveButton = view.container.querySelector<HTMLButtonElement>('button[type="submit"]')
    expect(saveButton?.disabled).toBe(true)
    save(view.container)
    await Promise.resolve()
    flushSync()
    expect(api.mutations).not.toHaveBeenCalled()
    api.client.setUser(loaded)
    flushSync()
    expectEdits(view.container)
    await expectSaved(api, view.container)
  })
})

it('the base form submits loaded fields with typed edits', async () => {
  const onSubmit = vi.fn<(values: Fields) => void>()
  const options = writable<{
    defaultValues: Fields
    values?: User
    resetOptions?: { keepDirtyValues: boolean }
  }>({ defaultValues: defaults })
  const view = mountTree(setup().client, BaseSettings, { options, onSubmit })
  typeEdits(view.container)
  options.set({ defaultValues: defaults, values: loaded, resetOptions: { keepDirtyValues: true } })
  flushSync()
  expectEdits(view.container)
  save(view.container)
  await vi.waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'reader',
        email: 'reader@example.test',
        bio: 'Typed bio',
        image: 'typed.png',
      }),
    ),
  )
})

it('a native me() read started before save cannot restore the old profile or controls', async () => {
  const api = setup(loaded)
  api.mutations.mockRestore()
  const staleRead = deferred<Response>()
  const patches: Partial<User>[] = []
  const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
    if (String(url).endsWith('/users/me')) return staleRead.promise
    const patch = JSON.parse(String(options.body)) as Partial<User>
    patches.push(patch)
    return new Response(JSON.stringify({ user: { ...loaded, ...patch } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  const view = mountSettings(api.client)
  const read = api.client.validateSession!()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  typeEdits(view.container)
  save(view.container)
  await vi.waitFor(() => expect(api.client.getUser()?.bio).toBe('Typed bio'))
  await vi.waitFor(() => {
    flushSync()
    expect(view.container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(
      false,
    )
  })
  expect(patches).toHaveLength(1)
  expect(patches[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
  expectEdits(view.container)
  staleRead.resolve(
    new Response(JSON.stringify({ user: loaded }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )
  await read
  flushSync()
  expectEdits(view.container)
  expect(api.client.getUser()?.bio).toBe('Typed bio')
})

it('an untouched populated list does not create a profile mutation', async () => {
  const api = setup(loaded)
  const view = mountSettings(api.client, undefined, { ...defaults, tags: ['old'] })
  expect(output(view.container, 'Tags')).toBe('["old"]')
  save(view.container)
  await new Promise((resolve) => setTimeout(resolve, 0))
  flushSync()
  expect(api.mutations).not.toHaveBeenCalled()
})

it('a pristine empty default list hydrates from the late populated user record', async () => {
  const api = setup()
  const view = mountSettings(api.client)
  expect(output(view.container, 'Tags')).toBe('[]')
  api.client.setUser(loaded)
  await Promise.resolve()
  flushSync()
  expect(output(view.container, 'Tags')).toBe('["old"]')
})

it('a real list edit still sends the new list', async () => {
  const api = setup(loaded)
  const view = mountSettings(api.client, undefined, { ...defaults, tags: ['old'] })
  view.container
    .querySelector<HTMLButtonElement>('button[type="button"]')
    ?.dispatchEvent(new Event('click', { bubbles: true }))
  flushSync()
  save(view.container)
  await vi.waitFor(() => expect(api.writes).toEqual([{ tags: [] }]))
})
