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

// Register Angular's JIT compiler facade and bond the reference ClassMap + i18n
// provider the components read, before any component class loads.
import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as AngularUI from '@molecule/app-ui-angular'

import { flush, type RenderedFixture, renderFixture } from './render.js'
import { ButtonStub, IconStub, ModalStub, OAuthButtonsStub, OAuthDividerStub } from './stubs.js'

const refreshMock = vi.fn()

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ refresh: refreshMock }),
  useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
  useLogin: () => ({ status: 'idle', error: null, login: vi.fn() }),
  useSignup: () => ({ status: 'idle', error: null, signup: vi.fn() }),
  useI18nError: () => () => null,
  useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
  useTranslation: () => ({
    t: (key: string, _values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

vi.mock('@molecule/app-auth-shell-angular', () => ({
  useAuthFormState: () => ({ fields: () => ({}), setField: vi.fn(), clear: vi.fn() }),
}))

vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { elementTarget } = await importOriginal<typeof AngularUI>()
  const stubs = await import('./stubs.js')
  return { Modal: stubs.ModalStub, Icon: stubs.IconStub, Button: stubs.ButtonStub, elementTarget }
})

vi.mock('@molecule/app-oauth-buttons-angular', async () => {
  const stubs = await import('./stubs.js')
  return { OAuthButtons: stubs.OAuthButtonsStub, OAuthDivider: stubs.OAuthDividerStub }
})

import { AuthModal } from '../auth-modal.component.js'

/** Fixtures still mounted when the current test started, torn down in afterEach. */
const mounted: RenderedFixture[] = []

/** The email field, by its design-system id. */
function emailField(container: ParentNode): HTMLInputElement {
  return container.querySelector('[data-mol-id="auth-modal-email"]') as HTMLInputElement
}

/**
 * Renders the modal with the given props, returned for prop updates.
 *
 * @param props - The modal's props.
 * @returns The rendered fixture.
 */
async function mountModal(props: Record<string, unknown>): Promise<RenderedFixture> {
  const fixture = await renderFixture(
    `<mol-auth-modal
      [open]="p['open']"
      [onClose]="p['onClose']"
      [initialMode]="p['initialMode']"
      [oauthConfig]="p['oauthConfig']"
    ></mol-auth-modal>`,
    props,
    [AuthModal, ModalStub, IconStub, ButtonStub, OAuthButtonsStub, OAuthDividerStub],
  )
  await flush(fixture)
  mounted.push(fixture)
  return fixture
}

describe('AuthModal focus on open', () => {
  afterEach(async () => {
    for (const fixture of mounted.splice(0)) await fixture.destroy()
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('moves focus to the email field on open, in signup mode', async () => {
    await mountModal({ open: true, onClose: vi.fn(), initialMode: 'signup', oauthConfig: {} })
    expect(emailField(document).closest('[data-initial-focus="true"]')).not.toBeNull()
    expect(document.activeElement).toBe(emailField(document))
  })

  it('moves focus to the email field on open, in login mode', async () => {
    await mountModal({ open: true, onClose: vi.fn(), initialMode: 'login', oauthConfig: {} })
    expect(document.activeElement).toBe(emailField(document))
  })

  it('does not set the autofocus attribute on the email field', async () => {
    await mountModal({ open: true, onClose: vi.fn(), initialMode: 'signup', oauthConfig: {} })
    // The attribute (what React's autoFocus prop renders) is the thing the
    // a11y rule bars — assert its absence directly so a future port to another
    // framework cannot reintroduce it under a different code path.
    expect(emailField(document).getAttribute('autofocus')).toBeNull()
  })

  it('does not steal focus back when the parent re-renders while open', async () => {
    const fixture = await mountModal({
      open: true,
      onClose: vi.fn(),
      initialMode: 'signup',
      oauthConfig: {},
    })
    const password = document.querySelector(
      '[data-mol-id="auth-modal-password"]',
    ) as HTMLInputElement
    password.focus()

    // A fresh onClose closure — what a busy parent hands down every render.
    await fixture.setProps({ onClose: () => {} })
    await flush(fixture)
    expect(document.activeElement).toBe(password)
  })

  it('moves focus back to the email field when the modal is closed and reopened', async () => {
    const onClose = vi.fn()
    const fixture = await mountModal({
      open: true,
      onClose,
      initialMode: 'login',
      oauthConfig: {},
    })
    expect(document.activeElement).toBe(emailField(document))

    await fixture.setProps({ open: false })
    await flush(fixture)
    expect(document.activeElement).not.toBe(emailField(document))

    await fixture.setProps({ open: true })
    await flush(fixture)
    expect(document.activeElement).toBe(emailField(document))
  })
})
