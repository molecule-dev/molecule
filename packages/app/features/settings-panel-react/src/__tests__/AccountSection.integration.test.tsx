// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import type * as AppReact from '@molecule/app-react'
import { AuthProvider, useProfileForm } from '@molecule/app-react'

import { AccountSection } from '../AccountSection.js'

const http = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock('@molecule/app-react', async (importOriginal) => {
  const actual = await importOriginal<typeof AppReact>()
  return {
    ...actual,
    useHttpClient: () => http,
    useTranslation: () => ({
      t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
    }),
  }
})
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    sp: () => '',
    cn: (...parts: string[]) => parts.join(' '),
    stack: () => '',
    sectionHeading: '',
    formLabelSmall: '',
    textSize: () => '',
    textError: '',
  }),
}))
vi.mock('@molecule/app-ui-react', () => ({
  Flex: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Spinner: () => <output aria-label="Saving" />,
}))

const token = [btoa('{}'), btoa(JSON.stringify({ exp: 9999999999 })), 'signature'].join('.')
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
function clientFor<T extends object>(user: T): AuthClient<T> {
  const client = createJWTAuthClient<T>({
    storage: storage(),
    profileEndpoint: '/configured-profile',
  })
  client.setSession({ accessToken: token, user })
  return client
}
function publishUpdates<T extends object>(client: AuthClient<T>): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(client, 'updateProfile').mockImplementation(async (patch) => {
    const saved = { ...client.getUser()!, ...patch }
    client.setUser(saved)
    return saved
  })
}
const control = (label: string): HTMLInputElement =>
  screen.getByLabelText(label) as HTMLInputElement
const first = { id: 'account-a', name: 'Alice', email: 'alice@example.test' }
const second = { id: 'account-b', name: 'Bob', email: 'bob@example.test' }

beforeEach(() => {
  http.get.mockReset()
  http.patch.mockReset()
  http.get.mockReturnValue(new Promise(() => {}))
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AccountSection actual caller', () => {
  it('keeps a dirty name while a same-account background read refreshes pristine email', async () => {
    const client = clientFor<UserProfile>(first)
    render(
      <AuthProvider client={client}>
        <AccountSection />
      </AuthProvider>,
    )
    fireEvent.change(control('Name'), { target: { value: 'Typed name' } })
    await act(async () => {
      client.setUser({ ...first, name: 'Server name', email: 'fresh@example.test' })
    })
    await waitFor(() => expect(control('settings.email').value).toBe('fresh@example.test'))
    expect(control('Name').value).toBe('Typed name')
  })

  it('resets controls when the authenticated account changes', async () => {
    const client = clientFor<UserProfile>(first)
    render(
      <AuthProvider client={client}>
        <AccountSection />
      </AuthProvider>,
    )
    expect(control('Name').value).toBe('Alice')
    await act(async () => {
      client.setSession({ accessToken: token, user: second })
    })
    await waitFor(() => expect(control('Name').value).toBe('Bob'))
    expect(control('settings.email').value).toBe('bob@example.test')
  })

  it('submits only the changed field through the configured bonded profile transport on blur', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    render(
      <AuthProvider client={client}>
        <AccountSection />
      </AuthProvider>,
    )
    fireEvent.change(control('Name'), { target: { value: 'Alice edited' } })
    fireEvent.blur(control('Name'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Alice edited' }))
    expect(http.patch).not.toHaveBeenCalled()
    expect(control('Name').value).toBe('Alice edited')
  })
})

interface HandleUser {
  handle: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}
type ContactValues = { displayName: string; avatarUrl: string }
function ContactForm({ client }: { client: AuthClient<HandleUser> }): React.ReactElement {
  const form = useProfileForm<HandleUser, ContactValues>({
    defaultValues: { displayName: '', avatarUrl: '' },
    getIdentity: (user) => user.handle,
    toValues: (user) => ({ displayName: user.displayName ?? '', avatarUrl: user.avatarUrl ?? '' }),
    toPatch: (changes) => ({
      ...('displayName' in changes ? { displayName: changes.displayName || null } : {}),
      ...('avatarUrl' in changes ? { avatarUrl: changes.avatarUrl || null } : {}),
    }),
  })
  return (
    <form aria-label="Contact" {...form.formProps}>
      <input aria-label="Display name" {...form.register('displayName')} />
      <input aria-label="Avatar URL" {...form.register('avatarUrl')} />
      <button type="submit">Save contact</button>
      <output aria-label="Contact client">{client.getUser()?.handle}</output>
    </form>
  )
}

describe('representative non-X1 custom aliases and custom-form counterexample', () => {
  it('clears nullable aliases and switches handle-keyed accounts without an id', async () => {
    const alice: HandleUser = {
      handle: 'alice',
      email: 'alice@example.test',
      displayName: 'Alice',
      avatarUrl: 'alice.png',
    }
    const client = clientFor<HandleUser>(alice)
    const update = publishUpdates(client)
    render(
      <AuthProvider client={client}>
        <ContactForm client={client} />
      </AuthProvider>,
    )
    fireEvent.change(control('Display name'), { target: { value: '' } })
    fireEvent.change(control('Avatar URL'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ displayName: null, avatarUrl: null }))
    await act(async () => {
      client.setSession({
        accessToken: token,
        user: {
          handle: 'robert',
          email: 'robert@example.test',
          displayName: 'Robert',
          avatarUrl: null,
        },
      })
    })
    await waitFor(() => expect(control('Display name').value).toBe('Robert'))
    expect(control('Avatar URL').value).toBe('')
    expect(screen.getByLabelText('Contact client').textContent).toBe('robert')
  })

  it('keeps a non-profile newsletter form local and does not call profile transport', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    function NewsletterForm(): React.ReactElement {
      const [digest, setDigest] = useState(false)
      const [saved, setSaved] = useState(false)
      return (
        <form
          aria-label="Newsletter"
          onSubmit={(event) => {
            event.preventDefault()
            setSaved(true)
          }}
        >
          <input
            aria-label="Weekly digest"
            type="checkbox"
            checked={digest}
            onChange={(event) => setDigest(event.target.checked)}
          />
          <button type="submit">Save newsletter</button>
          {saved && <output aria-label="Newsletter state">{String(digest)}</output>}
        </form>
      )
    }
    render(
      <AuthProvider client={client}>
        <NewsletterForm />
      </AuthProvider>,
    )
    fireEvent.click(control('Weekly digest'))
    fireEvent.click(screen.getByRole('button', { name: 'Save newsletter' }))
    expect(screen.getByLabelText('Newsletter state').textContent).toBe('true')
    expect(update).not.toHaveBeenCalled()
    expect(http.patch).not.toHaveBeenCalled()
  })
})
