// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AuthError } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'

import { useAuth } from '../hooks/useAuth.js'
import { AuthProvider } from '../providers.js'

/** A form whose local draft and failure must survive an unsuccessful sign-in. */
function LoginPage(): React.ReactElement {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [failure, setFailure] = useState('')
  const submit = async (): Promise<void> => {
    setFailure('')
    try {
      await login({ email, password: 'test-password' })
    } catch (error) {
      const body = (error as AuthError).body as { errors?: Record<string, string[]> } | undefined
      setFailure(
        Object.entries(body?.errors ?? {})
          .map(([field, messages]) => `${field} ${messages.join(', ')}`)
          .join('; '),
      )
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
      <input aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <button type="submit">Sign in</button>
      {isLoading && <span role="status">Signing in</span>}
      {failure && <p role="alert">{failure}</p>}
    </form>
  )
}

/** A route shell waits only while the initial session decision is unknown. */
function GuardedShell(): React.ReactElement {
  const { status, user } = useAuth<{ id: string; email: string }>()
  if (status === 'loading') return <p role="status">Restoring session</p>
  if (status === 'authenticated') return <h1>Signed in as {user?.email}</h1>
  return <LoginPage />
}

/** Use the browser response parsing path, including the API's structured error. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
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

    render(
      <AuthProvider client={client}>
        <GuardedShell />
      </AuthProvider>,
    )
    const form = screen.getByRole('form', { name: 'Sign in' })
    const email = screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement
    fireEvent.change(email, { target: { value: 'reader@example.test' } })

    let rejectLogin!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise((resolve) => {
        rejectLogin = resolve
      }),
    )
    fireEvent.submit(form)
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('form', { name: 'Sign in' })).toBe(form)
    expect(screen.getByRole('textbox', { name: 'Email' })).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(screen.getByRole('status').textContent).toBe('Signing in')

    await act(async () => {
      rejectLogin(jsonResponse({ errors: { credentials: ['is invalid'] } }, 401))
    })
    expect(screen.getByRole('alert').textContent).toBe('credentials is invalid')
    expect(screen.getByRole('form', { name: 'Sign in' })).toBe(form)
    expect(screen.getByRole('textbox', { name: 'Email' })).toBe(email)
    expect(email.value).toBe('reader@example.test')
    expect(screen.queryByRole('status')).toBeNull()

    let acceptLogin!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise((resolve) => {
        acceptLogin = resolve
      }),
    )
    fireEvent.submit(form)
    expect(screen.getByRole('form', { name: 'Sign in' })).toBe(form)
    expect(screen.getByRole('status').textContent).toBe('Signing in')
    await act(async () => {
      acceptLogin(
        jsonResponse({
          user: { id: 'reader', email: 'reader@example.test' },
          accessToken: 'test-access-token',
        }),
      )
    })
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('heading').textContent).toBe('Signed in as reader@example.test')
    expect(screen.queryByRole('form')).toBeNull()
    expect(client.getState().status).toBe('authenticated')
  })
})
