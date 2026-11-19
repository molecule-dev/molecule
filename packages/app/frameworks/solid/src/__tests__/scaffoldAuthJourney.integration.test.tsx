// @vitest-environment jsdom

/**
 * A disposable scaffold's auth journey, driven through the SHARED packages a
 * generated Solid app actually imports: the real `createJWTAuthClient`, the
 * real `MoleculeProvider` auth context, `useAuth`/`useAuthClient` and `useForm`
 * with the real native forms provider. Only the HTTP boundary (`fetch`) is
 * controlled.
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
 * Mirrors the React package's `scaffoldAuthJourney.integration.test.tsx`.
 *
 * @module
 */

import { createComponent, createSignal, type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AuthError, AuthResult, UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'
import { createNativeFormProvider } from '@molecule/app-forms'

import { AuthContext } from '../context.js'
import { useAuth, useAuthClient } from '../primitives/auth.js'
import { useForm } from '../primitives/react-forms.js'

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

const formProvider = createNativeFormProvider()
const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.unstubAllGlobals()
})

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

/**
 * Renders a Solid tree into the document and keeps its cleanup.
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
 * Mounts a page under the auth context, the way the scaffold's shell does.
 *
 * @param client - The auth client the page reads.
 * @param page - The page component to mount.
 * @returns The rendered container.
 */
function mountPage(client: Client, page: () => JSX.Element): HTMLElement {
  return mount(() =>
    createComponent(AuthContext.Provider, {
      value: client,
      get children() {
        return page()
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

/** Submits the labeled form. */
function submit(container: HTMLElement, label: string): void {
  query(container, `form[aria-label="${label}"]`).dispatchEvent(
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

interface SignupValues extends Record<string, unknown> {
  email: string
  password: string
  username: string
}

/**
 * The scaffold's sign-up page: `useAuth().register` for the ONE mutation and
 * `useForm` for the fields — the shared pair a generated app is expected to use.
 *
 * @param props - The auth client (only the broken control needs the lower-level call).
 * @returns The sign-up page element.
 */
function SignupPage(props: { client: Client; duplicate?: boolean }): JSX.Element {
  const { register } = useAuth<AppUser, AppRegisterFields>()
  const [failure, setFailure] = createSignal('')
  const form = useForm<SignupValues>({
    createForm: formProvider.createForm,
    defaultValues: { email: '', password: '', username: '' },
  })
  const values = (): SignupValues => form.formState().values

  const onSubmit = async (submitted: SignupValues): Promise<void> => {
    setFailure('')
    try {
      await register(submitted)
      if (props.duplicate) {
        // CONTROL: the m390 pattern — the API's own resource helper AND the
        // auth client both create the account. The second call is the 409.
        await props.client.register(submitted)
      }
    } catch (error) {
      const body = (error as AuthError).body as
        { errors?: Record<string, string[]>; error?: string } | undefined
      setFailure(
        error instanceof Error
          ? `${error.message}${body?.error ? ` (${body.error})` : ''}`
          : 'Sign-up failed',
      )
    }
  }

  const email = form.register('email')
  const password = form.register('password')
  const username = form.register('username')

  return (
    <form aria-label="Create account" onSubmit={form.handleSubmit(onSubmit)}>
      <input aria-label="Email" name="email" value={values().email} onInput={email.onChange} />
      <input
        aria-label="Username"
        name="username"
        value={values().username}
        onInput={username.onChange}
      />
      <input
        aria-label="Password"
        type="password"
        name="password"
        value={values().password}
        onInput={password.onChange}
      />
      <button type="submit" disabled={form.isSubmitting()}>
        Create account
      </button>
      <Show when={form.isSubmitting()}>
        <span role="status">Creating account</span>
      </Show>
      <Show when={failure()}>
        <p role="alert">{failure()}</p>
      </Show>
    </form>
  )
}

interface LoginValues extends Record<string, unknown> {
  email: string
  password: string
}

/**
 * The scaffold's sign-in page. It renders from the form controller (so the
 * same DOM nodes must survive a rejected request) and renders the API's own
 * error body, not a generic message.
 *
 * @returns The sign-in page element.
 */
function LoginPage(): JSX.Element {
  const { login, isLoading } = useAuth<AppUser>()
  const [failure, setFailure] = createSignal('')
  const form = useForm<LoginValues>({
    createForm: formProvider.createForm,
    defaultValues: { email: '', password: '' },
  })
  const values = (): LoginValues => form.formState().values

  const onSubmit = async (submitted: LoginValues): Promise<void> => {
    setFailure('')
    try {
      await login(submitted)
    } catch (error) {
      const body = (error as AuthError).body as
        { errors?: Record<string, string[]>; error?: string } | undefined
      setFailure(
        Object.entries(body?.errors ?? {})
          .map(([field, messages]) => `${field} ${messages.join(', ')}`)
          .join('; ') ||
          (body?.error ?? 'Sign-in failed'),
      )
    }
  }

  const email = form.register('email')
  const password = form.register('password')

  return (
    <form aria-label="Sign in" onSubmit={form.handleSubmit(onSubmit)}>
      <input aria-label="Email" name="email" value={values().email} onInput={email.onChange} />
      <input
        aria-label="Password"
        type="password"
        name="password"
        value={values().password}
        onInput={password.onChange}
      />
      <button type="submit">Sign in</button>
      <Show when={isLoading()}>
        <span role="status">Signing in</span>
      </Show>
      <Show when={failure()}>
        <p role="alert">{failure()}</p>
      </Show>
    </form>
  )
}

interface SettingsValues extends Record<string, unknown> {
  name: string
  bio: string
}

/** The typed profile the settings form is seeded from. */
const seededUser: AppUser = {
  id: 'reader',
  email: 'reader@example.test',
  name: 'Reader',
  bio: 'First bio',
  username: 'reader',
}

/**
 * The scaffold's settings page: a form seeded from the signed-in user, reset
 * to the server's values, and saved through the shared client so every page
 * reading `useAuth().user` sees the new profile at once.
 *
 * @param props - Selects the deliberately stale-submission control.
 * @returns The settings page element.
 */
function SettingsPage(props: { staleSubmit?: boolean }): JSX.Element {
  const { user } = useAuth<AppUser>()
  const client = useAuthClient<AppUser, AppRegisterFields>()
  const [saved, setSaved] = createSignal('')
  const form = useForm<SettingsValues>({
    createForm: formProvider.createForm,
    defaultValues: { name: user()?.name ?? '', bio: user()?.bio ?? '' },
  })
  const values = (): SettingsValues => form.formState().values

  // CONTROL: capture the values from the FIRST render and submit those, which
  // is what reading a closed-over snapshot instead of the form's live values
  // does. The journey asserts the request carries the latest DOM value.
  const captured = { name: user()?.name ?? '', bio: user()?.bio ?? '' }

  const onSubmit = async (submitted: SettingsValues): Promise<void> => {
    await client.updateProfile(props.staleSubmit ? captured : submitted)
    setSaved(submitted.name)
  }

  const name = form.register('name')
  const bio = form.register('bio')

  return (
    <>
      <p role="status" data-testid="settings-saved">
        {saved() ? `Saved ${saved()}` : 'Not saved'}
      </p>
      <form aria-label="Settings" onSubmit={form.handleSubmit(onSubmit)}>
        <input aria-label="Name" name="name" value={values().name} onInput={name.onChange} />
        <textarea aria-label="Bio" name="bio" value={values().bio} onInput={bio.onChange} />
        <button type="submit">Save</button>
        <button
          type="button"
          onClick={() => {
            form.reset({
              name: client.getUser()?.name ?? '',
              bio: client.getUser()?.bio ?? '',
            })
          }}
        >
          Reset
        </button>
      </form>
    </>
  )
}

/** The authenticated shell, read from the same client every page uses. */
function ProfileSummary(): JSX.Element {
  const { user } = useAuth<AppUser>()
  return <p data-testid="profile-name">{user()?.name ?? 'anonymous'}</p>
}

describe('disposable scaffold auth journey', () => {
  it('registers with the app’s own typed fields through the envelope, exactly once', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()

    const container = mountPage(client, () => createComponent(SignupPage, { client }))

    typeInto(container, 'Email', 'reader@example.test')
    typeInto(container, 'Username', 'reader')
    typeInto(container, 'Password', 'long-password')

    let answer!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )

    const form = query(container, 'form[aria-label="Create account"]')
    submit(container, 'Create account')
    await settle()

    // One submit is one mutation.
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    const [url, init] = fetchBoundary.mock.calls[0]
    expect(String(url)).toBe('https://api.example.test/users')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      user: { email: 'reader@example.test', password: 'long-password', username: 'reader' },
    })
    // The form stays mounted (with its values) while the request is in flight.
    expect(query(container, 'form[aria-label="Create account"]')).toBe(form)
    expect(query<HTMLInputElement>(container, 'input[aria-label="Username"]').value).toBe('reader')

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
    await settle()

    expect(client.getState().status).toBe('authenticated')
    expect(client.getState().user).toMatchObject({ id: 'reader', name: 'Reader' })
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
  })

  it('renders a rejected sign-in’s API body without remounting the form or losing input', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()

    const container = mountPage(client, () => createComponent(LoginPage, {}))

    const form = query(container, 'form[aria-label="Sign in"]')
    const email = query<HTMLInputElement>(container, 'input[aria-label="Email"]')
    typeInto(container, 'Email', 'reader@example.test')

    let answer!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )
    submit(container, 'Sign in')
    await settle()
    expect(query<HTMLElement>(container, '[role="status"]').textContent).toBe('Signing in')
    expect(query(container, 'input[aria-label="Email"]')).toBe(email)

    answer(jsonResponse({ errors: { credentials: ['is invalid'] } }, 401))
    await settle()

    expect(query<HTMLElement>(container, '[role="alert"]').textContent).toBe(
      'credentials is invalid',
    )
    // The SAME nodes, with the typed value still in them.
    expect(query(container, 'form[aria-label="Sign in"]')).toBe(form)
    expect(query(container, 'input[aria-label="Email"]')).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(container.querySelector('[role="status"]')).toBeNull()
  })

  it('edits, revalidates while typing, resets, and saves the latest DOM values', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    client.setSession({ accessToken: 'access-token', user: seededUser })

    const container = mountPage(client, () => (
      <>
        <ProfileSummary />
        <SettingsPage />
      </>
    ))
    await settle()

    expect(query<HTMLElement>(container, '[data-testid="profile-name"]').textContent).toBe('Reader')
    const name = query<HTMLInputElement>(container, 'input[aria-label="Name"]')
    const bio = query<HTMLTextAreaElement>(container, 'textarea[aria-label="Bio"]')
    expect(name.value).toBe('Reader')
    expect(bio.value).toBe('First bio')

    typeInto(container, 'Name', 'Reader Edited')
    typeInto(container, 'Bio', 'Typed while the check was running')

    // A delayed session revalidation lands MID-TYPING. The answer is the same
    // data the client already holds — it must not reset the form.
    let revalidation!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        revalidation = resolve
      }),
    )
    const validation = client.validateSession?.() ?? Promise.resolve()
    await settle()
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    revalidation(
      jsonResponse({
        props: { ...seededUser, username: 'reader' },
        accessToken: 'access-token',
      }),
    )
    await validation
    await settle()

    expect(name.value).toBe('Reader Edited')
    expect(bio.value).toBe('Typed while the check was running')

    // Reset restores the SERVER's values, in the DOM.
    ;[...container.querySelectorAll('button')]
      .find((candidate) => candidate.textContent === 'Reset')
      ?.click()
    await settle()
    expect(name.value).toBe('Reader')
    expect(bio.value).toBe('First bio')

    // Type again and save: the request carries the DOM values, and every
    // reader of `useAuth().user` sees the saved profile without a reload.
    typeInto(container, 'Name', 'Latest Name')
    typeInto(container, 'Bio', 'Latest bio')
    let saved!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        saved = resolve
      }),
    )
    submit(container, 'Settings')
    await settle()
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
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
    await settle()

    expect(client.getUser()?.name).toBe('Latest Name')
    expect(query<HTMLElement>(container, '[data-testid="profile-name"]').textContent).toBe(
      'Latest Name',
    )
    expect(query<HTMLElement>(container, '[data-testid="settings-saved"]').textContent).toBe(
      'Saved Latest Name',
    )
  })
})

describe('known-bad controls (the journey’s guards have teeth)', () => {
  it('detects duplicate registration: the API helper plus the auth client create twice', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()

    const container = mountPage(client, () =>
      createComponent(SignupPage, { client, duplicate: true }),
    )

    typeInto(container, 'Email', 'reader@example.test')
    typeInto(container, 'Username', 'reader')
    typeInto(container, 'Password', 'long-password')

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

    submit(container, 'Create account')
    await settle()

    // The detector the journey asserts against: TWO registrations went out and
    // the second answered 409. This is the failure "exactly once" prevents.
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
    expect(fetchBoundary.mock.calls[1][1]?.method).toBe('POST')
    expect(query<HTMLElement>(container, '[role="alert"]').textContent).toContain(
      'already registered',
    )
  })

  it('detects a loading-state remount: the typed form is replaced and its input lost', async () => {
    /** CONTROL: a guard that remounts the page whenever a request starts. */
    function RemountingGuard(): JSX.Element {
      const { isLoading } = useAuth<AppUser>()
      return (
        <Show when={!isLoading()} fallback={<LoginPage />}>
          <LoginPage />
        </Show>
      )
    }

    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    fetchBoundary.mockReturnValue(new Promise<Response>(() => undefined))
    const client = createDisposableClient()

    const container = mountPage(client, () => createComponent(RemountingGuard, {}))

    const email = query<HTMLInputElement>(container, 'input[aria-label="Email"]')
    typeInto(container, 'Email', 'reader@example.test')
    submit(container, 'Sign in')
    await settle()

    // The old body-loss failure: the node is gone and the typed value with it.
    const after = query<HTMLInputElement>(container, 'input[aria-label="Email"]')
    expect(after).not.toBe(email)
    expect(after.value).toBe('')
  })

  it('detects a stale submission: the request carries values from before the edit', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    client.setSession({ accessToken: 'access-token', user: seededUser })

    const container = mountPage(client, () => createComponent(SettingsPage, { staleSubmit: true }))
    await settle()

    typeInto(container, 'Name', 'Latest Name')
    typeInto(container, 'Bio', 'Latest bio')
    fetchBoundary.mockResolvedValueOnce(
      jsonResponse({ props: { ...seededUser, name: 'Latest Name' } }),
    )

    submit(container, 'Settings')
    await settle()

    const [, init] = fetchBoundary.mock.calls[0]
    // The client reads the response body; the assertion is about what was SENT.
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Reader', bio: 'First bio' })
  })
})
