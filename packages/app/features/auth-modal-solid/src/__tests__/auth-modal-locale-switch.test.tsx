// @vitest-environment jsdom
/**
 * Locale-switch reactivity for AuthModal's labels.
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/auth-modal-locale-switch.test.tsx`:
 * the modal must read `t` from the subscribed `useTranslation()` primitive —
 * not the static `t` import — so a `setLocale('fr')` re-renders its labels in
 * French with no unrelated re-render. The auth primitives are stubbed (no
 * server here) but `@molecule/app-solid` itself stays REAL.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppSolid from '@molecule/app-solid'

// Keep the real module (useTranslation — the primitive under test) and replace
// only the network-touching auth primitives. `useI18nError` is ALSO stubbed,
// like the package's other AuthModal tests: it internally calls
// `useTranslation()`, so with the real one the whole modal would re-render on a
// locale switch through that side door and this test would prove nothing about
// the component's own translation path.
vi.mock('@molecule/app-solid', async (importOriginal) => {
  const actual = await importOriginal<typeof AppSolid>()
  return {
    ...actual,
    useAuth: () => ({ refresh: vi.fn() }),
    useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
    useLogin: () => ({ status: () => 'idle', error: () => null, login: vi.fn() }),
    useSignup: () => ({ status: () => 'idle', error: () => null, signup: vi.fn() }),
    useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
    useI18nError: (error: unknown) => {
      const read = (): unknown => (typeof error === 'function' ? (error as () => unknown)() : error)
      return () => {
        const current = read()
        return current ? String((current as Error).message) : null
      }
    },
  }
})

vi.mock('@molecule/app-auth-shell-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuthFormState: () => ({
    fields: () => ({ email: 'user@example.com' }),
    setField: vi.fn(),
    clear: vi.fn(),
  }),
}))

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: () => Object.assign(() => '', { toString: () => '' }),
      },
    ),
}))

vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Modal: (props: { open: boolean; title?: string; children?: JSX.Element }) =>
    props.open ? (
      <div>
        <h2 data-mol-title="">{props.title}</h2>
        {props.children}
      </div>
    ) : null,
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

vi.mock('@molecule/app-oauth-buttons-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  OAuthButtons: () => null,
  OAuthDivider: () => null,
}))

const { AuthModal } = await import('../AuthModal.jsx')

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
  document.body.replaceChildren()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
  vi.clearAllMocks()
})

describe('AuthModal locale switch', () => {
  it('renders the signup title in French after setLocale', async () => {
    const container = document.body.appendChild(document.createElement('div'))
    // `useI18nProvider` reads the context the Solid provider sets and falls
    // back to the bonded one — the bonded provider is what this test drives
    // through `setProvider`, so the modal's `t` resolves against exactly it.
    render(() => <AuthModal open onClose={() => {}} oauthConfig={{}} />, container)
    const title = (): string | null =>
      container.querySelector('[data-mol-title]')?.textContent ?? null
    expect(title()).toBe('Create your account')

    // The switch itself: the modal must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await Promise.resolve()
    expect(title()).toBe('Créez votre compte')
  })
})
