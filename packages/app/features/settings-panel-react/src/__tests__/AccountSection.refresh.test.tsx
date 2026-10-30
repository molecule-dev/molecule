// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import type * as AppReact from '@molecule/app-react'
import { AuthProvider } from '@molecule/app-react'

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
const first = { id: 'account-a', name: 'Alice', email: 'alice@example.test' }
function clientFor(user: UserProfile): AuthClient<UserProfile> {
  const values = new Map<string, string>()
  const storage: StorageAdapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
  const client = createJWTAuthClient<UserProfile>({
    storage,
    profileEndpoint: '/configured-profile',
  })
  client.setSession({ accessToken: token, user })
  return client
}
const control = (label: string): HTMLInputElement =>
  screen.getByLabelText(label) as HTMLInputElement

beforeEach(() => {
  http.get.mockReset()
  http.patch.mockReset()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AccountSection best-effort HTTP refresh', () => {
  it('refreshes pristine fields without overwriting a dirty field and uses i18n fallbacks', async () => {
    http.get.mockResolvedValue({
      data: { props: { ...first, name: 'Server name', email: 'fresh@example.test' } },
    })
    render(
      <AuthProvider client={clientFor(first)}>
        <AccountSection />
      </AuthProvider>,
    )
    fireEvent.change(control('Name'), { target: { value: 'Typed name' } })
    await waitFor(() => expect(control('settings.email').value).toBe('fresh@example.test'))
    expect(control('Name').value).toBe('Typed name')
    expect(http.get).toHaveBeenCalledWith('/api/users/me')
  })

  it('keeps the cached profile usable and still saves on blur when refresh fails', async () => {
    http.get.mockRejectedValue(new Error('refresh unavailable'))
    const client = clientFor(first)
    const update = vi.spyOn(client, 'updateProfile').mockImplementation(async (patch) => {
      const saved = { ...client.getUser()!, ...patch }
      client.setUser(saved)
      return saved
    })
    render(
      <AuthProvider client={client}>
        <AccountSection />
      </AuthProvider>,
    )
    await waitFor(() => expect(http.get).toHaveBeenCalledWith('/api/users/me'))
    expect(control('Name').value).toBe('Alice')
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.change(control('Name'), { target: { value: 'Alice edited' } })
    fireEvent.blur(control('Name'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Alice edited' }))
    expect(http.patch).not.toHaveBeenCalled()
  })
})
