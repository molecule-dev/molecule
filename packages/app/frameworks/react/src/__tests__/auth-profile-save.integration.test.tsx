// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { createElement, useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'

import { AuthContext } from '../contexts.js'
import { useAuth } from '../hooks/useAuth.js'
import { useProfileForm } from '../hooks/useProfileForm.js'

interface Account {
  memberKey: string
  displayName: string
  timezone: string
}
const initial: Account = { memberKey: 'employee-7', displayName: 'Before', timezone: 'UTC' }
const saved: Account = { ...initial, displayName: 'Saved name' }
const cleanups: (() => void)[] = []

function setup() {
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
  const client = createJWTAuthClient<Account>({
    autoRefresh: false,
    currentUserEndpoint: '/employees/current',
    profileEndpoint: '/employees/current',
    profileUpdateMethod: 'PUT',
    profileRequestBody: (account) => ({ account }),
    mapAuthResponse: (data) => ({ user: (data as { account: Account }).account }),
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
  cleanups.push(() => client.destroy())
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(AuthContext.Provider, { value: client }, children)
  return { client, wrapper, writes, items }
}

function AccountEditor() {
  const { user } = useAuth<Account>()
  const [name, setName] = useState(user?.displayName ?? '')
  return (
    <input
      aria-label="Account name"
      value={name}
      onChange={(event) => setName(event.target.value)}
    />
  )
}

function ManagedAccountEditor() {
  const form = useProfileForm<Account, { displayName: string; timezone: string }>({
    defaultValues: { displayName: '', timezone: '' },
    toValues: (user) => ({ displayName: user.displayName, timezone: user.timezone }),
    toPatch: (changes) => changes,
  })
  return (
    <form aria-label="Account" {...form.formProps}>
      <input aria-label="Account name" {...form.register('displayName')} />
      <input aria-label="Timezone" {...form.register('timezone')} />
      <button type="submit" disabled={!form.ready || form.isSubmitting}>
        Save
      </button>
    </form>
  )
}

afterEach(() => {
  cleanup()
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.unstubAllGlobals()
})

describe('signed-in account edits', () => {
  it('useAuth saves through the configured profile transport before a form remount', async () => {
    const { client, wrapper, writes, items } = setup()
    const hook = renderHook(() => useAuth<Account>(), { wrapper })
    expect(hook.result.current.updateProfile).toBeTypeOf('function')
    const action = hook.result.current.updateProfile
    let answer: Account | undefined
    await act(async () => {
      answer = await action({ displayName: saved.displayName })
    })

    expect(answer).toEqual(saved)
    expect(hook.result.current.user).toEqual(saved)
    expect(client.getUser()).toEqual(saved)
    expect(writes).toEqual([{ account: { displayName: saved.displayName } }])
    expect(JSON.parse(items.get('molecule:auth:user')!)).toEqual(saved)
    expect(hook.result.current.updateProfile).toBe(action)
    hook.unmount()
    render(<AccountEditor />, { wrapper })
    expect(screen.getByLabelText('Account name')).toHaveProperty('value', saved.displayName)
  })

  it('a rejected useAuth profile save keeps the previous shared user', async () => {
    const { wrapper } = setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'Invalid name' }, { status: 422 })),
    )
    const hook = renderHook(() => useAuth<Account>(), { wrapper })
    expect(hook.result.current.updateProfile).toBeTypeOf('function')
    await act(async () => {
      await expect(hook.result.current.updateProfile({ displayName: '' })).rejects.toHaveProperty(
        'status',
        422,
      )
    })
    expect(hook.result.current.user).toEqual(initial)
  })

  it('counterexample: a custom save followed by setUser keeps the next form correct', async () => {
    const { wrapper } = setup()
    const hook = renderHook(() => useAuth<Account>(), { wrapper })
    await act(async () => {
      const response = await fetch('/employees/current', {
        method: 'PUT',
        body: JSON.stringify({ account: { displayName: saved.displayName } }),
      })
      const body = (await response.json()) as { account: Account }
      hook.result.current.setUser(body.account)
    })
    hook.unmount()
    render(<AccountEditor />, { wrapper })
    expect(screen.getByLabelText('Account name')).toHaveProperty('value', saved.displayName)
  })

  it('counterexample: a form that loads the server on each visit can own its values', async () => {
    const { wrapper, client } = setup()
    await fetch('/employees/current', {
      method: 'PUT',
      body: JSON.stringify({ account: { displayName: saved.displayName } }),
    })
    function ServerAccountEditor() {
      const [name, setName] = useState('')
      useEffect(() => {
        void fetch('/employees/current')
          .then((response) => response.json())
          .then((body: { account: Account }) => setName(body.account.displayName))
      }, [])
      return (
        <input
          aria-label="Account name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      )
    }
    render(<ServerAccountEditor />, { wrapper })
    await waitFor(() =>
      expect(screen.getByLabelText('Account name')).toHaveProperty('value', saved.displayName),
    )
    expect(client.getUser()).toEqual(initial)
  })

  it('useProfileForm preserves a typed field through late account hydration and saves it for the next visit', async () => {
    const { client, wrapper, writes } = setup()
    client.setUser({ ...initial, timezone: '' })
    const view = render(<ManagedAccountEditor />, { wrapper })
    fireEvent.change(screen.getByLabelText('Account name'), {
      target: { value: saved.displayName },
    })
    act(() => client.setUser(initial))
    expect(screen.getByLabelText('Account name')).toHaveProperty('value', saved.displayName)
    expect(screen.getByLabelText('Timezone')).toHaveProperty('value', 'UTC')
    fireEvent.submit(screen.getByRole('form', { name: 'Account' }))
    await waitFor(() => expect(client.getUser()).toEqual(saved))
    expect(writes).toEqual([{ account: { displayName: saved.displayName } }])
    view.unmount()
    render(<ManagedAccountEditor />, { wrapper })
    expect(screen.getByLabelText('Account name')).toHaveProperty('value', saved.displayName)
  })
})
