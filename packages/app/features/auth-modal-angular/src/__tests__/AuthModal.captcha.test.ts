// @vitest-environment jsdom
/**
 * The captcha slot — the "complete the challenge" with no challenge regression.
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/AuthModal.captcha.test.tsx`:
 * an API whose signup route requires a human-verification token does not care
 * which surface the request came from; the modal must render the challenge in
 * its own signup form and gate the submit on it.
 *
 * @module
 */

// Register Angular's JIT compiler facade and bond the reference ClassMap + i18n
// provider the components read, before any component class loads.
import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { flush, type RenderedFixture, renderFixture } from './render.js'
import { ButtonStub, IconStub, ModalStub, OAuthButtonsStub, OAuthDividerStub } from './stubs.js'

const signupMock = vi.fn()

vi.mock('@molecule/app-angular', () => ({
  useAuth: () => ({ refresh: vi.fn() }),
  useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
  useLogin: () => ({ status: 'idle', error: null, login: vi.fn() }),
  useSignup: () => ({ status: 'idle', error: null, signup: signupMock }),
  useI18nError: () => () => null,
  useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
  useTranslation: () => ({
    t: (key: string, _values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

vi.mock('@molecule/app-auth-shell-angular', () => ({
  useAuthFormState: () => ({
    fields: () => ({ email: 'new@example.com' }),
    setField: vi.fn(),
    clear: vi.fn(),
  }),
}))

vi.mock('@molecule/app-ui-angular', async () => {
  const stubs = await import('./stubs.js')
  return { Modal: stubs.ModalStub, Icon: stubs.IconStub, Button: stubs.ButtonStub }
})

vi.mock('@molecule/app-oauth-buttons-angular', async () => {
  const stubs = await import('./stubs.js')
  return { OAuthButtons: stubs.OAuthButtonsStub, OAuthDivider: stubs.OAuthDividerStub }
})

import { AuthModal } from '../auth-modal.component.js'

/** Fixtures still mounted when the current test started, torn down in afterEach. */
const mounted: RenderedFixture[] = []

/** The submit button, which the challenge gates. */
function submitButton(): HTMLButtonElement {
  return document.querySelector('[data-mol-id="auth-modal-submit"]') as HTMLButtonElement
}

/**
 * Renders AuthModal with the given props (and the challenge widget when asked),
 * returned for prop updates.
 *
 * @param options - The mode, the gating flag and whether a slot is passed.
 * @returns The rendered fixture.
 */
async function mountModal(options: {
  initialMode: 'login' | 'signup'
  captchaSolved?: boolean
  withSlot?: boolean
}): Promise<RenderedFixture> {
  const slotTemplate = options.withSlot
    ? '<ng-template #cap><div data-testid="challenge">challenge</div></ng-template>'
    : ''
  const slotBinding = options.withSlot ? `[captchaSlot]="cap"` : ''
  const fixture = await renderFixture(
    `${slotTemplate}<mol-auth-modal
      [open]="true"
      [initialMode]="p['initialMode']"
      [oauthConfig]="{}"
      ${slotBinding}
      [captchaSolved]="p['captchaSolved']"
    ></mol-auth-modal>`,
    { initialMode: options.initialMode, captchaSolved: options.captchaSolved },
    [AuthModal, ModalStub, IconStub, ButtonStub, OAuthButtonsStub, OAuthDividerStub],
  )
  await flush(fixture)
  mounted.push(fixture)
  return fixture
}

describe('AuthModal captcha slot', () => {
  afterEach(async () => {
    for (const fixture of mounted.splice(0)) await fixture.destroy()
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('renders the challenge in the signup form and blocks submit until it is solved', async () => {
    const fixture = await mountModal({
      initialMode: 'signup',
      captchaSolved: false,
      withSlot: true,
    })

    expect(document.querySelector('[data-testid="challenge"]')).toBeTruthy()
    // Inside the form — a challenge rendered outside it would still leave the
    // user submitting a form with no visible check attached to it.
    expect(document.querySelector('form [data-mol-id="auth-modal-captcha"]')).toBeTruthy()
    expect(submitButton().disabled).toBe(true)

    await fixture.setProps({ captchaSolved: true })
    await flush(fixture)
    expect(submitButton().disabled).toBe(false)
  })

  it('does not render the challenge in login mode, and never gates the login submit', async () => {
    await mountModal({ initialMode: 'login', captchaSolved: false, withSlot: true })

    // Login is not captcha-gated server-side; unmounting the slot also lets the
    // widget clear its single-use token instead of stranding a stale one.
    expect(document.querySelector('[data-testid="challenge"]')).toBeNull()
    expect(submitButton().disabled).toBe(false)
  })

  it('leaves signup unchanged for apps with no challenge (no slot, no gating)', async () => {
    await mountModal({ initialMode: 'signup', withSlot: false })

    expect(document.querySelector('[data-mol-id="auth-modal-captcha"]')).toBeNull()
    expect(submitButton().disabled).toBe(false)
  })
})
