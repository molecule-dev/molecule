/**
 * Locale-switch reactivity for AuthModal's labels.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded
 * provider but nothing subscribes the calling component to locale changes, so
 * after `setLocale('fr')` its labels stayed in the old language until an
 * unrelated re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-react` subscribes through `useSyncExternalStore`, so a
 * component reading `t` from the hook re-renders on the switch. This test
 * bonds a provider with an `en` and a `fr` value for the modal title key,
 * renders the modal in `en`, switches to `fr` through `act`, and asserts the
 * DOM now shows the French title.
 *
 * The auth hooks are stubbed (no server here) but `@molecule/app-react` itself
 * stays REAL — `useTranslation` must be the subscribed hook, not a stub, or
 * this test would prove nothing.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppReact from '@molecule/app-react'

// Keep the real module (useTranslation — the hook under test) and replace only
// the network-touching auth hooks. `useI18nError` is ALSO stubbed, like the
// package's other AuthModal tests: it internally calls `useTranslation()`, so
// with the real one the whole modal re-renders on a locale switch through that
// side door and this test would pass even against the un-migrated component,
// proving nothing about the component's own translation path.
vi.mock('@molecule/app-react', async (importOriginal) => {
  const actual = await importOriginal<typeof AppReact>()
  return {
    ...actual,
    useAuth: () => ({ refresh: vi.fn() }),
    useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
    useLogin: () => ({ status: 'idle', error: null, login: vi.fn() }),
    useSignup: () => ({ status: 'idle', error: null, signup: vi.fn() }),
    useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
    useI18nError: (error: unknown) => (error ? String(error) : null),
  }
})

vi.mock('@molecule/app-auth-shell-react', () => ({
  useAuthFormState: () => ({
    fields: { email: 'user@example.com' },
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
  Modal: ({ open, title, children }: { open: boolean; title?: ReactNode; children?: ReactNode }) =>
    open ? (
      <div>
        <h2 data-mol-title="">{title}</h2>
        {children}
      </div>
    ) : null,
  Icon: () => null,
  Button: ({
    children,
    type,
    disabled,
  }: {
    children?: ReactNode
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

const { AuthModal } = await import('../AuthModal.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'auth.modal.signupTitle': 'Create your account' },
    },
    {
      code: 'fr',
      name: 'French',
      translations: { 'auth.modal.signupTitle': 'Créez votre compte' },
    },
  ])
  setProvider(provider)
})

afterEach(() => {
  cleanup()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
  vi.clearAllMocks()
})

describe('AuthModal locale switch', () => {
  it('renders the signup title in French after setLocale', async () => {
    const { container } = render(<AuthModal open onClose={() => {}} oauthConfig={{}} />)
    const title = (): string | null =>
      container.querySelector('[data-mol-title]')?.textContent ?? null
    expect(title()).toBe('Create your account')

    // The switch itself: the modal must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(title()).toBe('Créez votre compte')
  })
})
