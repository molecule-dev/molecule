// @vitest-environment jsdom

/**
 * Auth route-guard continuity over the real restoring client: a page guarded on
 * `status === 'loading'` stays mounted through a failed sign-in — the same form
 * and the same typed email — renders the API's structured errors, and replaces
 * itself only once the session is authenticated.
 *
 * Mirrors the React package's `authGuardContinuity.test.tsx`.
 *
 * @module
 */

import { createSignal, type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'

import { AuthContext } from '../context.js'
import { useAuth } from '../primitives/auth.js'

const disposers: Array<() => void> = []

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
 * Whether a value is a non-null object.
 *
 * @param value - The value to inspect.
 * @returns `true` for a plain object-like value.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * The API's field errors as the one line a page shows, read without trusting
 * the shape of a rejection: `{ errors: { credentials: ['is invalid'] } }`
 * becomes `credentials is invalid`.
 *
 * @param error - The rejection.
 * @returns The joined field errors, or an empty string when none are present.
 */
function apiFieldErrors(error: unknown): string {
  if (!isRecord(error) || !('body' in error) || !isRecord(error.body)) return ''
  const { errors } = error.body
  if (!isRecord(errors)) return ''
  return Object.entries(errors)
    .map(([field, messages]) => {
      const shown = Array.isArray(messages) ? messages.join(', ') : String(messages)
      return `${field} ${shown}`
    })
    .join('; ')
}

/** A form whose local draft and failure must survive an unsuccessful sign-in. */
function LoginPage(): JSX.Element {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = createSignal('')
  const [failure, setFailure] = createSignal('')
  const submit = async (): Promise<void> => {
    setFailure('')
    try {
      await login({ email: email(), password: 'test-password' })
    } catch (error) {
      setFailure(apiFieldErrors(error))
    }
  }
  return (
    <form
      aria-label="Sign in"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <input
        aria-label="Email"
        value={email()}
        onInput={(event) => setEmail(event.currentTarget.value)}
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

/** A route shell waits only while the initial session decision is unknown. */
function GuardedShell(): JSX.Element {
  const { status, user } = useAuth<{ id: string; email: string }>()
  return (
    <Show when={status() !== 'loading'} fallback={<p role="status">Restoring session</p>}>
      <Show when={status() === 'authenticated'} fallback={<LoginPage />}>
        <h1>Signed in as {user()?.email}</h1>
      </Show>
    </Show>
  )
}

/**
 * The browser response-parsing path, including the API's structured error.
 *
 * @param body - The JSON body.
 * @param status - The HTTP status.
 * @returns The response.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * The element matching a selector, or a failure naming it — an absent control
 * is a broken page, not a passing assertion.
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
 * An `<input>` selected by its label.
 *
 * @param container - The rendered tree.
 * @param label - The input's `aria-label`.
 * @returns The input element.
 */
function inputByLabel(container: HTMLElement, label: string): HTMLInputElement {
  const element = query(container, `input[aria-label="${label}"]`)
  if (!(element instanceof HTMLInputElement)) throw new Error(`${label} is not an input`)
  return element
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('auth route guard continuity', () => {
  it('keeps the same form through a failed login, renders its API errors, and transitions on success', async () => {
    document.cookie = 'mol_auth=; Max-Age=0; path=/'
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createJWTAuthClient({
      baseURL: 'https://api.example.test',
      storage: 'memory',
      autoRefresh: false,
    })
    await client.initialize()
    expect(client.getState()).toMatchObject({ initialized: true, status: 'unauthenticated' })
    expect(fetchBoundary).not.toHaveBeenCalled()

    const container = mount(() => (
      <AuthContext.Provider value={client}>
        <GuardedShell />
      </AuthContext.Provider>
    ))
    const form = query(container, 'form[aria-label="Sign in"]')
    const email = inputByLabel(container, 'Email')
    email.value = 'reader@example.test'
    email.dispatchEvent(new Event('input', { bubbles: true }))

    let rejectLogin!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        rejectLogin = resolve
      }),
    )
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await settle()
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    expect(container.querySelector('form[aria-label="Sign in"]')).toBe(form)
    expect(container.querySelector('input[aria-label="Email"]')).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Signing in')

    rejectLogin(jsonResponse({ errors: { credentials: ['is invalid'] } }, 401))
    await settle()
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('credentials is invalid')
    expect(container.querySelector('form[aria-label="Sign in"]')).toBe(form)
    expect(container.querySelector('input[aria-label="Email"]')).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(container.querySelector('[role="status"]')).toBeNull()

    let acceptLogin!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        acceptLogin = resolve
      }),
    )
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await settle()
    expect(container.querySelector('form[aria-label="Sign in"]')).toBe(form)
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Signing in')
    acceptLogin(
      jsonResponse({
        user: { id: 'reader', email: 'reader@example.test' },
        accessToken: 'test-access-token',
      }),
    )
    await settle()
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
    expect(container.querySelector('h1')?.textContent).toBe('Signed in as reader@example.test')
    expect(container.querySelector('form')).toBeNull()
    expect(client.getState().status).toBe('authenticated')
  })
})
