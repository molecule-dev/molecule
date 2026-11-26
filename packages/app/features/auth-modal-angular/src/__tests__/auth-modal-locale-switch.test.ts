// @vitest-environment jsdom
/**
 * Locale-switch reactivity for AuthModal's labels.
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/auth-modal-locale-switch.test.tsx`:
 * the modal must read `t` from the subscribed `useTranslation()` hook — not the
 * static `t` import — so a `setLocale('fr')` re-renders its labels in French
 * with no unrelated re-render. The auth hooks are stubbed (no server here) but
 * `@molecule/app-angular` itself stays REAL.
 *
 * @module
 */

// Register Angular's JIT compiler facade and bond the reference ClassMap + i18n
// provider the components read, before any component class loads.
import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AppAngular from '@molecule/app-angular'
import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AngularUI from '@molecule/app-ui-angular'

import { flush, type RenderedFixture, renderFixture } from './render.js'
import { ButtonStub, IconStub, ModalStub, OAuthButtonsStub, OAuthDividerStub } from './stubs.js'

// Keep the real module (`useTranslation` — the hook under test) and replace
// only the network-touching auth hooks. `useI18nError` is ALSO stubbed, like
// the package's other AuthModal tests: it internally calls `useTranslation()`,
// so with the real one the whole modal would re-render on a locale switch
// through that side door and this test would prove nothing about the
// component's own translation path.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AppAngular>()
  return {
    ...actual,
    useAuth: () => ({ refresh: vi.fn() }),
    useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
    useLogin: () => ({ status: 'idle', error: null, login: vi.fn() }),
    useSignup: () => ({ status: 'idle', error: null, signup: vi.fn() }),
    useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
    useI18nError: () => () => null,
  }
})

vi.mock('@molecule/app-auth-shell-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuthFormState: () => ({
    fields: () => ({ email: 'user@example.com' }),
    setField: vi.fn(),
    clear: vi.fn(),
  }),
}))

vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { elementTarget } = await importOriginal<typeof AngularUI>()
  const stubs = await import('./stubs.js')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Modal: stubs.ModalStub,
    Icon: stubs.IconStub,
    Button: stubs.ButtonStub,
    elementTarget,
  }
})

vi.mock('@molecule/app-oauth-buttons-angular', async (importOriginal) => {
  const stubs = await import('./stubs.js')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    OAuthButtons: stubs.OAuthButtonsStub,
    OAuthDivider: stubs.OAuthDividerStub,
  }
})

import { AuthModal } from '../auth-modal.component.js'

/** Fixtures still mounted when the current test started, torn down in afterEach. */
const mounted: RenderedFixture[] = []

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

afterEach(async () => {
  for (const fixture of mounted.splice(0)) await fixture.destroy()
  document.body.replaceChildren()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
  vi.clearAllMocks()
})

describe('AuthModal locale switch', () => {
  it('renders the signup title in French after setLocale', async () => {
    const fixture = await renderFixture(
      `<mol-auth-modal [open]="true" [initialMode]="'signup'" [oauthConfig]="{}"></mol-auth-modal>`,
      {},
      [AuthModal, ModalStub, IconStub, ButtonStub, OAuthButtonsStub, OAuthDividerStub],
    )
    await flush(fixture)
    mounted.push(fixture)

    const title = (): string | null =>
      document.querySelector('[data-mol-title]')?.textContent ?? null
    // `useI18nProvider` injects the app's provider and falls back to the bonded
    // one — the bonded provider is what this test drives through `setProvider`,
    // so the modal's `t` resolves against exactly it.
    expect(title()).toBe('Create your account')

    // The switch itself: the modal must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await flush(fixture)
    expect(title()).toBe('Créez votre compte')
  })
})
