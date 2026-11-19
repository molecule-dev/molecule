// @vitest-environment jsdom

/**
 * Profile editing through the real auth client and the shared profile form:
 * late records hydrate pristine controls without discarding typed edits, submit
 * sends only what changed, and a save cannot be undone by a read that started
 * before it.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive } from 'vue'

import { createJWTAuthClient } from '@molecule/app-auth'

import { useForm, type UseFormOptions } from '../composables/useForms.js'
import { useProfileForm } from '../composables/useProfileForm.js'
import { moleculePlugin } from '../plugin.js'

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

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * A promise plus the function that settles it.
 *
 * @returns The promise and its resolver.
 */
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

type SettingsProps = {
  validate?: (values: Fields) => Promise<Partial<Record<keyof Fields, string>>>
  initialDefaults?: Fields
}

function Settings({ validate, initialDefaults = defaults }: SettingsProps) {
  return defineComponent({
    setup() {
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
      const bind = (name: keyof Fields) => {
        const registration = form.register(name)
        return {
          name: registration.name,
          onChange: registration.onChange,
          onBlur: registration.onBlur,
          value: form.formState.value.values[name],
        }
      }
      return () =>
        h('form', { 'aria-label': 'Settings', onSubmit: form.formProps.onSubmit }, [
          h('input', { 'aria-label': 'Username', ...bind('username') }),
          h('input', { 'aria-label': 'Email', ...bind('email') }),
          h('textarea', { 'aria-label': 'Bio', ...bind('bio') }),
          h('input', { 'aria-label': 'Image', ...bind('image') }),
          h('output', { 'aria-label': 'Tags' }, JSON.stringify(form.formState.value.values.tags)),
          h('output', { 'aria-label': 'Errors' }, JSON.stringify(form.formState.value.errors)),
          h('button', { type: 'button', onClick: () => form.setValue('tags', []) }, 'Clear tags'),
          h(
            'button',
            { type: 'submit', disabled: !form.ready.value || form.isSubmitting.value },
            'Save',
          ),
        ])
    },
  })
}

function mountSettings(client: ReturnType<typeof setup>['client'], props: SettingsProps = {}) {
  const wrapper = mount(Settings(props), {
    global: { plugins: [[moleculePlugin, { auth: client }]] },
  })
  wrappers.push(wrapper)
  return wrapper
}

const value = (wrapper: VueWrapper, label: string): string =>
  (wrapper.get(`[aria-label="${label}"]`).element as HTMLInputElement).value

async function typeInto(wrapper: VueWrapper, label: string, text: string): Promise<void> {
  const control = wrapper.get(`[aria-label="${label}"]`)
  if (
    control.element instanceof HTMLInputElement ||
    control.element instanceof HTMLTextAreaElement
  ) {
    control.element.value = text
  }
  await control.trigger('change')
}

async function typeEdits(wrapper: VueWrapper): Promise<void> {
  await typeInto(wrapper, 'Bio', 'Typed bio')
  await typeInto(wrapper, 'Image', 'typed.png')
}

function expectEdits(wrapper: VueWrapper): void {
  expect(value(wrapper, 'Bio')).toBe('Typed bio')
  expect(value(wrapper, 'Image')).toBe('typed.png')
}

async function save(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('form').trigger('submit')
}

async function expectSaved(api: ReturnType<typeof setup>, wrapper: VueWrapper): Promise<void> {
  await save(wrapper)
  await vi.waitFor(() => expect(api.writes).toHaveLength(1))
  expect(api.writes[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
  expect(api.writes[0].username).not.toBe('')
  expect(api.writes[0].email).not.toBe('')
  expectEdits(wrapper)
}

describe('Settings late records and profile writes', () => {
  it('hydrates the first user after typing', async () => {
    const api = setup()
    const wrapper = mountSettings(api.client)
    await typeEdits(wrapper)
    api.client.setUser(loaded)
    await nextTick()
    expectEdits(wrapper)
    expect(value(wrapper, 'Username')).toBe('reader')
    expect(value(wrapper, 'Email')).toBe('reader@example.test')
    await expectSaved(api, wrapper)
  })

  it('retains edits through repeated same-user hydration', async () => {
    const api = setup()
    const wrapper = mountSettings(api.client)
    await typeEdits(wrapper)
    api.client.setUser(loaded)
    await nextTick()
    api.client.setUser({ ...loaded })
    await nextTick()
    expectEdits(wrapper)
    await expectSaved(api, wrapper)
  })

  it.each(['before submit', 'during validation', 'after submit'] as const)(
    'keeps edits when a profile response lands %s',
    async (when) => {
      const api = setup(loaded)
      const response = deferred<User>()
      const validation = deferred<Partial<Record<keyof Fields, string>>>()
      const wrapper = mountSettings(
        api.client,
        when === 'during validation' ? { validate: () => validation.promise } : {},
      )
      const request = response.promise.then((user) => api.client.setUser(user))
      await typeEdits(wrapper)
      if (when !== 'before submit') await save(wrapper)
      if (when === 'after submit') await vi.waitFor(() => expect(api.writes).toHaveLength(1))
      response.resolve({ ...loaded, username: 'background-name' })
      await request
      await nextTick()
      expectEdits(wrapper)
      if (when === 'during validation') {
        validation.resolve({})
        await nextTick()
      }
      if (when === 'before submit') await expectSaved(api, wrapper)
      else {
        await vi.waitFor(() => expect(api.writes).toHaveLength(1))
        expect(api.writes[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
      }
    },
  )

  it('keeps cleared tags through a late record and submits the clear', async () => {
    const api = setup(loaded)
    const wrapper = mountSettings(api.client, { initialDefaults: { ...defaults, tags: ['old'] } })
    await wrapper.get('button[type="button"]').trigger('click')
    await typeEdits(wrapper)
    api.client.setUser({ ...loaded, tags: ['restored'] })
    await nextTick()
    expect(wrapper.get('output[aria-label="Tags"]').text()).toBe('[]')
    await expectSaved(api, wrapper)
    expect(api.writes[0].tags).toEqual([])
  })

  it('keeps an unchanged field submit error through a selective refresh', async () => {
    const api = setup(loaded)
    const validation = deferred<Partial<Record<keyof Fields, string>>>()
    const wrapper = mountSettings(api.client, { validate: () => validation.promise })
    await save(wrapper)
    api.client.setUser({ ...loaded, bio: 'Background bio' })
    await nextTick()
    validation.resolve({ username: 'Rejected name' })
    await vi.waitFor(() =>
      expect(wrapper.get('output[aria-label="Errors"]').text()).toBe(
        '{"username":"Rejected name"}',
      ),
    )
    expect(api.mutations).not.toHaveBeenCalled()
  })

  it('sends no blank fields while loading and saves after hydration', async () => {
    const api = setup()
    const wrapper = mountSettings(api.client)
    await typeEdits(wrapper)
    expect(wrapper.get('button[type="submit"]').element).toHaveProperty('disabled', true)
    await save(wrapper)
    await Promise.resolve()
    expect(api.mutations).not.toHaveBeenCalled()
    api.client.setUser(loaded)
    await nextTick()
    expectEdits(wrapper)
    await expectSaved(api, wrapper)
  })
})

it('the base form submits loaded fields with typed edits', async () => {
  const onSubmit = vi.fn()
  const options = reactive<UseFormOptions<Fields>>({
    defaultValues: defaults,
    resetOptions: { keepDirtyValues: true },
  })
  const BaseSettings = defineComponent({
    setup() {
      const form = useForm<Fields>(options)
      const bind = (name: keyof Fields) => {
        const registration = form.register(name)
        return {
          name: registration.name,
          onChange: registration.onChange,
          onBlur: registration.onBlur,
          value: form.formState.value.values[name],
        }
      }
      return () =>
        h('form', { 'aria-label': 'Settings', onSubmit: form.handleSubmit(onSubmit) }, [
          h('textarea', { 'aria-label': 'Bio', ...bind('bio') }),
          h('input', { 'aria-label': 'Image', ...bind('image') }),
        ])
    },
  })
  const wrapper = mount(BaseSettings)
  wrappers.push(wrapper)
  await typeEdits(wrapper)
  options.values = loaded
  await nextTick()
  expectEdits(wrapper)
  await save(wrapper)
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
  const wrapper = mountSettings(api.client)
  const read = api.client.validateSession!()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await typeEdits(wrapper)
  await save(wrapper)
  await vi.waitFor(() => expect(api.client.getUser()?.bio).toBe('Typed bio'))
  await vi.waitFor(() =>
    expect(wrapper.get('button[type="submit"]').element).toHaveProperty('disabled', false),
  )
  expect(patches).toHaveLength(1)
  expect(patches[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
  expectEdits(wrapper)
  staleRead.resolve(
    new Response(JSON.stringify({ user: loaded }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )
  await read
  await nextTick()
  expectEdits(wrapper)
  expect(api.client.getUser()?.bio).toBe('Typed bio')
})

it('an untouched populated list does not create a profile mutation', async () => {
  const api = setup(loaded)
  const wrapper = mountSettings(api.client, { initialDefaults: { ...defaults, tags: ['old'] } })
  expect(wrapper.get('output[aria-label="Tags"]').text()).toBe('["old"]')
  await save(wrapper)
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(api.mutations).not.toHaveBeenCalled()
})

it('a pristine empty default list hydrates from the late populated user record', async () => {
  const api = setup()
  const wrapper = mountSettings(api.client)
  expect(wrapper.get('output[aria-label="Tags"]').text()).toBe('[]')
  api.client.setUser(loaded)
  await nextTick()
  expect(wrapper.get('output[aria-label="Tags"]').text()).toBe('["old"]')
})

it('a real list edit still sends the new list', async () => {
  const api = setup(loaded)
  const wrapper = mountSettings(api.client, { initialDefaults: { ...defaults, tags: ['old'] } })
  await wrapper.get('button[type="button"]').trigger('click')
  await save(wrapper)
  await vi.waitFor(() => expect(api.writes).toEqual([{ tags: [] }]))
})
