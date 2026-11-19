// @vitest-environment jsdom

/**
 * Signed-in profile edits through the Angular binding, over a real HTTP wire
 * API: `useProfileForm` saves through the auth client's configured profile
 * transport without changing the session, and a save that completes after an
 * explicit session replacement is discarded.
 *
 * @module
 */

import { createServer, type Server } from 'node:http'

import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'

import type { AuthClient, AuthClientConfig, StorageAdapter } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'

import { useProfileForm } from '../hooks/use-profile-form.js'
import { provideMolecule } from '../providers.js'

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
const clients: AuthClient<Profile>[] = []

/** The saved-user callback the mounted page reports through. */
let activeOnSaved: ((user: Profile) => void) | undefined
/** The account identity the mounted page adds to session ownership. */
let activeGetIdentity: ((user: Profile) => string) | undefined

/** The managed profile form React's `Settings` component renders. */
@Component({
  selector: 'app-test-session-settings',
  template: `
    <form aria-label="Settings" (submit)="form.formProps.onSubmit($event)">
      <input
        aria-label="Username"
        [value]="form.formState().values.username"
        (input)="form.register('username').onChange($event)"
      />
      <textarea
        aria-label="Bio"
        [value]="form.formState().values.bio"
        (input)="form.register('bio').onChange($event)"
      ></textarea>
      <button type="submit" [disabled]="form.isSubmitting()">Save</button>
      <output aria-label="Saving">{{ saving() }}</output>
    </form>
  `,
})
class SessionSettingsComponent {
  readonly form = useProfileForm<Profile, Fields>({
    defaultValues: { username: '', bio: '' },
    getIdentity: activeGetIdentity,
    toValues: (user) => ({ username: user.username, bio: user.bio ?? '' }),
    toPatch: (changes) => changes,
    onSaved: activeOnSaved,
  })

  /**
   * Whether a save is running, as rendered text.
   *
   * @returns `'true'` or `'false'`.
   */
  saving(): string {
    return String(this.form.isSubmitting())
  }
}

afterEach(async () => {
  TestBed.resetTestingModule()
  for (const client of clients.splice(0)) client.destroy()
  activeOnSaved = undefined
  activeGetIdentity = undefined
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
  clients.push(client)
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
 * Mounts the settings page under one client and renders it once.
 *
 * @param client - The auth client the module provides.
 * @returns The mounted fixture.
 */
function mount(client: AuthClient<Profile>): ComponentFixture<SessionSettingsComponent> {
  TestBed.configureTestingModule({
    imports: [SessionSettingsComponent],
    providers: [provideZonelessChangeDetection(), provideMolecule({ auth: client })],
  })
  const fixture = TestBed.createComponent(SessionSettingsComponent)
  fixture.detectChanges()
  return fixture
}

/**
 * Types into a native input, the way a person does.
 *
 * @param fixture - The mounted fixture.
 * @param label - The control's aria-label.
 * @param next - The typed value.
 */
function typeField(fixture: ComponentFixture<unknown>, label: string, next: string): void {
  const input = fixture.nativeElement.querySelector(`[aria-label="${label}"]`) as
    HTMLInputElement | HTMLTextAreaElement
  input.value = next
  input.dispatchEvent(new Event('input', { bubbles: true }))
  fixture.detectChanges()
}

/** Submits the settings form. */
function save(fixture: ComponentFixture<unknown>): void {
  const form = fixture.nativeElement.querySelector('[aria-label="Settings"]') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
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

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

it('saves a mutable username and biography through the configured wire API without changing sessions', async () => {
  const { client, config, read, writes } = await setup()
  const revision = client.getSessionRevision!()
  const saved = vi.fn()
  activeOnSaved = saved
  const fixture = mount(client)
  typeField(fixture, 'Username', 'after')
  typeField(fixture, 'Bio', 'Persisted biography')
  save(fixture)
  await waitFor(fixture, () => saved.mock.calls.length === 1)
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
  clients.push(restored)
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
  activeOnSaved = saved
  activeGetIdentity = (user) => user.id
  const fixture = mount(client)
  typeField(fixture, 'Bio', 'Old session write')
  save(fixture)
  await waitFor(fixture, () => writes.length === 1)
  const user = client.getUser()!
  const revision = client.getSessionRevision!()
  client.setSession({ accessToken: initial.token, user })
  expect(client.getSessionRevision!()).not.toBe(revision)
  release()
  await waitFor(
    fixture,
    () => fixture.nativeElement.querySelector('[aria-label="Saving"]').textContent === 'false',
  )
  expect(await read()).toMatchObject({ bio: 'Old session write' })
  expect(client.getUser()).toBe(user)
  expect(client.getUser()!.bio).toBeNull()
  expect(saved).not.toHaveBeenCalled()
})
