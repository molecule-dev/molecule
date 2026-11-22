// @vitest-environment jsdom
/**
 * Focus-on-open — the "keyboard users land behind the modal" regression.
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/AuthModal.focus.test.tsx`:
 * the email field must receive focus when the modal opens (the WAI-ARIA dialog
 * pattern), without the `autoFocus` prop, and a parent re-render while the
 * modal is open must not steal focus back.
 *
 * @module
 */

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthModal } from '../AuthModal.jsx'
import type { AuthModalMode } from '../cta-intercept.js'

const refreshMock = vi.fn()

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ refresh: refreshMock }),
  useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
  useLogin: () => ({ status: () => 'idle', error: () => null, login: vi.fn() }),
  useSignup: () => ({ status: () => 'idle', error: () => null, signup: vi.fn() }),
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
    fields: () => ({}),
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
    children?: JSX.Element
  }) => (
    <button type={props.type} disabled={props.disabled}>
      {props.children}
    </button>
  ),
}))

vi.mock('@molecule/app-oauth-buttons-solid', () => ({
  OAuthButtons: () => null,
  OAuthDivider: () => null,
}))

/** The email field, by its design-system id. */
function emailField(container: HTMLElement): HTMLInputElement {
  return container.querySelector('[data-mol-id="auth-modal-email"]') as HTMLInputElement
}

/**
 * Renders AuthModal under an `open` signal (React's rerender-driven focus
 * assertions drive the same prop), flushing Solid's render effects the way
 * the conformance kit's flush does.
 */
async function mountModal(initialMode: AuthModalMode): Promise<{
  setOpen: (open: boolean) => void
  rerender: () => void
  container: HTMLElement
}> {
  const [open, setOpen] = createSignal(true)
  // The busy parent's unrelated rerender: a signal the modal's focus effect
  // does not read (React rerenders with a fresh onClose closure).
  const [nonce, setNonce] = createSignal(0)
  const container = document.body.appendChild(document.createElement('div'))
  const dispose = render(
    () => (
      <AuthModal
        open={open()}
        onClose={() => {
          void nonce()
        }}
        initialMode={initialMode}
        oauthConfig={{}}
      />
    ),
    container,
  )
  void dispose
  await flush()
  return { setOpen, rerender: () => setNonce(nonce() + 1), container }
}

/** Drains Solid's render effects and the deferred focus microtask. */
async function flush(): Promise<void> {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await Promise.resolve()
}

describe('AuthModal focus on open', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('moves focus to the email field on open, in signup mode', async () => {
    const { container } = await mountModal('signup')
    expect(document.activeElement).toBe(emailField(container))
  })

  it('moves focus to the email field on open, in login mode', async () => {
    const { container } = await mountModal('login')
    expect(document.activeElement).toBe(emailField(container))
  })

  it('does not set the autofocus attribute on the email field', async () => {
    const { container } = await mountModal('signup')
    // The attribute (what the autoFocus prop renders) is the thing the a11y
    // rule bars — assert its absence directly so a future port to another
    // framework cannot reintroduce it under a different code path.
    expect(emailField(container).getAttribute('autofocus')).toBeNull()
  })

  it('does not steal focus back when the parent re-renders while open', async () => {
    const { rerender, container } = await mountModal('signup')
    const password = container.querySelector(
      '[data-mol-id="auth-modal-password"]',
    ) as HTMLInputElement
    password.focus()

    // The busy parent's rerender: a fresh onClose closure every render.
    rerender()
    await flush()
    expect(document.activeElement).toBe(password)
  })

  it('moves focus back to the email field when the modal is closed and reopened', async () => {
    const { setOpen, container } = await mountModal('login')
    expect(document.activeElement).toBe(emailField(container))

    setOpen(false)
    await flush()
    expect(document.activeElement).not.toBe(emailField(container))

    setOpen(true)
    await flush()
    expect(document.activeElement).toBe(emailField(container))
  })
})
