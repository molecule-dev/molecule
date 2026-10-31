// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'

import { AuthContext } from '../contexts.js'
import { useForm } from '../hooks/useForm.js'
import { useProfileForm } from '../hooks/useProfileForm.js'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

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

function Settings({
  validate,
  initialDefaults = defaults,
}: {
  validate?: (values: Fields) => Promise<Partial<Record<keyof Fields, string>>>
  initialDefaults?: Fields
}) {
  const form = useProfileForm<User, Fields>({
    defaultValues: initialDefaults,
    toValues: ({ username, email, bio, image, tags }) => ({
      username,
      email,
      bio,
      image,
      tags,
    }),
    toPatch: (changes) => changes,
    validate,
  })
  return (
    <form aria-label="Settings" {...form.formProps}>
      <input aria-label="Username" {...form.register('username')} />
      <input aria-label="Email" {...form.register('email')} />
      <textarea aria-label="Bio" {...form.register('bio')} />
      <input aria-label="Image" {...form.register('image')} />
      <output aria-label="Tags">{JSON.stringify(form.getValue('tags'))}</output>
      <output aria-label="Errors">{JSON.stringify(form.formState.errors)}</output>
      <button type="button" onClick={() => form.setValue('tags', [])}>
        Clear tags
      </button>
      <button type="submit" disabled={!form.ready || form.isSubmitting}>
        Save
      </button>
    </form>
  )
}

const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value
function typeEdits() {
  fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'Typed bio' } })
  fireEvent.change(screen.getByLabelText('Image'), { target: { value: 'typed.png' } })
}
function expectEdits() {
  expect(value('Bio')).toBe('Typed bio')
  expect(value('Image')).toBe('typed.png')
}
function mount(
  client: ReturnType<typeof setup>['client'],
  validate?: Parameters<typeof Settings>[0]['validate'],
  initialDefaults?: Fields,
) {
  return render(
    createElement(
      AuthContext.Provider,
      { value: client },
      <Settings validate={validate} initialDefaults={initialDefaults} />,
    ),
  )
}
function save() {
  fireEvent.submit(screen.getByRole('form', { name: 'Settings' }))
}
async function expectSaved(api: ReturnType<typeof setup>) {
  save()
  await waitFor(() => expect(api.writes).toHaveLength(1))
  expect(api.writes[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
  expect(api.writes[0].username).not.toBe('')
  expect(api.writes[0].email).not.toBe('')
  expectEdits()
}

describe('Settings late records and profile writes', () => {
  it('hydrates the first user after typing', async () => {
    const api = setup()
    mount(api.client)
    typeEdits()
    act(() => api.client.setUser(loaded))
    expectEdits()
    expect(value('Username')).toBe('reader')
    expect(value('Email')).toBe('reader@example.test')
    await expectSaved(api)
  })

  it('retains edits through repeated same-user hydration', async () => {
    const api = setup()
    const view = mount(api.client)
    typeEdits()
    act(() => api.client.setUser(loaded))
    view.rerender(createElement(AuthContext.Provider, { value: api.client }, <Settings />))
    act(() => api.client.setUser({ ...loaded }))
    expectEdits()
    await expectSaved(api)
  })

  it.each(['before submit', 'during validation', 'after submit'] as const)(
    'keeps edits when a profile response lands %s',
    async (when) => {
      const api = setup(loaded)
      const response = deferred<User>()
      const validation = deferred<Partial<Record<keyof Fields, string>>>()
      const view = mount(
        api.client,
        when === 'during validation' ? () => validation.promise : undefined,
      )
      const request = response.promise.then((user) => api.client.setUser(user))
      typeEdits()
      if (when !== 'before submit') save()
      if (when === 'after submit') await waitFor(() => expect(api.writes).toHaveLength(1))
      await act(async () => {
        response.resolve({ ...loaded, username: 'background-name' })
        await request
      })
      expectEdits()
      if (when === 'during validation') {
        await act(async () => validation.resolve({}))
      }
      if (when === 'before submit') await expectSaved(api)
      else {
        await waitFor(() => expect(api.writes).toHaveLength(1))
        expect(api.writes[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
      }
      view.unmount()
    },
  )

  it('keeps cleared tags through a late record and submits the clear', async () => {
    const api = setup(loaded)
    mount(api.client, undefined, { ...defaults, tags: ['old'] })
    fireEvent.click(screen.getByRole('button', { name: 'Clear tags' }))
    typeEdits()
    act(() => api.client.setUser({ ...loaded, tags: ['restored'] }))
    expect(screen.getByLabelText('Tags').textContent).toBe('[]')
    await expectSaved(api)
    expect(api.writes[0].tags).toEqual([])
  })

  it('keeps an unchanged field submit error through a selective refresh', async () => {
    const api = setup(loaded)
    const validation = deferred<Partial<Record<keyof Fields, string>>>()
    mount(api.client, () => validation.promise)
    save()
    act(() => api.client.setUser({ ...loaded, bio: 'Background bio' }))
    await act(async () => validation.resolve({ username: 'Rejected name' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Errors').textContent).toBe('{"username":"Rejected name"}'),
    )
    expect(api.mutations).not.toHaveBeenCalled()
  })

  it('sends no blank fields while loading and saves after hydration', async () => {
    const api = setup()
    mount(api.client)
    typeEdits()
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true)
    save()
    await act(async () => {
      await Promise.resolve()
    })
    expect(api.mutations).not.toHaveBeenCalled()
    act(() => api.client.setUser(loaded))
    expectEdits()
    await expectSaved(api)
  })
})

it('the base form submits loaded fields with typed edits', async () => {
  const onSubmit = vi.fn()
  function BaseSettings({ user }: { user?: User }) {
    const form = useForm<Fields>({
      defaultValues: defaults,
      values: user,
      resetOptions: { keepDirtyValues: true },
    })
    return (
      <form aria-label="Settings" onSubmit={form.handleSubmit(onSubmit)}>
        <textarea aria-label="Bio" {...form.register('bio')} value={String(form.getValue('bio'))} />
        <input
          aria-label="Image"
          {...form.register('image')}
          value={String(form.getValue('image'))}
        />
      </form>
    )
  }
  const view = render(<BaseSettings />)
  typeEdits()
  view.rerender(<BaseSettings user={loaded} />)
  expectEdits()
  await act(async () => save())
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      username: 'reader',
      email: 'reader@example.test',
      bio: 'Typed bio',
      image: 'typed.png',
    }),
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
  mount(api.client)
  const read = api.client.validateSession!()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  typeEdits()
  save()
  await waitFor(() => expect(api.client.getUser()?.bio).toBe('Typed bio'))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', false),
  )
  expect(patches).toHaveLength(1)
  expect(patches[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
  expectEdits()
  await act(async () => {
    staleRead.resolve(
      new Response(JSON.stringify({ user: loaded }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    await read
  })
  expectEdits()
  expect(api.client.getUser()?.bio).toBe('Typed bio')
})

it('an untouched populated list does not create a profile mutation', async () => {
  const api = setup(loaded)
  mount(api.client, undefined, { ...defaults, tags: ['old'] })
  expect(screen.getByLabelText('Tags').textContent).toBe('["old"]')
  save()
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(api.mutations).not.toHaveBeenCalled()
})

it('a pristine empty default list hydrates from the late populated user record', async () => {
  const api = setup()
  mount(api.client)
  expect(screen.getByLabelText('Tags').textContent).toBe('[]')
  await act(async () => {
    api.client.setUser(loaded)
    await Promise.resolve()
  })
  expect(screen.getByLabelText('Tags').textContent).toBe('["old"]')
})

it('a real list edit still sends the new list', async () => {
  const api = setup(loaded)
  mount(api.client, undefined, { ...defaults, tags: ['old'] })
  fireEvent.click(screen.getByRole('button', { name: 'Clear tags' }))
  save()
  await waitFor(() => expect(api.writes).toEqual([{ tags: [] }]))
})
