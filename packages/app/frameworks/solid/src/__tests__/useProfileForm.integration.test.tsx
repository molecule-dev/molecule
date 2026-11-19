// @vitest-environment jsdom

/**
 * The shared profile form over the real auth client, a real HTTP boundary and
 * the bonded native form provider: load → edit → submit → publish, with what a
 * background account update, an identity change and a rejected save do to the
 * editable controls.
 *
 * Mirrors the React package's `useProfileForm.integration.test.tsx`.
 *
 * @module
 */

import { createServer, type Server } from 'node:http'

import { createComponent, createEffect, createSignal, type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'

import { AuthContext } from '../context.js'
import { useAuth } from '../primitives/auth.js'
import { useProfileForm } from '../primitives/react-forms.js'

interface Reader extends UserProfile {
  bio: string | null
  image: string | null
}
type Fields = { name: string; email: string; bio: string; image: string; password: string }
const initial: Reader = {
  id: 'reader',
  name: 'Reader',
  email: 'reader@example.test',
  bio: null,
  image: null,
}
const defaults: Fields = { name: '', email: '', bio: '', image: '', password: '' }
const valuesFor = (user: Reader): Fields => ({
  name: user.name ?? '',
  email: user.email ?? '',
  bio: user.bio ?? '',
  image: user.image ?? '',
  password: '',
})
const token = [btoa('{}'), btoa(JSON.stringify({ exp: 9999999999 })), 'signature'].join('.')

/**
 * An in-memory storage adapter for the auth client.
 *
 * @returns The adapter.
 */
function storage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

/** The real HTTP boundary the profile form saves through. */
interface AccountApi {
  baseURL: string
  server: Server
  writes: Record<string, unknown>[]
  reject: boolean
  partialAnswer: boolean
  hold: Promise<void> | null
}

/**
 * A real local HTTP boundary: writes persist independently of every auth cache.
 *
 * @returns The running API and its controls.
 */
async function accountApi(): Promise<AccountApi> {
  let persisted = { ...initial }
  const writes: Record<string, unknown>[] = []
  const service = {
    reject: false,
    partialAnswer: false,
    hold: null as Promise<void> | null,
  }
  const server = createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json')
    if (request.url !== '/account') {
      response.writeHead(404).end('{}')
      return
    }
    if (request.method === 'GET') {
      response.end(JSON.stringify({ user: persisted }))
      return
    }
    if (request.method !== 'PATCH') {
      response.writeHead(405).end('{}')
      return
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401).end('{}')
      return
    }
    let body = ''
    for await (const chunk of request) body += String(chunk)
    const patch = JSON.parse(body) as Record<string, unknown>
    writes.push(patch)
    if (service.hold) await service.hold
    if (service.reject) {
      response.writeHead(422).end(JSON.stringify({ error: 'Invalid profile' }))
      return
    }
    // Whitelisted writable profile fields, deliberately independent of the auth client.
    for (const key of ['name', 'email', 'bio', 'image'] as const) {
      if (Object.hasOwn(patch, key)) persisted = { ...persisted, [key]: patch[key] }
    }
    response.end(JSON.stringify(service.partialAnswer ? { props: patch } : { user: persisted }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP server')
  return {
    baseURL: `http://127.0.0.1:${address.port}`,
    server,
    get writes() {
      return writes
    },
    get reject() {
      return service.reject
    },
    set reject(next: boolean) {
      service.reject = next
    },
    get partialAnswer() {
      return service.partialAnswer
    },
    set partialAnswer(next: boolean) {
      service.partialAnswer = next
    },
    get hold() {
      return service.hold
    },
    set hold(next: Promise<void> | null) {
      service.hold = next
    },
  }
}

const servers: Server[] = []
const disposers: Array<() => void> = []
afterEach(async () => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.restoreAllMocks()
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()))
          server.closeAllConnections()
        }),
    ),
  )
})

/**
 * A real auth client over the test API and an in-memory store.
 *
 * @param signedIn - Whether to seed the session with the initial reader.
 * @returns The API, the client and its store.
 */
async function setup(
  signedIn = true,
): Promise<{ api: AccountApi; client: AuthClient<Reader>; store: StorageAdapter }> {
  const api = await accountApi()
  servers.push(api.server)
  const store = storage()
  const client = createJWTAuthClient<Reader>({
    storage: store,
    baseURL: api.baseURL,
    profileEndpoint: '/account',
  })
  if (signedIn) client.setSession({ accessToken: token, user: initial })
  return { api, client, store }
}

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container and an idempotent unmount.
 */
function mount(app: () => JSX.Element): { container: HTMLElement; unmount: () => void } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  let active = true
  const unmount = (): void => {
    if (!active) return
    active = false
    dispose()
    container.remove()
  }
  disposers.push(unmount)
  return { container, unmount }
}

/** The shared auth store as a rendered output. */
function ProfileSummary(): JSX.Element {
  const { user } = useAuth<Reader>()
  return <output aria-label="Shared profile">{JSON.stringify(user())}</output>
}

/** Props of the managed profile page. */
interface ProfileFormProps {
  onSaved?: (user: Reader) => void | Promise<void>
  validate?: (values: Fields) => Promise<Partial<Record<keyof Fields, string>>>
}

/** The managed profile form: controlled controls over `useProfileForm`. */
function ProfileForm(props: ProfileFormProps): JSX.Element {
  const form = useProfileForm<Reader, Fields>({
    defaultValues: defaults,
    getIdentity: (user) => user.id,
    toValues: valuesFor,
    toPatch: ({ password, ...changes }) => ({
      ...changes,
      ...('bio' in changes ? { bio: changes.bio?.trim() ? changes.bio : null } : {}),
      ...('image' in changes ? { image: changes.image?.trim() ? changes.image : null } : {}),
      ...(password?.trim() ? { password } : {}),
    }),
    onSaved: props.onSaved,
    validate: props.validate,
  })
  const name = form.register('name')
  const email = form.register('email', { email: true })
  const bio = form.register('bio')
  const image = form.register('image')
  const password = form.register('password')
  const values = (): Fields => form.formState().values
  return (
    <>
      <form aria-label="Profile" onSubmit={form.formProps.onSubmit}>
        <input
          aria-label="Name"
          name="name"
          value={values().name}
          onInput={name.onChange}
          onBlur={name.onBlur}
        />
        <input
          aria-label="Email"
          name="email"
          value={values().email}
          onInput={email.onChange}
          onBlur={email.onBlur}
        />
        <Show when={form.formState().errors.email}>
          <p role="alert">{form.formState().errors.email}</p>
        </Show>
        <textarea
          aria-label="Bio"
          name="bio"
          value={values().bio}
          onInput={bio.onChange}
          onBlur={bio.onBlur}
        />
        <input
          aria-label="Image"
          name="image"
          value={values().image}
          onInput={image.onChange}
          onBlur={image.onBlur}
        />
        <input
          aria-label="Password"
          type="password"
          name="password"
          value={values().password}
          onInput={password.onChange}
          onBlur={password.onBlur}
        />
        <button type="submit" disabled={!form.ready() || form.isSubmitting()}>
          Save
        </button>
        <button type="button" onClick={() => form.reset()}>
          Reset
        </button>
      </form>
      <output aria-label="Form state">
        {JSON.stringify({ dirty: form.isDirty(), saving: form.isSubmitting() })}
      </output>
      <Show when={form.error() !== undefined}>
        <p role="alert">Save failed</p>
      </Show>
      <ProfileSummary />
    </>
  )
}

/** The client the legacy form submits through. */
const legacyClient: { client?: AuthClient<Reader> } = {}

/** The recorded manual hydration: every new user object overwrites editable controls. */
function LegacyForm(): JSX.Element {
  const { user } = useAuth<Reader>()
  const [bio, setBio] = createSignal('')
  const [image, setImage] = createSignal('')
  const [hydratedUser, setHydratedUser] = createSignal<Reader | null>(user())
  // The recorded effect, as a Solid effect: a new user object still overwrites
  // both controls.
  createEffect(() => {
    const current = user()
    if (hydratedUser() !== current) {
      setHydratedUser(current)
      setBio(current?.bio ?? '')
      setImage(current?.image ?? '')
    }
  })
  const submitPatch = (event: Event): void => {
    event.preventDefault()
    const client = legacyClient.client
    if (!client) throw new Error('the legacy form needs a client')
    void client.updateProfile({ bio: bio() || null, image: image() || null })
  }
  return (
    <form aria-label="Profile" onSubmit={submitPatch}>
      <textarea
        aria-label="Bio"
        value={bio()}
        onInput={(event) => setBio(event.currentTarget.value)}
      />
      <input
        aria-label="Image"
        value={image()}
        onInput={(event) => setImage(event.currentTarget.value)}
      />
      <button type="submit">Save</button>
    </form>
  )
}

/**
 * Mounts the profile page under the auth context.
 *
 * @param client - The auth client the page reads.
 * @param props - The page's saved callback and optional validation.
 * @returns The container and an idempotent unmount.
 */
function mountProfile(
  client: AuthClient<Reader>,
  props: ProfileFormProps = {},
): { container: HTMLElement; unmount: () => void } {
  return mount(() =>
    createComponent(AuthContext.Provider, {
      value: client,
      get children() {
        return createComponent(ProfileForm, props)
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
 * The labeled control.
 *
 * @param container - The rendered tree.
 * @param label - The control's `aria-label`.
 * @returns The control.
 */
function control(container: HTMLElement, label: string): HTMLInputElement | HTMLTextAreaElement {
  return query<HTMLInputElement | HTMLTextAreaElement>(container, `[aria-label="${label}"]`)
}

/**
 * Types into a labeled control the way a person does.
 *
 * @param container - The rendered tree.
 * @param label - The control's `aria-label`.
 * @param next - The text to type.
 */
function edit(container: HTMLElement, label: string, next: string): void {
  const element = control(container, label)
  element.value = next
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Submits the profile form.
 *
 * @param container - The rendered tree.
 */
function submit(container: HTMLElement): void {
  query(container, 'form[aria-label="Profile"]').dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  )
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
 * The saved profile the server holds, read independently of every auth cache.
 *
 * @param baseURL - The API's base URL.
 * @returns The persisted user.
 */
async function persistedUser(baseURL: string): Promise<Reader> {
  const response = await fetch(`${baseURL}/account`)
  return ((await response.json()) as { user: Reader }).user
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

/** A promise whose resolution the test drives. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
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

describe('shared profile form: rendered controls → real HTTP → persisted profile', () => {
  it('negative control reproduces null bio/image from the recorded manual hydration effect', async () => {
    const { api, client } = await setup()
    legacyClient.client = client
    const { container } = mount(() =>
      createComponent(AuthContext.Provider, {
        value: client,
        get children() {
          return createComponent(LegacyForm, {})
        },
      }),
    )
    edit(container, 'Bio', 'Typed biography')
    edit(container, 'Image', 'https://images.example.test/reader.png')
    client.setUser({ ...initial, name: 'Background refresh' })
    await settle()
    expect(control(container, 'Bio').value).toBe('')
    expect(control(container, 'Image').value).toBe('')
    submit(container)
    await waitFor(() => expect(api.writes).toEqual([{ bio: null, image: null }]))
    expect(await persistedUser(api.baseURL)).toMatchObject({ bio: null, image: null })
  })

  it('preserves edited controls on a background user update and publishes the saved server response', async () => {
    const { api, client, store } = await setup()
    let propagated: Reader | undefined
    const { container, unmount } = mountProfile(client, {
      onSaved: (saved) => {
        propagated = saved
      },
    })
    edit(container, 'Bio', 'Typed biography')
    edit(container, 'Image', 'https://images.example.test/reader.png')
    client.setUser({ ...initial, name: 'Background refresh' })
    await settle()
    expect(client.getState()).toMatchObject({ authenticated: true, status: 'authenticated' })
    expect(control(container, 'Name').value).toBe('Background refresh')
    expect(control(container, 'Bio').value).toBe('Typed biography')
    expect(control(container, 'Image').value).toBe('https://images.example.test/reader.png')
    submit(container)
    await waitFor(() => expect(propagated?.bio).toBe('Typed biography'))
    expect(api.writes).toEqual([
      { bio: 'Typed biography', image: 'https://images.example.test/reader.png' },
    ])
    const stored = await persistedUser(api.baseURL)
    expect(stored).toMatchObject({
      bio: 'Typed biography',
      image: 'https://images.example.test/reader.png',
    })
    expect(client.getUser()).toEqual(stored)
    expect(JSON.parse(outputText(container, 'Shared profile'))).toEqual(stored)
    expect(outputText(container, 'Form state')).toBe('{"dirty":false,"saving":false}')
    const reloaded = createJWTAuthClient<Reader>({ storage: store })
    await reloaded.initialize()
    expect(reloaded.getUser()).toEqual(stored)
    unmount()
    const next = mountProfile(reloaded)
    expect(control(next.container, 'Bio').value).toBe(stored.bio)
    expect(control(next.container, 'Image').value).toBe(stored.image)
  })

  it('passes the merged JWT profile to onSaved for a changed-fields HTTP answer', async () => {
    const { api, client, store } = await setup()
    api.partialAnswer = true
    const saved = vi.fn<(user: Reader) => void>()
    const { container } = mountProfile(client, { onSaved: saved })
    edit(container, 'Bio', 'Only the biography changed')
    submit(container)
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    const persisted = await persistedUser(api.baseURL)
    expect(api.writes).toEqual([{ bio: 'Only the biography changed' }])
    expect(saved.mock.calls[0][0]).toEqual(persisted)
    expect(client.getUser()).toEqual(persisted)
    expect(JSON.parse(outputText(container, 'Shared profile'))).toEqual(persisted)
    expect(control(container, 'Name').value).toBe(initial.name)
    const reloaded = createJWTAuthClient<Reader>({ storage: store })
    await reloaded.initialize()
    expect(reloaded.getUser()).toEqual(persisted)
  })

  it('forwards a custom provider return without inventing a profile merge in the hook', async () => {
    const { client } = await setup()
    // A deliberately raw custom provider: this violates the saved-profile contract.
    // It proves that a page callback cannot assume the hook normalized the answer.
    const raw = { bio: 'Raw custom answer' } as Reader
    vi.spyOn(client, 'updateProfile').mockResolvedValue(raw)
    const saved = vi.fn<(user: Reader) => void>()
    const { container } = mountProfile(client, { onSaved: saved })
    edit(container, 'Bio', 'Submitted biography')
    submit(container)
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(saved.mock.calls[0][0]).toBe(raw)
    expect(saved.mock.calls[0][0]).not.toHaveProperty('id')
    expect(client.getUser()).toEqual(initial)
  })

  it('hydrates asynchronous user data, keeps earlier edits, resets to the newest baseline, and sends no empty patch', async () => {
    const { api, client } = await setup(false)
    // Edits before the user data arrives exist only in a shell that renders
    // before the session is restored, so this case mounts without a session.
    const { container } = mountProfile(client)
    expect(button(container, 'Save').disabled).toBe(true)
    edit(container, 'Bio', 'Typed before hydration')
    client.setSession({ accessToken: token, user: { ...initial, bio: 'Loaded biography' } })
    await settle()
    expect(control(container, 'Bio').value).toBe('Typed before hydration')
    expect(control(container, 'Email').value).toBe(initial.email)
    button(container, 'Reset').click()
    expect(control(container, 'Bio').value).toBe('Loaded biography')
    submit(container)
    await settle()
    expect(api.writes).toEqual([])
    expect(outputText(container, 'Form state')).toBe('{"dirty":false,"saving":false}')
  })

  it('retains rejected edits, omits blank optional password, and clears a submitted credential from the saved baseline', async () => {
    const { api, client } = await setup()
    const { container } = mountProfile(client)
    api.reject = true
    edit(container, 'Bio', 'Retry biography')
    edit(container, 'Password', '   ')
    submit(container)
    await waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull())
    expect(api.writes).toEqual([{ bio: 'Retry biography' }])
    expect(client.getUser()).toEqual(initial)
    expect(await persistedUser(api.baseURL)).toEqual(initial)
    expect(control(container, 'Bio').value).toBe('Retry biography')
    api.reject = false
    edit(container, 'Password', 'new-private-credential')
    submit(container)
    await waitFor(() => expect(control(container, 'Password').value).toBe(''))
    expect(api.writes[1]).toEqual({ bio: 'Retry biography', password: 'new-private-credential' })
    expect(await persistedUser(api.baseURL)).toMatchObject({ bio: 'Retry biography' })
    expect(client.getUser()).not.toHaveProperty('password')
  })

  it('validates registered fields before making a request and preserves an explicit field clear', async () => {
    const { api, client } = await setup()
    client.setUser({ ...initial, bio: 'Biography to clear' })
    const { container } = mountProfile(client)
    edit(container, 'Email', 'invalid')
    submit(container)
    await waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull())
    expect(api.writes).toEqual([])
    edit(container, 'Email', initial.email ?? '')
    edit(container, 'Bio', '')
    submit(container)
    await waitFor(() => expect(api.writes).toEqual([{ bio: null }]))
    await waitFor(() => expect(client.getUser()?.bio).toBeNull())
    expect((await persistedUser(api.baseURL)).bio).toBeNull()
    expect(control(container, 'Bio').value).toBe('')
  })

  it('captures one submit snapshot, prevents duplicate saves and keeps newer edits made during the request', async () => {
    const { api, client } = await setup()
    const hold = deferred()
    api.hold = hold.promise
    const { container } = mountProfile(client)
    edit(container, 'Bio', 'First submitted biography')
    submit(container)
    submit(container)
    edit(container, 'Bio', 'New unsaved biography')
    await waitFor(() => expect(api.writes).toHaveLength(1))
    expect(api.writes[0]).toEqual({ bio: 'First submitted biography' })
    hold.resolve()
    await waitFor(() => expect(client.getUser()?.bio).toBe('First submitted biography'))
    expect(control(container, 'Bio').value).toBe('New unsaved biography')
    expect(outputText(container, 'Form state')).toBe('{"dirty":true,"saving":false}')
    expect((await persistedUser(api.baseURL)).bio).toBe('First submitted biography')
    submit(container)
    await waitFor(() => expect(client.getUser()?.bio).toBe('New unsaved biography'))
    expect((await persistedUser(api.baseURL)).bio).toBe('New unsaved biography')
  })

  it('discards the previous account edits on identity change and sign-out', async () => {
    const { client } = await setup()
    const { container } = mountProfile(client)
    edit(container, 'Bio', 'Private unsaved edit')
    edit(container, 'Password', 'private-credential')
    client.setSession({
      accessToken: token,
      user: { ...initial, id: 'other', bio: 'Other account' },
    })
    await settle()
    expect(control(container, 'Bio').value).toBe('Other account')
    expect(control(container, 'Password').value).toBe('')
    client.setUser(null)
    await settle()
    expect(control(container, 'Bio').value).toBe('')
    expect(control(container, 'Password').value).toBe('')
  })

  it('preserves explicit identity checks even without a session revision change', async () => {
    const { client } = await setup()
    const { container } = mountProfile(client)
    edit(container, 'Bio', 'Private unsaved edit')
    const revision = client.getSessionRevision?.()
    client.setUser({ ...initial, id: 'other', bio: 'Other profile' })
    await settle()
    expect(client.getSessionRevision?.()).toBe(revision)
    expect(control(container, 'Bio').value).toBe('Other profile')
  })

  it('keeps identity-based saves for custom clients without session revisions', async () => {
    const { client, api } = await setup()
    delete client.getSessionRevision
    const saved = vi.fn<(user: Reader) => void>()
    const { container } = mountProfile(client, { onSaved: saved })
    edit(container, 'Bio', 'Legacy provider biography')
    submit(container)
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect((await persistedUser(api.baseURL)).bio).toBe('Legacy provider biography')
  })

  it('keeps saving true until propagation finishes and retries failed propagation without another request', async () => {
    const { api, client } = await setup()
    const pending = deferred()
    let propagations = 0
    const { container } = mountProfile(client, {
      onSaved: async () => {
        propagations++
        if (propagations === 1) {
          await pending.promise
          throw new Error('Cache unavailable')
        }
      },
    })
    edit(container, 'Bio', 'Saved biography')
    submit(container)
    await waitFor(() => expect(propagations).toBe(1))
    expect(outputText(container, 'Form state')).toBe('{"dirty":false,"saving":true}')
    expect((await persistedUser(api.baseURL)).bio).toBe('Saved biography')
    pending.resolve()
    await waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull())
    submit(container)
    await waitFor(() => expect(propagations).toBe(2))
    expect(api.writes).toHaveLength(1)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('does not publish or propagate account A after switching to B during the real HTTP request', async () => {
    const { api, client } = await setup()
    const hold = deferred()
    api.hold = hold.promise
    const propagated: Reader[] = []
    const { container } = mountProfile(client, {
      onSaved: (user) => {
        propagated.push(user)
      },
    })
    edit(container, 'Bio', 'Account A submitted biography')
    submit(container)
    await waitFor(() => expect(api.writes).toHaveLength(1))
    const other = { ...initial, id: 'other', name: 'Other', bio: 'Account B biography' }
    client.setSession({ accessToken: token, user: other })
    await settle()
    edit(container, 'Bio', 'Account B unsaved biography')
    hold.resolve()
    await waitFor(() => expect(button(container, 'Save').disabled).toBe(false))
    expect(client.getUser()).toEqual(other)
    expect(control(container, 'Bio').value).toBe('Account B unsaved biography')
    expect(propagated).toEqual([])
    expect((await persistedUser(api.baseURL)).bio).toBe('Account A submitted biography')
  })

  it.each(['account switch', 'unmount', 'client replacement'] as const)(
    'does not start a mutation after %s while asynchronous validation is pending',
    async (transition) => {
      const { api, client } = await setup()
      const mutation = vi.spyOn(client, 'updateProfile')
      const replacement = transition === 'client replacement' ? await setup() : undefined
      const pending = deferred()
      let validationStarted = false
      const validate = async (): Promise<Partial<Record<keyof Fields, string>>> => {
        validationStarted = true
        await pending.promise
        return {}
      }
      const propagated: Reader[] = []
      const page = (target: AuthClient<Reader>): ReturnType<typeof mountProfile> =>
        mountProfile(target, {
          validate,
          onSaved: (user) => {
            propagated.push(user)
          },
        })
      let view = page(client)
      edit(view.container, 'Bio', 'Account A unsaved biography')
      submit(view.container)
      await waitFor(() => expect(validationStarted).toBe(true))
      expect(api.writes).toEqual([])
      if (transition === 'account switch') {
        client.setSession({
          accessToken: token,
          user: { ...initial, id: 'other', bio: 'Account B biography' },
        })
        await settle()
      } else if (transition === 'unmount') {
        view.unmount()
      } else {
        if (!replacement) throw new Error('the replacement client was not created')
        // Solid has no rerender: a changed provider re-creates the consumer
        // under the new client, which is how its tree follows a context value.
        view.unmount()
        view = page(replacement.client)
      }
      pending.resolve()
      await settle()
      if (transition !== 'unmount') {
        await waitFor(() => expect(button(view.container, 'Save').disabled).toBe(false))
      }
      expect(api.writes).toEqual([])
      expect(replacement?.api.writes ?? []).toEqual([])
      expect(mutation).not.toHaveBeenCalled()
      expect(propagated).toEqual([])
      expect(await persistedUser(api.baseURL)).toEqual(initial)
      if (transition === 'account switch') {
        expect(client.getUser()?.id).toBe('other')
        expect(control(view.container, 'Bio').value).toBe('Account B biography')
      }
    },
  )

  it('keeps a validated submit when only the same account background data changes', async () => {
    const { api, client } = await setup()
    const pending = deferred()
    let validationStarted = false
    const validate = async (): Promise<Partial<Record<keyof Fields, string>>> => {
      validationStarted = true
      await pending.promise
      return {}
    }
    const { container } = mountProfile(client, { validate })
    edit(container, 'Bio', 'Account A submitted biography')
    submit(container)
    await waitFor(() => expect(validationStarted).toBe(true))
    client.setUser({ ...initial, name: 'Background refresh' })
    await settle()
    pending.resolve()
    await waitFor(() => expect(button(container, 'Save').disabled).toBe(false))
    expect(api.writes).toEqual([{ bio: 'Account A submitted biography' }])
    expect((await persistedUser(api.baseURL)).bio).toBe('Account A submitted biography')
    expect(client.getUser()?.bio).toBe('Account A submitted biography')
  })
})
