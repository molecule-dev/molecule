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

import { flushSync, mount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AuthModal from '../AuthModal.svelte'

const refreshMock = vi.fn()
const isAuthenticatedMock = vi.fn()
const signupMock = vi.fn()
const clearMock = vi.fn()

vi.mock('@molecule/app-svelte', () => ({
  useAuth: () => ({ refresh: refreshMock }),
  useAuthClient: () => ({
    isAuthenticated: isAuthenticatedMock,
    getUser: () => ({ email: 'new@example.com' }),
  }),
  useLogin: () => ({ status: writableOf('idle'), error: writableOf(null), login: vi.fn() }),
  useSignup: () => ({ status: writableOf('idle'), error: writableOf(null), signup: signupMock }),
  useI18nError: (error: unknown) => ({
    // The stub mirrors the real hook for the one part the modal uses: the
    // error's own message (a plain `Error`, not an I18nError). It subscribes
    // the store the component passes, so a new error replaces the message.
    subscribe(run: (value: string | null) => void): () => void {
      const store = error as { subscribe?: (cb: (value: unknown) => void) => () => void }
      if (!store || typeof store.subscribe !== 'function') {
        run(null)
        return () => undefined
      }
      return store.subscribe((value: unknown) => {
        run(value ? String((value as Error).message) : null)
      })
    },
  }),
  useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
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

vi.mock('@molecule/app-auth-shell-svelte', () => ({
  useAuthFormState: () => ({
    fields: writableOf({ email: 'new@example.com' }),
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

/** Renders the modal in signup mode and submits the form. */
async function renderAndSubmit(): Promise<{
  onClose: ReturnType<typeof vi.fn>
  onAuthenticated: ReturnType<typeof vi.fn>
}> {
  const onClose = vi.fn()
  const onAuthenticated = vi.fn()
  const target = document.body.appendChild(document.createElement('div'))
  const instance = mount(AuthModal, {
    target,
    props: {
      open: true,
      onClose,
      initialMode: 'signup',
      oauthConfig: {},
      onAuthenticated,
    },
  })
  void instance
  flushSync()
  const form = target.querySelector('form') as HTMLFormElement
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
