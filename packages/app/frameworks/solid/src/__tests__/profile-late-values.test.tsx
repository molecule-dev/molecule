// @vitest-environment jsdom

/**
 * Late profile records: `useProfileForm` and `useForm` must keep what the
 * reader typed when the user record arrives (or is refreshed) after typing,
 * and must submit only real changes.
 *
 * Mirrors the React package's `profile-late-values.test.tsx`.
 *
 * @module
 */

import { createComponent, createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'

import { AuthContext } from '../context.js'
import { useForm, useProfileForm } from '../primitives/react-forms.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
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

/**
 * A promise whose resolution the test drives.
 *
 * @returns The pending promise and its resolver.
 */
function deferred<T>(): { resolve: (value: T) => void; promise: Promise<T> } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { resolve, promise }
}

/**
 * A real auth client with an in-memory store and a recorded `updateProfile`.
 *
 * @param initial - A user record to seed the session with.
 * @returns The client, the patches it saved and the spy.
 */
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

/** The profile page: controlled controls over `useProfileForm`. */
function Settings(props: {
  validate?: (values: Fields) => Promise<Partial<Record<keyof Fields, string>>>
  initialDefaults?: Fields
}): JSX.Element {
  const form = useProfileForm<User, Fields>({
    defaultValues: props.initialDefaults ?? defaults,
    toValues: ({ username, email, bio, image, tags }) => ({
      username,
      email,
      bio,
      image,
      tags,
    }),
    toPatch: (changes) => changes,
    validate: props.validate,
  })
  const username = form.register('username')
  const email = form.register('email')
  const bio = form.register('bio')
  const image = form.register('image')
  const values = (): Fields => form.formState().values
  return (
    <form aria-label="Settings" onSubmit={form.formProps.onSubmit}>
      <input
        aria-label="Username"
        name="username"
        value={values().username}
        onInput={username.onChange}
      />
      <input aria-label="Email" name="email" value={values().email} onInput={email.onChange} />
      <textarea aria-label="Bio" name="bio" value={values().bio} onInput={bio.onChange} />
      <input aria-label="Image" name="image" value={values().image} onInput={image.onChange} />
      <output aria-label="Tags">{JSON.stringify(values().tags)}</output>
      <output aria-label="Errors">{JSON.stringify(form.formState().errors)}</output>
      <button type="button" onClick={() => form.setValue('tags', [])}>
        Clear tags
      </button>
      <button type="submit" disabled={!form.ready() || form.isSubmitting()}>
        Save
      </button>
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
 * @param validate - Optional asynchronous validation.
 * @param initialDefaults - The form's starting values.
 * @returns The rendered container.
 */
function mountSettings(
  client: ReturnType<typeof setup>['client'],
  validate?: Parameters<typeof Settings>[0]['validate'],
  initialDefaults?: Fields,
): HTMLElement {
  return mount(() =>
    createComponent(AuthContext.Provider, {
      value: client,
      get children() {
        return createComponent(Settings, { validate, initialDefaults })
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
 * The value of the labeled control.
 *
 * @param container - The rendered tree.
 * @param label - The control's `aria-label`.
 * @returns The control's current value.
 */
function value(container: HTMLElement, label: string): string {
  const element = query<HTMLInputElement | HTMLTextAreaElement>(
    container,
    `[aria-label="${label}"]`,
  )
  return element.value
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

/**
 * The text of the labeled `<output>`.
 *
 * @param container - The rendered tree.
 * @param label - The output's `aria-label`.
 * @returns The output's text.
 */
function outputText(container: HTMLElement, label: string): string {
  return query<HTMLOutputElement>(container, `output[aria-label="${label}"]`).textContent ?? ''
}

/**
 * The labeled button.
 *
 * @param container - The rendered tree.
 * @param label - The button's text.
 * @returns The button.
 */
function button(container: HTMLElement, label: string): HTMLButtonElement {
  const element = [...container.querySelectorAll('button')].find(
    (candidate) => candidate.textContent === label,
  )
  if (!element) throw new Error(`no button named ${label}`)
  return element
}

/**
 * Submits the settings form.
 *
 * @param container - The rendered tree.
 */
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

/** Types the two fields the profile save carries. */
function typeEdits(container: HTMLElement): void {
  typeInto(container, 'Bio', 'Typed bio')
  typeInto(container, 'Image', 'typed.png')
}

/** Asserts the typed edits survived whatever landed. */
function expectEdits(container: HTMLElement): void {
  expect(value(container, 'Bio')).toBe('Typed bio')
  expect(value(container, 'Image')).toBe('typed.png')
}

/**
 * Saves and asserts the one recorded write carries the typed edits.
 *
 * @param api - The client, writes and spy from {@link setup}.
 * @param container - The rendered tree.
 * @returns A promise resolved once the write landed.
 */
async function expectSaved(api: ReturnType<typeof setup>, container: HTMLElement): Promise<void> {
  save(container)
  await waitFor(() => expect(api.writes).toHaveLength(1))
  expect(api.writes[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
  expect(api.writes[0].username).not.toBe('')
  expect(api.writes[0].email).not.toBe('')
  expectEdits(container)
}

describe('Settings late records and profile writes', () => {
  it('hydrates the first user after typing', async () => {
    const api = setup()
    const container = mountSettings(api.client)
    typeEdits(container)
    api.client.setUser(loaded)
    await settle()
    expectEdits(container)
    expect(value(container, 'Username')).toBe('reader')
    expect(value(container, 'Email')).toBe('reader@example.test')
    await expectSaved(api, container)
  })

  it('retains edits through repeated same-user hydration', async () => {
    const api = setup()
    const container = mountSettings(api.client)
    typeEdits(container)
    api.client.setUser(loaded)
    await settle()
    api.client.setUser({ ...loaded })
    await settle()
    expectEdits(container)
    await expectSaved(api, container)
  })

  it.each(['before submit', 'during validation', 'after submit'] as const)(
    'keeps edits when a profile response lands %s',
    async (when) => {
      const api = setup(loaded)
      const response = deferred<User>()
      const validation = deferred<Partial<Record<keyof Fields, string>>>()
      const container = mountSettings(
        api.client,
        when === 'during validation' ? () => validation.promise : undefined,
      )
      const request = response.promise.then((next) => api.client.setUser(next))
      typeEdits(container)
      if (when !== 'before submit') save(container)
      if (when === 'after submit') await waitFor(() => expect(api.writes).toHaveLength(1))
      response.resolve({ ...loaded, username: 'background-name' })
      await request
      await settle()
      expectEdits(container)
      if (when === 'during validation') {
        validation.resolve({})
        await settle()
      }
      if (when === 'before submit') await expectSaved(api, container)
      else {
        await waitFor(() => expect(api.writes).toHaveLength(1))
        expect(api.writes[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
      }
    },
  )

  it('keeps cleared tags through a late record and submits the clear', async () => {
    const api = setup(loaded)
    const container = mountSettings(api.client, undefined, { ...defaults, tags: ['old'] })
    button(container, 'Clear tags').click()
    typeEdits(container)
    api.client.setUser({ ...loaded, tags: ['restored'] })
    await settle()
    expect(outputText(container, 'Tags')).toBe('[]')
    await expectSaved(api, container)
    expect(api.writes[0].tags).toEqual([])
  })

  it('keeps an unchanged field submit error through a selective refresh', async () => {
    const api = setup(loaded)
    const validation = deferred<Partial<Record<keyof Fields, string>>>()
    const container = mountSettings(api.client, () => validation.promise)
    save(container)
    api.client.setUser({ ...loaded, bio: 'Background bio' })
    validation.resolve({ username: 'Rejected name' })
    await waitFor(() =>
      expect(outputText(container, 'Errors')).toBe('{"username":"Rejected name"}'),
    )
    expect(api.mutations).not.toHaveBeenCalled()
  })

  it('sends no blank fields while loading and saves after hydration', async () => {
    const api = setup()
    const container = mountSettings(api.client)
    typeEdits(container)
    expect(button(container, 'Save').disabled).toBe(true)
    save(container)
    await settle()
    expect(api.mutations).not.toHaveBeenCalled()
    api.client.setUser(loaded)
    await settle()
    expectEdits(container)
    await expectSaved(api, container)
  })
})

it('the base form submits loaded fields with typed edits', async () => {
  const onSubmit = vi.fn()
  const [loadedUser, setLoadedUser] = createSignal<User | undefined>(undefined)
  function BaseSettings(): JSX.Element {
    const form = useForm<Fields>({
      defaultValues: defaults,
      get values() {
        return loadedUser()
      },
      resetOptions: { keepDirtyValues: true },
    })
    const bio = form.register('bio')
    const image = form.register('image')
    const values = (): Fields => form.formState().values
    return (
      <form aria-label="Settings" onSubmit={form.handleSubmit(onSubmit)}>
        <textarea aria-label="Bio" name="bio" value={values().bio} onInput={bio.onChange} />
        <input aria-label="Image" name="image" value={values().image} onInput={image.onChange} />
      </form>
    )
  }
  const container = mount(() => createComponent(BaseSettings, {}))
  typeEdits(container)
  setLoadedUser(loaded)
  await settle()
  expectEdits(container)
  save(container)
  await settle()
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
  const fetchMock = vi.fn<typeof fetch>(async (url, options) => {
    if (String(url).endsWith('/users/me')) return staleRead.promise
    const patch = JSON.parse(String(options?.body)) as Partial<User>
    patches.push(patch)
    return new Response(JSON.stringify({ user: { ...loaded, ...patch } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  const container = mountSettings(api.client)
  const read = api.client.validateSession!()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  typeEdits(container)
  save(container)
  await waitFor(() => expect(api.client.getUser()?.bio).toBe('Typed bio'))
  await waitFor(() => expect(button(container, 'Save').disabled).toBe(false))
  expect(patches).toHaveLength(1)
  expect(patches[0]).toMatchObject({ bio: 'Typed bio', image: 'typed.png' })
  expectEdits(container)
  staleRead.resolve(
    new Response(JSON.stringify({ user: loaded }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )
  await read
  await settle()
  expectEdits(container)
  expect(api.client.getUser()?.bio).toBe('Typed bio')
})

it('an untouched populated list does not create a profile mutation', async () => {
  const api = setup(loaded)
  const container = mountSettings(api.client, undefined, { ...defaults, tags: ['old'] })
  expect(outputText(container, 'Tags')).toBe('["old"]')
  save(container)
  await settle()
  expect(api.mutations).not.toHaveBeenCalled()
})

it('a pristine empty default list hydrates from the late populated user record', async () => {
  const api = setup()
  const container = mountSettings(api.client)
  expect(outputText(container, 'Tags')).toBe('[]')
  api.client.setUser(loaded)
  await settle()
  expect(outputText(container, 'Tags')).toBe('["old"]')
})

it('a real list edit still sends the new list', async () => {
  const api = setup(loaded)
  const container = mountSettings(api.client, undefined, { ...defaults, tags: ['old'] })
  button(container, 'Clear tags').click()
  save(container)
  await waitFor(() => expect(api.writes).toEqual([{ tags: [] }]))
})
