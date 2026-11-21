// @vitest-environment jsdom
/**
 * finishAuth resilience — the post-signup "didn't log me in" regression.
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/AuthModal.test.tsx`:
 * cookie-session APIs (the `@molecule/api-resource-user` model) issue no refresh
 * token, so `refresh()` could reject right after a SUCCESSFUL signup/login.
 * finishAuth must still run `onAuthenticated` + close when the client session
 * is already established, and only treat the failure as fatal when there is
 * genuinely no session.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import type { AuthModalProps } from '../AuthModal.js'

const refreshMock = vi.fn()
const isAuthenticatedMock = vi.fn()
const signupMock = vi.fn()
const clearMock = vi.fn()

vi.mock('@molecule/app-vue', () => ({
  useAuth: () => ({ refresh: refreshMock }),
  useAuthClient: () => ({
    isAuthenticated: isAuthenticatedMock,
    getUser: () => ({ email: 'new@example.com' }),
  }),
  useLogin: () => ({ status: { value: 'idle' }, error: { value: null }, login: vi.fn() }),
  useSignup: () => ({ status: { value: 'idle' }, error: { value: null }, signup: signupMock }),
  useI18nError: (error: unknown) => {
    const read = (): unknown => (typeof error === 'function' ? error() : error)
    const unwrap = (current: unknown): unknown =>
      current != null && typeof current === 'object' && 'value' in (current as object)
        ? (current as { value: unknown }).value
        : current
    return {
      get value(): string | null {
        const current = unwrap(read())
        return current ? String((current as Error).message) : null
      },
    }
  },
  useOAuth: () => ({ providers: { value: [] }, loginViaPopup: vi.fn() }),
  // AuthModal reads `t` from `useTranslation()` (it must re-render on locale
  // switches). The stub mirrors the real provider's contract for the parts the
  // modal uses: the `defaultValue` with `{{name}}` placeholders interpolated
  // from `values` — the same interpolation `app-i18n`'s provider applies to a
  // missing key's fallback, so a `{{who}}` default renders the real value.
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) => {
      const text = options?.defaultValue ?? key
      return text.replace(/\{\{(\w+)\}\}/g, (whole: string, name: string) =>
        values && name in values ? String(values[name]) : whole,
      )
    },
  }),
}))

vi.mock('@molecule/app-auth-shell-vue', () => ({
  // The real composable returns `fields` as a Vue ref (the component reads
  // `fields.value.email`), so the stub carries the same shape.
  useAuthFormState: () => ({
    fields: { value: { email: 'new@example.com' } },
    setField: vi.fn(),
    clear: clearMock,
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
      (props, { slots }) =>
      () =>
        h('button', { type: props.type, disabled: props.disabled }, slots.default?.()),
  }),
}))

vi.mock('@molecule/app-oauth-buttons-vue', () => ({
  OAuthButtons: defineComponent({ name: 'OAuthButtons', setup: () => () => null }),
  OAuthDivider: defineComponent({ name: 'OAuthDivider', setup: () => () => null }),
}))

import { AuthModal } from '../AuthModal.js'

/** Renders the modal in signup mode and submits the form. */
async function renderAndSubmit(): Promise<{
  onClose: ReturnType<typeof vi.fn>
  onAuthenticated: ReturnType<typeof vi.fn>
}> {
  const onClose = vi.fn()
  const onAuthenticated = vi.fn()
  const host = document.body.appendChild(document.createElement('div'))
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(AuthModal, {
          open: true,
          onClose,
          initialMode: 'signup',
          oauthConfig: {},
          onAuthenticated,
        } satisfies AuthModalProps),
    }),
  )
  app.mount(host)
  await nextTick()
  const form = host.querySelector('form') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  return { onClose, onAuthenticated }
}

describe('AuthModal finishAuth', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('completes (onAuthenticated + close) when refresh() rejects but the session is established', async () => {
    signupMock.mockResolvedValue({ user: { id: 'u1' } })
    refreshMock.mockRejectedValue(new Error('No refresh token available'))
    isAuthenticatedMock.mockReturnValue(true)

    const { onClose, onAuthenticated } = await renderAndSubmit()

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 3000 })
    expect(signupMock).toHaveBeenCalled()
    expect(onAuthenticated).toHaveBeenCalled()
  })

  it('shows a brief "Signed up!" confirmation, then closes', async () => {
    signupMock.mockResolvedValue({ user: { id: 'u1' } })
    refreshMock.mockResolvedValue({ user: { id: 'u1' } })
    isAuthenticatedMock.mockReturnValue(true)

    const { onClose, onAuthenticated } = await renderAndSubmit()
    const text = (): string => document.body.textContent ?? ''

    // The confirmation replaces the form BEFORE the modal closes, and names
    // the account that just authenticated.
    await vi.waitFor(() => expect(text()).toContain('Signed up!'))
    expect(text()).toContain('Logged in as new@example.com')
    expect(onClose).not.toHaveBeenCalled()

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 3000 })
    expect(onAuthenticated).toHaveBeenCalled()
    // clear() ran with the successful auth, so no credentials linger.
    expect(clearMock).toHaveBeenCalled()
  })

  it('does NOT close or run onAuthenticated when refresh() rejects and no session exists', async () => {
    signupMock.mockResolvedValue({ user: { id: 'u1' } })
    refreshMock.mockRejectedValue(new Error('No refresh token available'))
    isAuthenticatedMock.mockReturnValue(false)

    const { onClose, onAuthenticated } = await renderAndSubmit()

    // Give the async submit handler a tick to settle.
    await vi.waitFor(() => expect(refreshMock).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onClose).not.toHaveBeenCalled()
    expect(onAuthenticated).not.toHaveBeenCalled()
  })
})
