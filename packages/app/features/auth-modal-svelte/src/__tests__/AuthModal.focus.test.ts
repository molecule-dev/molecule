// @vitest-environment jsdom
/**
 * Focus-on-open — the "keyboard users land behind the modal" regression.
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/AuthModal.focus.test.tsx`:
 * the email field must receive focus when the modal opens (the WAI-ARIA dialog
 * pattern), without the `autofocus` attribute, and a parent re-render while the
 * modal is open must not steal focus back.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

const refreshMock = vi.fn()

vi.mock('@molecule/app-svelte', () => ({
  useAuth: () => ({ refresh: refreshMock }),
  useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
  useLogin: () => ({ status: writableOf('idle'), error: writableOf(null), login: vi.fn() }),
  useSignup: () => ({ status: writableOf('idle'), error: writableOf(null), signup: vi.fn() }),
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
    fields: writableOf({}),
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

/** The email field, by its design-system id. */
function emailField(container: HTMLElement): HTMLInputElement {
  return container.querySelector('[data-mol-id="auth-modal-email"]') as HTMLInputElement
}

/** Mounts the host over a reactive prop bag, returned for rerender flips. */
function mountModal(props: Partial<AuthModalProps> = {}): {
  bag: ReturnType<typeof createPropBag>
  container: HTMLElement
  unmountAll: () => void
} {
  const container = document.body.appendChild(document.createElement('div'))
  const bag = createPropBag({
    open: true,
    onClose: vi.fn(),
    initialMode: 'signup',
    oauthConfig: {},
    ...props,
  })
  const instance = mount(AuthModalHost, { target: container, props: { bag } })
  flushSync()
  return {
    bag,
    container,
    unmountAll: (): void => {
      unmount(instance)
    },
  }
}

describe('AuthModal focus on open', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('moves focus to the email field on open, in signup mode', () => {
    const { container, unmountAll } = mountModal({})
    expect(document.activeElement).toBe(emailField(container))
    unmountAll()
  })

  it('moves focus to the email field on open, in login mode', () => {
    const { container, unmountAll } = mountModal({ initialMode: 'login' })
    expect(document.activeElement).toBe(emailField(container))
    unmountAll()
  })

  it('does not set the autofocus attribute on the email field', () => {
    const { container, unmountAll } = mountModal({})
    // The attribute (what the autoFocus prop renders) is the thing the a11y
    // rule bars — assert its absence directly so a future port to another
    // framework cannot reintroduce it under a different code path.
    expect(emailField(container).getAttribute('autofocus')).toBeNull()
    unmountAll()
  })

  it('does not steal focus back when the parent re-renders while open', () => {
    const { bag, container, unmountAll } = mountModal({})
    const password = container.querySelector(
      '[data-mol-id="auth-modal-password"]',
    ) as HTMLInputElement
    password.focus()

    // A fresh onClose closure — what a busy parent hands down every render.
    bag.props.onClose = () => {}
    flushSync()
    expect(document.activeElement).toBe(password)
    unmountAll()
  })

  it('moves focus back to the email field when the modal is closed and reopened', () => {
    const { bag, container, unmountAll } = mountModal({ initialMode: 'login' })
    expect(document.activeElement).toBe(emailField(container))

    bag.props.open = false
    flushSync()
    expect(document.activeElement).not.toBe(emailField(container))

    bag.props.open = true
    flushSync()
    expect(document.activeElement).toBe(emailField(container))
    unmountAll()
  })
})
