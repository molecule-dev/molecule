/**
 * finishAuth resilience — the post-signup "didn't log me in" regression.
 *
 * Cookie-session APIs (the @molecule/api-resource-user model) issue no refresh
 * token, so `refresh()` could reject right after a SUCCESSFUL signup/login.
 * finishAuth must still run `onAuthenticated` + close when the client session
 * is already established, and only treat the failure as fatal when there is
 * genuinely no session.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthModal } from '../AuthModal.js'

const refreshMock = vi.fn()
const isAuthenticatedMock = vi.fn()
const signupMock = vi.fn()

vi.mock('@molecule/app-react', () => ({
  useAuth: () => ({ refresh: refreshMock }),
  useAuthClient: () => ({ isAuthenticated: isAuthenticatedMock }),
  useLogin: () => ({ status: 'idle', error: null, login: vi.fn() }),
  useSignup: () => ({ status: 'idle', error: null, signup: signupMock }),
  useI18nError: (error: unknown) => (error ? String(error) : null),
  useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
}))

vi.mock('@molecule/app-auth-shell-react', () => ({
  useAuthFormState: () => ({
    fields: { email: 'new@example.com' },
    setField: vi.fn(),
    clear: vi.fn(),
  }),
}))

vi.mock('@molecule/app-ui', () => ({
  // Any cm.* access yields a callable that stringifies to '' — covers both
  // `cm.textMuted` (string usage) and `cm.button({...})` / `cm.cn(...)` (calls).
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: () => Object.assign(() => '', { toString: () => '' }),
      },
    ),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Modal: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  Alert: ({ children }: { children?: React.ReactNode }) => <div role="alert">{children}</div>,
  Button: ({
    children,
    type,
    disabled,
  }: {
    children?: React.ReactNode
    type?: 'button' | 'submit'
    disabled?: boolean
  }) => (
    <button type={type} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock('@molecule/app-oauth-buttons-react', () => ({
  OAuthButtons: () => null,
  OAuthDivider: () => null,
}))

/** Renders the modal in signup mode and submits the form. */
function renderAndSubmit(): {
  onClose: ReturnType<typeof vi.fn>
  onAuthenticated: ReturnType<typeof vi.fn>
} {
  const onClose = vi.fn()
  const onAuthenticated = vi.fn()
  const { container } = render(
    <AuthModal
      open
      onClose={onClose}
      initialMode="signup"
      oauthConfig={{}}
      onAuthenticated={onAuthenticated}
    />,
  )
  const form = container.querySelector('form') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  return { onClose, onAuthenticated }
}

describe('AuthModal finishAuth', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('completes (onAuthenticated + close) when refresh() rejects but the session is established', async () => {
    signupMock.mockResolvedValue({ user: { id: 'u1' } })
    refreshMock.mockRejectedValue(new Error('No refresh token available'))
    isAuthenticatedMock.mockReturnValue(true)

    const { onClose, onAuthenticated } = renderAndSubmit()

    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 3000 })
    expect(signupMock).toHaveBeenCalled()
    expect(onAuthenticated).toHaveBeenCalled()
  })

  it('shows a brief "Signed up!" confirmation, then closes', async () => {
    signupMock.mockResolvedValue({ user: { id: 'u1' } })
    refreshMock.mockResolvedValue({ user: { id: 'u1' } })
    isAuthenticatedMock.mockReturnValue(true)

    const { onClose, onAuthenticated } = renderAndSubmit()

    // The confirmation replaces the form BEFORE the modal closes.
    await waitFor(() => expect(screen.getByText('Signed up!')).toBeTruthy())
    expect(onClose).not.toHaveBeenCalled()

    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 3000 })
    expect(onAuthenticated).toHaveBeenCalled()
  })

  it('does NOT close or run onAuthenticated when refresh() rejects and no session exists', async () => {
    signupMock.mockResolvedValue({ user: { id: 'u1' } })
    refreshMock.mockRejectedValue(new Error('No refresh token available'))
    isAuthenticatedMock.mockReturnValue(false)

    const { onClose, onAuthenticated } = renderAndSubmit()

    // Give the async submit handler a tick to settle.
    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onClose).not.toHaveBeenCalled()
    expect(onAuthenticated).not.toHaveBeenCalled()
  })
})
