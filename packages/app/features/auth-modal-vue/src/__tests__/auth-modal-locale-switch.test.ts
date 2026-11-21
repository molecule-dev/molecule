// @vitest-environment jsdom
/**
 * Locale-switch reactivity for AuthModal's labels.
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/auth-modal-locale-switch.test.tsx`:
 * the modal must read `t` from the subscribed `useTranslation()` composable —
 * not the static `t` import — so a `setLocale('fr')` re-renders its labels in
 * French with no unrelated re-render. The auth composables are stubbed (no
 * server here) but `@molecule/app-vue` itself stays REAL.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppVue from '@molecule/app-vue'

// Keep the real module (useTranslation — the composable under test) and replace
// only the network-touching auth composables. `useI18nError` is ALSO stubbed,
// like the package's other AuthModal tests: it internally calls
// `useTranslation()`, so with the real one the whole modal would re-render on a
// locale switch through that side door and this test would prove nothing about
// the component's own translation path.
vi.mock('@molecule/app-vue', async (importOriginal) => {
  const actual = await importOriginal<typeof AppVue>()
  return {
    ...actual,
    useAuth: () => ({ refresh: vi.fn() }),
    useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
    useLogin: () => ({ status: { value: 'idle' }, error: { value: null }, login: vi.fn() }),
    useSignup: () => ({ status: { value: 'idle' }, error: { value: null }, signup: vi.fn() }),
    useOAuth: () => ({ providers: { value: [] }, loginViaPopup: vi.fn() }),
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
  }
})

vi.mock('@molecule/app-auth-shell-vue', () => ({
  useAuthFormState: () => ({
    fields: { value: { email: 'user@example.com' } },
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
    props: { open: Boolean, title: String },
    setup:
      (props, { slots }) =>
      () =>
        props.open
          ? h('div', [h('h2', { 'data-mol-title': '' }, props.title), slots.default?.()])
          : null,
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
  document.body.replaceChildren()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
  vi.clearAllMocks()
})

describe('AuthModal locale switch', () => {
  it('renders the signup title in French after setLocale', async () => {
    const container = document.body.appendChild(document.createElement('div'))
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(AuthModal, { open: true, onClose: () => {}, oauthConfig: {} } as never),
      }),
    )
    // `useI18nProvider` injects the app's provider and falls back to the bonded
    // one — the bonded provider is what this test drives through `setProvider`,
    // so the modal's `t` resolves against exactly it.
    app.mount(container)
    await nextTick()

    const title = (): string | null =>
      container.querySelector('[data-mol-title]')?.textContent ?? null
    expect(title()).toBe('Create your account')

    // The switch itself: the modal must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await nextTick()
    expect(title()).toBe('Créez votre compte')
  })
})
