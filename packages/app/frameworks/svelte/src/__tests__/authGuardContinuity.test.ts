// @vitest-environment jsdom

/**
 * Auth route guard continuity, React's case in Svelte's idiom: a failed sign-in
 * keeps the same form nodes and shows the API's structured errors, then a
 * successful one swaps the shell to the signed-in view.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../context.js'
import type { MoleculeConfig } from '../types.js'
import GuardedShell from './auth/GuardedShell.svelte'

/** Use the browser response parsing path, including the API's structured error. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const hosts: Array<() => Promise<void>> = []

/**
 * Mounts the guard shell under a real auth context.
 *
 * @param config - The services to provide through `setMoleculeContext`.
 * @param component - The component to render under that context.
 * @returns The container and the tree's unmount.
 */
function mountTree(
  config: MoleculeConfig,
  component: Component<Record<string, unknown>>,
): { container: HTMLDivElement; stop: () => Promise<void> } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: { config, setMoleculeContext, component, props: {} },
  })
  flushSync()
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { container, stop }
}

/**
 * Finds a required element, failing the test when it is absent.
 *
 * @param container - The tree's container.
 * @param selector - The CSS selector.
 * @returns The element.
 */
function required<T extends Element>(container: ParentNode, selector: string): T {
  const element = container.querySelector<T>(selector)
  if (!element) throw new Error(`no element for ${selector}`)
  return element
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('auth route guard continuity', () => {
  it('keeps the same form through a failed login, renders its API errors, and transitions on success', async () => {
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

    const view = mountTree({ auth: client }, GuardedShell)
    const form = required<HTMLFormElement>(view.container, 'form[aria-label="Sign in"]')
    const email = required<HTMLInputElement>(view.container, 'input[aria-label="Email"]')
    email.value = 'reader@example.test'
    email.dispatchEvent(new Event('input', { bubbles: true }))
    flushSync()

    let rejectLogin!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise((resolve) => {
        rejectLogin = resolve
      }),
    )
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    flushSync()
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    expect(required(view.container, 'form[aria-label="Sign in"]')).toBe(form)
    expect(required(view.container, 'input[aria-label="Email"]')).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(required(view.container, '[role="status"]').textContent).toBe('Signing in')

    rejectLogin(jsonResponse({ errors: { credentials: ['is invalid'] } }, 401))
    await vi.waitFor(() => {
      flushSync()
      expect(required(view.container, '[role="alert"]').textContent).toBe('credentials is invalid')
    })
    expect(required(view.container, 'form[aria-label="Sign in"]')).toBe(form)
    expect(required(view.container, 'input[aria-label="Email"]')).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(view.container.querySelector('[role="status"]')).toBeNull()

    let acceptLogin!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise((resolve) => {
        acceptLogin = resolve
      }),
    )
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    flushSync()
    expect(required(view.container, 'form[aria-label="Sign in"]')).toBe(form)
    expect(required(view.container, '[role="status"]').textContent).toBe('Signing in')

    acceptLogin(
      jsonResponse({
        user: { id: 'reader', email: 'reader@example.test' },
        accessToken: 'test-access-token',
      }),
    )
    await vi.waitFor(() => {
      flushSync()
      expect(required(view.container, 'h1').textContent).toBe('Signed in as reader@example.test')
    })
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
    expect(view.container.querySelector('form')).toBeNull()
    expect(client.getState().status).toBe('authenticated')
  })
})
