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

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, shallowReactive } from 'vue'

import type { AuthModalProps } from '../AuthModal.js'

const signupMock = vi.fn()

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ refresh: vi.fn() }),
  useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
  useLogin: () => ({ status: { value: 'idle' }, error: { value: null }, login: vi.fn() }),
  useSignup: () => ({ status: { value: 'idle' }, error: { value: null }, signup: signupMock }),
  useI18nError: (error: unknown) => ({
    get value(): string | null {
      const read = typeof error === 'function' ? error() : error
      const current =
        read != null && typeof read === 'object' && 'value' in (read as object)
          ? (read as { value: unknown }).value
          : read
      return current ? String((current as Error).message) : null
    },
  }),
  useOAuth: () => ({ providers: { value: [] }, loginViaPopup: vi.fn() }),
  // The component only uses the `defaultValue` contract here.
  useTranslation: () => ({
    t: (key: string, _values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

vi.mock('@molecule/app-auth-shell-vue', () => ({
  useAuthFormState: () => ({
    fields: { value: { email: 'new@example.com' } },
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

vi.mock('@molecule/app-ui-vue', () => ({
  Modal: defineComponent({
    name: 'Modal',
    props: { open: Boolean },
    setup:
      (props, { slots }) =>
      () =>
        props.open ? h('div', slots.default?.()) : null,
  }),
  Icon: defineComponent({ name: 'Icon', setup: () => () => null }),
  Button: defineComponent({
    name: 'Button',
    props: { type: String, disabled: Boolean },
    setup:
      (props, { slots, attrs }) =>
      () =>
        h(
          'button',
          { type: props.type, disabled: props.disabled, 'data-mol-id': attrs['data-mol-id'] },
          slots.default?.(),
        ),
  }),
}))

vi.mock('@molecule/app-oauth-buttons-vue', () => ({
  OAuthButtons: defineComponent({ name: 'OAuthButtons', setup: () => () => null }),
  OAuthDivider: defineComponent({ name: 'OAuthDivider', setup: () => () => null }),
}))

import { AuthModal } from '../AuthModal.js'

/** The submit button, which the challenge gates. */
function submitButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector('[data-mol-id="auth-modal-submit"]') as HTMLButtonElement
}

/** Mounts AuthModal against a reactive props object, returned for rerenders. */
function mountModal(props: AuthModalProps): { props: AuthModalProps; container: HTMLElement } {
  const container = document.body.appendChild(document.createElement('div'))
  const reactiveProps = shallowReactive<AuthModalProps>({ ...props })
  const app = createApp(defineComponent({ setup: () => () => h(AuthModal, reactiveProps) }))
  app.mount(container)
  return { props: reactiveProps, container }
}

describe('AuthModal captcha slot', () => {
  afterEach(async () => {
    await nextTick()
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('renders the challenge in the signup form and blocks submit until it is solved', async () => {
    const { props, container } = mountModal({
      open: true,
      onClose: vi.fn(),
      initialMode: 'signup',
      oauthConfig: {},
      // A same-named slot carries the challenge (the Vue idiom for node props).
      captchaSlot: h('div', { 'data-testid': 'challenge' }, 'challenge'),
      captchaSolved: false,
    })

    expect(document.querySelector('[data-testid="challenge"]')).toBeTruthy()
    // Inside the form — a challenge rendered outside it would still leave the
    // user submitting a form with no visible check attached to it.
    expect(container.querySelector('form [data-mol-id="auth-modal-captcha"]')).toBeTruthy()
    expect(submitButton(container).disabled).toBe(true)

    props.captchaSolved = true
    await nextTick()
    expect(submitButton(container).disabled).toBe(false)
  })

  it('does not render the challenge in login mode, and never gates the login submit', () => {
    const { container } = mountModal({
      open: true,
      onClose: vi.fn(),
      initialMode: 'login',
      oauthConfig: {},
      captchaSlot: h('div', { 'data-testid': 'challenge' }, 'challenge'),
      captchaSolved: false,
    })

    // Login is not captcha-gated server-side; unmounting the slot also lets the
    // widget clear its single-use token instead of stranding a stale one.
    expect(document.querySelector('[data-testid="challenge"]')).toBeNull()
    expect(submitButton(container).disabled).toBe(false)
  })

  it('leaves signup unchanged for apps with no challenge (no slot, no gating)', () => {
    const { container } = mountModal({
      open: true,
      onClose: vi.fn(),
      initialMode: 'signup',
      oauthConfig: {},
    })

    expect(container.querySelector('[data-mol-id="auth-modal-captcha"]')).toBeNull()
    expect(submitButton(container).disabled).toBe(false)
  })
})
