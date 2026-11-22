/**
 * Focus-on-open — the "keyboard users land behind the modal" regression.
 *
 * The email field must receive focus when the modal opens (the WAI-ARIA
 * dialog pattern: keyboard and screen-reader users land IN the dialog, not on
 * the page behind it), without the `autoFocus` prop, which
 * jsx-a11y/no-autofocus bars. The focus move lives in an effect keyed on
 * `open`, so it runs once per open transition — a parent re-render while the
 * modal is open must not steal focus back from wherever the user is.
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthModal } from '../AuthModal.js'

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ refresh: vi.fn() }),
  useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
  useLogin: () => ({ status: 'idle', error: null, login: vi.fn() }),
  useSignup: () => ({ status: 'idle', error: null, signup: vi.fn() }),
  useI18nError: (error: unknown) => (error ? String(error) : null),
  useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
  // The component only uses the `defaultValue` contract here.
  useTranslation: () => ({
    t: (key: string, _values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

vi.mock('@molecule/app-auth-shell-react', () => ({
  useAuthFormState: () => ({
    fields: {},
    setField: vi.fn(),
    clear: vi.fn(),
  }),
}))

vi.mock('@molecule/app-ui', () => ({
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
  Icon: () => null,
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

/** The email field, by its design-system id. */
function emailField(container: HTMLElement): HTMLInputElement {
  return container.querySelector('[data-mol-id="auth-modal-email"]') as HTMLInputElement
}

describe('AuthModal focus on open', () => {
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('moves focus to the email field on open, in signup mode', () => {
    const { container } = render(
      <AuthModal open onClose={vi.fn()} initialMode="signup" oauthConfig={{}} />,
    )
    expect(container.ownerDocument.activeElement).toBe(emailField(container))
  })

  it('moves focus to the email field on open, in login mode', () => {
    const { container } = render(
      <AuthModal open onClose={vi.fn()} initialMode="login" oauthConfig={{}} />,
    )
    expect(container.ownerDocument.activeElement).toBe(emailField(container))
  })

  it('does not set the autofocus attribute on the email field', () => {
    const { container } = render(
      <AuthModal open onClose={vi.fn()} initialMode="signup" oauthConfig={{}} />,
    )
    // The attribute (what the autoFocus prop renders) is the thing the a11y
    // rule bars — assert its absence directly so a future port to another
    // framework cannot reintroduce it under a different code path.
    expect(emailField(container).getAttribute('autofocus')).toBeNull()
  })

  it('does not steal focus back when the parent re-renders while open', () => {
    const { container, rerender } = render(
      <AuthModal open onClose={vi.fn()} initialMode="signup" oauthConfig={{}} />,
    )
    const password = container.querySelector(
      '[data-mol-id="auth-modal-password"]',
    ) as HTMLInputElement
    password.focus()

    // A fresh onClose closure — what a busy parent hands down every render.
    rerender(<AuthModal open onClose={() => {}} initialMode="signup" oauthConfig={{}} />)
    expect(container.ownerDocument.activeElement).toBe(password)
  })

  it('moves focus back to the email field when the modal is closed and reopened', () => {
    const onClose = vi.fn()
    const { container, rerender } = render(
      <AuthModal open onClose={onClose} initialMode="login" oauthConfig={{}} />,
    )
    expect(container.ownerDocument.activeElement).toBe(emailField(container))

    rerender(<AuthModal open={false} onClose={onClose} initialMode="login" oauthConfig={{}} />)
    expect(container.ownerDocument.activeElement).not.toBe(emailField(container))

    rerender(<AuthModal open onClose={onClose} initialMode="login" oauthConfig={{}} />)
    expect(container.ownerDocument.activeElement).toBe(emailField(container))
  })
})
