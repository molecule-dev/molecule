// @vitest-environment jsdom

/**
 * A disposable scaffold's auth journey, driven through the SHARED packages a
 * generated app actually imports: the real `createJWTAuthClient`,
 * `setMoleculeContext({ auth })`, `useAuth`/`useAuthClient` and `useForm` with
 * the real native forms provider. Only the HTTP boundary (`fetch`) is controlled.
 *
 * The journey is the one a scaffold user takes, in order:
 *   1. sign up with the app's OWN typed registration fields through the API's
 *      `{ user: … }` envelope — exactly ONE registration mutation;
 *   2. fail a sign-in with the API's structured 401 body and keep the typed
 *      form on screen (no remount, no lost input);
 *   3. edit the profile, watch a delayed session revalidation land while the
 *      user is still typing, reset to the server values, and save the LATEST
 *      DOM values.
 *
 * Each "control" case at the bottom drives a deliberately broken variant of
 * the same UI and asserts the failure the journey above rules out, so the
 * positive assertions are shown to have teeth.
 *
 * @module
 */

import { type Component, flushSync } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AuthResult, UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'

import { mountInContext } from './context-host.js'
import LoginPage from './scaffold/LoginPage.svelte'
import RemountingGuard from './scaffold/RemountingGuard.svelte'
import SettingsPage from './scaffold/SettingsPage.svelte'
import SettingsScreen from './scaffold/SettingsScreen.svelte'
import SignupPage from './scaffold/SignupPage.svelte'

/** The app's profile: the base identity plus the fields its pages read. */
interface AppUser extends UserProfile {
  username?: string
  bio?: string
}

/** The app's OWN registration fields, typed through the client's second generic. */
interface AppRegisterFields {
  username: string
}

/** The user the API puts on the wire inside `{ props }` / `{ user }`. */
interface WireUser {
  username: string
  email: string
  name?: string | null
  bio?: string | null
  token?: string
}

const hosts: Array<() => Promise<void>> = []

/**
 * A JSON `Response`, so the client parses it through its real browser path.
 *
 * @param body - The JSON body.
 * @param status - The HTTP status.
 * @returns The response the stubbed `fetch` resolves with.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * The disposable app's auth client: a RealWorld-shaped API — the app's own
 * `username` field at the top level of `register()`, the payload nested under
 * `{ user }` on the wire, and the wire user adapted to {@link AppUser}.
 *
 * @returns A real `createJWTAuthClient` instance.
 */
function createDisposableClient() {
  return createJWTAuthClient<AppUser, AppRegisterFields>({
    baseURL: 'https://api.example.test',
    loginEndpoint: '/users/log-in',
    registerEndpoint: '/users',
    profileEndpoint: '/users/me',
    currentUserEndpoint: '/users/me',
    logoutEndpoint: '/users/log-out',
    storage: 'memory',
    autoRefresh: false,
    requestBody: (kind, payload) => ({ user: payload }),
    mapAuthResponse: (data): AuthResult<AppUser> => {
      const answer = data as { user?: WireUser; props?: WireUser; accessToken?: string }
      const wire = answer.user ?? answer.props
      if (!wire) throw new Error('The API answer carried no user')
      return {
        accessToken: answer.accessToken ?? wire.token,
        user: {
          id: wire.username,
          email: wire.email,
          name: wire.name ?? undefined,
          bio: wire.bio ?? undefined,
          username: wire.username,
        },
      }
    },
  })
}

type Client = ReturnType<typeof createDisposableClient>

/** The typed profile the settings form is seeded from. */
const seededUser: AppUser = {
  id: 'reader',
  email: 'reader@example.test',
  name: 'Reader',
  bio: 'First bio',
  username: 'reader',
}

/**
 * Mounts a page under a real Svelte context carrying the case's auth client.
 *
 * @param client - The auth client every page reads.
 * @param component - The page component to render.
 * @param props - The component's props.
 * @returns The container and the tree's unmount.
 */
function mountPage<T extends Record<string, unknown>>(
  client: Client,
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
  if (!form) throw new Error('no form')
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  flushSync()
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('disposable scaffold auth journey', () => {
  it('registers with the app’s own typed fields through the envelope, exactly once', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()

    const view = mountPage(client, SignupPage, {})
    change(view.container, 'Email', 'reader@example.test')
    change(view.container, 'Username', 'reader')
    change(view.container, 'Password', 'long-password')

    let answer!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )

    const form = view.container.querySelector('form')
    submit(view.container)
    await vi.waitFor(() => expect(fetchBoundary).toHaveBeenCalledTimes(1))

    // One submit is one mutation.
    const [url, init] = fetchBoundary.mock.calls[0]
    expect(String(url)).toBe('https://api.example.test/users')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      user: { email: 'reader@example.test', password: 'long-password', username: 'reader' },
    })
    // The form stays mounted (with its values) while the request is in flight.
    expect(view.container.querySelector('form')).toBe(form)
    expect(field(view.container, 'Username').value).toBe('reader')

    answer(
      jsonResponse(
        {
          props: { username: 'reader', email: 'reader@example.test', name: 'Reader' },
          user: { username: 'reader', email: 'reader@example.test', name: 'Reader' },
          accessToken: 'access-token',
        },
        201,
      ),
    )

    await vi.waitFor(() => expect(client.getState().status).toBe('authenticated'))
    expect(client.getState().user).toMatchObject({ id: 'reader', name: 'Reader' })
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
  })

  it('renders a rejected sign-in’s API body without remounting the form or losing input', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()

    const view = mountPage(client, LoginPage, {})

    const form = view.container.querySelector('form')
    const email = field(view.container, 'Email')
    change(view.container, 'Email', 'reader@example.test')

    let answer!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )
    submit(view.container)
    await vi.waitFor(() =>
      expect(view.container.querySelector('[role="status"]')?.textContent).toBe('Signing in'),
    )
    expect(field(view.container, 'Email')).toBe(email)

    answer(jsonResponse({ errors: { credentials: ['is invalid'] } }, 401))

    await vi.waitFor(() =>
      expect(view.container.querySelector('[role="alert"]')?.textContent).toBe(
        'credentials is invalid',
      ),
    )
    // The SAME nodes, with the typed value still in them.
    expect(view.container.querySelector('form')).toBe(form)
    expect(field(view.container, 'Email')).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(view.container.querySelector('[role="status"]')).toBeNull()
  })

  it('edits, revalidates while typing, resets, and saves the latest DOM values', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    client.setSession({ accessToken: 'access-token', user: seededUser })

    const view = mountPage(client, SettingsScreen, {})

    expect(view.container.querySelector('[data-testid="profile-name"]')?.textContent).toBe('Reader')
    const name = field(view.container, 'Name')
    const bio = field(view.container, 'Bio')
    expect(name.value).toBe('Reader')
    expect(bio.value).toBe('First bio')

    change(view.container, 'Name', 'Reader Edited')
    change(view.container, 'Bio', 'Typed while the check was running')

    // A delayed session revalidation lands MID-TYPING. The answer is the same
    // data the client already holds — it must not reset the form.
    let revalidation!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        revalidation = resolve
      }),
    )
    const validation = client.validateSession?.() ?? Promise.resolve()
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    revalidation(
      jsonResponse({
        props: { ...seededUser, username: 'reader' },
        accessToken: 'access-token',
      }),
    )
    await validation
    flushSync()

    expect(name.value).toBe('Reader Edited')
    expect(bio.value).toBe('Typed while the check was running')

    // Reset restores the SERVER's values, in the DOM.
    view.container
      .querySelector<HTMLButtonElement>('button[type="button"]')
      ?.dispatchEvent(new Event('click', { bubbles: true }))
    flushSync()
    expect(name.value).toBe('Reader')
    expect(bio.value).toBe('First bio')

    // Type again and save: the request carries the DOM values, and every
    // reader of `useAuth().user` sees the saved profile without a reload.
    change(view.container, 'Name', 'Latest Name')
    change(view.container, 'Bio', 'Latest bio')
    let saved!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        saved = resolve
      }),
    )
    submit(view.container)
    await vi.waitFor(() => expect(fetchBoundary).toHaveBeenCalledTimes(2))
    const [, init] = fetchBoundary.mock.calls[1]
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Latest Name', bio: 'Latest bio' })

    saved(
      jsonResponse({
        props: { ...seededUser, name: 'Latest Name', bio: 'Latest bio' },
        user: { ...seededUser, name: 'Latest Name', bio: 'Latest bio' },
        accessToken: 'access-token',
      }),
    )

    await vi.waitFor(() => expect(client.getUser()?.name).toBe('Latest Name'))
    flushSync()
    expect(view.container.querySelector('[data-testid="profile-name"]')?.textContent).toBe(
      'Latest Name',
    )
    expect(view.container.querySelector('[data-testid="settings-saved"]')?.textContent).toBe(
      'Saved Latest Name',
    )
  })
})

describe('known-bad controls (the journey’s guards have teeth)', () => {
  it('detects duplicate registration: the API helper plus the auth client create twice', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()

    const view = mountPage(client, SignupPage, { duplicate: true })
    change(view.container, 'Email', 'reader@example.test')
    change(view.container, 'Username', 'reader')
    change(view.container, 'Password', 'long-password')

    fetchBoundary
      .mockResolvedValueOnce(
        jsonResponse(
          {
            props: { username: 'reader', email: 'reader@example.test' },
            user: { username: 'reader', email: 'reader@example.test' },
            accessToken: 'access-token',
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { errorKey: 'user.error.usernameUnavailable', error: 'already registered' },
          409,
        ),
      )

    submit(view.container)

    // The detector the journey asserts against: TWO registrations went out and
    // the second answered 409. This is the failure "exactly once" prevents.
    await vi.waitFor(() => expect(fetchBoundary).toHaveBeenCalledTimes(2))
    expect(fetchBoundary.mock.calls[1][1]?.method).toBe('POST')
    await vi.waitFor(() =>
      expect(view.container.querySelector('[role="alert"]')?.textContent).toContain(
        'already registered',
      ),
    )
  })

  it('detects a loading-state remount: the typed form is replaced and its input lost', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    fetchBoundary.mockReturnValue(new Promise<Response>(() => undefined))
    const client = createDisposableClient()

    const view = mountPage(client, RemountingGuard, {})

    const email = field(view.container, 'Email')
    change(view.container, 'Email', 'reader@example.test')
    submit(view.container)
    await vi.waitFor(() => expect(field(view.container, 'Email')).not.toBe(email))

    // The old body-loss failure: the node is gone and the typed value with it.
    const after = field(view.container, 'Email')
    expect(after).not.toBe(email)
    expect(after.value).toBe('')
  })

  it('detects a stale submission: the request carries values from before the edit', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    client.setSession({ accessToken: 'access-token', user: seededUser })

    const view = mountPage(client, SettingsPage, { staleSubmit: true })

    change(view.container, 'Name', 'Latest Name')
    change(view.container, 'Bio', 'Latest bio')
    fetchBoundary.mockResolvedValueOnce(
      jsonResponse({ props: { ...seededUser, name: 'Latest Name' } }),
    )

    submit(view.container)
    await vi.waitFor(() => expect(fetchBoundary).toHaveBeenCalledTimes(1))

    const [, init] = fetchBoundary.mock.calls[0]
    // The client reads the response body; the assertion is about what was SENT.
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Reader', bio: 'First bio' })
  })
})
