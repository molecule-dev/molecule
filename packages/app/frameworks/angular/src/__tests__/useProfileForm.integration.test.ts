// @vitest-environment jsdom

/**
 * The shared profile form over the real auth client and a real local HTTP
 * boundary: rendered controls, hydration, save snapshot, publication and the
 * lifecycle races.
 *
 * This is React's `useProfileForm.integration.test.tsx` against the Angular
 * function; each title is React's. Only the framework-forced mechanics change:
 * a function runs in an injection context, signals replace the returned values,
 * a mounted component replaces a render, and effects replace React's layout
 * effects.
 *
 * @module
 */

import { createServer, type Server } from 'node:http'

import '@angular/compiler'
import { Component, effect, provideZonelessChangeDetection, signal, type Type } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'

import { useAuth } from '../hooks/use-auth.js'
import { useProfileForm } from '../hooks/use-profile-form.js'
import { provideMolecule } from '../providers.js'

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
 * In-memory storage for one auth client.
 *
 * @returns The storage adapter.
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

/** What one local account boundary exposes to a case. */
interface AccountApi {
  baseURL: string
  server: Server
  writes: Record<string, unknown>[]
  reject: boolean
  partialAnswer: boolean
  hold: Promise<void> | null
}

/** A real local HTTP boundary: writes persist independently of every auth cache. */
async function accountApi(): Promise<AccountApi> {
  let persisted = { ...initial }
  const server = createServer()
  const api: AccountApi = {
    baseURL: '',
    server,
    writes: [],
    reject: false,
    partialAnswer: false,
    hold: null,
  }
  server.on('request', async (request, response) => {
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
    api.writes.push(patch)
    if (api.hold) await api.hold
    if (api.reject) {
      response.writeHead(422).end(JSON.stringify({ error: 'Invalid profile' }))
      return
    }
    // Whitelisted writable profile fields, deliberately independent of the auth client.
    for (const key of ['name', 'email', 'bio', 'image'] as const) {
      if (Object.hasOwn(patch, key)) persisted = { ...persisted, [key]: patch[key] }
    }
    response.end(JSON.stringify(api.partialAnswer ? { props: patch } : { user: persisted }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP server')
  api.baseURL = `http://127.0.0.1:${address.port}`
  return api
}

const servers: Server[] = []
const clients: AuthClient<Reader>[] = []

/** The saved-user callback the mounted page reports through. */
let activeOnSaved: ((user: Reader) => void | Promise<void>) | undefined
/** The validation the mounted page runs. */
let activeValidate: ((values: Fields) => Promise<Partial<Record<keyof Fields, string>>>) | undefined

afterEach(async () => {
  TestBed.resetTestingModule()
  for (const client of clients.splice(0)) client.destroy()
  activeOnSaved = undefined
  activeValidate = undefined
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
 * Wires the auth client, its memory storage and a real profile transport.
 *
 * @param signedIn - Whether the previous document left a session.
 * @returns The api, client and storage.
 */
async function setup(signedIn = true): Promise<{
  api: Awaited<ReturnType<typeof accountApi>>
  client: AuthClient<Reader>
  store: StorageAdapter
}> {
  const api = await accountApi()
  servers.push(api.server)
  const store = storage()
  const client = createJWTAuthClient<Reader>({
    storage: store,
    baseURL: api.baseURL,
    profileEndpoint: '/account',
  })
  if (signedIn) client.setSession({ accessToken: token, user: initial })
  clients.push(client)
  return { api, client, store }
}

/** The managed profile form: controlled values over the shared account. */
@Component({
  selector: 'app-test-profile-form',
  template: `
    <form aria-label="Profile" (submit)="form.formProps.onSubmit($event)">
      <input
        aria-label="Name"
        [value]="form.formState().values.name"
        (input)="form.register('name').onChange($event)"
      />
      <input
        aria-label="Email"
        [value]="form.formState().values.email"
        (input)="form.register('email', { email: true }).onChange($event)"
      />
      @if (form.formState().errors.email) {
        <p role="alert">{{ form.formState().errors.email }}</p>
      }
      <textarea
        aria-label="Bio"
        [value]="form.formState().values.bio"
        (input)="form.register('bio').onChange($event)"
      ></textarea>
      <input
        aria-label="Image"
        [value]="form.formState().values.image"
        (input)="form.register('image').onChange($event)"
      />
      <input
        aria-label="Password"
        type="password"
        [value]="form.formState().values.password"
        (input)="form.register('password').onChange($event)"
      />
      <button type="submit" [disabled]="!form.ready() || form.isSubmitting()">Save</button>
      <button type="button" (click)="form.reset()">Reset</button>
    </form>
    <output aria-label="Form state">{{ formStateJson() }}</output>
    @if (form.error() !== undefined) {
      <p role="alert">Save failed</p>
    }
    <output aria-label="Shared profile">{{ sharedProfile() }}</output>
  `,
})
class ProfileFormComponent {
  readonly form = useProfileForm<Reader, Fields>({
    defaultValues: defaults,
    getIdentity: (user) => user.id,
    toValues: valuesFor,
    toPatch: ({ password, ...changes }) => ({
      ...changes,
      ...('bio' in changes ? { bio: changes.bio?.trim() ? changes.bio : null } : {}),
      ...('image' in changes ? { image: changes.image?.trim() ? changes.image : null } : {}),
      ...(password?.trim() ? { password } : {}),
    }),
    onSaved: (user) => activeOnSaved?.(user),
    validate: activeValidate,
  })
  private readonly auth = useAuth<Reader>()

  /**
   * The dirty/saving state as rendered text.
   *
   * @returns The JSON of the state flags.
   */
  formStateJson(): string {
    return JSON.stringify({ dirty: this.form.isDirty(), saving: this.form.isSubmitting() })
  }

  /**
   * The shared auth user as rendered text.
   *
   * @returns The JSON of the shared user.
   */
  sharedProfile(): string {
    return JSON.stringify(this.auth.user())
  }
}

/**
 * The recorded manual hydration: every new user object overwrites editable
 * controls.
 */
@Component({
  selector: 'app-test-legacy-form',
  template: `
    <form aria-label="Profile" (submit)="onSubmit($event)">
      <textarea aria-label="Bio" [value]="bio()" (input)="onBio($event)"></textarea>
      <input aria-label="Image" [value]="image()" (input)="onImage($event)" />
      <button type="submit">Save</button>
    </form>
  `,
})
class LegacyFormComponent {
  private readonly auth = useAuth<Reader>()
  readonly bio = signal('')
  readonly image = signal('')

  constructor() {
    effect(() => {
      const current = this.auth.user()
      this.bio.set(current?.bio ?? '')
      this.image.set(current?.image ?? '')
    })
  }

  /**
   * Stores the typed biography.
   *
   * @param event - The input event.
   */
  onBio(event: Event): void {
    this.bio.set(inputValue(event))
  }

  /**
   * Stores the typed image url.
   *
   * @param event - The input event.
   */
  onImage(event: Event): void {
    this.image.set(inputValue(event))
  }

  /**
   * Submits the recorded legacy implementation's raw patch.
   *
   * @param event - The native submit event.
   */
  onSubmit(event: Event): void {
    event.preventDefault()
    void legacyClient.client?.updateProfile({
      bio: this.bio() || null,
      image: this.image() || null,
    })
  }
}
const legacyClient: { client?: AuthClient<Reader> } = {}

/**
 * Reads an input event's value.
 *
 * @param event - A DOM input event.
 * @returns The input's value.
 */
function inputValue(event: Event): string {
  const target = event.target
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return ''
  return target.value
}

/**
 * Mounts one component with the auth client provided, then renders it once.
 *
 * @param component - The component to mount.
 * @param client - The auth client the module provides.
 * @returns The mounted fixture.
 */
function mount<T>(component: Type<T>, client: AuthClient<Reader>): ComponentFixture<T> {
  TestBed.resetTestingModule()
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), provideMolecule({ auth: client })],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * Reads one labelled control.
 *
 * @param fixture - The mounted fixture.
 * @param label - The control's aria-label.
 * @returns The control.
 */
function control(
  fixture: ComponentFixture<unknown>,
  label: string,
): HTMLInputElement | HTMLTextAreaElement {
  const element = fixture.nativeElement.querySelector(`[aria-label="${label}"]`) as
    HTMLInputElement | HTMLTextAreaElement | null
  if (!element) throw new Error(`no control labelled ${label}`)
  return element
}

/**
 * Types into a native control, the way a person does.
 *
 * @param fixture - The mounted fixture.
 * @param label - The control's aria-label.
 * @param next - The typed value.
 */
function edit(fixture: ComponentFixture<unknown>, label: string, next: string): void {
  const element = control(fixture, label)
  element.value = next
  element.dispatchEvent(new Event('input', { bubbles: true }))
  fixture.detectChanges()
}

/**
 * Finds a button by its visible text.
 *
 * @param fixture - The mounted fixture.
 * @param label - The button's text.
 * @returns The button.
 */
function button(fixture: ComponentFixture<unknown>, label: string): HTMLButtonElement {
  const buttons = [
    ...(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>),
  ]
  const found = buttons.find((candidate) => candidate.textContent?.trim() === label)
  if (!found) throw new Error(`no button labelled ${label}`)
  return found
}

/**
 * Lets pending promises land, then renders one change detection.
 *
 * @param fixture - The mounted fixture.
 */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  fixture.detectChanges()
}

/** Submits the profile form. */
async function submitForm(fixture: ComponentFixture<unknown>): Promise<void> {
  const form = fixture.nativeElement.querySelector('form[aria-label="Profile"]') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await settle(fixture)
}

/** Clicks the form's Reset button. */
function resetForm(fixture: ComponentFixture<unknown>): void {
  button(fixture, 'Reset').click()
  fixture.detectChanges()
}

/**
 * Polls until the predicate holds, rendering between attempts.
 *
 * @param fixture - The mounted fixture.
 * @param predicate - The condition to reach.
 */
async function waitFor(
  fixture: ComponentFixture<unknown>,
  predicate: () => boolean,
): Promise<void> {
  const deadline = Date.now() + 2000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor: condition was not met')
    await new Promise((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()
  }
}

/**
 * Reads the rendered form-state flags.
 *
 * @param fixture - The mounted fixture.
 * @returns The rendered JSON.
 */
function formState(fixture: ComponentFixture<unknown>): string {
  return (
    (fixture.nativeElement.querySelector('[aria-label="Form state"]') as HTMLElement).textContent ??
    ''
  )
}

/**
 * Reads the persisted account straight from the HTTP boundary.
 *
 * @param baseURL - The server's base url.
 * @returns The persisted user.
 */
async function persistedUser(baseURL: string): Promise<Reader> {
  const response = await fetch(`${baseURL}/account`)
  return ((await response.json()) as { user: Reader }).user
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

describe('shared profile form: rendered controls → real HTTP → persisted profile', () => {
  it('negative control reproduces null bio/image from the recorded manual hydration effect', async () => {
    const { api, client } = await setup()
    legacyClient.client = client
    const fixture = mount(LegacyFormComponent, client)
    edit(fixture, 'Bio', 'Typed biography')
    edit(fixture, 'Image', 'https://images.example.test/reader.png')
    client.setUser({ ...initial, name: 'Background refresh' })
    await settle(fixture)
    expect(control(fixture, 'Bio').value).toBe('')
    expect(control(fixture, 'Image').value).toBe('')
    await submitForm(fixture)
    await waitFor(fixture, () => api.writes.length === 1)
    expect(api.writes).toEqual([{ bio: null, image: null }])
    expect(await persistedUser(api.baseURL)).toMatchObject({ bio: null, image: null })
  })

  it('preserves edited controls on a background user update and publishes the saved server response', async () => {
    const { api, client, store } = await setup()
    let propagated: Reader | undefined
    activeOnSaved = (saved) => {
      propagated = saved
    }
    const fixture = mount(ProfileFormComponent, client)
    edit(fixture, 'Bio', 'Typed biography')
    edit(fixture, 'Image', 'https://images.example.test/reader.png')
    client.setUser({ ...initial, name: 'Background refresh' })
    await settle(fixture)
    expect(client.getState()).toMatchObject({ authenticated: true, status: 'authenticated' })
    expect(control(fixture, 'Name').value).toBe('Background refresh')
    expect(control(fixture, 'Bio').value).toBe('Typed biography')
    expect(control(fixture, 'Image').value).toBe('https://images.example.test/reader.png')
    await submitForm(fixture)
    await waitFor(fixture, () => propagated?.bio === 'Typed biography')
    expect(api.writes).toEqual([
      { bio: 'Typed biography', image: 'https://images.example.test/reader.png' },
    ])
    const stored = await persistedUser(api.baseURL)
    expect(stored).toMatchObject({
      bio: 'Typed biography',
      image: 'https://images.example.test/reader.png',
    })
    expect(client.getUser()).toEqual(stored)
    expect(
      JSON.parse(
        (fixture.nativeElement.querySelector('[aria-label="Shared profile"]') as HTMLElement)
          .textContent ?? '',
      ),
    ).toEqual(stored)
    expect(formState(fixture)).toBe('{"dirty":false,"saving":false}')
    const reloaded = createJWTAuthClient<Reader>({ storage: store })
    clients.push(reloaded)
    await reloaded.initialize()
    expect(reloaded.getUser()).toEqual(stored)
    fixture.destroy()
    const next = mount(ProfileFormComponent, reloaded)
    expect(control(next, 'Bio').value).toBe(stored.bio)
    expect(control(next, 'Image').value).toBe(stored.image)
  })

  it('passes the merged JWT profile to onSaved for a changed-fields HTTP answer', async () => {
    const { api, client, store } = await setup()
    api.partialAnswer = true
    const saved = vi.fn<(user: Reader) => void>()
    activeOnSaved = saved
    const fixture = mount(ProfileFormComponent, client)
    edit(fixture, 'Bio', 'Only the biography changed')
    await submitForm(fixture)
    await waitFor(fixture, () => saved.mock.calls.length === 1)
    const persisted = await persistedUser(api.baseURL)
    expect(api.writes).toEqual([{ bio: 'Only the biography changed' }])
    expect(saved.mock.calls[0]?.[0]).toEqual(persisted)
    expect(client.getUser()).toEqual(persisted)
    expect(
      JSON.parse(
        (fixture.nativeElement.querySelector('[aria-label="Shared profile"]') as HTMLElement)
          .textContent ?? '',
      ),
    ).toEqual(persisted)
    expect(control(fixture, 'Name').value).toBe(initial.name)
    const reloaded = createJWTAuthClient<Reader>({ storage: store })
    clients.push(reloaded)
    await reloaded.initialize()
    expect(reloaded.getUser()).toEqual(persisted)
  })

  it('forwards a custom provider return without inventing a profile merge in the hook', async () => {
    const { client } = await setup()
    // A deliberately raw custom provider: this violates the saved-profile contract.
    // It proves that a page callback cannot assume the function normalized the answer.
    const raw = { bio: 'Raw custom answer' } as Reader
    vi.spyOn(client, 'updateProfile').mockResolvedValue(raw)
    const saved = vi.fn<(user: Reader) => void>()
    activeOnSaved = saved
    const fixture = mount(ProfileFormComponent, client)
    edit(fixture, 'Bio', 'Submitted biography')
    await submitForm(fixture)
    await waitFor(fixture, () => saved.mock.calls.length === 1)
    expect(saved.mock.calls[0]?.[0]).toBe(raw)
    expect(saved.mock.calls[0]?.[0]).not.toHaveProperty('id')
    expect(client.getUser()).toEqual(initial)
  })

  it('hydrates asynchronous user data, keeps earlier edits, resets to the newest baseline, and sends no empty patch', async () => {
    const { api, client } = await setup(false)
    // Edits before the user data arrives exist only in a shell that renders before the session is
    // restored, so this case mounts the form before any session exists.
    const fixture = mount(ProfileFormComponent, client)
    expect(button(fixture, 'Save').disabled).toBe(true)
    edit(fixture, 'Bio', 'Typed before hydration')
    client.setSession({ accessToken: token, user: { ...initial, bio: 'Loaded biography' } })
    await settle(fixture)
    expect(control(fixture, 'Bio').value).toBe('Typed before hydration')
    expect(control(fixture, 'Email').value).toBe(initial.email)
    resetForm(fixture)
    expect(control(fixture, 'Bio').value).toBe('Loaded biography')
    await submitForm(fixture)
    await waitFor(fixture, () => formState(fixture) === '{"dirty":false,"saving":false}')
    expect(api.writes).toEqual([])
  })

  it('retains rejected edits, omits blank optional password, and clears a submitted credential from the saved baseline', async () => {
    const { api, client } = await setup()
    const fixture = mount(ProfileFormComponent, client)
    api.reject = true
    edit(fixture, 'Bio', 'Retry biography')
    edit(fixture, 'Password', '   ')
    await submitForm(fixture)
    await waitFor(fixture, () => fixture.nativeElement.querySelector('[role="alert"]') !== null)
    expect(api.writes).toEqual([{ bio: 'Retry biography' }])
    expect(client.getUser()).toEqual(initial)
    expect(await persistedUser(api.baseURL)).toEqual(initial)
    expect(control(fixture, 'Bio').value).toBe('Retry biography')
    api.reject = false
    edit(fixture, 'Password', 'new-private-credential')
    await submitForm(fixture)
    await waitFor(fixture, () => control(fixture, 'Password').value === '')
    expect(api.writes[1]).toEqual({
      bio: 'Retry biography',
      password: 'new-private-credential',
    })
    expect(await persistedUser(api.baseURL)).toMatchObject({ bio: 'Retry biography' })
    expect(client.getUser()).not.toHaveProperty('password')
  })

  it('validates registered fields before making a request and preserves an explicit field clear', async () => {
    const { api, client } = await setup()
    client.setUser({ ...initial, bio: 'Biography to clear' })
    const fixture = mount(ProfileFormComponent, client)
    edit(fixture, 'Email', 'invalid')
    await submitForm(fixture)
    await waitFor(fixture, () => fixture.nativeElement.querySelector('[role="alert"]') !== null)
    expect(api.writes).toEqual([])
    edit(fixture, 'Email', initial.email ?? '')
    edit(fixture, 'Bio', '')
    await submitForm(fixture)
    await waitFor(fixture, () => api.writes.length === 1)
    expect(api.writes).toEqual([{ bio: null }])
    await waitFor(fixture, () => client.getUser()?.bio === null)
    expect((await persistedUser(api.baseURL)).bio).toBeNull()
    expect(control(fixture, 'Bio').value).toBe('')
  })

  it('captures one submit snapshot, prevents duplicate saves and keeps newer edits made during the request', async () => {
    const { api, client } = await setup()
    let release!: () => void
    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    const fixture = mount(ProfileFormComponent, client)
    edit(fixture, 'Bio', 'First submitted biography')
    const form = fixture.nativeElement.querySelector(
      'form[aria-label="Profile"]',
    ) as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    edit(fixture, 'Bio', 'New unsaved biography')
    await waitFor(fixture, () => api.writes.length === 1)
    expect(api.writes[0]).toEqual({ bio: 'First submitted biography' })
    release()
    await waitFor(fixture, () => client.getUser()?.bio === 'First submitted biography')
    expect(control(fixture, 'Bio').value).toBe('New unsaved biography')
    expect(formState(fixture)).toBe('{"dirty":true,"saving":false}')
    expect((await persistedUser(api.baseURL)).bio).toBe('First submitted biography')
    await submitForm(fixture)
    await waitFor(fixture, () => client.getUser()?.bio === 'New unsaved biography')
    expect((await persistedUser(api.baseURL)).bio).toBe('New unsaved biography')
  })

  it('discards the previous account edits on identity change and sign-out', async () => {
    const { client } = await setup()
    const fixture = mount(ProfileFormComponent, client)
    edit(fixture, 'Bio', 'Private unsaved edit')
    edit(fixture, 'Password', 'private-credential')
    client.setSession({
      accessToken: token,
      user: { ...initial, id: 'other', bio: 'Other account' },
    })
    await settle(fixture)
    expect(control(fixture, 'Bio').value).toBe('Other account')
    expect(control(fixture, 'Password').value).toBe('')
    client.setUser(null)
    await settle(fixture)
    expect(control(fixture, 'Bio').value).toBe('')
    expect(control(fixture, 'Password').value).toBe('')
  })

  it('preserves explicit identity checks even without a session revision change', async () => {
    const { client } = await setup()
    const fixture = mount(ProfileFormComponent, client)
    edit(fixture, 'Bio', 'Private unsaved edit')
    const revision = client.getSessionRevision?.()
    client.setUser({ ...initial, id: 'other', bio: 'Other profile' })
    await settle(fixture)
    expect(client.getSessionRevision?.()).toBe(revision)
    expect(control(fixture, 'Bio').value).toBe('Other profile')
  })

  it('keeps identity-based saves for custom clients without session revisions', async () => {
    const { client, api } = await setup()
    delete client.getSessionRevision
    const saved = vi.fn<(user: Reader) => void>()
    activeOnSaved = saved
    const fixture = mount(ProfileFormComponent, client)
    edit(fixture, 'Bio', 'Legacy provider biography')
    await submitForm(fixture)
    await waitFor(fixture, () => saved.mock.calls.length === 1)
    expect((await persistedUser(api.baseURL)).bio).toBe('Legacy provider biography')
  })

  it('keeps saving true until propagation finishes and retries failed propagation without another request', async () => {
    const { api, client } = await setup()
    let finish!: () => void
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    })
    let propagations = 0
    activeOnSaved = async () => {
      propagations++
      if (propagations === 1) {
        await pending
        throw new Error('Cache unavailable')
      }
    }
    const fixture = mount(ProfileFormComponent, client)
    edit(fixture, 'Bio', 'Saved biography')
    await submitForm(fixture)
    await waitFor(fixture, () => propagations === 1)
    expect(formState(fixture)).toBe('{"dirty":false,"saving":true}')
    expect((await persistedUser(api.baseURL)).bio).toBe('Saved biography')
    finish()
    await waitFor(fixture, () => fixture.nativeElement.querySelector('[role="alert"]') !== null)
    await submitForm(fixture)
    await waitFor(fixture, () => propagations === 2)
    expect(api.writes).toHaveLength(1)
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull()
  })

  it('does not publish or propagate account A after switching to B during the real HTTP request', async () => {
    const { api, client } = await setup()
    let release!: () => void
    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    const propagated: Reader[] = []
    activeOnSaved = (user) => {
      propagated.push(user)
    }
    const fixture = mount(ProfileFormComponent, client)
    edit(fixture, 'Bio', 'Account A submitted biography')
    await submitForm(fixture)
    await waitFor(fixture, () => api.writes.length === 1)
    const other = { ...initial, id: 'other', name: 'Other', bio: 'Account B biography' }
    client.setSession({ accessToken: token, user: other })
    // The account switch hydrates before the person types again.
    await settle(fixture)
    edit(fixture, 'Bio', 'Account B unsaved biography')
    release()
    await waitFor(fixture, () => !button(fixture, 'Save').disabled)
    expect(client.getUser()).toEqual(other)
    expect(control(fixture, 'Bio').value).toBe('Account B unsaved biography')
    expect(propagated).toEqual([])
    expect((await persistedUser(api.baseURL)).bio).toBe('Account A submitted biography')
  })

  it.each(['account switch', 'unmount', 'client replacement'] as const)(
    'does not start a mutation after %s while asynchronous validation is pending',
    async (transition) => {
      const { api, client } = await setup()
      const mutation = vi.spyOn(client, 'updateProfile')
      const replacement = transition === 'client replacement' ? await setup() : undefined
      let finishValidation!: () => void
      const pending = new Promise<void>((resolve) => {
        finishValidation = resolve
      })
      let validationStarted = false
      activeValidate = async () => {
        validationStarted = true
        await pending
        return {}
      }
      const propagated: Reader[] = []
      activeOnSaved = (user) => {
        propagated.push(user)
      }
      let fixture = mount(ProfileFormComponent, client)
      edit(fixture, 'Bio', 'Account A unsaved biography')
      await submitForm(fixture)
      await waitFor(fixture, () => validationStarted)
      expect(api.writes).toEqual([])
      if (transition === 'account switch') {
        client.setSession({
          accessToken: token,
          user: { ...initial, id: 'other', bio: 'Account B biography' },
        })
        await settle(fixture)
      } else if (transition === 'unmount') {
        fixture.destroy()
      } else {
        // Angular swaps a provided service by mounting under the replacement
        // client; React rerenders the same tree with a new provider value.
        fixture = mount(ProfileFormComponent, replacement!.client)
      }
      finishValidation()
      await new Promise((resolve) => setTimeout(resolve, 0))
      if (transition !== 'unmount') {
        await waitFor(fixture, () => !button(fixture, 'Save').disabled)
      }
      expect(api.writes).toEqual([])
      expect(replacement?.api.writes ?? []).toEqual([])
      expect(mutation).not.toHaveBeenCalled()
      expect(propagated).toEqual([])
      expect(await persistedUser(api.baseURL)).toEqual(initial)
      if (transition === 'account switch') {
        expect(client.getUser()?.id).toBe('other')
        expect(control(fixture, 'Bio').value).toBe('Account B biography')
      }
    },
  )

  it('keeps a validated submit when only the same account background data changes', async () => {
    const { api, client } = await setup()
    let finishValidation!: () => void
    const pending = new Promise<void>((resolve) => {
      finishValidation = resolve
    })
    let validationStarted = false
    activeValidate = async () => {
      validationStarted = true
      await pending
      return {}
    }
    const fixture = mount(ProfileFormComponent, client)
    edit(fixture, 'Bio', 'Account A submitted biography')
    await submitForm(fixture)
    await waitFor(fixture, () => validationStarted)
    client.setUser({ ...initial, name: 'Background refresh' })
    await settle(fixture)
    finishValidation()
    await waitFor(fixture, () => !button(fixture, 'Save').disabled)
    expect(api.writes).toEqual([{ bio: 'Account A submitted biography' }])
    expect((await persistedUser(api.baseURL)).bio).toBe('Account A submitted biography')
    expect(client.getUser()?.bio).toBe('Account A submitted biography')
  })
})
