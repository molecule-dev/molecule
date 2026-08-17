/**
 * The captcha slot — the "complete the challenge" with no challenge regression.
 *
 * An API whose signup route requires a human-verification token does not care
 * which surface the request came from. The standalone `/signup` page renders a
 * widget; this modal is what an in-app `/signup` CTA actually opens, so without
 * a slot of its own it POSTs no token and the user is told to complete a
 * challenge that is nowhere on screen.
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthModal } from '../AuthModal.js'

const signupMock = vi.fn()

vi.mock('@molecule/app-react', () => ({
  useAuth: () => ({ refresh: vi.fn() }),
  useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
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
    ...rest
  }: {
    children?: React.ReactNode
    type?: 'button' | 'submit'
    disabled?: boolean
  }) => (
    <button type={type} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}))

vi.mock('@molecule/app-oauth-buttons-react', () => ({
  OAuthButtons: () => null,
  OAuthDivider: () => null,
}))

/** The submit button, which the challenge gates. */
function submitButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector('[data-mol-id="auth-modal-submit"]') as HTMLButtonElement
}

describe('AuthModal captcha slot', () => {
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('renders the challenge in the signup form and blocks submit until it is solved', () => {
    const { container, rerender } = render(
      <AuthModal
        open
        onClose={vi.fn()}
        initialMode="signup"
        oauthConfig={{}}
        captchaSlot={<div data-testid="challenge">challenge</div>}
        captchaSolved={false}
      />,
    )

    expect(screen.getByTestId('challenge')).toBeTruthy()
    // Inside the form — a challenge rendered outside it would still leave the
    // user submitting a form with no visible check attached to it.
    expect(container.querySelector('form [data-mol-id="auth-modal-captcha"]')).toBeTruthy()
    expect(submitButton(container).disabled).toBe(true)

    rerender(
      <AuthModal
        open
        onClose={vi.fn()}
        initialMode="signup"
        oauthConfig={{}}
        captchaSlot={<div data-testid="challenge">challenge</div>}
        captchaSolved
      />,
    )
    expect(submitButton(container).disabled).toBe(false)
  })

  it('does not render the challenge in login mode, and never gates the login submit', () => {
    const { container } = render(
      <AuthModal
        open
        onClose={vi.fn()}
        initialMode="login"
        oauthConfig={{}}
        captchaSlot={<div data-testid="challenge">challenge</div>}
        captchaSolved={false}
      />,
    )

    // Login is not captcha-gated server-side; unmounting the slot also lets the
    // widget clear its single-use token instead of stranding a stale one.
    expect(screen.queryByTestId('challenge')).toBeNull()
    expect(submitButton(container).disabled).toBe(false)
  })

  it('leaves signup unchanged for apps with no challenge (no slot, no gating)', () => {
    const { container } = render(
      <AuthModal open onClose={vi.fn()} initialMode="signup" oauthConfig={{}} />,
    )

    expect(container.querySelector('[data-mol-id="auth-modal-captcha"]')).toBeNull()
    expect(submitButton(container).disabled).toBe(false)
  })
})
