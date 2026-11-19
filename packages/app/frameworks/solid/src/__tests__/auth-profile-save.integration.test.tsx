// @vitest-environment jsdom

/**
 * Signed-in account edits over the real client and the bonded native form
 * provider: `useAuth().updateProfile` saves through the configured profile
 * transport and publishes the server's canonical profile, and
 * `useProfileForm` preserves a typed field through late account hydration and
 * saves only what changed.
 *
 * Mirrors the React package's `auth-profile-save.integration.test.tsx`.
 *
 * @module
 */

import { createSignal, type JSX, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'

import { AuthContext } from '../context.js'
import { useAuth, type UseAuthResult } from '../primitives/auth.js'
import { useProfileForm } from '../primitives/react-forms.js'

/** The signed-in account an API returns. */
interface Account {
  memberKey: string
  displayName: string
  timezone: string
}

/** The account fields this page edits. */
interface AccountValues {
  displayName: string
  timezone: string
}

const initial: Account = { memberKey: 'employee-7', displayName: 'Before', timezone: 'UTC' }
const saved: Account = { ...initial, displayName: 'Saved name' }
const mounted: Array<() => void> = []

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
 * Reads an account from an unknown wire value, failing loudly on a shape this
 * test did not write.
 *
 * @param value - The parsed wire value.
 * @returns The account.
 */
function toAccount(value: unknown): Account {
  if (
    !isRecord(value) ||
    typeof value.memberKey !== 'string' ||
    typeof value.displayName !== 'string' ||
    typeof value.timezone !== 'string'
  ) {
    throw new Error('unexpected account payload')
  }
  return {
    memberKey: value.memberKey,
    displayName: value.displayName,
    timezone: value.timezone,
  }
}

/**
 * Reads the `{ account }` envelope the test API answers with.
 *
 * @param value - The parsed wire value.
 * @returns The account in the envelope.
 */
function accountFromEnvelope(value: unknown): Account {
  if (!isRecord(value)) throw new Error('unexpected account envelope')
  return toAccount(value.account)
}

/**
 * Reads the `{ account: Partial<Account> }` profile-save body, keeping only the
 * string fields the account has.
 *
 * @param value - The parsed request body.
 * @returns The patch the client sent.
 */
function patchFromBody(value: unknown): Partial<Account> {
  if (!isRecord(value) || !isRecord(value.account)) throw new Error('unexpected save body')
  const patch: Partial<Account> = {}
  for (const [field, fieldValue] of Object.entries(value.account)) {
    if (
      typeof fieldValue === 'string' &&
      (field === 'memberKey' || field === 'displayName' || field === 'timezone')
    ) {
      patch[field] = fieldValue
    }
  }
  return patch
}

/**
 * Renders a Solid tree into the document.
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
  mounted.push(unmount)
  return { container, unmount }
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
 * The value of the labeled input.
 *
 * @param container - The rendered tree.
 * @param label - The input's `aria-label`.
 * @returns The input's current value.
 */
function valueOf(container: HTMLElement, label: string): string {
  const element = query(container, `input[aria-label="${label}"]`)
  if (!(element instanceof HTMLInputElement)) throw new Error(`${label} is not an input`)
  return element.value
}

/**
 * Types into the labeled input the way a person does.
 *
 * @param container - The rendered tree.
 * @param label - The input's `aria-label`.
 * @param value - The text to type.
 */
function typeInto(container: HTMLElement, label: string, value: string): void {
  const element = query<HTMLInputElement>(container, `input[aria-label="${label}"]`)
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * The account editor's live client, the write spies, and the mount wrapper.
 *
 * @returns The client, a wrapper for the account editor, the writes the server
 *   saw, and the client's storage adapter contents.
 */
function setup(): {
  client: ReturnType<typeof createJWTAuthClient<Account>>
  wrapper: (children: () => JSX.Element) => () => JSX.Element
  writes: unknown[]
  items: Map<string, string>
} {
  let server: Account = { ...initial }
  const writes: unknown[] = []
  const items = new Map<string, string>()
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (_input, options) => {
      if (options?.method === 'PUT') {
        const body: unknown = JSON.parse(String(options.body))
        writes.push(body)
        server = { ...server, ...patchFromBody(body) }
      }
      return Response.json({ account: server })
    }),
  )
  const client = createJWTAuthClient<Account>({
    autoRefresh: false,
    currentUserEndpoint: '/employees/current',
    profileEndpoint: '/employees/current',
    profileUpdateMethod: 'PUT',
    profileRequestBody: (account) => ({ account }),
    mapAuthResponse: (data) => ({ user: accountFromEnvelope(data) }),
    storage: {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => {
        items.set(key, value)
      },
      removeItem: (key) => {
        items.delete(key)
      },
    },
  })
  client.setSession({ accessToken: 'employee-token', user: initial })
  const wrapper = (children: () => JSX.Element) => () => (
    <AuthContext.Provider value={client}>{children()}</AuthContext.Provider>
  )
  return { client, wrapper, writes, items }
}

/**
 * Mounts the account editor's `useAuth` probe and returns its result once the
 * mount has run.
 *
 * @param wrapper - The auth context wrapper.
 * @param read - Receives the hook result.
 * @returns The idempotent unmount, once the probe has run.
 */
function mountAuthProbe(
  wrapper: (children: () => JSX.Element) => () => JSX.Element,
  read: (auth: UseAuthResult<Account>) => void,
): { unmount: () => void } {
  function Probe(): null {
    read(useAuth<Account>())
    return null
  }
  return mount(wrapper(() => <Probe />))
}

/**
 * A form that seeds its draft from the shared user at mount.
 *
 * @returns The account name input.
 */
function AccountEditor(): JSX.Element {
  const { user } = useAuth<Account>()
  const [name, setName] = createSignal(user()?.displayName ?? '')
  return (
    <input
      aria-label="Account name"
      value={name()}
      onInput={(event) => setName(event.currentTarget.value)}
    />
  )
}

/**
 * The managed profile form: controlled native inputs over `useProfileForm`.
 *
 * @returns The form, its two inputs and its submit button.
 */
function ManagedAccountEditor(): JSX.Element {
  const form = useProfileForm<Account, AccountValues>({
    defaultValues: { displayName: '', timezone: '' },
    toValues: (account) => ({ displayName: account.displayName, timezone: account.timezone }),
    toPatch: (changes) => changes,
  })
  const name = form.register('displayName')
  const timezone = form.register('timezone')
  return (
    <form aria-label="Account" onSubmit={form.formProps.onSubmit}>
      <input
        aria-label="Account name"
        name="displayName"
        value={form.formState().values.displayName}
        onInput={name.onChange}
      />
      <input
        aria-label="Timezone"
        name="timezone"
        value={form.formState().values.timezone}
        onInput={timezone.onChange}
      />
      <button type="submit" disabled={!form.ready() || form.isSubmitting()}>
        Save
      </button>
    </form>
  )
}

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
  vi.unstubAllGlobals()
})

describe('signed-in account edits', () => {
  it('useAuth saves through the configured profile transport before a form remount', async () => {
    const { client, wrapper, writes, items } = setup()
    let auth!: UseAuthResult<Account>
    const probe = mountAuthProbe(wrapper, (result) => {
      auth = result
    })
    const action = auth.updateProfile
    const answer = await auth.updateProfile({ displayName: saved.displayName })

    expect(answer).toEqual(saved)
    expect(auth.user()).toEqual(saved)
    expect(client.getUser()).toEqual(saved)
    expect(writes).toEqual([{ account: { displayName: saved.displayName } }])
    expect(JSON.parse(items.get('molecule:auth:user') ?? 'null')).toEqual(saved)
    expect(auth.updateProfile).toBe(action)
    probe.unmount()
    const { container } = mount(wrapper(() => <AccountEditor />))
    expect(valueOf(container, 'Account name')).toBe(saved.displayName)
  })

  it('a rejected useAuth profile save keeps the previous shared user', async () => {
    const { wrapper } = setup()
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => Response.json({ error: 'Invalid name' }, { status: 422 })),
    )
    let auth!: UseAuthResult<Account>
    mountAuthProbe(wrapper, (result) => {
      auth = result
    })
    await expect(auth.updateProfile({ displayName: '' })).rejects.toHaveProperty('status', 422)
    expect(auth.user()).toEqual(initial)
  })

  it('counterexample: a custom save followed by setUser keeps the next form correct', async () => {
    const { wrapper } = setup()
    let auth!: UseAuthResult<Account>
    const probe = mountAuthProbe(wrapper, (result) => {
      auth = result
    })
    const response = await fetch('/employees/current', {
      method: 'PUT',
      body: JSON.stringify({ account: { displayName: saved.displayName } }),
    })
    auth.setUser(accountFromEnvelope(await response.json()))
    probe.unmount()
    const { container } = mount(wrapper(() => <AccountEditor />))
    expect(valueOf(container, 'Account name')).toBe(saved.displayName)
  })

  it('counterexample: a form that loads the server on each visit can own its values', async () => {
    const { wrapper, client } = setup()
    await fetch('/employees/current', {
      method: 'PUT',
      body: JSON.stringify({ account: { displayName: saved.displayName } }),
    })

    /**
     * A form that reads the server itself on mount and owns its own draft.
     *
     * @returns The account name input.
     */
    function ServerAccountEditor(): JSX.Element {
      const [name, setName] = createSignal('')
      onMount(() => {
        void fetch('/employees/current')
          .then((response) => response.json())
          .then((body: unknown) => setName(accountFromEnvelope(body).displayName))
      })
      return (
        <input
          aria-label="Account name"
          value={name()}
          onInput={(event) => setName(event.currentTarget.value)}
        />
      )
    }

    const { container } = mount(wrapper(() => <ServerAccountEditor />))
    await waitFor(() => expect(valueOf(container, 'Account name')).toBe(saved.displayName))
    expect(client.getUser()).toEqual(initial)
  })

  it('useProfileForm preserves a typed field through late account hydration and saves it for the next visit', async () => {
    const { client, wrapper, writes } = setup()
    client.setUser({ ...initial, timezone: '' })
    const view = mount(wrapper(() => <ManagedAccountEditor />))
    typeInto(view.container, 'Account name', saved.displayName)
    client.setUser(initial)
    expect(valueOf(view.container, 'Account name')).toBe(saved.displayName)
    expect(valueOf(view.container, 'Timezone')).toBe('UTC')
    query(view.container, 'form[aria-label="Account"]').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await waitFor(() => expect(client.getUser()).toEqual(saved))
    expect(writes).toEqual([{ account: { displayName: saved.displayName } }])
    view.unmount()
    const next = mount(wrapper(() => <ManagedAccountEditor />))
    expect(valueOf(next.container, 'Account name')).toBe(saved.displayName)
  })
})
