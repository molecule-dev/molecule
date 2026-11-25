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

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  onMounted,
  type PropType,
  shallowReactive,
  watch,
} from 'vue'

import type { AuthModalProps } from '../AuthModal.js'

const refreshMock = vi.fn()

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ refresh: refreshMock }),
  useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
  useLogin: () => ({ status: { value: 'idle' }, error: { value: null }, login: vi.fn() }),
  useSignup: () => ({ status: { value: 'idle' }, error: { value: null }, signup: vi.fn() }),
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
    fields: { value: {} },
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
  // The real Modal moves focus to its `initialFocus` once the open dialog is in the
  // document (its own conformance cases cover that), and so does this stand-in: these
  // tests check the control AuthModal names.
  Modal: defineComponent({
    name: 'Modal',
    props: {
      open: Boolean,
      initialFocus: Object as PropType<{ readonly current: HTMLElement | null }>,
    },
    setup(props, { slots }) {
      const focusInitial = (): void => {
        if (props.open) void nextTick(() => props.initialFocus?.current?.focus())
      }
      onMounted(focusInitial)
      watch(() => props.open, focusInitial)
      return () => (props.open ? h('div', slots.default?.()) : null)
    },
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

/** The email field, by its design-system id. */
function emailField(container: HTMLElement): HTMLInputElement {
  return container.querySelector('[data-mol-id="auth-modal-email"]') as HTMLInputElement
}

/** Mounts AuthModal against a reactive props object, returned for rerenders. */
async function mountModal(
  props: AuthModalProps,
): Promise<{ props: AuthModalProps; container: HTMLElement }> {
  const container = document.body.appendChild(document.createElement('div'))
  const reactiveProps = shallowReactive<AuthModalProps>({ ...props })
  const app = createApp(defineComponent({ setup: () => () => h(AuthModal, reactiveProps) }))
  app.mount(container)
  await flush()
  return { props: reactiveProps, container }
}

/**
 * Drains Vue's pending render work the way the conformance kit's flush does:
 * the reopen focus runs one tick behind the reactive write, so a single
 * `await nextTick()` can resume before it.
 */
async function flush(): Promise<void> {
  await nextTick()
  await nextTick()
}

describe('AuthModal focus on open', () => {
  afterEach(async () => {
    await nextTick()
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('moves focus to the email field on open, in signup mode', async () => {
    const { container } = await mountModal({
      open: true,
      onClose: vi.fn(),
      initialMode: 'signup',
      oauthConfig: {},
    })
    expect(document.activeElement).toBe(emailField(container))
  })

  it('moves focus to the email field on open, in login mode', async () => {
    const { container } = await mountModal({
      open: true,
      onClose: vi.fn(),
      initialMode: 'login',
      oauthConfig: {},
    })
    expect(document.activeElement).toBe(emailField(container))
  })

  it('does not set the autofocus attribute on the email field', async () => {
    const { container } = await mountModal({
      open: true,
      onClose: vi.fn(),
      initialMode: 'signup',
      oauthConfig: {},
    })
    // The attribute (what React's autoFocus prop renders) is the thing the
    // a11y rule bars — assert its absence directly so a future port to another
    // framework cannot reintroduce it under a different code path.
    expect(emailField(container).getAttribute('autofocus')).toBeNull()
  })

  it('does not steal focus back when the parent re-renders while open', async () => {
    const { props, container } = await mountModal({
      open: true,
      onClose: vi.fn(),
      initialMode: 'signup',
      oauthConfig: {},
    })
    const password = container.querySelector(
      '[data-mol-id="auth-modal-password"]',
    ) as HTMLInputElement
    password.focus()

    // A fresh onClose closure — what a busy parent hands down every render.
    props.onClose = () => {}
    await flush()
    expect(document.activeElement).toBe(password)
  })

  it('moves focus back to the email field when the modal is closed and reopened', async () => {
    const onClose = vi.fn()
    const { props, container } = await mountModal({
      open: true,
      onClose,
      initialMode: 'login',
      oauthConfig: {},
    })
    expect(document.activeElement).toBe(emailField(container))

    props.open = false
    await flush()
    expect(document.activeElement).not.toBe(emailField(container))

    props.open = true
    await flush()
    expect(document.activeElement).toBe(emailField(container))
  })
})
