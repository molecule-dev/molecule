// @vitest-environment jsdom
/**
 * Locale-switch reactivity for AuthModal's labels.
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/auth-modal-locale-switch.test.tsx`:
 * the modal must read `t` from the subscribed `useTranslation()` hook — not the
 * static `t` import — so a `setLocale('fr')` re-renders its labels in French
 * with no unrelated re-render. The auth hooks are stubbed (no server here) but
 * `@molecule/app-svelte` itself stays REAL.
 *
 * @module
 */

import { flushSync, mount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppSvelte from '@molecule/app-svelte'

import AuthModal from '../AuthModal.svelte'

// Keep the real module (useTranslation — the hook under test) and replace only
// the network-touching auth hooks. `useI18nError` is ALSO stubbed, like the
// package's other AuthModal tests: it internally calls `useTranslation()`, so
// with the real one the whole modal would re-render on a locale switch through
// that side door and this test would prove nothing about the component's own
// translation path.
vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof AppSvelte>()
  return {
    ...actual,
    useAuth: () => ({ refresh: vi.fn() }),
    useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
    useLogin: () => ({ status: writableOf('idle'), error: writableOf(null), login: vi.fn() }),
    useSignup: () => ({ status: writableOf('idle'), error: writableOf(null), signup: vi.fn() }),
    useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
    useI18nError: () => ({
      subscribe(run: (value: string | null) => void): () => void {
        run(null)
        return () => undefined
      },
    }),
  }
})

vi.mock('@molecule/app-auth-shell-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuthFormState: () => ({
    fields: writableOf({ email: 'user@example.com' }),
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

vi.mock('@molecule/app-ui-svelte', async (importOriginal) => {
  const { default: Button } = await import('./stubs/ButtonStub.svelte')
  // The locale switch drives this test through the REAL title the modal hands
  // the Modal, so the stub exposes it on a marker element like React's does.
  const { default: Modal } = await import('./stubs/TitleModalStub.svelte')
  const Icon = () => null
  return { ...(await importOriginal<Record<string, unknown>>()), Button, Modal, Icon }
})

vi.mock('@molecule/app-oauth-buttons-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
  it('renders the signup title in French after setLocale', () => {
    const target = document.body.appendChild(document.createElement('div'))
    // `useTranslation` reads the context the Svelte provider sets and falls
    // back to the bonded one — the bonded provider is what this test drives
    // through `setProvider`, so the modal's `t` resolves against exactly it.
    mount(AuthModal, { target, props: { open: true, onClose: () => {}, oauthConfig: {} } })
    flushSync()
    const title = (): string | null => target.querySelector('[data-mol-title]')?.textContent ?? null
    expect(title()).toBe('Create your account')

    // The switch itself: the modal must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    void provider.setLocale('fr')
    flushSync()
    expect(title()).toBe('Créez votre compte')
  })
})
