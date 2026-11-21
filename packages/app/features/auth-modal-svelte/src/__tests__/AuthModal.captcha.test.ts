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

import { createRawSnippet, flushSync, mount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

const signupMock = vi.fn()

vi.mock('@molecule/app-svelte', () => ({
  useAuth: () => ({ refresh: vi.fn() }),
  useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
  useLogin: () => ({ status: writableOf('idle'), error: writableOf(null), login: vi.fn() }),
  useSignup: () => ({ status: writableOf('idle'), error: writableOf(null), signup: signupMock }),
  useI18nError: () => ({
    subscribe(run: (value: string | null) => void): () => void {
      run(null)
      return () => undefined
    },
  }),
  useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
  // The component only uses the `defaultValue` contract here.
  useTranslation: () => ({
    t: (key: string, _values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

vi.mock('@molecule/app-auth-shell-svelte', () => ({
  useAuthFormState: () => ({
    fields: writableOf({ email: 'new@example.com' }),
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

vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Button } = await import('./stubs/ButtonStub.svelte')
  const { default: Modal } = await import('./stubs/ModalStub.svelte')
  const Icon = () => null
  return { Button, Modal, Icon }
})

vi.mock('@molecule/app-oauth-buttons-svelte', () => ({
  OAuthButtons: () => null,
  OAuthDivider: () => null,
}))

import type { AuthModalProps } from '../types.js'

const { createPropBag } = await import('./props-bag.svelte.js')
const { default: AuthModalHost } = await import('./AuthModalHost.svelte')

/** A minimal readable store, the shape the binding hooks return. */
function writableOf<T>(value: T): {
  subscribe(run: (value: T) => void): () => void
} {
  return {
    subscribe(run: (value: T) => void) {
      run(value)
      return () => undefined
    },
  }
}

/** The submit button, which the challenge gates. */
function submitButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector('[data-mol-id="auth-modal-submit"]') as HTMLButtonElement
}

/** The challenge widget, as a snippet node the caller passes for `captchaSlot`. */
const challenge = (): ReturnType<typeof createRawSnippet> =>
  createRawSnippet(() => ({ render: () => '<div data-testid="challenge">challenge</div>' }))

/** Mounts the modal through the host with the captcha wiring. */
function mountModal(props: Partial<AuthModalProps> = {}): {
  bag: ReturnType<typeof createPropBag>
  container: HTMLElement
} {
  const container = document.body.appendChild(document.createElement('div'))
  const bag = createPropBag({
    open: true,
    onClose: vi.fn(),
    initialMode: 'signup',
    oauthConfig: {},
    ...props,
  })
  mount(AuthModalHost, { target: container, props: { bag } })
  flushSync()
  return { bag, container }
}

describe('AuthModal captcha slot', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('renders the challenge in the signup form and blocks submit until it is solved', () => {
    const { bag, container } = mountModal({ captchaSlot: challenge(), captchaSolved: false })

    expect(document.querySelector('[data-testid="challenge"]')).toBeTruthy()
    // Inside the form — a challenge rendered outside it would still leave the
    // user submitting a form with no visible check attached to it.
    expect(container.querySelector('form [data-mol-id="auth-modal-captcha"]')).toBeTruthy()
    expect(submitButton(container).disabled).toBe(true)

    bag.props.captchaSolved = true
    flushSync()
    expect(submitButton(container).disabled).toBe(false)
  })

  it('does not render the challenge in login mode, and never gates the login submit', () => {
    const { container } = mountModal({
      initialMode: 'login',
      captchaSlot: challenge(),
      captchaSolved: false,
    })

    // Login is not captcha-gated server-side; unmounting the slot also lets the
    // widget clear its single-use token instead of stranding a stale one.
    expect(document.querySelector('[data-testid="challenge"]')).toBeNull()
    expect(submitButton(container).disabled).toBe(false)
  })

  it('leaves signup unchanged for apps with no challenge (no slot, no gating)', () => {
    const { container } = mountModal({})

    expect(container.querySelector('[data-mol-id="auth-modal-captcha"]')).toBeNull()
    expect(submitButton(container).disabled).toBe(false)
  })
})
