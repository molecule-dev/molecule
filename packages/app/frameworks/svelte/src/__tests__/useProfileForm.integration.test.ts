// @vitest-environment jsdom

/**
 * The shared profile form over the real auth client and a real local HTTP
 * boundary, React's `useProfileForm.integration` cases in the Svelte binding:
 * rendered controls, hydration, the save snapshot, publication and the
 * lifecycle races.
 *
 * @module
 */

import { createServer, type Server } from 'node:http'

import { type Component, flushSync } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type AuthClient, createJWTAuthClient, type StorageAdapter } from '@molecule/app-auth'

import { mountInContext } from './context-host.js'
import LegacyForm from './profile-form/LegacyForm.svelte'
import { type Fields, initial, type Reader } from './profile-form/profile-fixtures.js'
import ProfileForm from './profile-form/ProfileForm.svelte'

const token = [btoa('{}'), btoa(JSON.stringify({ exp: 9999999999 })), 'signature'].join('.')

/**
 * Waits for an assertion that depends on a real HTTP round trip and a Svelte
 * flush. A loaded machine stretches both well past vitest's one-second default,
 * so the wait is generous while every assertion stays exact.
 *
 * @param assertion - The assertion to retry.
 * @param timeout - How long to keep retrying, in milliseconds.
 * @returns Resolves once the assertion passes.
 */
const waitFor = (assertion: () => void, timeout = 20_000): Promise<void> =>
  vi.waitFor(assertion, { timeout })

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

/** A real local HTTP boundary: writes persist independently of every auth cache. */
async function accountApi(): Promise<{
  baseURL: string
  writes: Record<string, unknown>[]
  reject: boolean
  partialAnswer: boolean
  hold: Promise<void> | null
}> {
  let persisted = { ...initial }
  const api = {
    baseURL: '',
    writes: [] as Record<string, unknown>[],
    reject: false,
    partialAnswer: false,
    hold: null as Promise<void> | null,
  }
  const server = createServer(async (request, response) => {
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
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP server')
  api.baseURL = `http://127.0.0.1:${address.port}`
  return api
}

const servers: Server[] = []
const hosts: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
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
  document.body.innerHTML = ''
})

async function setup(signedIn = true): Promise<{
  api: Awaited<ReturnType<typeof accountApi>>
  client: AuthClient<Reader>
  store: StorageAdapter
}> {
  const api = await accountApi()
  const store = storage()
  const client = createJWTAuthClient<Reader>({
    storage: store,
    baseURL: api.baseURL,
    profileEndpoint: '/account',
  })
  if (signedIn) client.setSession({ accessToken: token, user: initial })
  return { api, client, store }
}

/**
 * Mounts a component under a real Svelte context carrying the auth client.
 *
 * @param client - The auth client the form reads and saves through.
 * @param component - The component to render under that context.
 * @param props - The component's props.
 * @returns The container and the tree's unmount.
 */
function mountTree<T extends Record<string, unknown>>(
  client: AuthClient<Reader>,
  component: Component<T>,
  props: T,
): { container: HTMLDivElement; stop: () => Promise<void> } {
  const tree = mountInContext({ auth: client }, component, props)
  hosts.push(tree.stop)
  return tree
}

const control = (container: ParentNode, label: string): HTMLInputElement | HTMLTextAreaElement => {
  const element = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `[aria-label="${label}"]`,
  )
  if (!element) throw new Error(`no control labelled ${label}`)
  return element
}
const output = (container: ParentNode, label: string): string =>
  container.querySelector(`[aria-label="${label}"]`)?.textContent ?? ''

function edit(container: ParentNode, label: string, next: string): void {
  const element = control(container, label)
  element.value = next
  element.dispatchEvent(new Event('input', { bubbles: true }))
  flushSync()
}

function submit(container: ParentNode): void {
  const form = container.querySelector('form')
  if (!form) throw new Error('no profile form')
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  flushSync()
}

/**
 * Finds a button by its visible text.
 *
 * @param container - The rendered tree.
 * @param label - The button's text.
 * @returns The button.
 */
function button(container: ParentNode, label: string): HTMLButtonElement {
  for (const candidate of container.querySelectorAll('button')) {
    if (candidate.textContent === label) return candidate
  }
  throw new Error(`no button labelled ${label}`)
}

function resetForm(container: ParentNode): void {
  button(container, 'Reset').dispatchEvent(new Event('click', { bubbles: true }))
  flushSync()
}

const formState = (container: ParentNode): string => output(container, 'Form state')
const persistedUser = async (baseURL: string): Promise<Reader> => {
  const response = await fetch(`${baseURL}/account`)
  return ((await response.json()) as { user: Reader }).user
}

/** A loaded machine slows a real HTTP round trip well past the default limit. */
const slow = { timeout: 90_000 }

describe('shared profile form: rendered controls → real HTTP → persisted profile', slow, () => {
  it('negative control reproduces null bio/image from the recorded manual hydration effect', async () => {
    const { api, client } = await setup()
    const view = mountTree(client, LegacyForm, { client })
    edit(view.container, 'Bio', 'Typed biography')
    edit(view.container, 'Image', 'https://images.example.test/reader.png')
    client.setUser({ ...initial, name: 'Background refresh' })
    flushSync()
    expect(control(view.container, 'Bio').value).toBe('')
    expect(control(view.container, 'Image').value).toBe('')
    submit(view.container)
    await waitFor(() => expect(api.writes).toEqual([{ bio: null, image: null }]))
    expect(await persistedUser(api.baseURL)).toMatchObject({ bio: null, image: null })
  })

  it('preserves edited controls on a background user update and publishes the saved server response', async () => {
    const { api, client, store } = await setup()
    let propagated: Reader | undefined
    let view = mountTree(client, ProfileForm, {
      onSaved: (saved: Reader) => {
        propagated = saved
      },
    })
    edit(view.container, 'Bio', 'Typed biography')
    edit(view.container, 'Image', 'https://images.example.test/reader.png')
    client.setUser({ ...initial, name: 'Background refresh' })
    flushSync()
    expect(client.getState()).toMatchObject({ authenticated: true, status: 'authenticated' })
    expect(control(view.container, 'Name').value).toBe('Background refresh')
    expect(control(view.container, 'Bio').value).toBe('Typed biography')
    expect(control(view.container, 'Image').value).toBe('https://images.example.test/reader.png')
    submit(view.container)
    await waitFor(() => expect(propagated?.bio).toBe('Typed biography'))
    expect(api.writes).toEqual([
      { bio: 'Typed biography', image: 'https://images.example.test/reader.png' },
    ])
    const stored = await persistedUser(api.baseURL)
    expect(stored).toMatchObject({
      bio: 'Typed biography',
      image: 'https://images.example.test/reader.png',
    })
    expect(client.getUser()).toEqual(stored)
    await waitFor(() => {
      flushSync()
      expect(JSON.parse(output(view.container, 'Shared profile'))).toEqual(stored)
      expect(formState(view.container)).toBe('{"dirty":false,"saving":false}')
    })
    const reloaded = createJWTAuthClient<Reader>({ storage: store })
    await reloaded.initialize()
    expect(reloaded.getUser()).toEqual(stored)
    await view.stop()
    view = mountTree(reloaded, ProfileForm, {})
    expect(control(view.container, 'Bio').value).toBe(stored.bio)
    expect(control(view.container, 'Image').value).toBe(stored.image)
  })

  it('passes the merged JWT profile to onSaved for a changed-fields HTTP answer', async () => {
    const { api, client, store } = await setup()
    api.partialAnswer = true
    const saved = vi.fn<(user: Reader) => void>()
    const view = mountTree(client, ProfileForm, { onSaved: saved })
    edit(view.container, 'Bio', 'Only the biography changed')
    submit(view.container)
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    const persisted = await persistedUser(api.baseURL)
    expect(api.writes).toEqual([{ bio: 'Only the biography changed' }])
    expect(saved.mock.calls[0]?.[0]).toEqual(persisted)
    expect(client.getUser()).toEqual(persisted)
    await waitFor(() => {
      flushSync()
      expect(JSON.parse(output(view.container, 'Shared profile'))).toEqual(persisted)
    })
    expect(control(view.container, 'Name').value).toBe(initial.name)
    const reloaded = createJWTAuthClient<Reader>({ storage: store })
    await reloaded.initialize()
    expect(reloaded.getUser()).toEqual(persisted)
  })

  it('forwards a custom provider return without inventing a profile merge in the hook', async () => {
    const { client } = await setup()
    // A deliberately raw custom provider: this violates the saved-profile contract.
    // It proves that a page callback cannot assume the hook normalized the answer.
    const raw = { bio: 'Raw custom answer' } as Reader
    vi.spyOn(client, 'updateProfile').mockResolvedValue(raw)
    const saved = vi.fn<(user: Reader) => void>()
    const view = mountTree(client, ProfileForm, { onSaved: saved })
    edit(view.container, 'Bio', 'Submitted biography')
    submit(view.container)
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(saved.mock.calls[0]?.[0]).toBe(raw)
    expect(saved.mock.calls[0]?.[0]).not.toHaveProperty('id')
    expect(client.getUser()).toEqual(initial)
  })

  it('hydrates asynchronous user data, keeps earlier edits, resets to the newest baseline, and sends no empty patch', async () => {
    const { api, client } = await setup(false)
    // Edits before the user data arrives exist only in a shell that renders before the session is
    // restored, so this case mounts the form before any session exists.
    const view = mountTree(client, ProfileForm, {})
    expect(button(view.container, 'Save').disabled).toBe(true)
    edit(view.container, 'Bio', 'Typed before hydration')
    client.setSession({ accessToken: token, user: { ...initial, bio: 'Loaded biography' } })
    flushSync()
    expect(control(view.container, 'Bio').value).toBe('Typed before hydration')
    expect(control(view.container, 'Email').value).toBe(initial.email)
    resetForm(view.container)
    expect(control(view.container, 'Bio').value).toBe('Loaded biography')
    submit(view.container)
    await waitFor(() => {
      flushSync()
      expect(formState(view.container)).toBe('{"dirty":false,"saving":false}')
    })
    expect(api.writes).toEqual([])
  })

  it('retains rejected edits, omits blank optional password, and clears a submitted credential from the saved baseline', async () => {
    const { api, client } = await setup()
    const view = mountTree(client, ProfileForm, {})
    api.reject = true
    edit(view.container, 'Bio', 'Retry biography')
    edit(view.container, 'Password', '   ')
    submit(view.container)
    await waitFor(() => {
      flushSync()
      expect(view.container.querySelector('[role="alert"]')).not.toBeNull()
    })
    expect(api.writes).toEqual([{ bio: 'Retry biography' }])
    expect(client.getUser()).toEqual(initial)
    expect(await persistedUser(api.baseURL)).toEqual(initial)
    expect(control(view.container, 'Bio').value).toBe('Retry biography')
    api.reject = false
    edit(view.container, 'Password', 'new-private-credential')
    submit(view.container)
    await waitFor(() => {
      flushSync()
      expect(control(view.container, 'Password').value).toBe('')
    })
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
    const view = mountTree(client, ProfileForm, {})
    edit(view.container, 'Email', 'invalid')
    submit(view.container)
    await waitFor(() => {
      flushSync()
      expect(view.container.querySelector('[role="alert"]')).not.toBeNull()
    })
    expect(api.writes).toEqual([])
    edit(view.container, 'Email', initial.email ?? '')
    edit(view.container, 'Bio', '')
    submit(view.container)
    await waitFor(() => expect(api.writes).toEqual([{ bio: null }]))
    await waitFor(() => expect(client.getUser()?.bio).toBeNull())
    expect((await persistedUser(api.baseURL)).bio).toBeNull()
    expect(control(view.container, 'Bio').value).toBe('')
  })

  it('captures one submit snapshot, prevents duplicate saves and keeps newer edits made during the request', async () => {
    const { api, client } = await setup()
    let release!: () => void
    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    const view = mountTree(client, ProfileForm, {})
    edit(view.container, 'Bio', 'First submitted biography')
    submit(view.container)
    submit(view.container)
    edit(view.container, 'Bio', 'New unsaved biography')
    await waitFor(() => expect(api.writes).toHaveLength(1))
    expect(api.writes[0]).toEqual({ bio: 'First submitted biography' })
    release()
    await waitFor(() => expect(client.getUser()?.bio).toBe('First submitted biography'))
    expect(control(view.container, 'Bio').value).toBe('New unsaved biography')
    await waitFor(() => {
      flushSync()
      expect(formState(view.container)).toBe('{"dirty":true,"saving":false}')
    })
    expect((await persistedUser(api.baseURL)).bio).toBe('First submitted biography')
    submit(view.container)
    await waitFor(() => expect(client.getUser()?.bio).toBe('New unsaved biography'))
    expect((await persistedUser(api.baseURL)).bio).toBe('New unsaved biography')
  })

  it('discards the previous account edits on identity change and sign-out', async () => {
    const { client } = await setup()
    const view = mountTree(client, ProfileForm, {})
    edit(view.container, 'Bio', 'Private unsaved edit')
    edit(view.container, 'Password', 'private-credential')
    client.setSession({
      accessToken: token,
      user: { ...initial, id: 'other', bio: 'Other account' },
    })
    flushSync()
    expect(control(view.container, 'Bio').value).toBe('Other account')
    expect(control(view.container, 'Password').value).toBe('')
    client.setUser(null)
    flushSync()
    expect(control(view.container, 'Bio').value).toBe('')
    expect(control(view.container, 'Password').value).toBe('')
  })

  it('preserves explicit identity checks even without a session revision change', async () => {
    const { client } = await setup()
    const view = mountTree(client, ProfileForm, {})
    edit(view.container, 'Bio', 'Private unsaved edit')
    const revision = client.getSessionRevision?.()
    client.setUser({ ...initial, id: 'other', bio: 'Other profile' })
    flushSync()
    expect(client.getSessionRevision?.()).toBe(revision)
    expect(control(view.container, 'Bio').value).toBe('Other profile')
  })

  it('keeps identity-based saves for custom clients without session revisions', async () => {
    const { client, api } = await setup()
    delete client.getSessionRevision
    const saved = vi.fn<(user: Reader) => void>()
    const view = mountTree(client, ProfileForm, { onSaved: saved })
    edit(view.container, 'Bio', 'Legacy provider biography')
    submit(view.container)
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect((await persistedUser(api.baseURL)).bio).toBe('Legacy provider biography')
  })

  it('keeps saving true until propagation finishes and retries failed propagation without another request', async () => {
    const { api, client } = await setup()
    let finish!: () => void
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    })
    let propagations = 0
    const view = mountTree(client, ProfileForm, {
      onSaved: async () => {
        propagations++
        if (propagations === 1) {
          await pending
          throw new Error('Cache unavailable')
        }
      },
    })
    edit(view.container, 'Bio', 'Saved biography')
    submit(view.container)
    await waitFor(() => expect(propagations).toBe(1))
    await waitFor(() => {
      flushSync()
      expect(formState(view.container)).toBe('{"dirty":false,"saving":true}')
    })
    expect((await persistedUser(api.baseURL)).bio).toBe('Saved biography')
    finish()
    await waitFor(() => {
      flushSync()
      expect(view.container.querySelector('[role="alert"]')).not.toBeNull()
    })
    submit(view.container)
    await waitFor(() => expect(propagations).toBe(2))
    expect(api.writes).toHaveLength(1)
    await waitFor(() => {
      flushSync()
      expect(view.container.querySelector('[role="alert"]')).toBeNull()
    })
  })

  it('does not publish or propagate account A after switching to B during the real HTTP request', async () => {
    const { api, client } = await setup()
    let release!: () => void
    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    const propagated: Reader[] = []
    const view = mountTree(client, ProfileForm, {
      onSaved: (user: Reader) => {
        propagated.push(user)
      },
    })
    edit(view.container, 'Bio', 'Account A submitted biography')
    submit(view.container)
    await waitFor(() => expect(api.writes).toHaveLength(1))
    const other = { ...initial, id: 'other', name: 'Other', bio: 'Account B biography' }
    client.setSession({ accessToken: token, user: other })
    // The account switch hydrates before the person types again.
    flushSync()
    edit(view.container, 'Bio', 'Account B unsaved biography')
    release()
    await waitFor(() => {
      flushSync()
      expect(button(view.container, 'Save').disabled).toBe(false)
    })
    expect(client.getUser()).toEqual(other)
    expect(control(view.container, 'Bio').value).toBe('Account B unsaved biography')
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
      const validate = async (): Promise<Partial<Record<keyof Fields, string>>> => {
        validationStarted = true
        await pending
        return {}
      }
      const propagated: Reader[] = []
      const view = mountTree(client, ProfileForm, {
        validate,
        onSaved: (user: Reader) => {
          propagated.push(user)
        },
      })
      edit(view.container, 'Bio', 'Account A unsaved biography')
      submit(view.container)
      await waitFor(() => expect(validationStarted).toBe(true))
      expect(api.writes).toEqual([])
      if (transition === 'account switch') {
        client.setSession({
          accessToken: token,
          user: { ...initial, id: 'other', bio: 'Account B biography' },
        })
        flushSync()
      } else if (transition === 'unmount') {
        await view.stop()
      } else {
        // A Svelte hook reads its client from context at init, so the app
        // replaces a client by disposing the old tree and mounting the new one.
        await view.stop()
        mountTree(replacement!.client, ProfileForm, { validate })
      }
      finishValidation()
      if (transition === 'account switch') {
        await waitFor(() => {
          flushSync()
          expect(button(view.container, 'Save').disabled).toBe(false)
        })
      }
      // One macrotask: the submit's own continuation settles after validation.
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      expect(api.writes).toEqual([])
      expect(replacement?.api.writes ?? []).toEqual([])
      expect(mutation).not.toHaveBeenCalled()
      expect(propagated).toEqual([])
      expect(await persistedUser(api.baseURL)).toEqual(initial)
      if (transition === 'account switch') {
        expect(client.getUser()?.id).toBe('other')
        expect(control(view.container, 'Bio').value).toBe('Account B biography')
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
    const validate = async (): Promise<Partial<Record<keyof Fields, string>>> => {
      validationStarted = true
      await pending
      return {}
    }
    const view = mountTree(client, ProfileForm, { validate })
    edit(view.container, 'Bio', 'Account A submitted biography')
    submit(view.container)
    await waitFor(() => expect(validationStarted).toBe(true))
    client.setUser({ ...initial, name: 'Background refresh' })
    flushSync()
    finishValidation()
    await waitFor(() => {
      flushSync()
      expect(button(view.container, 'Save').disabled).toBe(false)
    })
    expect(api.writes).toEqual([{ bio: 'Account A submitted biography' }])
    expect((await persistedUser(api.baseURL)).bio).toBe('Account A submitted biography')
    expect(client.getUser()?.bio).toBe('Account A submitted biography')
  })
})
