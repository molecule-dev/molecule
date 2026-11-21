// @vitest-environment jsdom
/**
 * The captcha slot — the "complete the challenge" with no challenge regression.
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/AuthModal.captcha.test.tsx`:
 * an API whose signup route requires a human-verification token does not care
 * which surface the request came from; the modal must render the challenge in
 * its own signup form and gate the submit on it.
 *
 * @module
 */

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthModal } from '../AuthModal.jsx'
import type { AuthModalMode } from '../cta-intercept.js'

const signupMock = vi.fn()

vi.mock('@molecule/app-solid', () => ({
  useAuth: () => ({ refresh: vi.fn() }),
  useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
  useLogin: () => ({ status: () => 'idle', error: () => null, login: vi.fn() }),
  useSignup: () => ({ status: () => 'idle', error: () => null, signup: signupMock }),
  useI18nError: (error: unknown) => {
    const read = (): unknown => (typeof error === 'function' ? (error as () => unknown)() : error)
    return () => {
      const current = read()
      return current ? String((current as Error).message) : null
    }
  },
  useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
  // The component only uses the `defaultValue` contract here.
  useTranslation: () => ({
    t: (key: string, _values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

vi.mock('@molecule/app-auth-shell-solid', () => ({
  useAuthFormState: () => ({
    fields: () => ({ email: 'new@example.com' }),
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

vi.mock('@molecule/app-ui-solid', () => ({
  Modal: (props: { open: boolean; children?: JSX.Element }) => (
    <div>{props.open ? props.children : null}</div>
  ),
  Icon: () => null,
  Button: (props: {
    type?: 'button' | 'submit' | 'reset' | 'menu'
    disabled?: boolean
    'data-mol-id'?: string
    children?: JSX.Element
  }) => (
    <button type={props.type} disabled={props.disabled} data-mol-id={props['data-mol-id']}>
      {props.children}
    </button>
  ),
}))

vi.mock('@molecule/app-oauth-buttons-solid', () => ({
  OAuthButtons: () => null,
  OAuthDivider: () => null,
}))

/** The submit button, which the challenge gates. */
function submitButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector('[data-mol-id="auth-modal-submit"]') as HTMLButtonElement
}

/** The challenge widget an app passes as its slot. */
const challenge = (): JSX.Element => <div data-testid="challenge">challenge</div>

/**
 * Renders AuthModal with the captcha wiring driven by signals (React's
 * rerender-driven assertions flip the same props).
 */
async function mountModal(options: {
  initialMode: AuthModalMode
  captchaSlot?: JSX.Element
  captchaSolved?: boolean
}): Promise<{ setSolved: (solved: boolean) => void; container: HTMLElement }> {
  const [open] = createSignal(true)
  const [solved, setSolved] = createSignal(options.captchaSolved ?? true)
  const [slot, setSlot] = createSignal<JSX.Element | undefined>(options.captchaSlot)
  const container = document.body.appendChild(document.createElement('div'))
  const dispose = render(
    () => (
      <AuthModal
        open={open()}
        onClose={vi.fn()}
        initialMode={options.initialMode}
        oauthConfig={{}}
        captchaSlot={slot()}
        captchaSolved={solved()}
      />
    ),
    container,
  )
  void dispose
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  return {
    setSolved: (next: boolean): void => {
      setSolved(next)
      setSlot(options.captchaSlot)
    },
    container,
  }
}

describe('AuthModal captcha slot', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('renders the challenge in the signup form and blocks submit until it is solved', async () => {
    const widget = challenge()
    const { setSolved, container } = await mountModal({
      initialMode: 'signup',
      captchaSlot: widget,
      captchaSolved: false,
    })

    expect(document.querySelector('[data-testid="challenge"]')).toBeTruthy()
    // Inside the form — a challenge rendered outside it would still leave the
    // user submitting a form with no visible check attached to it.
    expect(container.querySelector('form [data-mol-id="auth-modal-captcha"]')).toBeTruthy()
    expect(submitButton(container).disabled).toBe(true)

    setSolved(true)
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(submitButton(container).disabled).toBe(false)
  })

  it('does not render the challenge in login mode, and never gates the login submit', async () => {
    const { container } = await mountModal({
      initialMode: 'login',
      captchaSlot: challenge(),
      captchaSolved: false,
    })

    // Login is not captcha-gated server-side; unmounting the slot also lets the
    // widget clear its single-use token instead of stranding a stale one.
    expect(document.querySelector('[data-testid="challenge"]')).toBeNull()
    expect(submitButton(container).disabled).toBe(false)
  })

  it('leaves signup unchanged for apps with no challenge (no slot, no gating)', async () => {
    const { container } = await mountModal({ initialMode: 'signup' })

    expect(container.querySelector('[data-mol-id="auth-modal-captcha"]')).toBeNull()
    expect(submitButton(container).disabled).toBe(false)
  })
})
