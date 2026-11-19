// @vitest-environment jsdom

/**
 * A disposable scaffold's auth journey, driven through the SHARED packages a
 * generated app actually imports: the real `createJWTAuthClient`, the real
 * molecule plugin, `useAuth`/`useAuthClient` and `useForm` with the real native
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
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import type { AuthError, AuthResult, UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'
import { createNativeFormProvider } from '@molecule/app-forms'

import { useAuth, useAuthClient } from '../composables/useAuth.js'
import { useForm } from '../composables/useForms.js'
import { moleculePlugin } from '../plugin.js'

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
const wrappers: VueWrapper[] = []

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
 * @returns The sign-up page component.
 */
function SignupPage({ client, duplicate = false }: { client: Client; duplicate?: boolean }) {
  return defineComponent({
    setup() {
      const { register } = useAuth<AppUser, AppRegisterFields>()
      const failure = ref('')
      const form = useForm<SignupValues>({
        createForm: formProvider.createForm,
        defaultValues: { email: '', password: '', username: '' },
      })

      const submit = async (values: SignupValues): Promise<void> => {
        failure.value = ''
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
          failure.value =
            error instanceof Error
              ? `${error.message}${body?.error ? ` (${body.error})` : ''}`
              : 'Sign-up failed'
        }
      }

      const bind = (name: keyof SignupValues) => {
        const registration = form.register(name)
        return {
          name: registration.name,
          onChange: registration.onChange,
          onBlur: registration.onBlur,
          value: form.formState.value.values[name],
        }
      }

      return () =>
        h('form', { 'aria-label': 'Create account', onSubmit: form.handleSubmit(submit) }, [
          h('input', { 'aria-label': 'Email', ...bind('email') }),
          h('input', { 'aria-label': 'Username', ...bind('username') }),
          h('input', { 'aria-label': 'Password', type: 'password', ...bind('password') }),
          h('button', { type: 'submit', disabled: form.isSubmitting.value }, 'Create account'),
          form.isSubmitting.value ? h('span', { role: 'status' }, 'Creating account') : null,
          failure.value ? h('p', { role: 'alert' }, failure.value) : null,
        ])
    },
  })
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
 * @returns The sign-in page component.
 */
function LoginPage() {
  return defineComponent({
    setup() {
      const { login, isLoading } = useAuth<AppUser>()
      const failure = ref('')
      const form = useForm<LoginValues>({
        createForm: formProvider.createForm,
        defaultValues: { email: '', password: '' },
      })

      const submit = async (values: LoginValues): Promise<void> => {
        failure.value = ''
        try {
          await login(values)
        } catch (error) {
          const body = (error as AuthError).body as
            { errors?: Record<string, string[]>; error?: string } | undefined
          failure.value =
            Object.entries(body?.errors ?? {})
              .map(([field, messages]) => `${field} ${messages.join(', ')}`)
              .join('; ') ||
            body?.error ||
            'Sign-in failed'
        }
      }

      const bind = (name: keyof LoginValues) => {
        const registration = form.register(name)
        return {
          name: registration.name,
          onChange: registration.onChange,
          onBlur: registration.onBlur,
          value: form.formState.value.values[name],
        }
      }

      return () =>
        h('form', { 'aria-label': 'Sign in', onSubmit: form.handleSubmit(submit) }, [
          h('input', { 'aria-label': 'Email', ...bind('email') }),
          h('input', { 'aria-label': 'Password', type: 'password', ...bind('password') }),
          h('button', { type: 'submit' }, 'Sign in'),
          isLoading.value ? h('span', { role: 'status' }, 'Signing in') : null,
          failure.value ? h('p', { role: 'alert' }, failure.value) : null,
        ])
    },
  })
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
 * @returns The settings page component.
 */
function SettingsPage({ staleSubmit = false }: { staleSubmit?: boolean }) {
  return defineComponent({
    setup() {
      const { user } = useAuth<AppUser>()
      const client = useAuthClient<AppUser, AppRegisterFields>()
      const saved = ref('')
      const form = useForm<SettingsValues>({
        createForm: formProvider.createForm,
        defaultValues: { name: user.value?.name ?? '', bio: user.value?.bio ?? '' },
      })

      // CONTROL: capture the values from the FIRST render and submit those, which
      // is what reading a closed-over snapshot instead of the form's live values
      // does. The journey asserts the request carries the latest DOM value.
      const captured = { name: user.value?.name ?? '', bio: user.value?.bio ?? '' }

      const submit = async (values: SettingsValues): Promise<void> => {
        await client.updateProfile(staleSubmit ? captured : values)
        saved.value = values.name
      }

      const bind = (name: keyof SettingsValues) => {
        const registration = form.register(name)
        return {
          name: registration.name,
          onChange: registration.onChange,
          onBlur: registration.onBlur,
          value: form.formState.value.values[name],
        }
      }

      return () =>
        h('div', [
          h(
            'p',
            { role: 'status', 'data-testid': 'settings-saved' },
            saved.value ? `Saved ${saved.value}` : 'Not saved',
          ),
          h('form', { 'aria-label': 'Settings', onSubmit: form.handleSubmit(submit) }, [
            h('input', { 'aria-label': 'Name', ...bind('name') }),
            h('textarea', { 'aria-label': 'Bio', ...bind('bio') }),
            h('button', { type: 'submit' }, 'Save'),
            h(
              'button',
              {
                type: 'button',
                onClick: () => {
                  form.reset({
                    name: client.getUser()?.name ?? '',
                    bio: client.getUser()?.bio ?? '',
                  })
                },
              },
              'Reset',
            ),
          ]),
        ])
    },
  })
}

/** The authenticated shell, read from the same client every page uses. */
function ProfileSummary() {
  return defineComponent({
    setup() {
      const { user } = useAuth<AppUser>()
      return () => h('p', { 'data-testid': 'profile-name' }, user.value?.name ?? 'anonymous')
    },
  })
}

/**
 * Mounts a page through the plugin, as the scaffold's `main.ts` wires the app.
 *
 * @param client - The auth client the app was built with.
 * @param component - The page to mount.
 * @returns The mounted wrapper.
 */
function mountPage(client: Client, component: ReturnType<typeof defineComponent>) {
  const wrapper = mount(component, {
    global: { plugins: [[moleculePlugin, { auth: client }]] },
  })
  wrappers.push(wrapper)
  return wrapper
}

/**
 * Types into a native control and fires the `change` the form binding listens to.
 *
 * @param wrapper - The mounted wrapper.
 * @param selector - The control selector.
 * @param value - The text to type.
 */
async function typeInto(wrapper: VueWrapper, selector: string, value: string): Promise<void> {
  const control = wrapper.get(selector)
  if (
    control.element instanceof HTMLInputElement ||
    control.element instanceof HTMLTextAreaElement
  ) {
    control.element.value = value
  }
  await control.trigger('change')
}

/**
 * The value a native control currently holds.
 *
 * @param wrapper - The mounted wrapper.
 * @param selector - The control selector.
 * @returns Its value text.
 */
function controlValue(wrapper: VueWrapper, selector: string): string {
  const element = wrapper.get(selector).element
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
    ? element.value
    : ''
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.unstubAllGlobals()
})

describe('disposable scaffold auth journey', () => {
  it('registers with the app’s own typed fields through the envelope, exactly once', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    const wrapper = mountPage(client, SignupPage({ client }))

    await typeInto(wrapper, '[aria-label="Email"]', 'reader@example.test')
    await typeInto(wrapper, '[aria-label="Username"]', 'reader')
    await typeInto(wrapper, '[aria-label="Password"]', 'long-password')

    let answer!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )

    const form = wrapper.get('form').element
    await wrapper.get('form').trigger('submit')

    // One submit is one mutation.
    await vi.waitFor(() => expect(fetchBoundary).toHaveBeenCalledTimes(1))
    const [url, init] = fetchBoundary.mock.calls[0]
    expect(String(url)).toBe('https://api.example.test/users')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      user: { email: 'reader@example.test', password: 'long-password', username: 'reader' },
    })
    // The form stays mounted (with its values) while the request is in flight.
    expect(wrapper.get('form').element).toBe(form)
    expect(controlValue(wrapper, '[aria-label="Username"]')).toBe('reader')

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
    await nextTick()

    expect(client.getState().user).toMatchObject({ id: 'reader', name: 'Reader' })
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
  })

  it('renders a rejected sign-in’s API body without remounting the form or losing input', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    const wrapper = mountPage(client, LoginPage())

    const form = wrapper.get('form').element
    const email = wrapper.get('[aria-label="Email"]').element
    await typeInto(wrapper, '[aria-label="Email"]', 'reader@example.test')

    let answer!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.get('[role="status"]').text()).toBe('Signing in'))
    expect(wrapper.get('[aria-label="Email"]').element).toBe(email)

    answer(jsonResponse({ errors: { credentials: ['is invalid'] } }, 401))
    await vi.waitFor(() =>
      expect(wrapper.get('[role="alert"]').text()).toBe('credentials is invalid'),
    )

    // The SAME nodes, with the typed value still in them.
    expect(wrapper.get('form').element).toBe(form)
    expect(wrapper.get('[aria-label="Email"]').element).toBe(email)
    expect(controlValue(wrapper, '[aria-label="Email"]')).toBe('reader@example.test')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('edits, revalidates while typing, resets, and saves the latest DOM values', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    client.setSession({ accessToken: 'access-token', user: seededUser })

    const settings = SettingsPage({})
    const summary = ProfileSummary()
    const Page = defineComponent({
      setup: () => () => h('div', [h(summary), h(settings)]),
    })
    const wrapper = mountPage(client, Page)

    expect(wrapper.get('[data-testid="profile-name"]').text()).toBe('Reader')
    expect(controlValue(wrapper, '[aria-label="Name"]')).toBe('Reader')
    expect(controlValue(wrapper, '[aria-label="Bio"]')).toBe('First bio')

    await typeInto(wrapper, '[aria-label="Name"]', 'Reader Edited')
    await typeInto(wrapper, '[aria-label="Bio"]', 'Typed while the check was running')

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
    await nextTick()

    expect(controlValue(wrapper, '[aria-label="Name"]')).toBe('Reader Edited')
    expect(controlValue(wrapper, '[aria-label="Bio"]')).toBe('Typed while the check was running')

    // Reset restores the SERVER's values, in the DOM.
    await wrapper.get('button[type="button"]').trigger('click')
    await nextTick()
    expect(controlValue(wrapper, '[aria-label="Name"]')).toBe('Reader')
    expect(controlValue(wrapper, '[aria-label="Bio"]')).toBe('First bio')

    // Type again and save: the request carries the DOM values, and every
    // reader of `useAuth().user` sees the saved profile without a reload.
    await typeInto(wrapper, '[aria-label="Name"]', 'Latest Name')
    await typeInto(wrapper, '[aria-label="Bio"]', 'Latest bio')
    let saved!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        saved = resolve
      }),
    )
    await wrapper.get('form').trigger('submit')
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
    await nextTick()
    expect(wrapper.get('[data-testid="profile-name"]').text()).toBe('Latest Name')
    expect(wrapper.get('[data-testid="settings-saved"]').text()).toBe('Saved Latest Name')
  })
})

describe('known-bad controls (the journey’s guards have teeth)', () => {
  it('detects duplicate registration: the API helper plus the auth client create twice', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    const wrapper = mountPage(client, SignupPage({ client, duplicate: true }))

    await typeInto(wrapper, '[aria-label="Email"]', 'reader@example.test')
    await typeInto(wrapper, '[aria-label="Username"]', 'reader')
    await typeInto(wrapper, '[aria-label="Password"]', 'long-password')

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

    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))

    // The detector the journey asserts against: TWO registrations went out and
    // the second answered 409. This is the failure "exactly once" prevents.
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
    expect(fetchBoundary.mock.calls[1][1]?.method).toBe('POST')
    expect(wrapper.get('[role="alert"]').text()).toContain('already registered')
  })

  it('detects a loading-state remount: the typed form is replaced and its input lost', async () => {
    /** CONTROL: a guard that remounts the page whenever a request starts. */
    const login = LoginPage()
    const RemountingGuard = defineComponent({
      setup() {
        const { isLoading } = useAuth<AppUser>()
        return () => h('div', { key: isLoading.value ? 'loading' : 'ready' }, [h(login)])
      },
    })

    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    fetchBoundary.mockReturnValue(new Promise<Response>(() => undefined))
    const client = createDisposableClient()
    const wrapper = mountPage(client, RemountingGuard)

    const email = wrapper.get('[aria-label="Email"]').element
    await typeInto(wrapper, '[aria-label="Email"]', 'reader@example.test')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Email"]').element).not.toBe(email))

    // The old body-loss failure: the node is gone and the typed value with it.
    expect(controlValue(wrapper, '[aria-label="Email"]')).toBe('')
  })

  it('detects a stale submission: the request carries values from before the edit', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createDisposableClient()
    client.setSession({ accessToken: 'access-token', user: seededUser })
    const wrapper = mountPage(client, SettingsPage({ staleSubmit: true }))

    await typeInto(wrapper, '[aria-label="Name"]', 'Latest Name')
    await typeInto(wrapper, '[aria-label="Bio"]', 'Latest bio')
    fetchBoundary.mockResolvedValueOnce(
      jsonResponse({ props: { ...seededUser, name: 'Latest Name' } }),
    )

    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(fetchBoundary).toHaveBeenCalledTimes(1))

    const [, init] = fetchBoundary.mock.calls[0]
    // The client reads the response body; the assertion is about what was SENT.
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Reader', bio: 'First bio' })
  })
})
