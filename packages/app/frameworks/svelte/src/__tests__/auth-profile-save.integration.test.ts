// @vitest-environment jsdom

/**
 * Signed-in account edits: the transport, the shared user, and the profile
 * form's late hydration — React's integration cases driven through a real
 * Svelte tree under `setMoleculeContext({ auth })`.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type AuthClient, createJWTAuthClient, type StorageAdapter } from '@molecule/app-auth'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../context.js'
import { useAuth } from '../hooks/useAuth.js'
import type { MoleculeConfig } from '../types.js'
import AccountEditor from './auth/AccountEditor.svelte'
import ManagedAccountEditor from './auth/ManagedAccountEditor.svelte'
import ServerAccountEditor from './auth/ServerAccountEditor.svelte'
import { mountInContext } from './context-host.js'

interface Account {
  memberKey: string
  displayName: string
  timezone: string
}
const initial: Account = { memberKey: 'employee-7', displayName: 'Before', timezone: 'UTC' }
const saved: Account = { ...initial, displayName: 'Saved name' }
const cleanups: (() => void)[] = []
const hosts: Array<() => Promise<void>> = []

function setup(): { client: AuthClient<Account>; writes: unknown[]; items: Map<string, string> } {
  let server = { ...initial }
  const writes: unknown[] = []
  const items = new Map<string, string>()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') {
        const body = JSON.parse(String(options.body)) as { account: Partial<Account> }
        writes.push(body)
        server = { ...server, ...body.account }
      }
      return Response.json({ account: server })
    }),
  )
  const storage: StorageAdapter = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }
  const client = createJWTAuthClient<Account>({
    autoRefresh: false,
    currentUserEndpoint: '/employees/current',
    profileEndpoint: '/employees/current',
    profileUpdateMethod: 'PUT',
    profileRequestBody: (account) => ({ account }),
    mapAuthResponse: (data) => ({ user: (data as { account: Account }).account }),
    storage,
  })
  client.setSession({ accessToken: 'employee-token', user: initial })
  cleanups.push(() => client.destroy())
  return { client, writes, items }
}

/**
 * Mounts the binding conformance host, so the component or hook runs under a
 * real Svelte context carrying the case's services.
 *
 * @param config - The services to provide through `setMoleculeContext`.
 * @param component - The component to render under that context.
 * @param props - The component's props.
 * @returns The container and the tree's unmount.
 */
function mountTree<Props extends Record<string, unknown>>(
  config: MoleculeConfig,
  component: Component<Props>,
  props: Props,
): { container: HTMLDivElement; stop: () => Promise<void> } {
  const tree = mountInContext(config, component, props)
  hosts.push(tree.stop)
  return tree
}

/**
 * Mounts a host that runs the hook once during a child's init.
 *
 * @param config - The services to provide through `setMoleculeContext`.
 * @param run - Calls the hook; its return value is kept.
 * @returns The hook's result and the host's unmount.
 */
function mountHook<T>(
  config: MoleculeConfig,
  run: () => T,
): { result: T; stop: () => Promise<void> } {
  const captured: { result?: T } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config,
      setMoleculeContext,
      run: () => {
        captured.result = run()
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { result, stop }
}

/**
 * A labelled input in the mounted container.
 *
 * @param container - The tree's container.
 * @param label - The input's `aria-label`.
 * @returns The input element.
 */
function input(container: ParentNode, label: string): HTMLInputElement {
  const element = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  if (!element) throw new Error(`no input labelled ${label}`)
  return element
}

/**
 * Types into an input through the DOM event a component listens to.
 *
 * @param element - The input to type into.
 * @param value - The new value.
 */
function type(element: HTMLInputElement, value: string): void {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  flushSync()
}

/**
 * Submits a form through its DOM submit event.
 *
 * @param form - The form element to submit.
 */
function submit(form: HTMLFormElement): void {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  flushSync()
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('signed-in account edits', () => {
  it('useAuth saves through the configured profile transport before a form remount', async () => {
    const { client, writes, items } = setup()
    const hook = mountHook({ auth: client }, () => useAuth<Account>())
    expect(hook.result.updateProfile).toBeTypeOf('function')
    const action = hook.result.updateProfile
    const answer = await action({ displayName: saved.displayName })
    flushSync()

    expect(answer).toEqual(saved)
    expect(get(hook.result.user)).toEqual(saved)
    expect(client.getUser()).toEqual(saved)
    expect(writes).toEqual([{ account: { displayName: saved.displayName } }])
    expect(JSON.parse(items.get('molecule:auth:user')!)).toEqual(saved)
    expect(hook.result.updateProfile).toBe(action)
    await hook.stop()
    const view = mountTree({ auth: client }, AccountEditor, {})
    expect(input(view.container, 'Account name').value).toBe(saved.displayName)
  })

  it('a rejected useAuth profile save keeps the previous shared user', async () => {
    const { client } = setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'Invalid name' }, { status: 422 })),
    )
    const hook = mountHook({ auth: client }, () => useAuth<Account>())
    expect(hook.result.updateProfile).toBeTypeOf('function')
    await expect(hook.result.updateProfile({ displayName: '' })).rejects.toHaveProperty(
      'status',
      422,
    )
    flushSync()
    expect(get(hook.result.user)).toEqual(initial)
  })

  it('counterexample: a custom save followed by setUser keeps the next form correct', async () => {
    const { client } = setup()
    const hook = mountHook({ auth: client }, () => useAuth<Account>())
    const response = await fetch('/employees/current', {
      method: 'PUT',
      body: JSON.stringify({ account: { displayName: saved.displayName } }),
    })
    const body = (await response.json()) as { account: Account }
    hook.result.setUser(body.account)
    flushSync()
    await hook.stop()
    const view = mountTree({ auth: client }, AccountEditor, {})
    expect(input(view.container, 'Account name').value).toBe(saved.displayName)
  })

  it('counterexample: a form that loads the server on each visit can own its values', async () => {
    const { client } = setup()
    await fetch('/employees/current', {
      method: 'PUT',
      body: JSON.stringify({ account: { displayName: saved.displayName } }),
    })
    const view = mountTree({ auth: client }, ServerAccountEditor, {})
    await vi.waitFor(() => {
      flushSync()
      expect(input(view.container, 'Account name').value).toBe(saved.displayName)
    })
    expect(client.getUser()).toEqual(initial)
  })

  it('useProfileForm preserves a typed field through late account hydration and saves it for the next visit', async () => {
    const { client, writes } = setup()
    client.setUser({ ...initial, timezone: '' })
    const view = mountTree({ auth: client }, ManagedAccountEditor, {})
    type(input(view.container, 'Account name'), saved.displayName)
    client.setUser(initial)
    flushSync()
    expect(input(view.container, 'Account name').value).toBe(saved.displayName)
    expect(input(view.container, 'Timezone').value).toBe('UTC')
    const form = view.container.querySelector('form')
    if (!form) throw new Error('no account form')
    submit(form)
    await vi.waitFor(() => {
      flushSync()
      expect(client.getUser()).toEqual(saved)
    })
    expect(writes).toEqual([{ account: { displayName: saved.displayName } }])
    await view.stop()
    const again = mountTree({ auth: client }, ManagedAccountEditor, {})
    expect(input(again.container, 'Account name').value).toBe(saved.displayName)
  })
})
