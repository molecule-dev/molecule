// @vitest-environment jsdom
/**
 * finishAuth resilience — the post-signup "didn't log me in" regression.
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/AuthModal.test.tsx`:
 * cookie-session APIs (the `@molecule/api-resource-user` model) issue no refresh
 * token, so `refresh()` could reject right after a SUCCESSFUL signup/login.
 * finishAuth must still run `onAuthenticated` + close when the client session
 * is already established, and only treat the failure as fatal when there is
 * genuinely no session.
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

const refreshMock = vi.fn()
const isAuthenticatedMock = vi.fn()
const signupMock = vi.fn()
const clearMock = vi.fn()

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ refresh: refreshMock }),
  useAuthClient: () => ({
    isAuthenticated: isAuthenticatedMock,
    getUser: () => ({ email: 'new@example.com' }),
  }),
  useLogin: () => ({ status: 'idle', error: null, login: vi.fn() }),
  useSignup: () => ({ status: 'idle', error: null, signup: signupMock }),
  useI18nError: () => () => null,
  useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) => {
      const text = options?.defaultValue ?? key
      return text.replace(/\{\{(\w+)\}\}/g, (whole: string, name: string) =>
        values && name in values ? String(values[name]) : whole,
      )
    },
  }),
}))

vi.mock('@molecule/app-auth-shell-angular', () => ({
  useAuthFormState: () => ({
    fields: () => ({ email: 'new@example.com' }),
    setField: vi.fn(),
    clear: clearMock,
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

/**
 * Renders the modal in signup mode and submits the form.
 *
 * @returns The two callback spies.
 */
async function renderAndSubmit(): Promise<{
  onClose: ReturnType<typeof vi.fn>
  onAuthenticated: ReturnType<typeof vi.fn>
  fixture: RenderedFixture
}> {
  const onClose = vi.fn()
  const onAuthenticated = vi.fn()
  const fixture = await renderFixture(
    `<mol-auth-modal
      [open]="p['open']"
      [onClose]="p['onClose']"
      [initialMode]="'signup'"
      [oauthConfig]="p['oauthConfig']"
      [onAuthenticated]="p['onAuthenticated']"
    ></mol-auth-modal>`,
    { open: true, onClose, oauthConfig: {}, onAuthenticated },
    [AuthModal, ModalStub, IconStub, ButtonStub, OAuthButtonsStub, OAuthDividerStub],
  )
  await flush(fixture)
  mounted.push(fixture)
  const form = document.querySelector('form') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  return { onClose, onAuthenticated, fixture }
}

describe('AuthModal finishAuth', () => {
  afterEach(async () => {
    for (const fixture of mounted.splice(0)) await fixture.destroy()
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('completes (onAuthenticated + close) when refresh() rejects but the session is established', async () => {
    signupMock.mockResolvedValue({ user: { id: 'u1' } })
    refreshMock.mockRejectedValue(new Error('No refresh token available'))
    isAuthenticatedMock.mockReturnValue(true)

    const { onClose, onAuthenticated, fixture } = await renderAndSubmit()

    await vi.waitFor(
      () => {
        fixture.tick()
        expect(onClose).toHaveBeenCalled()
      },
      { timeout: 3000 },
    )
    expect(signupMock).toHaveBeenCalled()
    expect(onAuthenticated).toHaveBeenCalled()
  })

  it('shows a brief "Signed up!" confirmation, then closes', async () => {
    signupMock.mockResolvedValue({ user: { id: 'u1' } })
    refreshMock.mockResolvedValue({ user: { id: 'u1' } })
    isAuthenticatedMock.mockReturnValue(true)

    const { onClose, onAuthenticated, fixture } = await renderAndSubmit()
    const text = (): string => document.body.textContent ?? ''

    // The confirmation replaces the form BEFORE the modal closes, and names
    // the account that just authenticated.
    await vi.waitFor(() => {
      fixture.tick()
      expect(text()).toContain('Signed up!')
    })
    expect(text()).toContain('Logged in as new@example.com')
    expect(onClose).not.toHaveBeenCalled()

    await vi.waitFor(
      () => {
        fixture.tick()
        expect(onClose).toHaveBeenCalled()
      },
      { timeout: 3000 },
    )
    expect(onAuthenticated).toHaveBeenCalled()
    // clear() ran with the successful auth, so no credentials linger.
    expect(clearMock).toHaveBeenCalled()
  })

  it('does NOT close or run onAuthenticated when refresh() rejects and no session exists', async () => {
    signupMock.mockResolvedValue({ user: { id: 'u1' } })
    refreshMock.mockRejectedValue(new Error('No refresh token available'))
    isAuthenticatedMock.mockReturnValue(false)

    const { onClose, onAuthenticated, fixture } = await renderAndSubmit()

    // Give the async submit handler a tick to settle.
    await vi.waitFor(() => expect(refreshMock).toHaveBeenCalled())
    await flush(fixture)
    expect(onClose).not.toHaveBeenCalled()
    expect(onAuthenticated).not.toHaveBeenCalled()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const fixture = await renderFixture(
      `<i>a</i><mol-auth-modal [open]="p['open']" [onClose]="p['onClose']" [initialMode]="'signup'" [oauthConfig]="p['oauthConfig']"></mol-auth-modal><i>b</i>`,
      { open: true, onClose: vi.fn(), oauthConfig: {} },
      [AuthModal, ModalStub, IconStub, ButtonStub, OAuthButtonsStub, OAuthDividerStub],
    )
    mounted.push(fixture)
    await flush(fixture)
    const tags = (): string[] =>
      Array.from(fixture.host.children).map((child) => child.tagName.toLowerCase())
    // React's root is the Modal: the port's own `mol-auth-modal` host leaves the
    // page, and the stub modal's host stands where React's modal root is (the
    // real port portals its root, as React's does).
    expect(tags()).toEqual(['i', 'mol-modal', 'i'])
    expect(fixture.host.querySelector('mol-auth-modal')).toBeNull()
  })
})
