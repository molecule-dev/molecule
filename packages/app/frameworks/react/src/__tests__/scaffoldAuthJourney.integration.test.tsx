// @vitest-environment jsdom

/**
 * A disposable scaffold's auth journey, driven through the SHARED packages a
 * generated app actually imports: the real `createJWTAuthClient`, the real
 * `AuthProvider`, `useAuth`/`useAuthClient` and `useForm` with the real native
 * forms provider. Only the HTTP boundary (`fetch`) is controlled.
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
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AuthError, AuthResult, UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'
import { createNativeFormProvider } from '@molecule/app-forms'

import { useAuth, useAuthClient } from '../hooks/useAuth.js'
import { useForm } from '../hooks/useForm.js'
import { AuthProvider } from '../providers.js'

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
function SignupPage({
  client,
  duplicate = false,
}: {
  client: Client
  duplicate?: boolean
}): React.ReactElement {
  const { register } = useAuth<AppUser, AppRegisterFields>()
  const [failure, setFailure] = useState('')
  const form = useForm<SignupValues>({
    createForm: formProvider.createForm,
    defaultValues: { email: '', password: '', username: '' },
  })

  const submit = async (values: SignupValues): Promise<void> => {
    setFailure('')
    try {
      await register(values)
      if (duplicate) {
        // CONTROL: the m390 pattern — the API's own resource helper AND the
        // auth client both create the account. The second call is the 409.
        await client.register(values)
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
    <form aria-label="Create account" onSubmit={form.handleSubmit(submit)}>
      <input aria-label="Email" {...email} value={email.value as string} />
      <input aria-label="Username" {...username} value={username.value as string} />
      <input aria-label="Password" type="password" {...password} value={password.value as string} />
      <button type="submit" disabled={form.isSubmitting}>
        Create account
      </button>
      {form.isSubmitting && <span role="status">Creating account</span>}
      {failure && <p role="alert">{failure}</p>}
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
function LoginPage(): React.ReactElement {
  const { login, isLoading } = useAuth<AppUser>()
  const [failure, setFailure] = useState('')
  const form = useForm<LoginValues>({
    createForm: formProvider.createForm,
    defaultValues: { email: '', password: '' },
  })

  const submit = async (values: LoginValues): Promise<void> => {
    setFailure('')
    try {
      await login(values)
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
    <form aria-label="Sign in" onSubmit={form.handleSubmit(submit)}>
      <input aria-label="Email" {...email} value={email.value as string} />
      <input aria-label="Password" type="password" {...password} value={password.value as string} />
      <button type="submit">Sign in</button>
      {isLoading && <span role="status">Signing in</span>}
      {failure && <p role="alert">{failure}</p>}
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
function SettingsPage({ staleSubmit = false }: { staleSubmit?: boolean }): React.ReactElement {
  const { user } = useAuth<AppUser>()
  const client = useAuthClient<AppUser, AppRegisterFields>()
  const [saved, setSaved] = useState('')
  const form = useForm<SettingsValues>({
    createForm: formProvider.createForm,
    defaultValues: { name: user?.name ?? '', bio: user?.bio ?? '' },
  })

  // CONTROL: capture the values from the FIRST render and submit those, which
  // is what reading a closed-over snapshot instead of the form's live values
  // does. The journey asserts the request carries the latest DOM value.
  const captured = { name: user?.name ?? '', bio: user?.bio ?? '' }

  const submit = async (values: SettingsValues): Promise<void> => {
    await client.updateProfile(staleSubmit ? captured : values)
    setSaved(values.name)
  }

  const name = form.register('name')
  const bio = form.register('bio')

  return (
    <>
      <p role="status" data-testid="settings-saved">
        {saved ? `Saved ${saved}` : 'Not saved'}
      </p>
      <form aria-label="Settings" onSubmit={form.handleSubmit(submit)}>
        <input aria-label="Name" {...name} value={name.value as string} />
        <textarea aria-label="Bio" {...bio} value={bio.value as string} />
        <button type="submit">Save</button>
        <button
          type="button"
          onClick={() => {
            form.reset({ name: client.getUser()?.name ?? '', bio: client.getUser()?.bio ?? '' })
          }}
        >
          Reset
        </button>
      </form>
    </>
  )
}

/** The authenticated shell, read from the same client every page uses. */
function ProfileSummary(): React.ReactElement {
  const { user } = useAuth<AppUser>()
  return <p data-testid="profile-name">{user?.name ?? 'anonymous'}</p>
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('disposable scaffold auth journey', () => {
  it('registers with the app’s own typed fields through the envelope, exactly once', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()

    render(
      <AuthProvider client={client}>
        <SignupPage client={client} />
      </AuthProvider>,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'reader@example.test' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Username' }), {
      target: { value: 'reader' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } })

    let answer!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )

    const form = screen.getByRole('form', { name: 'Create account' })
    await act(async () => {
      fireEvent.submit(form)
    })

    // One submit is one mutation.
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    const [url, init] = fetchBoundary.mock.calls[0]
    expect(String(url)).toBe('https://api.example.test/users')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      user: { email: 'reader@example.test', password: 'long-password', username: 'reader' },
    })
    // The form stays mounted (with its values) while the request is in flight.
    expect(screen.getByRole('form', { name: 'Create account' })).toBe(form)
    expect((screen.getByRole('textbox', { name: 'Username' }) as HTMLInputElement).value).toBe(
      'reader',
    )

    await act(async () => {
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
    })

    expect(client.getState().status).toBe('authenticated')
    expect(client.getState().user).toMatchObject({ id: 'reader', name: 'Reader' })
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
  })

  it('renders a rejected sign-in’s API body without remounting the form or losing input', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()

    render(
      <AuthProvider client={client}>
        <LoginPage />
      </AuthProvider>,
    )

    const form = screen.getByRole('form', { name: 'Sign in' })
    const email = screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement
    fireEvent.change(email, { target: { value: 'reader@example.test' } })

    let answer!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )
    await act(async () => {
      fireEvent.submit(form)
    })
    expect(screen.getByRole('status').textContent).toBe('Signing in')
    expect(screen.getByRole('textbox', { name: 'Email' })).toBe(email)

    await act(async () => {
      answer(jsonResponse({ errors: { credentials: ['is invalid'] } }, 401))
    })

    expect(screen.getByRole('alert').textContent).toBe('credentials is invalid')
    // The SAME nodes, with the typed value still in them.
    expect(screen.getByRole('form', { name: 'Sign in' })).toBe(form)
    expect(screen.getByRole('textbox', { name: 'Email' })).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('edits, revalidates while typing, resets, and saves the latest DOM values', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    client.setSession({ accessToken: 'access-token', user: seededUser })

    render(
      <AuthProvider client={client}>
        <ProfileSummary />
        <SettingsPage />
      </AuthProvider>,
    )

    expect(screen.getByTestId('profile-name').textContent).toBe('Reader')
    const name = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement
    const bio = screen.getByRole('textbox', { name: 'Bio' }) as HTMLTextAreaElement
    expect(name.value).toBe('Reader')
    expect(bio.value).toBe('First bio')

    fireEvent.change(name, { target: { value: 'Reader Edited' } })
    fireEvent.change(bio, { target: { value: 'Typed while the check was running' } })

    // A delayed session revalidation lands MID-TYPING. The answer is the same
    // data the client already holds — it must not reset the form.
    let revalidation!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        revalidation = resolve
      }),
    )
    let validation!: Promise<void>
    act(() => {
      validation = client.validateSession?.() ?? Promise.resolve()
    })
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    await act(async () => {
      revalidation(
        jsonResponse({
          props: { ...seededUser, username: 'reader' },
          accessToken: 'access-token',
        }),
      )
      await validation
    })

    expect(name.value).toBe('Reader Edited')
    expect(bio.value).toBe('Typed while the check was running')

    // Reset restores the SERVER's values, in the DOM.
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(name.value).toBe('Reader')
    expect(bio.value).toBe('First bio')

    // Type again and save: the request carries the DOM values, and every
    // reader of `useAuth().user` sees the saved profile without a reload.
    fireEvent.change(name, { target: { value: 'Latest Name' } })
    fireEvent.change(bio, { target: { value: 'Latest bio' } })
    let saved!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        saved = resolve
      }),
    )
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Settings' }))
    })
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
    const [, init] = fetchBoundary.mock.calls[1]
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Latest Name', bio: 'Latest bio' })

    await act(async () => {
      saved(
        jsonResponse({
          props: { ...seededUser, name: 'Latest Name', bio: 'Latest bio' },
          user: { ...seededUser, name: 'Latest Name', bio: 'Latest bio' },
          accessToken: 'access-token',
        }),
      )
    })

    expect(client.getUser()?.name).toBe('Latest Name')
    expect(screen.getByTestId('profile-name').textContent).toBe('Latest Name')
    expect(screen.getByTestId('settings-saved').textContent).toBe('Saved Latest Name')
  })
})

describe('known-bad controls (the journey’s guards have teeth)', () => {
  it('detects duplicate registration: the API helper plus the auth client create twice', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()

    render(
      <AuthProvider client={client}>
        <SignupPage client={client} duplicate />
      </AuthProvider>,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'reader@example.test' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Username' }), {
      target: { value: 'reader' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } })

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

    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Create account' }))
    })

    // The detector the journey asserts against: TWO registrations went out and
    // the second answered 409. This is the failure "exactly once" prevents.
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
    expect(fetchBoundary.mock.calls[1][1]?.method).toBe('POST')
    expect(screen.getByRole('alert').textContent).toContain('already registered')
  })

  it('detects a loading-state remount: the typed form is replaced and its input lost', async () => {
    /** CONTROL: a guard that remounts the page whenever a request starts. */
    function RemountingGuard(): React.ReactElement {
      const { isLoading } = useAuth<AppUser>()
      return (
        <div key={isLoading ? 'loading' : 'ready'}>
          <LoginPage />
        </div>
      )
    }

    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    fetchBoundary.mockReturnValue(new Promise<Response>(() => undefined))
    const client = createDisposableClient()

    render(
      <AuthProvider client={client}>
        <RemountingGuard />
      </AuthProvider>,
    )

    const email = screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement
    fireEvent.change(email, { target: { value: 'reader@example.test' } })
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }))
    })

    // The old body-loss failure: the node is gone and the typed value with it.
    const after = screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement
    expect(after).not.toBe(email)
    expect(after.value).toBe('')
  })

  it('detects a stale submission: the request carries values from before the edit', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    client.setSession({ accessToken: 'access-token', user: seededUser })

    render(
      <AuthProvider client={client}>
        <SettingsPage staleSubmit />
      </AuthProvider>,
    )

    const name = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement
    fireEvent.change(name, { target: { value: 'Latest Name' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Bio' }), {
      target: { value: 'Latest bio' },
    })
    fetchBoundary.mockResolvedValueOnce(
      jsonResponse({ props: { ...seededUser, name: 'Latest Name' } }),
    )

    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Settings' }))
    })

    const [, init] = fetchBoundary.mock.calls[0]
    // The client reads the response body; the assertion is about what was SENT.
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Reader', bio: 'First bio' })
  })
})
